export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      areas: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          project_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          project_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "areas_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action_type: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          new_value: Json | null
          old_value: Json | null
          project_id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          project_id: string
          reason?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          project_id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      components: {
        Row: {
          area_id: string | null
          attributes: Json | null
          component_type: string
          created_at: string
          created_by: string | null
          current_milestones: Json
          drawing_id: string | null
          id: string
          identity_key: Json
          is_retired: boolean
          last_updated_at: string
          last_updated_by: string | null
          percent_complete: number
          progress_template_id: string
          project_id: string
          retire_reason: string | null
          system_id: string | null
          test_package_id: string | null
          version: number
        }
        Insert: {
          area_id?: string | null
          attributes?: Json | null
          component_type: string
          created_at?: string
          created_by?: string | null
          current_milestones?: Json
          drawing_id?: string | null
          id?: string
          identity_key: Json
          is_retired?: boolean
          last_updated_at?: string
          last_updated_by?: string | null
          percent_complete?: number
          progress_template_id: string
          project_id: string
          retire_reason?: string | null
          system_id?: string | null
          test_package_id?: string | null
          version?: number
        }
        Update: {
          area_id?: string | null
          attributes?: Json | null
          component_type?: string
          created_at?: string
          created_by?: string | null
          current_milestones?: Json
          drawing_id?: string | null
          id?: string
          identity_key?: Json
          is_retired?: boolean
          last_updated_at?: string
          last_updated_by?: string | null
          percent_complete?: number
          progress_template_id?: string
          project_id?: string
          retire_reason?: string | null
          system_id?: string | null
          test_package_id?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "components_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "components_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "vw_progress_by_area"
            referencedColumns: ["area_id"]
          },
          {
            foreignKeyName: "components_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "components_drawing_id_fkey"
            columns: ["drawing_id"]
            isOneToOne: false
            referencedRelation: "drawings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "components_drawing_id_fkey"
            columns: ["drawing_id"]
            isOneToOne: false
            referencedRelation: "mv_drawing_progress"
            referencedColumns: ["drawing_id"]
          },
          {
            foreignKeyName: "components_last_updated_by_fkey"
            columns: ["last_updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "components_progress_template_id_fkey"
            columns: ["progress_template_id"]
            isOneToOne: false
            referencedRelation: "progress_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "components_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "components_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "components_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "vw_progress_by_system"
            referencedColumns: ["system_id"]
          },
          {
            foreignKeyName: "components_test_package_id_fkey"
            columns: ["test_package_id"]
            isOneToOne: false
            referencedRelation: "mv_package_readiness"
            referencedColumns: ["package_id"]
          },
          {
            foreignKeyName: "components_test_package_id_fkey"
            columns: ["test_package_id"]
            isOneToOne: false
            referencedRelation: "test_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "components_test_package_id_fkey"
            columns: ["test_package_id"]
            isOneToOne: false
            referencedRelation: "vw_progress_by_test_package"
            referencedColumns: ["test_package_id"]
          },
        ]
      }
      drawings: {
        Row: {
          area_id: string | null
          created_at: string
          drawing_no_norm: string
          drawing_no_raw: string
          id: string
          is_retired: boolean
          project_id: string
          retire_reason: string | null
          rev: string | null
          system_id: string | null
          test_package_id: string | null
          title: string | null
        }
        Insert: {
          area_id?: string | null
          created_at?: string
          drawing_no_norm: string
          drawing_no_raw: string
          id?: string
          is_retired?: boolean
          project_id: string
          retire_reason?: string | null
          rev?: string | null
          system_id?: string | null
          test_package_id?: string | null
          title?: string | null
        }
        Update: {
          area_id?: string | null
          created_at?: string
          drawing_no_norm?: string
          drawing_no_raw?: string
          id?: string
          is_retired?: boolean
          project_id?: string
          retire_reason?: string | null
          rev?: string | null
          system_id?: string | null
          test_package_id?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drawings_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawings_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "vw_progress_by_area"
            referencedColumns: ["area_id"]
          },
          {
            foreignKeyName: "drawings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawings_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawings_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "vw_progress_by_system"
            referencedColumns: ["system_id"]
          },
          {
            foreignKeyName: "drawings_test_package_id_fkey"
            columns: ["test_package_id"]
            isOneToOne: false
            referencedRelation: "mv_package_readiness"
            referencedColumns: ["package_id"]
          },
          {
            foreignKeyName: "drawings_test_package_id_fkey"
            columns: ["test_package_id"]
            isOneToOne: false
            referencedRelation: "test_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawings_test_package_id_fkey"
            columns: ["test_package_id"]
            isOneToOne: false
            referencedRelation: "vw_progress_by_test_package"
            referencedColumns: ["test_package_id"]
          },
        ]
      }
      field_welds: {
        Row: {
          base_metal: string | null
          component_id: string
          created_at: string
          created_by: string
          date_welded: string | null
          id: string
          is_repair: boolean | null
          nde_date: string | null
          nde_notes: string | null
          nde_required: boolean
          nde_result: string | null
          nde_type: string | null
          original_weld_id: string | null
          project_id: string
          schedule: string | null
          spec: string | null
          status: string
          updated_at: string
          weld_size: string | null
          weld_type: string
          welder_id: string | null
        }
        Insert: {
          base_metal?: string | null
          component_id: string
          created_at?: string
          created_by: string
          date_welded?: string | null
          id?: string
          is_repair?: boolean | null
          nde_date?: string | null
          nde_notes?: string | null
          nde_required?: boolean
          nde_result?: string | null
          nde_type?: string | null
          original_weld_id?: string | null
          project_id: string
          schedule?: string | null
          spec?: string | null
          status?: string
          updated_at?: string
          weld_size?: string | null
          weld_type: string
          welder_id?: string | null
        }
        Update: {
          base_metal?: string | null
          component_id?: string
          created_at?: string
          created_by?: string
          date_welded?: string | null
          id?: string
          is_repair?: boolean | null
          nde_date?: string | null
          nde_notes?: string | null
          nde_required?: boolean
          nde_result?: string | null
          nde_type?: string | null
          original_weld_id?: string | null
          project_id?: string
          schedule?: string | null
          spec?: string | null
          status?: string
          updated_at?: string
          weld_size?: string | null
          weld_type?: string
          welder_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "field_welds_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: true
            referencedRelation: "components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_welds_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_welds_original_weld_id_fkey"
            columns: ["original_weld_id"]
            isOneToOne: false
            referencedRelation: "field_welds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_welds_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_welds_welder_id_fkey"
            columns: ["welder_id"]
            isOneToOne: false
            referencedRelation: "welders"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["invitation_status"]
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          organization_id: string
          role: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      milestone_events: {
        Row: {
          action: string
          component_id: string
          created_at: string
          id: string
          metadata: Json | null
          milestone_name: string
          previous_value: number | null
          user_id: string
          value: number | null
        }
        Insert: {
          action: string
          component_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          milestone_name: string
          previous_value?: number | null
          user_id: string
          value?: number | null
        }
        Update: {
          action?: string
          component_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          milestone_name?: string
          previous_value?: number | null
          user_id?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "milestone_events_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestone_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      needs_review: {
        Row: {
          component_id: string | null
          created_at: string
          created_by: string | null
          id: string
          payload: Json
          project_id: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          type: string
        }
        Insert: {
          component_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          payload: Json
          project_id: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          type: string
        }
        Update: {
          component_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          payload?: Json
          project_id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "needs_review_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "needs_review_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "needs_review_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "needs_review_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      progress_templates: {
        Row: {
          component_type: string
          created_at: string
          id: string
          milestones_config: Json
          version: number
          workflow_type: string
        }
        Insert: {
          component_type: string
          created_at?: string
          id?: string
          milestones_config: Json
          version: number
          workflow_type: string
        }
        Update: {
          component_type?: string
          created_at?: string
          id?: string
          milestones_config?: Json
          version?: number
          workflow_type?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          identifier_type: string
          identifier_value: string
          metadata: Json | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          identifier_type: string
          identifier_value: string
          metadata?: Json | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          identifier_type?: string
          identifier_value?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      report_configs: {
        Row: {
          component_type_filter: string[] | null
          created_at: string
          created_by: string | null
          description: string | null
          grouping_dimension: string
          hierarchical_grouping: boolean
          id: string
          name: string
          project_id: string
          updated_at: string
        }
        Insert: {
          component_type_filter?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          grouping_dimension: string
          hierarchical_grouping?: boolean
          id?: string
          name: string
          project_id: string
          updated_at?: string
        }
        Update: {
          component_type_filter?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          grouping_dimension?: string
          hierarchical_grouping?: boolean
          id?: string
          name?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_configs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_configs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      systems: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          project_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          project_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "systems_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      test_packages: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          project_id: string
          target_date: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          project_id: string
          target_date?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          project_id?: string
          target_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_packages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          deleted_at: string | null
          demo_expires_at: string | null
          email: string
          full_name: string | null
          id: string
          is_demo_user: boolean
          is_super_admin: boolean
          organization_id: string | null
          role: string | null
          terms_accepted_at: string | null
          terms_version: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          deleted_at?: string | null
          demo_expires_at?: string | null
          email: string
          full_name?: string | null
          id: string
          is_demo_user?: boolean
          is_super_admin?: boolean
          organization_id?: string | null
          role?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          deleted_at?: string | null
          demo_expires_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_demo_user?: boolean
          is_super_admin?: boolean
          organization_id?: string | null
          role?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      welders: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          project_id: string
          status: string
          stencil: string
          stencil_norm: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          project_id: string
          status?: string
          stencil: string
          stencil_norm: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          project_id?: string
          status?: string
          stencil?: string
          stencil_norm?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "welders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "welders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "welders_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      mv_drawing_progress: {
        Row: {
          area_id: string | null
          avg_percent_complete: number | null
          completed_components: number | null
          drawing_id: string | null
          drawing_no_norm: string | null
          project_id: string | null
          system_id: string | null
          test_package_id: string | null
          total_components: number | null
        }
        Relationships: [
          {
            foreignKeyName: "drawings_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawings_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "vw_progress_by_area"
            referencedColumns: ["area_id"]
          },
          {
            foreignKeyName: "drawings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawings_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawings_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "vw_progress_by_system"
            referencedColumns: ["system_id"]
          },
          {
            foreignKeyName: "drawings_test_package_id_fkey"
            columns: ["test_package_id"]
            isOneToOne: false
            referencedRelation: "mv_package_readiness"
            referencedColumns: ["package_id"]
          },
          {
            foreignKeyName: "drawings_test_package_id_fkey"
            columns: ["test_package_id"]
            isOneToOne: false
            referencedRelation: "test_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawings_test_package_id_fkey"
            columns: ["test_package_id"]
            isOneToOne: false
            referencedRelation: "vw_progress_by_test_package"
            referencedColumns: ["test_package_id"]
          },
        ]
      }
      mv_package_readiness: {
        Row: {
          avg_percent_complete: number | null
          blocker_count: number | null
          completed_components: number | null
          description: string | null
          last_activity_at: string | null
          package_id: string | null
          package_name: string | null
          project_id: string | null
          target_date: string | null
          total_components: number | null
        }
        Relationships: [
          {
            foreignKeyName: "test_packages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_progress_by_area: {
        Row: {
          area_id: string | null
          area_name: string | null
          budget: number | null
          pct_installed: number | null
          pct_punch: number | null
          pct_received: number | null
          pct_restored: number | null
          pct_tested: number | null
          pct_total: number | null
          project_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "areas_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_progress_by_system: {
        Row: {
          budget: number | null
          pct_installed: number | null
          pct_punch: number | null
          pct_received: number | null
          pct_restored: number | null
          pct_tested: number | null
          pct_total: number | null
          project_id: string | null
          system_id: string | null
          system_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "systems_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_progress_by_test_package: {
        Row: {
          budget: number | null
          pct_installed: number | null
          pct_punch: number | null
          pct_received: number | null
          pct_restored: number | null
          pct_tested: number | null
          pct_total: number | null
          project_id: string | null
          test_package_id: string | null
          test_package_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_packages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_recent_activity: {
        Row: {
          description: string | null
          id: string | null
          project_id: string | null
          timestamp: string | null
          user_id: string | null
          user_initials: string | null
        }
        Relationships: [
          {
            foreignKeyName: "components_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestone_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_invitation_for_user: {
        Args: { p_invitation_id: string; p_user_id: string }
        Returns: Json
      }
      assign_drawing_with_inheritance: {
        Args: {
          p_area_id?: string
          p_drawing_id: string
          p_system_id?: string
          p_test_package_id?: string
          p_user_id?: string
        }
        Returns: Json
      }
      assign_drawings_bulk: {
        Args: {
          p_area_id?: string
          p_drawing_ids: string[]
          p_system_id?: string
          p_test_package_id?: string
          p_user_id?: string
        }
        Returns: Json[]
      }
      calculate_component_percent: {
        Args: { p_current_milestones: Json; p_template_id: string }
        Returns: number
      }
      calculate_earned_milestone_value: {
        Args: {
          p_component_type: string
          p_milestones: Json
          p_standard_milestone: string
        }
        Returns: number
      }
      check_email_has_organization: {
        Args: { check_email: string }
        Returns: boolean
      }
      create_test_package: {
        Args: {
          p_description?: string
          p_name: string
          p_project_id: string
          p_target_date?: string
          p_user_id?: string
        }
        Returns: string
      }
      detect_similar_drawings: {
        Args: {
          p_drawing_no_norm: string
          p_project_id: string
          p_threshold?: number
        }
        Returns: {
          drawing_id: string
          drawing_no_norm: string
          similarity_score: number
        }[]
      }
      get_current_user_email: { Args: never; Returns: string }
      get_current_user_org_id: { Args: never; Returns: string }
      get_user_org_role: {
        Args: { org_uuid: string; user_uuid: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_weld_repair_history: {
        Args: { p_parent_weld_id: string }
        Returns: {
          comments: string
          date_welded: string
          id: string
          repair_sequence: number
          weld_id_number: number
          welder_stencil: string
        }[]
      }
      is_super_admin: { Args: never; Returns: boolean }
      normalize_drawing_number: { Args: { raw: string }; Returns: string }
      refresh_materialized_views: { Args: never; Returns: undefined }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      update_component_milestone: {
        Args: {
          p_component_id: string
          p_milestone_name: string
          p_new_value: number
          p_user_id: string
        }
        Returns: Json
      }
      update_test_package: {
        Args: {
          p_description?: string
          p_name?: string
          p_package_id: string
          p_target_date?: string
          p_user_id?: string
        }
        Returns: Json
      }
      validate_component_identity_key: {
        Args: { p_component_type: string; p_identity_key: Json }
        Returns: boolean
      }
      validate_milestone_weights: {
        Args: { p_milestones_config: Json }
        Returns: boolean
      }
    }
    Enums: {
      invitation_status: "pending" | "accepted" | "revoked" | "expired"
      user_role:
        | "owner"
        | "admin"
        | "project_manager"
        | "foreman"
        | "qc_inspector"
        | "welder"
        | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      invitation_status: ["pending", "accepted", "revoked", "expired"],
      user_role: [
        "owner",
        "admin",
        "project_manager",
        "foreman",
        "qc_inspector",
        "welder",
        "viewer",
      ],
    },
  },
} as const
