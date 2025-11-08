// src/types/team.types.ts

export type Role =
  | 'owner'
  | 'admin'
  | 'project_manager'
  | 'foreman'
  | 'qc_inspector'
  | 'welder'
  | 'viewer';

export type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

export interface TeamMember {
  user_id: string;
  organization_id: string;
  name: string;
  email: string;
  role: Role;
  joined_at: string;  // ISO 8601 timestamp
  last_active: string | null;
}

export interface Invitation {
  id: string;
  organization_id: string;
  email: string;
  role: Role;
  token_hash: string;  // SHA-256 hash of token (actual DB column)
  invited_by: string;   // UUID referencing auth.users(id)
  created_at: string;
  accepted_at: string | null;
  expires_at: string;
  status: InvitationStatus;
}

export interface Organization {
  id: string;
  name: string;
  created_at: string;
}
