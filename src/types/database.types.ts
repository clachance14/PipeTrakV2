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
        ]
      }
      field_weld_inspections: {
        Row: {
          base_metal: string | null
          comments: string | null
          component_id: string
          created_at: string
          created_by: string | null
          date_welded: string | null
          drawing_iso_number: string | null
          flagged_for_xray: boolean
          hydro_complete: boolean
          hydro_complete_date: string | null
          id: string
          last_updated_at: string
          last_updated_by: string | null
          nde_result: string | null
          nde_type_performed: string | null
          optional_info: string | null
          package_number: string | null
          parent_weld_id: string | null
          pmi_complete: boolean
          pmi_date: string | null
          pmi_required: boolean
          pmi_result: string | null
          project_id: string
          pwht_complete: boolean
          pwht_date: string | null
          pwht_required: boolean
          repair_sequence: number
          restored_date: string | null
          schedule: string | null
          spec: string | null
          system_code: string | null
          test_pressure: number | null
          tie_in_number: string | null
          turned_over_to_client: boolean
          turnover_date: string | null
          weld_id_number: number
          weld_size: string | null
          weld_type: string | null
          welder_id: string | null
          welder_stencil: string | null
          xray_flagged_by: string | null
          xray_flagged_date: string | null
          xray_percentage: string | null
          xray_result: string | null
          xray_shot_number: string | null
        }
        Insert: {
          base_metal?: string | null
          comments?: string | null
          component_id: string
          created_at?: string
          created_by?: string | null
          date_welded?: string | null
          drawing_iso_number?: string | null
          flagged_for_xray?: boolean
          hydro_complete?: boolean
          hydro_complete_date?: string | null
          id?: string
          last_updated_at?: string
          last_updated_by?: string | null
          nde_result?: string | null
          nde_type_performed?: string | null
          optional_info?: string | null
          package_number?: string | null
          parent_weld_id?: string | null
          pmi_complete?: boolean
          pmi_date?: string | null
          pmi_required?: boolean
          pmi_result?: string | null
          project_id: string
          pwht_complete?: boolean
          pwht_date?: string | null
          pwht_required?: boolean
          repair_sequence?: number
          restored_date?: string | null
          schedule?: string | null
          spec?: string | null
          system_code?: string | null
          test_pressure?: number | null
          tie_in_number?: string | null
          turned_over_to_client?: boolean
          turnover_date?: string | null
          weld_id_number: number
          weld_size?: string | null
          weld_type?: string | null
          welder_id?: string | null
          welder_stencil?: string | null
          xray_flagged_by?: string | null
          xray_flagged_date?: string | null
          xray_percentage?: string | null
          xray_result?: string | null
          xray_shot_number?: string | null
        }
        Update: {
          base_metal?: string | null
          comments?: string | null
          component_id?: string
          created_at?: string
          created_by?: string | null
          date_welded?: string | null
          drawing_iso_number?: string | null
          flagged_for_xray?: boolean
          hydro_complete?: boolean
          hydro_complete_date?: string | null
          id?: string
          last_updated_at?: string
          last_updated_by?: string | null
          nde_result?: string | null
          nde_type_performed?: string | null
          optional_info?: string | null
          package_number?: string | null
          parent_weld_id?: string | null
          pmi_complete?: boolean
          pmi_date?: string | null
          pmi_required?: boolean
          pmi_result?: string | null
          project_id?: string
          pwht_complete?: boolean
          pwht_date?: string | null
          pwht_required?: boolean
          repair_sequence?: number
          restored_date?: string | null
          schedule?: string | null
          spec?: string | null
          system_code?: string | null
          test_pressure?: number | null
          tie_in_number?: string | null
          turned_over_to_client?: boolean
          turnover_date?: string | null
          weld_id_number?: number
          weld_size?: string | null
          weld_type?: string | null
          welder_id?: string | null
          welder_stencil?: string | null
          xray_flagged_by?: string | null
          xray_flagged_date?: string | null
          xray_percentage?: string | null
          xray_result?: string | null
          xray_shot_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "field_weld_inspections_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_weld_inspections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_weld_inspections_last_updated_by_fkey"
            columns: ["last_updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_weld_inspections_parent_weld_id_fkey"
            columns: ["parent_weld_id"]
            isOneToOne: false
            referencedRelation: "field_weld_inspections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_weld_inspections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_weld_inspections_welder_id_fkey"
            columns: ["welder_id"]
            isOneToOne: false
            referencedRelation: "welders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_weld_inspections_xray_flagged_by_fkey"
            columns: ["xray_flagged_by"]
            isOneToOne: false
            referencedRelation: "users"
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
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_super_admin: boolean
          organization_id: string
          role: string
          terms_accepted_at: string | null
          terms_version: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          is_super_admin?: boolean
          organization_id: string
          role: string
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_super_admin?: boolean
          organization_id?: string
          role?: string
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
        ]
      }
      mv_package_readiness: {
        Row: {
          avg_percent_complete: number | null
          blocker_count: number | null
          completed_components: number | null
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
    }
    Functions: {
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
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      is_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      normalize_drawing_number: {
        Args: { raw: string }
        Returns: string
      }
      refresh_materialized_views: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      update_component_milestone: {
        Args: {
          p_component_id: string
          p_milestone_name: string
          p_new_value: number
          p_user_id: string
        }
        Returns: Json
      }
      user_is_org_member: {
        Args: { org_uuid: string; user_uuid: string }
        Returns: boolean
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
