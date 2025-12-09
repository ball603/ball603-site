-- Ball603 Roster Submissions Table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS roster_submissions (
  id SERIAL PRIMARY KEY,
  school TEXT NOT NULL,                    -- shortname e.g. "Farmington"
  gender TEXT NOT NULL,                    -- "Boys" or "Girls"
  division TEXT,                           -- "D-I", "D-II", "D-III", "D-IV"
  season TEXT DEFAULT '2025-26',           -- Season year
  submitted_by TEXT,                       -- coach name
  submitted_email TEXT,                    -- coach email
  submission_type TEXT DEFAULT 'form',     -- "form" or "pdf"
  players_json JSONB DEFAULT '[]'::jsonb,  -- array of player objects
  head_coach TEXT,
  assistant_coaches TEXT,
  managers TEXT,
  pdf_url TEXT,                            -- Supabase storage URL if PDF uploaded
  status TEXT DEFAULT 'pending',           -- pending/approved/rejected
  notes TEXT,                              -- admin notes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT
);

-- Index for faster filtering
CREATE INDEX IF NOT EXISTS idx_roster_submissions_status ON roster_submissions(status);
CREATE INDEX IF NOT EXISTS idx_roster_submissions_school ON roster_submissions(school);
CREATE INDEX IF NOT EXISTS idx_roster_submissions_created ON roster_submissions(created_at DESC);

-- Enable Row Level Security (optional, for API access)
ALTER TABLE roster_submissions ENABLE ROW LEVEL SECURITY;

-- Policy to allow all operations for authenticated users (adjust as needed)
CREATE POLICY "Allow all for authenticated" ON roster_submissions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy to allow inserts from anonymous (for form submissions)
CREATE POLICY "Allow insert for anon" ON roster_submissions
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy to allow select for anon (needed for the function to read back)
CREATE POLICY "Allow select for anon" ON roster_submissions
  FOR SELECT
  TO anon
  USING (true);

-- Comment on table
COMMENT ON TABLE roster_submissions IS 'Stores coach roster submissions for Ball603 review';
