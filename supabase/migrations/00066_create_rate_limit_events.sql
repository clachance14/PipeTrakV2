-- Migration: Create rate_limit_events table for demo signup rate limiting
-- Feature: 021-public-homepage
-- Description: Tracks demo signup attempts to enforce rate limits (10/hour per IP, 3/day per email)

CREATE TABLE rate_limit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN ('demo_signup')),
  identifier_type TEXT NOT NULL CHECK (identifier_type IN ('ip_address', 'email')),
  identifier_value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Index for efficient rate limit lookups
-- Supports queries like: "Count events for this IP/email in the last hour/day"
CREATE INDEX idx_rate_limit_events_lookup
  ON rate_limit_events (event_type, identifier_type, identifier_value, created_at DESC);

-- Add comment for documentation
COMMENT ON TABLE rate_limit_events IS 'Tracks rate-limited events (demo signups) for abuse prevention';
COMMENT ON COLUMN rate_limit_events.event_type IS 'Type of event being rate limited (currently only demo_signup)';
COMMENT ON COLUMN rate_limit_events.identifier_type IS 'Type of identifier used for rate limiting (ip_address or email)';
COMMENT ON COLUMN rate_limit_events.identifier_value IS 'The actual IP address or email value';
COMMENT ON COLUMN rate_limit_events.metadata IS 'Additional event context (user agent, referrer, etc.)';
