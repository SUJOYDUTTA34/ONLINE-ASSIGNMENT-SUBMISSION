import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tcrjnxqkpwpkfqlxazth.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_85e5jMY77E1V2CPRmLlHOw_XyK4DJ1I';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Helper to sync appointment/submission records to Supabase table 'appointments' or 'submissions'.
 */
export async function syncAppointmentToSupabase(record: {
  id: string;
  studentId: string;
  studentName: string;
  assignmentId?: string;
  assignmentTitle?: string;
  courseCode?: string;
  submittedAt: string;
  status: string;
  notes?: string;
  fileUrl?: string;
}) {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .upsert([
        {
          id: record.id,
          student_id: record.studentId,
          student_name: record.studentName,
          assignment_id: record.assignmentId || '',
          assignment_title: record.assignmentTitle || '',
          course_code: record.courseCode || '',
          submitted_at: record.submittedAt,
          status: record.status,
          notes: record.notes || '',
          file_url: record.fileUrl || '',
          updated_at: new Date().toISOString(),
        },
      ], { onConflict: 'id' });

    if (error) {
      console.warn('Supabase sync warning (table may need creation in Supabase dashboard):', error.message);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err: any) {
    console.error('Supabase connection error:', err);
    return { success: false, error: err.message };
  }
}
