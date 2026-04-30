import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { QuestionBankClient } from '@/components/head/QuestionBankClient'

export const revalidate = 0

interface SearchParams { subject?: string; center?: string; chapter?: string }
interface Props { searchParams: Promise<SearchParams> }

export default async function HeadQuestionsPage({ searchParams }: Props) {
  const params = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles').select('role').eq('user_id', user.id).single()
  if (!profile || !['academic_head', 'director'].includes(profile.role)) redirect('/teacher/log')

  const admin = createAdminClient()

  // Fetch all uploads with files, typed questions, teacher + batch info
  let query = admin
    .from('question_uploads')
    .select(`
      id, chapter_name, sub_topic, subject, question_count, question_date, week_number, status, notes, created_at,
      batches(id, name, batch_type, centers(name)),
      user_profiles(id, name, employee_id),
      question_files(id, file_url, file_name, file_type, is_fair_copy, uploaded_by),
      typed_questions(id, question_number, question_text, option_a, option_b, option_c, option_d, correct_answer, difficulty)
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  if (params.subject) query = query.eq('subject', params.subject)
  if (params.chapter) query = query.ilike('chapter_name', `%${params.chapter}%`)

  const { data: rawUploads } = await query

  // Get centers for filter
  const { data: rawCenters } = await supabase.from('centers').select('id, name').order('name')

  const uploads = (rawUploads ?? []) as unknown as Parameters<typeof QuestionBankClient>[0]['uploads']
  const centers = (rawCenters ?? []) as Array<{ id: string; name: string }>

  // Count stats
  const total    = uploads.length
  const pending  = uploads.filter(u => u.status === 'uploaded').length
  const dtpDone  = uploads.filter(u => u.status === 'dtp_done').length

  // Unique subjects across all uploads
  const subjects = Array.from(new Set(uploads.map(u => u.subject))).sort()

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">❓ Question Bank</h1>
          <p className="text-gray-500 text-base mt-1">
            Teacher rough drafts → DTP fair copy · organised by chapter
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="px-2.5 py-1 bg-yellow-100 text-yellow-700 rounded-full">⏳ {pending} pending DTP</span>
            <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-full">✅ {dtpDone} done</span>
            <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full">📦 {total} total</span>
          </div>
        </div>
      </div>

      {/* Subject filter */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mr-1">Subject</span>
        <Link href="/head/questions"
          className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${!params.subject ? 'text-white border-transparent' : 'bg-white border-gray-200 text-gray-600 hover:border-violet-300'}`}
          style={!params.subject ? { background: 'linear-gradient(135deg,#7C3AED,#1A73E8)' } : {}}>
          All
        </Link>
        {subjects.map(s => (
          <Link key={s} href={`/head/questions?subject=${encodeURIComponent(s)}`}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${params.subject === s ? 'text-white border-transparent' : 'bg-white border-gray-200 text-gray-600 hover:border-violet-300'}`}
            style={params.subject === s ? { background: 'linear-gradient(135deg,#7C3AED,#1A73E8)' } : {}}>
            {s}
          </Link>
        ))}
      </div>

      {/* SQL setup notice if no uploads */}
      {uploads.length === 0 && (
        <div className="mb-6 p-5 bg-amber-50 border border-amber-200 rounded-2xl">
          <p className="font-black text-amber-800 mb-2">⚠️ Run SQL migration first</p>
          <p className="text-sm text-amber-700 mb-3">Create the question tables in your Supabase SQL Editor:</p>
          <pre className="text-xs bg-amber-100 rounded-xl p-4 overflow-x-auto text-amber-900 font-mono leading-relaxed whitespace-pre-wrap">{SQL_MIGRATION}</pre>
        </div>
      )}

      <QuestionBankClient uploads={uploads} centers={centers} selectedSubject={params.subject} />
    </div>
  )
}

const SQL_MIGRATION = `-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS question_uploads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  batch_id uuid REFERENCES batches(id) ON DELETE CASCADE NOT NULL,
  subject text NOT NULL,
  chapter_name text NOT NULL,
  sub_topic text,
  question_date date NOT NULL DEFAULT CURRENT_DATE,
  week_number int NOT NULL DEFAULT 1,
  question_count int NOT NULL DEFAULT 5,
  notes text,
  status text NOT NULL DEFAULT 'uploaded',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS question_files (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  upload_id uuid REFERENCES question_uploads(id) ON DELETE CASCADE NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL DEFAULT 'image',
  is_fair_copy boolean NOT NULL DEFAULT false,
  uploaded_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS typed_questions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  upload_id uuid REFERENCES question_uploads(id) ON DELETE CASCADE NOT NULL,
  question_number int NOT NULL,
  question_text text NOT NULL,
  option_a text, option_b text, option_c text, option_d text,
  correct_answer text,
  difficulty text DEFAULT 'medium',
  typed_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE question_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE typed_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read question_uploads" ON question_uploads FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth insert question_uploads" ON question_uploads FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth delete question_uploads" ON question_uploads FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "auth all question_files" ON question_files FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth all typed_questions" ON typed_questions FOR ALL USING (auth.role() = 'authenticated');

-- Supabase Storage: create a public bucket called "question-files"
-- Dashboard > Storage > New bucket > Name: question-files > Public: ON`
