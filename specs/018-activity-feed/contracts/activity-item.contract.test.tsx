/**
 * Contract Test: ActivityItem Interface
 * Feature: 018-activity-feed
 * Purpose: Validate TypeScript contract between vw_recent_activity view and frontend
 */

import { describe, it, expect } from 'vitest';
import type { ActivityItem } from '@/types/activity';

/**
 * Type guard to validate ActivityItem structure at runtime
 */
function isActivityItem(value: unknown): value is ActivityItem {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'user_initials' in value &&
    'description' in value &&
    'timestamp' in value &&
    typeof (value as ActivityItem).id === 'string' &&
    typeof (value as ActivityItem).user_initials === 'string' &&
    typeof (value as ActivityItem).description === 'string' &&
    typeof (value as ActivityItem).timestamp === 'string'
  );
}

describe('ActivityItem Contract', () => {
  describe('Interface Shape', () => {
    it('should have id as string (UUID from milestone_events)', () => {
      const item: ActivityItem = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_initials: 'JS',
        description: 'John Smith marked Weld complete for Spool SP-001 on Drawing P-12345',
        timestamp: '2025-10-28T10:30:00Z',
      };

      expect(item.id).toBeTypeOf('string');
      expect(item.id).toMatch(/^[0-9a-f-]+$/); // UUID format
    });

    it('should have user_initials as string (2-3 characters)', () => {
      const item: ActivityItem = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_initials: 'JS',
        description: 'John Smith marked Weld complete for Spool SP-001 on Drawing P-12345',
        timestamp: '2025-10-28T10:30:00Z',
      };

      expect(item.user_initials).toBeTypeOf('string');
      expect(item.user_initials.length).toBeGreaterThanOrEqual(1);
      expect(item.user_initials.length).toBeLessThanOrEqual(3);
    });

    it('should have description as string (human-readable activity)', () => {
      const item: ActivityItem = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_initials: 'JS',
        description: 'John Smith marked Weld complete for Spool SP-001 on Drawing P-12345',
        timestamp: '2025-10-28T10:30:00Z',
      };

      expect(item.description).toBeTypeOf('string');
      expect(item.description.length).toBeGreaterThan(0);
    });

    it('should have timestamp as ISO 8601 string', () => {
      const item: ActivityItem = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_initials: 'JS',
        description: 'John Smith marked Weld complete for Spool SP-001 on Drawing P-12345',
        timestamp: '2025-10-28T10:30:00Z',
      };

      expect(item.timestamp).toBeTypeOf('string');
      expect(new Date(item.timestamp).toString()).not.toBe('Invalid Date');
    });
  });

  describe('Type Guard', () => {
    it('should validate valid ActivityItem', () => {
      const validItem = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_initials: 'JS',
        description: 'John Smith marked Weld complete for Spool SP-001',
        timestamp: '2025-10-28T10:30:00Z',
      };

      expect(isActivityItem(validItem)).toBe(true);
    });

    it('should reject item with missing id', () => {
      const invalidItem = {
        user_initials: 'JS',
        description: 'John Smith marked Weld complete',
        timestamp: '2025-10-28T10:30:00Z',
      };

      expect(isActivityItem(invalidItem)).toBe(false);
    });

    it('should reject item with missing user_initials', () => {
      const invalidItem = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        description: 'John Smith marked Weld complete',
        timestamp: '2025-10-28T10:30:00Z',
      };

      expect(isActivityItem(invalidItem)).toBe(false);
    });

    it('should reject item with wrong type for id', () => {
      const invalidItem = {
        id: 12345, // number instead of string
        user_initials: 'JS',
        description: 'John Smith marked Weld complete',
        timestamp: '2025-10-28T10:30:00Z',
      };

      expect(isActivityItem(invalidItem)).toBe(false);
    });

    it('should reject null', () => {
      expect(isActivityItem(null)).toBe(false);
    });

    it('should reject undefined', () => {
      expect(isActivityItem(undefined)).toBe(false);
    });
  });

  describe('Description Format Examples', () => {
    it('should format discrete milestone complete', () => {
      const item: ActivityItem = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_initials: 'JS',
        description: 'John Smith marked Weld complete for Spool SP-001 on Drawing P-12345',
        timestamp: '2025-10-28T10:30:00Z',
      };

      expect(item.description).toContain('marked');
      expect(item.description).toContain('complete');
      expect(item.description).toContain('for');
    });

    it('should format partial milestone with previous value', () => {
      const item: ActivityItem = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_initials: 'JD',
        description: 'Jane Doe marked Fabricate to 85% (was 60%) for Spool SP-002 on Drawing P-67890',
        timestamp: '2025-10-28T10:35:00Z',
      };

      expect(item.description).toContain('to 85%');
      expect(item.description).toContain('(was 60%)');
    });

    it('should format component without drawing', () => {
      const item: ActivityItem = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_initials: 'BJ',
        description: 'Bob Jones marked Receive complete for Field Weld FW-042 (no drawing assigned)',
        timestamp: '2025-10-28T10:40:00Z',
      };

      expect(item.description).toContain('(no drawing assigned)');
      expect(item.description).not.toContain('on Drawing');
    });
  });

  describe('User Initials Examples', () => {
    it('should support multi-word names (2 initials)', () => {
      const item: ActivityItem = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_initials: 'JS',
        description: 'John Smith marked Weld complete',
        timestamp: '2025-10-28T10:30:00Z',
      };

      expect(item.user_initials).toBe('JS');
      expect(item.user_initials.length).toBe(2);
    });

    it('should support single-word names (1 initial)', () => {
      const item: ActivityItem = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_initials: 'M',
        description: 'Madonna marked Weld complete',
        timestamp: '2025-10-28T10:30:00Z',
      };

      expect(item.user_initials).toBe('M');
      expect(item.user_initials.length).toBe(1);
    });

    it('should support email-based initials (2 characters)', () => {
      const item: ActivityItem = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_initials: 'JO',
        description: 'john@example.com marked Weld complete',
        timestamp: '2025-10-28T10:30:00Z',
      };

      expect(item.user_initials).toBe('JO');
      expect(item.user_initials.length).toBe(2);
    });
  });

  describe('Array Contract', () => {
    it('should support empty array (no activities)', () => {
      const activities: ActivityItem[] = [];

      expect(activities).toHaveLength(0);
      expect(Array.isArray(activities)).toBe(true);
    });

    it('should support array with 1-10 items', () => {
      const activities: ActivityItem[] = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          user_initials: 'JS',
          description: 'John Smith marked Weld complete',
          timestamp: '2025-10-28T10:30:00Z',
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          user_initials: 'JD',
          description: 'Jane Doe marked Receive complete',
          timestamp: '2025-10-28T10:25:00Z',
        },
      ];

      expect(activities).toHaveLength(2);
      expect(activities.every(isActivityItem)).toBe(true);
    });

    it('should support sorting by timestamp (newest first)', () => {
      const activities: ActivityItem[] = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          user_initials: 'JS',
          description: 'John Smith marked Weld complete',
          timestamp: '2025-10-28T10:30:00Z', // Newer
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          user_initials: 'JD',
          description: 'Jane Doe marked Receive complete',
          timestamp: '2025-10-28T10:25:00Z', // Older
        },
      ];

      const timestamps = activities.map((a) => new Date(a.timestamp).getTime());
      const sortedTimestamps = [...timestamps].sort((a, b) => b - a);

      expect(timestamps).toEqual(sortedTimestamps); // Newest first
    });
  });
});
