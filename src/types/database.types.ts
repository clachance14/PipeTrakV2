// This file will be auto-generated from Supabase
// Run: npx supabase gen types typescript --project-id=<ref> > src/types/database.types.ts
// For now, this is a placeholder

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: Record<string, never>
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
