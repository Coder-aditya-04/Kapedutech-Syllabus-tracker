export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      centers: {
        Row: { id: string; name: string; city: string; address: string | null; created_at: string }
        Insert: { id?: string; name: string; city?: string; address?: string | null; created_at?: string }
        Update: { id?: string; name?: string; city?: string; address?: string | null }
        Relationships: []
      }
      batches: {
        Row: { id: string; name: string; center_id: string; class_level: string; batch_type: string; academic_year: string; is_active: boolean; created_at: string }
        Insert: { id?: string; name: string; center_id: string; class_level: string; batch_type: string; academic_year?: string; is_active?: boolean }
        Update: { id?: string; name?: string; center_id?: string; class_level?: string; batch_type?: string; academic_year?: string; is_active?: boolean }
        Relationships: []
      }
      user_profiles: {
        Row: { id: string; user_id: string; name: string; role: string; center_id: string | null; employee_id: string | null; created_at: string }
        Insert: { id?: string; user_id: string; name: string; role: string; center_id?: string | null; employee_id?: string | null }
        Update: { name?: string; role?: string; center_id?: string | null; employee_id?: string | null }
        Relationships: []
      }
      teacher_batch_assignments: {
        Row: { id: string; teacher_id: string; batch_id: string; subject: string; is_active: boolean; assigned_at: string }
        Insert: { id?: string; teacher_id: string; batch_id: string; subject: string; is_active?: boolean }
        Update: { is_active?: boolean; subject?: string }
        Relationships: []
      }
      subjects: {
        Row: { id: string; name: string; batch_types_applicable: string[] }
        Insert: { id?: string; name: string; batch_types_applicable: string[] }
        Update: { name?: string; batch_types_applicable?: string[] }
        Relationships: []
      }
      syllabus_topics: {
        Row: { id: string; subject_id: string; class_level: string; chapter_name: string; subtopic_name: string | null; chapter_order: number; subtopic_order: number }
        Insert: { id?: string; subject_id: string; class_level: string; chapter_name: string; subtopic_name?: string | null; chapter_order?: number; subtopic_order?: number }
        Update: { chapter_name?: string; subtopic_name?: string | null; chapter_order?: number; subtopic_order?: number }
        Relationships: []
      }
      lecture_plans: {
        Row: { id: string; batch_type: string; subject: string; class_level: string; month_name: string; topic_name: string; planned_lectures: number; start_date: string | null; academic_year: string; created_at: string }
        Insert: { id?: string; batch_type: string; subject: string; class_level: string; month_name: string; topic_name: string; planned_lectures: number; start_date?: string | null; academic_year?: string }
        Update: { topic_name?: string; planned_lectures?: number; start_date?: string | null }
        Relationships: []
      }
      weekly_logs: {
        Row: { id: string; teacher_id: string; batch_id: string; subject: string; chapter_name: string; subtopics_covered: string | null; lectures_this_week: number; week_number: number; academic_year: string; notes: string | null; is_holiday: boolean; submitted_at: string; updated_at: string }
        Insert: { id?: string; teacher_id: string; batch_id: string; subject: string; chapter_name: string; subtopics_covered?: string | null; lectures_this_week?: number; week_number: number; academic_year?: string; notes?: string | null; is_holiday?: boolean }
        Update: { chapter_name?: string; subtopics_covered?: string | null; lectures_this_week?: number; notes?: string | null; is_holiday?: boolean }
        Relationships: []
      }
      mentorships: {
        Row: { id: string; mentor_teacher_id: string; batch_id: string; assigned_at: string; notes: string | null; is_active: boolean }
        Insert: { id?: string; mentor_teacher_id: string; batch_id: string; notes?: string | null; is_active?: boolean }
        Update: { notes?: string | null; is_active?: boolean }
        Relationships: []
      }
      holidays: {
        Row: { id: string; center_id: string | null; holiday_date: string; holiday_name: string; affects_all_centers: boolean; created_at: string }
        Insert: { id?: string; center_id?: string | null; holiday_date: string; holiday_name: string; affects_all_centers?: boolean }
        Update: { holiday_date?: string; holiday_name?: string; affects_all_centers?: boolean; center_id?: string | null }
        Relationships: []
      }
      admission_enquiries: {
        Row: { id: string; student_name: string; parent_name: string | null; phone: string; email: string | null; class_level: string | null; target_exam: string | null; center_preference: string | null; status: string; notes: string | null; follow_up_date: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; student_name: string; parent_name?: string | null; phone: string; email?: string | null; class_level?: string | null; target_exam?: string | null; center_preference?: string | null; status?: string; notes?: string | null; follow_up_date?: string | null }
        Update: { status?: string; notes?: string | null; follow_up_date?: string | null }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

export type UserRole = 'teacher' | 'academic_head' | 'director' | 'student'
export type Subject = 'Physics' | 'Chemistry' | 'Botany' | 'Zoology' | 'Mathematics'
export type BatchType = 'NEET_EXCEL' | 'NEET_GROWTH' | 'JEE_EXCEL' | 'JEE_GROWTH' | 'MHT_CET'
export type PaceStatus = 'no_entry' | 'behind' | 'slow' | 'on_track' | 'fast'

// Joined types for convenience
export type BatchWithCenter = Database['public']['Tables']['batches']['Row'] & {
  centers: Database['public']['Tables']['centers']['Row']
}

export type WeeklyLogWithTeacher = Database['public']['Tables']['weekly_logs']['Row'] & {
  user_profiles: Pick<Database['public']['Tables']['user_profiles']['Row'], 'id' | 'name' | 'employee_id'>
}

export type TeacherWithAssignments = Database['public']['Tables']['user_profiles']['Row'] & {
  teacher_batch_assignments: Array<
    Database['public']['Tables']['teacher_batch_assignments']['Row'] & {
      batches: Database['public']['Tables']['batches']['Row'] & {
        centers: Database['public']['Tables']['centers']['Row']
      }
    }
  >
}
