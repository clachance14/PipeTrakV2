-- Create demo_leads table for marketing lead capture
-- This table stores contact information from users who access the demo

CREATE TABLE demo_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying leads by email (deduplication checks)
CREATE INDEX idx_demo_leads_email ON demo_leads(email);

-- Index for chronological export/reporting
CREATE INDEX idx_demo_leads_created_at ON demo_leads(created_at DESC);

-- Enable RLS with NO policies = service role only access
-- This ensures lead data is protected from client-side access
ALTER TABLE demo_leads ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE demo_leads IS 'Marketing leads captured from demo access requests. Service role access only.';
