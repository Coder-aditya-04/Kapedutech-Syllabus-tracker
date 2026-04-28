import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateSchedule } from '@/lib/scheduler/engine'
import type { BatchInfo, TeacherAbsence, GenerateInput, TeacherInfo } from '@/lib/scheduler/types'

interface RawBatch {
  id: string; name: string; batch_type: string; time_slot: string | null
  slots_per_day: number | null; centers: { name: string } | null
}
interface RawAssignment {
  batch_id: string; subject: string
  user_profiles: { id: string; name: string; teacher_code: string | null } | null
}
interface RawLog {
  subject: string; lectures_this_week: number
  batches: { batch_type: string } | null
}
interface RawOffDay  { batch_id: string; day_name: string }

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: caller } = await supabase
      .from('user_profiles').select('role').eq('user_id', user.id).single()
    if (!caller || !['academic_head', 'director'].includes(caller.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { weekStart, includeSunday = false } = body as { weekStart: string; includeSunday?: boolean }
    if (!weekStart) return NextResponse.json({ error: 'weekStart required' }, { status: 400 })

    const admin = createAdminClient()

    // ── 1. Load batches with assignments ──────────────────────────────────
    const { data: rawBatches } = await admin
      .from('batches')
      .select('id, name, batch_type, time_slot, slots_per_day, centers(name)')
      .eq('is_active', true)

    const { data: assignments } = await admin
      .from('teacher_batch_assignments')
      .select('batch_id, subject, user_profiles(id, name, teacher_code)')
      .eq('is_active', true)

    const rawBatchList = (rawBatches ?? []) as unknown as RawBatch[]
    const assignmentList = (assignments ?? []) as unknown as RawAssignment[]

    const batches: BatchInfo[] = rawBatchList.map(b => {
      const batchAssignments: Record<string, TeacherInfo> = {}
      assignmentList
        .filter(a => a.batch_id === b.id)
        .forEach(a => {
          if (a.user_profiles) {
            batchAssignments[a.subject] = {
              id: a.user_profiles.id,
              name: a.user_profiles.name,
              code: a.user_profiles.teacher_code ?? a.user_profiles.name.slice(0, 2).toUpperCase(),
              subject: a.subject,
            }
          }
        })
      return {
        id: b.id,
        name: b.name,
        batchType: (b.batch_type ?? 'JEE') as BatchInfo['batchType'],
        centerName: b.centers?.name ?? '',
        timeSlot: (b.time_slot ?? 'Morning') as BatchInfo['timeSlot'],
        slotsPerDay: b.slots_per_day ?? 3,
        assignments: batchAssignments,
      }
    })

    // ── 2. Lag map (planned vs submitted this month) ───────────────────────
    const now = new Date()
    const monthShort = now.toLocaleString('en-IN', { month: 'short', timeZone: 'Asia/Kolkata' })
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

    const [{ data: plans }, { data: logs }] = await Promise.all([
      admin.from('lecture_plans').select('batch_type, subject, planned_lectures').eq('month_name', monthShort),
      admin.from('weekly_logs')
        .select('batch_id, subject, lectures_this_week, batches(batch_type)')
        .eq('is_holiday', false)
        .gte('submitted_at', monthStart)
        .lte('submitted_at', monthEnd),
    ])

    // planned per batchType+subject
    const planned: Record<string, Record<string, number>> = {}
    for (const p of (plans ?? [])) {
      if (!planned[p.batch_type]) planned[p.batch_type] = {}
      planned[p.batch_type][p.subject] = (planned[p.batch_type][p.subject] ?? 0) + p.planned_lectures
    }
    // done per batchType+subject
    const done: Record<string, Record<string, number>> = {}
    for (const l of (logs ?? []) as unknown as RawLog[]) {
      const bt = l.batches?.batch_type ?? 'JEE'
      if (!done[bt]) done[bt] = {}
      done[bt][l.subject] = (done[bt][l.subject] ?? 0) + l.lectures_this_week
    }
    const lagMap: Record<string, Record<string, number>> = {}
    for (const bt of Object.keys(planned)) {
      lagMap[bt] = {}
      for (const sub of Object.keys(planned[bt])) {
        lagMap[bt][sub] = Math.max(0, planned[bt][sub] - (done[bt]?.[sub] ?? 0))
      }
    }

    // ── 3. Absences & off days for this week ──────────────────────────────
    const { data: rawAbsences } = await admin
      .from('teacher_absences')
      .select('teacher_id, day_name, slot_index')
      .eq('week_start', weekStart)

    const absences: TeacherAbsence[] = (rawAbsences ?? []).map(a => ({
      teacherId: a.teacher_id,
      dayName: a.day_name,
      slotIndex: a.slot_index ?? -1,
    }))

    const { data: rawOffDays } = await admin
      .from('batch_offdays')
      .select('batch_id, day_name')
      .eq('week_start', weekStart)

    const offDaysMap: Record<string, string[]> = {}
    for (const od of (rawOffDays ?? []) as unknown as RawOffDay[]) {
      if (!offDaysMap[od.batch_id]) offDaysMap[od.batch_id] = []
      offDaysMap[od.batch_id].push(od.day_name)
    }

    // ── 4. Run scheduler ──────────────────────────────────────────────────
    const input: GenerateInput = { batches, weekStart, absences, lagMap, includeSunday, offDays: offDaysMap }
    const cells = generateSchedule(input)

    // ── 5. Save to DB (replace existing for this week) ────────────────────
    await admin.from('weekly_schedule').delete().eq('week_start', weekStart).eq('is_override', false)

    if (cells.length > 0) {
      const rows = cells.map(c => ({
        week_start: weekStart,
        batch_id: c.batchId,
        date: c.date,
        slot_index: c.slotIndex,
        teacher_id: c.teacherId,
        subject: c.subject,
        is_override: false,
        is_sunday_extra: c.isSundayExtra,
      }))
      const { error } = await admin.from('weekly_schedule').upsert(rows, {
        onConflict: 'week_start,batch_id,date,slot_index',
        ignoreDuplicates: false,
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, cells: cells.length, clashes: cells.filter(c => c.hasClash).length })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}
