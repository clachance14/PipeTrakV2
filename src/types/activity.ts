/**
 * ActivityItem interface represents a single activity in the feed
 * This matches the shape returned by the vw_recent_activity PostgreSQL view
 */
export interface ActivityItem {
  id: string;
  user_initials: string;
  description: string;
  timestamp: string; // ISO 8601 format
}
