-- Migration: Optimize vw_recent_activity Query Performance
-- Feature: 018-activity-feed
-- Task: T018 - Performance validation and optimization
-- Description: Add composite index to improve view query performance
--
-- Performance Target: <100ms for queries with project_id filter + LIMIT 10
-- Current Performance: ~120ms average (20ms over target)
--
-- Root Cause Analysis:
-- - View joins 4 tables (milestone_events, components, users, drawings)
-- - Query filters on components.project_id (already indexed)
-- - Query orders by milestone_events.created_at DESC (already indexed)
-- - But no composite index for the join + sort operation
--
-- Solution: Add composite index on milestone_events (component_id, created_at DESC)
-- This allows PostgreSQL to use a single index for both the join and the sort,
-- eliminating the need for a separate sort operation after filtering.

-- Add composite index for efficient join + sort
-- This index supports queries that:
-- 1. Join milestone_events to components (via component_id)
-- 2. Sort by created_at DESC
-- 3. Apply LIMIT (can use index to avoid full scan)
CREATE INDEX IF NOT EXISTS idx_milestone_events_component_created
  ON milestone_events (component_id, created_at DESC);

-- Verify existing indexes remain in place
-- These were created in migration 00010:
-- - idx_events_component_id (supports joins)
-- - idx_events_created_at (supports sorts)
-- - idx_components_project_id (supports project filtering)
--
-- The new composite index is more efficient for the vw_recent_activity query
-- because it combines both operations in a single index scan.

-- Expected Performance Improvement:
-- - Before: ~120ms average
-- - After: <100ms target (estimated 70-90ms with optimized index)
-- - Reduction: ~25-40% faster queries

-- Note: This index benefits ALL queries that filter by component_id and sort by created_at,
-- not just vw_recent_activity. Other potential beneficiaries:
-- - Component history pages
-- - Audit trails per component
-- - Any component-level activity feeds
