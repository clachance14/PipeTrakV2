/**
 * Sync Manager Tests
 * Feature: 015-mobile-milestone-updates
 * Bug Fix: Type conversion for boolean milestone values
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { syncQueue } from './sync-manager'
import { enqueueUpdate, clearQueue } from './offline-queue'
import { supabase } from './supabase'

// Mock supabase
vi.mock('./supabase', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}))

describe('syncQueue - boolean to number conversion', () => {
  beforeEach(() => {
    // Clear queue and mocks before each test
    clearQueue()
    vi.clearAllMocks()
  })

  it('converts boolean true to numeric 1 when syncing', async () => {
    // Enqueue update with boolean value (simulating checkbox toggle)
    enqueueUpdate({
      component_id: 'test-component-123',
      milestone_name: 'Fit-Up',
      value: true, // Boolean value
      user_id: 'test-user-123',
    })

    // Mock RPC success
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: null })

    // Sync queue
    await syncQueue()

    // Verify RPC was called with numeric 1, not boolean true or string "true"
    expect(supabase.rpc).toHaveBeenCalledWith('update_component_milestone', {
      p_component_id: 'test-component-123',
      p_milestone_name: 'Fit-Up',
      p_new_value: 1, // Should be numeric 1
      p_user_id: 'test-user-123',
    })
  })

  it('converts boolean false to numeric 0 when syncing', async () => {
    // Enqueue update with boolean false (unchecking)
    enqueueUpdate({
      component_id: 'test-component-456',
      milestone_name: 'Fit-Up',
      value: false, // Boolean value
      user_id: 'test-user-456',
    })

    // Mock RPC success
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: null })

    // Sync queue
    await syncQueue()

    // Verify RPC was called with numeric 0
    expect(supabase.rpc).toHaveBeenCalledWith('update_component_milestone', {
      p_component_id: 'test-component-456',
      p_milestone_name: 'Fit-Up',
      p_new_value: 0, // Should be numeric 0
      p_user_id: 'test-user-456',
    })
  })

  it('preserves numeric values when syncing', async () => {
    // Enqueue update with numeric value (partial milestone)
    enqueueUpdate({
      component_id: 'test-component-789',
      milestone_name: 'Fabricate',
      value: 75, // Numeric value
      user_id: 'test-user-789',
    })

    // Mock RPC success
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: null })

    // Sync queue
    await syncQueue()

    // Verify RPC was called with numeric 75
    expect(supabase.rpc).toHaveBeenCalledWith('update_component_milestone', {
      p_component_id: 'test-component-789',
      p_milestone_name: 'Fabricate',
      p_new_value: 75, // Should remain numeric 75
      p_user_id: 'test-user-789',
    })
  })
})
