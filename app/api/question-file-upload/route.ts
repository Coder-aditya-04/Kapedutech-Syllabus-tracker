import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles').select('id').eq('user_id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const formData = await req.formData()
  const file       = formData.get('file') as File | null
  const uploadId   = formData.get('upload_id') as string | null
  const isFairCopy = formData.get('is_fair_copy') === 'true'

  if (!file || !uploadId) {
    return NextResponse.json({ error: 'file and upload_id required' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
  const prefix = isFairCopy ? 'fair' : profile.id
  const path = `${prefix}/${uploadId}/${Date.now()}_${file.name}`

  const admin = createAdminClient()
  const bytes = await file.arrayBuffer()

  const { error: storageErr } = await admin.storage
    .from('question-files')
    .upload(path, new Uint8Array(bytes), { contentType: file.type || 'application/octet-stream' })

  if (storageErr) {
    return NextResponse.json({ error: storageErr.message }, { status: 400 })
  }

  const { data: { publicUrl } } = admin.storage.from('question-files').getPublicUrl(path)
  const fileType = ext === 'pdf' ? 'pdf' : (ext === 'doc' || ext === 'docx') ? 'docx' : 'image'

  const { data: savedFile, error: dbErr } = await admin
    .from('question_files')
    .insert({
      upload_id: uploadId,
      file_url: publicUrl,
      file_name: file.name,
      file_type: fileType,
      is_fair_copy: isFairCopy,
      uploaded_by: profile.id,
    })
    .select().single()

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 400 })
  return NextResponse.json({ file: savedFile })
}
