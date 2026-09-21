import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { redactSensitive } from '../lib/security';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Safe initialization - only initialize if valid credentials are provided in environment variables
export const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  !SUPABASE_URL.includes('your-project') &&
  !SUPABASE_ANON_KEY.includes('your-anon-key')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

/**
 * Helper to sync appointment/submission records to Supabase table 'appointments'.
 * PII Minimization: Notes are stripped of personal contact info and secrets.
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
  if (!supabase) {
    return { success: false, error: 'Supabase is not configured. Using local storage.' };
  }

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
          notes: redactSensitive(record.notes || ''),
          file_url: record.fileUrl || '',
          updated_at: new Date().toISOString(),
        },
      ], { onConflict: 'id' });

    if (error) {
      // Safe logging: Only log standard error code, zero user data
      console.warn('Supabase sync notice: operation did not complete.');
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err: any) {
    console.error('Supabase connection error: network or service unavailable');
    return { success: false, error: err?.message || 'Connection error' };
  }
}

/**
 * Helper to sync student and user registration records to Supabase table 'users'.
 * PRIVACY AUDIT FIX:
 * - Passwords and credential hashes are NEVER sent to Supabase.
 * - Personal phone numbers and residential addresses are stripped from external sync payloads.
 */
export async function syncUserToSupabase(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  departmentName?: string;
  status: string;
  studentIdNumber?: string;
  employeeIdNumber?: string;
  program?: string;
  joinedDate?: string;
}) {
  if (!supabase) {
    return { success: false, error: 'Supabase is not configured. Using local storage.' };
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .upsert([
        {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          department_name: user.departmentName || '',
          status: user.status,
          student_id_number: user.studentIdNumber || '',
          employee_id_number: user.employeeIdNumber || '',
          program: user.program || '',
          joined_date: user.joinedDate || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ], { onConflict: 'id' });

    if (error) {
      console.warn('Supabase directory sync notice: operation did not complete.');
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err: any) {
    console.error('Supabase directory sync connection error: network or service unavailable');
    return { success: false, error: err?.message || 'Connection error' };
  }
}

