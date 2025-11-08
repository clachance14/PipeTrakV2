// Core domain types will be defined here
// Database types will be auto-generated from Supabase

export type User = {
  id: string
  email: string
  role: 'owner' | 'admin' | 'project_manager' | 'foreman' | 'qc_inspector' | 'welder' | 'viewer' | null
  full_name: string | null
  organization_id: string | null
  avatar_url: string | null
  created_at?: string
  updated_at?: string
}

export type Organization = {
  id: string
  name: string
  created_at: string
}

export type Project = {
  id: string
  organization_id: string
  name: string
  is_archived: boolean
  created_at: string
}

// Placeholder - will be replaced with Supabase generated types
export type Database = Record<string, unknown>

// Package types (Feature 012)
export * from './package.types'
