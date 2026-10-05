ALTER TABLE assignments ADD COLUMN instructions TEXT;
ALTER TABLE assignments ADD COLUMN file_url TEXT;
ALTER TABLE assignments ADD COLUMN file_name TEXT;
ALTER TABLE assignments ADD COLUMN status TEXT DEFAULT 'published';
ALTER TABLE assignments ADD COLUMN allowed_file_types TEXT;
ALTER TABLE assignments ADD COLUMN max_file_size_mb INTEGER DEFAULT 100;
ALTER TABLE assignments ADD COLUMN allow_late_submission INTEGER DEFAULT 1;
ALTER TABLE assignments ADD COLUMN late_penalty_percent_per_day INTEGER DEFAULT 5;
ALTER TABLE assignments ADD COLUMN allow_resubmission INTEGER DEFAULT 1;
ALTER TABLE assignments ADD COLUMN max_resubmissions INTEGER DEFAULT 3;
ALTER TABLE assignments ADD COLUMN created_by_name TEXT;

ALTER TABLE submissions ADD COLUMN student_email TEXT;
ALTER TABLE submissions ADD COLUMN student_id_number TEXT;
ALTER TABLE submissions ADD COLUMN file_key TEXT;
ALTER TABLE submissions ADD COLUMN mime_type TEXT;
ALTER TABLE submissions ADD COLUMN sha256_hash TEXT;
ALTER TABLE submissions ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE submissions ADD COLUMN receipt_id TEXT;

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
