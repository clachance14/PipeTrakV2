// Core domain types will be defined here
// Database types will be auto-generated from Supabase

export type User = {
  id: string
  email: string
  role: 'admin' | 'member'
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
