CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  course_code TEXT,
  course_name TEXT,
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  due_date TEXT,
  max_marks INTEGER DEFAULT 100,
  created_by TEXT,
  created_by_name TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  status TEXT DEFAULT 'published',
  allowed_file_types TEXT,
  max_file_size_mb INTEGER DEFAULT 100,
  allow_late_submission INTEGER DEFAULT 1,
  late_penalty_percent_per_day INTEGER DEFAULT 5,
  allow_resubmission INTEGER DEFAULT 1,
  max_resubmissions INTEGER DEFAULT 3,
  file_url TEXT,
  file_name TEXT
);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  student_name TEXT,
  student_email TEXT,
  student_id_number TEXT,
  file_name TEXT,
  file_url TEXT,
  file_key TEXT,
  file_size TEXT,
  mime_type TEXT,
  sha256_hash TEXT,
  status TEXT DEFAULT 'submitted',
  version INTEGER DEFAULT 1,
  receipt_id TEXT,
  submitted_at TEXT DEFAULT (datetime('now')),
  grade_score REAL,
  grade_feedback TEXT,
  graded_by TEXT,
  graded_at TEXT
);

CREATE TABLE IF NOT EXISTS course_materials (
  id TEXT PRIMARY KEY,
  course_id TEXT,
  course_code TEXT,
  name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_key TEXT NOT NULL,
  file_url TEXT,
  file_size TEXT,
  file_type TEXT,
  category TEXT,
  uploaded_by TEXT,
  uploaded_by_id TEXT,
  uploaded_at TEXT DEFAULT (datetime('now'))
);

-- Seed Initial Core 4 Assignments
INSERT OR IGNORE INTO assignments (
  id, course_code, course_name, title, description, instructions,
  due_date, max_marks, created_by, created_by_name, created_at, status
) VALUES 
(
  'asg-501', 'CS-301', 'Database Management Systems',
  'SQL Normalization & BCNF Implementation',
  'Design and normalize a university database schema up to BCNF with complex SQL queries and join operations.',
  'Implement normalization up to 3NF/BCNF. Upload your .sql file or PDF report.',
  '2026-10-15 23:59:00', 50, 'fac-201', 'Dr. Arvind Rao', '2026-10-05 08:04:00', 'published'
),
(
  'asg-502', 'CS-302', 'Python Programming Lab',
  'Python Data Analysis Pipeline',
  'Build modular Pandas and NumPy analysis script with complete unit test suites.',
  'Deliver clean Python script (.py) or Jupyter notebook with charts.',
  '2026-10-20 23:59:00', 40, 'fac-201', 'Dr. Arvind Rao', '2026-10-05 08:04:00', 'published'
),
(
  'asg-503', 'BCA-301', 'Numerical Methods',
  'BCA-301 — Coursework & Assignment Submission',
  'Submit assignments, project files, exercises or reports for Numerical Methods.',
  'Upload assignment solution PDF or code archive.',
  '2026-11-04 15:23:00', 100, 'fac-201', 'Dr. Arvind Rao', '2026-10-05 08:04:00', 'published'
),
(
  'asg-504', 'CS-401', 'Microprocessor & Microcontroller',
  'CS-401 — Coursework & Assignment Submission',
  'Submit assignments, project files, exercises or reports for Microprocessor Microcontroller.',
  'Upload assembly/C code and simulation circuit schematics.',
  '2026-11-04 15:23:00', 100, 'fac-201', 'Dr. Arvind Rao', '2026-10-05 08:04:00', 'published'
);
