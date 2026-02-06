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
          {
            foreignKeyName: "areas_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_progress"
            referencedColumns: ["project_id"]
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
            foreignKeyName: "audit_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_progress"
            referencedColumns: ["project_id"]
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
          budgeted_manhours: number | null
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
          manhour_weight: number | null
          percent_complete: number
          post_hydro_install: boolean
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
          budgeted_manhours?: number | null
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
          manhour_weight?: number | null
          percent_complete?: number
          post_hydro_install?: boolean
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
          budgeted_manhours?: number | null
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
          manhour_weight?: number | null
          percent_complete?: number
          post_hydro_install?: boolean
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
            referencedRelation: "vw_manhour_progress_by_area"
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
            foreignKeyName: "components_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_progress"
            referencedColumns: ["project_id"]
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
            referencedRelation: "vw_manhour_progress_by_system"
            referencedColumns: ["system_id"]
          },
          {
            foreignKeyName: "fk_components_test_package"
            columns: ["test_package_id"]
            isOneToOne: false
            referencedRelation: "mv_package_readiness"
            referencedColumns: ["package_id"]
          },
          {
            foreignKeyName: "fk_components_test_package"
            columns: ["test_package_id"]
            isOneToOne: false
            referencedRelation: "test_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_components_test_package"
            columns: ["test_package_id"]
            isOneToOne: false
            referencedRelation: "vw_manhour_progress_by_test_package"
            referencedColumns: ["test_package_id"]
          },
        ]
      }
      demo_leads: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          ip_address: string | null
          referrer: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          ip_address?: string | null
          referrer?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          ip_address?: string | null
          referrer?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
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
            referencedRelation: "vw_manhour_progress_by_area"
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
            foreignKeyName: "drawings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_progress"
            referencedColumns: ["project_id"]
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
            referencedRelation: "vw_manhour_progress_by_system"
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
            referencedRelation: "vw_manhour_progress_by_test_package"
            referencedColumns: ["test_package_id"]
          },
        ]
      }
      field_weld_events: {
        Row: {
          action: string
          created_at: string
          date_welded: string | null
          field_weld_id: string
          id: string
          metadata: Json | null
          nde_result: string | null
          nde_type: string | null
          previous_date_welded: string | null
          previous_nde_result: string | null
          previous_nde_type: string | null
          previous_welder_id: string | null
          user_id: string
          welder_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          date_welded?: string | null
          field_weld_id: string
          id?: string
          metadata?: Json | null
          nde_result?: string | null
          nde_type?: string | null
          previous_date_welded?: string | null
          previous_nde_result?: string | null
          previous_nde_type?: string | null
          previous_welder_id?: string | null
          user_id: string
          welder_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          date_welded?: string | null
          field_weld_id?: string
          id?: string
          metadata?: Json | null
          nde_result?: string | null
          nde_type?: string | null
          previous_date_welded?: string | null
          previous_nde_result?: string | null
          previous_nde_type?: string | null
          previous_welder_id?: string | null
          user_id?: string
          welder_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "field_weld_events_field_weld_id_fkey"
            columns: ["field_weld_id"]
            isOneToOne: false
            referencedRelation: "field_welds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_weld_events_previous_welder_id_fkey"
            columns: ["previous_welder_id"]
            isOneToOne: false
            referencedRelation: "vw_field_weld_progress_by_welder"
            referencedColumns: ["welder_id"]
          },
          {
            foreignKeyName: "field_weld_events_previous_welder_id_fkey"
            columns: ["previous_welder_id"]
            isOneToOne: false
            referencedRelation: "welders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_weld_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_weld_events_welder_id_fkey"
            columns: ["welder_id"]
            isOneToOne: false
            referencedRelation: "vw_field_weld_progress_by_welder"
            referencedColumns: ["welder_id"]
          },
          {
            foreignKeyName: "field_weld_events_welder_id_fkey"
            columns: ["welder_id"]
            isOneToOne: false
            referencedRelation: "welders"
            referencedColumns: ["id"]
          },
        ]
      }
      field_weld_report_snapshots: {
        Row: {
          created_at: string
          dimension: string
          dimension_id: string | null
          dimension_name: string | null
          id: string
          metrics: Json
          project_id: string
          snapshot_date: string
        }
        Insert: {
          created_at?: string
          dimension: string
          dimension_id?: string | null
          dimension_name?: string | null
          id?: string
          metrics: Json
          project_id: string
          snapshot_date?: string
        }
        Update: {
          created_at?: string
          dimension?: string
          dimension_id?: string | null
          dimension_name?: string | null
          id?: string
          metrics?: Json
          project_id?: string
          snapshot_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "field_weld_report_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_weld_report_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_progress"
            referencedColumns: ["project_id"]
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
          is_unplanned: boolean
          nde_date: string | null
          nde_notes: string | null
          nde_required: boolean
          nde_result: string | null
          nde_type: string | null
          notes: string | null
          original_weld_id: string | null
          project_id: string
          schedule: string | null
          spec: string | null
          status: string
          updated_at: string
          weld_size: string | null
          weld_type: string
          welder_id: string | null
          xray_percentage: number | null
        }
        Insert: {
          base_metal?: string | null
          component_id: string
          created_at?: string
          created_by: string
          date_welded?: string | null
          id?: string
          is_repair?: boolean | null
          is_unplanned?: boolean
          nde_date?: string | null
          nde_notes?: string | null
          nde_required?: boolean
          nde_result?: string | null
          nde_type?: string | null
          notes?: string | null
          original_weld_id?: string | null
          project_id: string
          schedule?: string | null
          spec?: string | null
          status?: string
          updated_at?: string
          weld_size?: string | null
          weld_type: string
          welder_id?: string | null
          xray_percentage?: number | null
        }
        Update: {
          base_metal?: string | null
          component_id?: string
          created_at?: string
          created_by?: string
          date_welded?: string | null
          id?: string
          is_repair?: boolean | null
          is_unplanned?: boolean
          nde_date?: string | null
          nde_notes?: string | null
          nde_required?: boolean
          nde_result?: string | null
          nde_type?: string | null
          notes?: string | null
          original_weld_id?: string | null
          project_id?: string
          schedule?: string | null
          spec?: string | null
          status?: string
          updated_at?: string
          weld_size?: string | null
          weld_type?: string
          welder_id?: string | null
          xray_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "field_welds_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: true
            referencedRelation: "component_effective_templates"
            referencedColumns: ["component_id"]
          },
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
            foreignKeyName: "field_welds_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_progress"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "field_welds_welder_id_fkey"
            columns: ["welder_id"]
            isOneToOne: false
            referencedRelation: "vw_field_weld_progress_by_welder"
            referencedColumns: ["welder_id"]
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
          category: string | null
          component_id: string
          created_at: string
          delta_mh: number | null
          id: string
          metadata: Json | null
          milestone_name: string
          previous_value: number | null
          user_id: string
          value: number | null
        }
        Insert: {
          action: string
          category?: string | null
          component_id: string
          created_at?: string
          delta_mh?: number | null
          id?: string
          metadata?: Json | null
          milestone_name: string
          previous_value?: number | null
          user_id: string
          value?: number | null
        }
        Update: {
          action?: string
          category?: string | null
          component_id?: string
          created_at?: string
          delta_mh?: number | null
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
            referencedRelation: "component_effective_templates"
            referencedColumns: ["component_id"]
          },
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
            referencedRelation: "component_effective_templates"
            referencedColumns: ["component_id"]
          },
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
            foreignKeyName: "needs_review_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_progress"
            referencedColumns: ["project_id"]
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
          logo_url: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          logo_url?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      package_certificates: {
        Row: {
          certificate_number: string
          client: string | null
          client_spec: string | null
          created_at: string
          id: string
          line_number: string | null
          package_id: string
          pressure_unit: string
          temperature: number
          temperature_unit: string
          test_media: string
          test_pressure: number
          updated_at: string
        }
        Insert: {
          certificate_number: string
          client?: string | null
          client_spec?: string | null
          created_at?: string
          id?: string
          line_number?: string | null
          package_id: string
          pressure_unit?: string
          temperature: number
          temperature_unit?: string
          test_media: string
          test_pressure: number
          updated_at?: string
        }
        Update: {
          certificate_number?: string
          client?: string | null
          client_spec?: string | null
          created_at?: string
          id?: string
          line_number?: string | null
          package_id?: string
          pressure_unit?: string
          temperature?: number
          temperature_unit?: string
          test_media?: string
          test_pressure?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_certificates_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: true
            referencedRelation: "mv_package_readiness"
            referencedColumns: ["package_id"]
          },
          {
            foreignKeyName: "package_certificates_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: true
            referencedRelation: "test_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_certificates_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: true
            referencedRelation: "vw_manhour_progress_by_test_package"
            referencedColumns: ["test_package_id"]
          },
        ]
      }
      package_drawing_assignments: {
        Row: {
          created_at: string
          drawing_id: string
          id: string
          package_id: string
        }
        Insert: {
          created_at?: string
          drawing_id: string
          id?: string
          package_id: string
        }
        Update: {
          created_at?: string
          drawing_id?: string
          id?: string
          package_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_drawing_assignments_drawing_id_fkey"
            columns: ["drawing_id"]
            isOneToOne: false
            referencedRelation: "drawings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_drawing_assignments_drawing_id_fkey"
            columns: ["drawing_id"]
            isOneToOne: false
            referencedRelation: "mv_drawing_progress"
            referencedColumns: ["drawing_id"]
          },
          {
            foreignKeyName: "package_drawing_assignments_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "mv_package_readiness"
            referencedColumns: ["package_id"]
          },
          {
            foreignKeyName: "package_drawing_assignments_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "test_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_drawing_assignments_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "vw_manhour_progress_by_test_package"
            referencedColumns: ["test_package_id"]
          },
        ]
      }
      package_workflow_stages: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          package_id: string
          signoffs: Json | null
          skip_reason: string | null
          stage_data: Json | null
          stage_name: string
          stage_order: number
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          package_id: string
          signoffs?: Json | null
          skip_reason?: string | null
          stage_data?: Json | null
          stage_name: string
          stage_order: number
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          package_id?: string
          signoffs?: Json | null
          skip_reason?: string | null
          stage_data?: Json | null
          stage_name?: string
          stage_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_workflow_stages_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_workflow_stages_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "mv_package_readiness"
            referencedColumns: ["package_id"]
          },
          {
            foreignKeyName: "package_workflow_stages_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "test_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_workflow_stages_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "vw_manhour_progress_by_test_package"
            referencedColumns: ["test_package_id"]
          },
        ]
      }
      package_workflow_templates: {
        Row: {
          created_at: string | null
          default_skip_reason: string | null
          id: string
          is_required: boolean
          stage_name: string
          stage_order: number
          test_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_skip_reason?: string | null
          id?: string
          is_required?: boolean
          stage_name: string
          stage_order: number
          test_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_skip_reason?: string | null
          id?: string
          is_required?: boolean
          stage_name?: string
          stage_order?: number
          test_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      progress_templates: {
        Row: {
          category: string | null
          component_type: string
          created_at: string
          id: string
          milestones_config: Json
          version: number
          workflow_type: string
        }
        Insert: {
          category?: string | null
          component_type: string
          created_at?: string
          id?: string
          milestones_config: Json
          version: number
          workflow_type: string
        }
        Update: {
          category?: string | null
          component_type?: string
          created_at?: string
          id?: string
          milestones_config?: Json
          version?: number
          workflow_type?: string
        }
        Relationships: []
      }
      project_manhour_budgets: {
        Row: {
          created_at: string
          created_by: string
          effective_date: string
          id: string
          is_active: boolean
          project_id: string
          revision_reason: string
          total_budgeted_manhours: number
          version_number: number
        }
        Insert: {
          created_at?: string
          created_by: string
          effective_date: string
          id?: string
          is_active?: boolean
          project_id: string
          revision_reason: string
          total_budgeted_manhours: number
          version_number?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          effective_date?: string
          id?: string
          is_active?: boolean
          project_id?: string
          revision_reason?: string
          total_budgeted_manhours?: number
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_manhour_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_manhour_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_progress"
            referencedColumns: ["project_id"]
          },
        ]
      }
      project_progress_templates: {
        Row: {
          category: string | null
          component_type: string
          created_at: string
          id: string
          is_partial: boolean
          milestone_name: string
          milestone_order: number
          project_id: string
          requires_welder: boolean
          updated_at: string
          weight: number
        }
        Insert: {
          category?: string | null
          component_type: string
          created_at?: string
          id?: string
          is_partial?: boolean
          milestone_name: string
          milestone_order: number
          project_id: string
          requires_welder?: boolean
          updated_at?: string
          weight: number
        }
        Update: {
          category?: string | null
          component_type?: string
          created_at?: string
          id?: string
          is_partial?: boolean
          milestone_name?: string
          milestone_order?: number
          project_id?: string
          requires_welder?: boolean
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_progress_templates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_progress_templates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_progress"
            referencedColumns: ["project_id"]
          },
        ]
      }
      project_template_changes: {
        Row: {
          affected_component_count: number
          applied_to_existing: boolean
          changed_at: string
          changed_by: string | null
          component_type: string
          id: string
          new_weights: Json
          old_weights: Json
          project_id: string
        }
        Insert: {
          affected_component_count: number
          applied_to_existing: boolean
          changed_at?: string
          changed_by?: string | null
          component_type: string
          id?: string
          new_weights: Json
          old_weights: Json
          project_id: string
        }
        Update: {
          affected_component_count?: number
          applied_to_existing?: boolean
          changed_at?: string
          changed_by?: string | null
          component_type?: string
          id?: string
          new_weights?: Json
          old_weights?: Json
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_template_changes_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_template_changes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_template_changes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_progress"
            referencedColumns: ["project_id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          description: string | null
          id: string
          name: string
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
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
          {
            foreignKeyName: "report_configs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_progress"
            referencedColumns: ["project_id"]
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
          {
            foreignKeyName: "systems_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_progress"
            referencedColumns: ["project_id"]
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
          requires_coating: boolean | null
          requires_insulation: boolean | null
          target_date: string | null
          test_pressure: number | null
          test_pressure_unit: string | null
          test_type: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          project_id: string
          requires_coating?: boolean | null
          requires_insulation?: boolean | null
          target_date?: string | null
          test_pressure?: number | null
          test_pressure_unit?: string | null
          test_type?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          project_id?: string
          requires_coating?: boolean | null
          requires_insulation?: boolean | null
          target_date?: string | null
          test_pressure?: number | null
          test_pressure_unit?: string | null
          test_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_packages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_packages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_progress"
            referencedColumns: ["project_id"]
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
          last_viewed_release: string | null
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
          last_viewed_release?: string | null
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
          last_viewed_release?: string | null
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
            foreignKeyName: "welders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_progress"
            referencedColumns: ["project_id"]
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
      component_effective_templates: {
        Row: {
          component_id: string | null
          component_type: string | null
          milestones_config: Json | null
          progress_template_id: string | null
          project_id: string | null
          uses_project_templates: boolean | null
        }
        Relationships: [
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
            foreignKeyName: "components_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_progress"
            referencedColumns: ["project_id"]
          },
        ]
      }
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
            referencedRelation: "vw_manhour_progress_by_area"
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
            foreignKeyName: "drawings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_progress"
            referencedColumns: ["project_id"]
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
            referencedRelation: "vw_manhour_progress_by_system"
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
            referencedRelation: "vw_manhour_progress_by_test_package"
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
          post_hydro_components: number | null
          project_id: string | null
          target_date: string | null
          test_ready_percent: number | null
          testable_components: number | null
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
          {
            foreignKeyName: "test_packages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_progress"
            referencedColumns: ["project_id"]
          },
        ]
      }
      mv_template_milestone_weights: {
        Row: {
          category: string | null
          component_type: string | null
          is_partial: boolean | null
          milestone_name: string | null
          priority: number | null
          project_id: string | null
          weight: number | null
        }
        Relationships: []
      }
      vw_field_weld_progress_by_area: {
        Row: {
          accepted_count: number | null
          active_count: number | null
          area_id: string | null
          area_name: string | null
          avg_days_to_acceptance: number | null
          avg_days_to_nde: number | null
          fitup_count: number | null
          nde_fail_count: number | null
          nde_pass_count: number | null
          nde_pass_rate: number | null
          nde_pending_count: number | null
          nde_required_count: number | null
          pct_accepted: number | null
          pct_fitup: number | null
          pct_total: number | null
          pct_weld_complete: number | null
          project_id: string | null
          rejected_count: number | null
          repair_count: number | null
          repair_rate: number | null
          total_welds: number | null
          weld_complete_count: number | null
        }
        Relationships: []
      }
      vw_field_weld_progress_by_system: {
        Row: {
          accepted_count: number | null
          active_count: number | null
          avg_days_to_acceptance: number | null
          avg_days_to_nde: number | null
          fitup_count: number | null
          nde_fail_count: number | null
          nde_pass_count: number | null
          nde_pass_rate: number | null
          nde_pending_count: number | null
          nde_required_count: number | null
          pct_accepted: number | null
          pct_fitup: number | null
          pct_total: number | null
          pct_weld_complete: number | null
          project_id: string | null
          rejected_count: number | null
          repair_count: number | null
          repair_rate: number | null
          system_id: string | null
          system_name: string | null
          total_welds: number | null
          weld_complete_count: number | null
        }
        Relationships: []
      }
      vw_field_weld_progress_by_test_package: {
        Row: {
          accepted_count: number | null
          active_count: number | null
          avg_days_to_acceptance: number | null
          avg_days_to_nde: number | null
          fitup_count: number | null
          nde_fail_count: number | null
          nde_pass_count: number | null
          nde_pass_rate: number | null
          nde_pending_count: number | null
          nde_required_count: number | null
          pct_accepted: number | null
          pct_fitup: number | null
          pct_total: number | null
          pct_weld_complete: number | null
          project_id: string | null
          rejected_count: number | null
          repair_count: number | null
          repair_rate: number | null
          test_package_id: string | null
          test_package_name: string | null
          total_welds: number | null
          weld_complete_count: number | null
        }
        Relationships: []
      }
      vw_field_weld_progress_by_welder: {
        Row: {
          accepted_count: number | null
          active_count: number | null
          avg_days_to_acceptance: number | null
          avg_days_to_nde: number | null
          first_pass_acceptance_count: number | null
          first_pass_acceptance_rate: number | null
          nde_fail_count: number | null
          nde_pass_count: number | null
          nde_pass_rate: number | null
          nde_pending_count: number | null
          nde_required_count: number | null
          pct_accepted: number | null
          pct_fitup: number | null
          pct_total: number | null
          pct_weld_complete: number | null
          project_id: string | null
          rejected_count: number | null
          repair_count: number | null
          repair_rate: number | null
          total_welds: number | null
          welder_id: string | null
          welder_name: string | null
          welder_stencil: string | null
          xray_100pct_count: number | null
          xray_100pct_pass_rate: number | null
          xray_10pct_count: number | null
          xray_10pct_pass_rate: number | null
          xray_5pct_count: number | null
          xray_5pct_pass_rate: number | null
          xray_other_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "welders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "welders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_progress"
            referencedColumns: ["project_id"]
          },
        ]
      }
      vw_manhour_progress_by_area: {
        Row: {
          area_id: string | null
          area_name: string | null
          install_mh_budget: number | null
          install_mh_earned: number | null
          mh_budget: number | null
          mh_pct_complete: number | null
          project_id: string | null
          punch_mh_budget: number | null
          punch_mh_earned: number | null
          receive_mh_budget: number | null
          receive_mh_earned: number | null
          restore_mh_budget: number | null
          restore_mh_earned: number | null
          test_mh_budget: number | null
          test_mh_earned: number | null
          total_mh_earned: number | null
        }
        Relationships: [
          {
            foreignKeyName: "areas_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "areas_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_progress"
            referencedColumns: ["project_id"]
          },
        ]
      }
      vw_manhour_progress_by_system: {
        Row: {
          install_mh_budget: number | null
          install_mh_earned: number | null
          mh_budget: number | null
          mh_pct_complete: number | null
          project_id: string | null
          punch_mh_budget: number | null
          punch_mh_earned: number | null
          receive_mh_budget: number | null
          receive_mh_earned: number | null
          restore_mh_budget: number | null
          restore_mh_earned: number | null
          system_id: string | null
          system_name: string | null
          test_mh_budget: number | null
          test_mh_earned: number | null
          total_mh_earned: number | null
        }
        Relationships: [
          {
            foreignKeyName: "systems_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "systems_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_progress"
            referencedColumns: ["project_id"]
          },
        ]
      }
      vw_manhour_progress_by_test_package: {
        Row: {
          install_mh_budget: number | null
          install_mh_earned: number | null
          mh_budget: number | null
          mh_pct_complete: number | null
          project_id: string | null
          punch_mh_budget: number | null
          punch_mh_earned: number | null
          receive_mh_budget: number | null
          receive_mh_earned: number | null
          restore_mh_budget: number | null
          restore_mh_earned: number | null
          test_mh_budget: number | null
          test_mh_earned: number | null
          test_package_id: string | null
          test_package_name: string | null
          total_mh_earned: number | null
        }
        Relationships: [
          {
            foreignKeyName: "test_packages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_packages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_progress"
            referencedColumns: ["project_id"]
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
      vw_project_progress: {
        Row: {
          completed_components: number | null
          has_explicit_budget: boolean | null
          project_id: string | null
          project_name: string | null
          project_pct_complete: number | null
          total_budget: number | null
          total_components: number | null
          total_earned: number | null
        }
        Relationships: []
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
            foreignKeyName: "components_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "vw_project_progress"
            referencedColumns: ["project_id"]
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
      calculate_avg_days_between: {
        Args: { date_end: string; date_start: string }
        Returns: number
      }
      calculate_category_earned_mh: {
        Args: {
          p_budgeted_manhours: number
          p_component_type: string
          p_current_milestones: Json
          p_project_id: string
        }
        Returns: {
          category: string
          category_pct: number
          category_weight: number
          earned_mh: number
        }[]
      }
      calculate_component_earned_mh: {
        Args: { p_budgeted_manhours: number; p_percent_complete: number }
        Returns: number
      }
      calculate_component_percent:
        | {
            Args: {
              p_component_type: string
              p_current_milestones: Json
              p_project_id: string
            }
            Returns: number
          }
        | {
            Args: { p_current_milestones: Json; p_template_id: string }
            Returns: number
          }
      calculate_earned_milestone_value:
        | {
            Args: {
              p_category: string
              p_component_type: string
              p_milestones: Json
              p_project_id?: string
            }
            Returns: number
          }
        | {
            Args: {
              p_component_type: string
              p_milestones: Json
              p_standard_milestone: string
            }
            Returns: number
          }
      calculate_field_weld_delta: {
        Args: {
          p_dimension: string
          p_dimension_id: string
          p_end_date?: string
          p_project_id: string
          p_start_date: string
        }
        Returns: Json
      }
      check_email_has_organization: {
        Args: { check_email: string }
        Returns: boolean
      }
      check_manhour_permission: {
        Args: { p_project_id: string }
        Returns: boolean
      }
      clear_nde_result: {
        Args: { p_field_weld_id: string; p_metadata?: Json; p_user_id: string }
        Returns: Json
      }
      clear_weld_assignment: {
        Args: { p_field_weld_id: string; p_metadata?: Json; p_user_id: string }
        Returns: Json
      }
      clone_system_templates_for_project: {
        Args: { target_project_id: string }
        Returns: number
      }
      create_demo_skeleton: {
        Args: { p_org_id: string; p_project_id: string; p_user_id: string }
        Returns: undefined
      }
      create_field_weld_snapshot: {
        Args: {
          p_dimension: string
          p_project_id: string
          p_snapshot_date?: string
        }
        Returns: number
      }
      create_manhour_budget: {
        Args: {
          p_effective_date?: string
          p_project_id: string
          p_revision_reason: string
          p_total_budgeted_manhours: number
        }
        Returns: Json
      }
      create_test_package: {
        Args: {
          p_description?: string
          p_name: string
          p_project_id: string
          p_requires_coating?: boolean
          p_requires_insulation?: boolean
          p_target_date?: string
          p_test_pressure?: number
          p_test_pressure_unit?: string
          p_test_type?: string
          p_user_id?: string
        }
        Returns: string
      }
      create_unplanned_weld: {
        Args: {
          p_base_metal?: string
          p_drawing_id: string
          p_notes?: string
          p_project_id: string
          p_schedule?: string
          p_spec: string
          p_weld_number: string
          p_weld_size: string
          p_weld_type: string
          p_xray_percentage?: number
        }
        Returns: Json
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
      generate_certificate_number: {
        Args: { p_project_id: string }
        Returns: string
      }
      get_component_template: {
        Args: { p_component_type: string; p_project_id: string }
        Returns: {
          category: string
          is_partial: boolean
          milestone_name: string
          milestone_order: number
          weight: number
        }[]
      }
      get_current_user_email: { Args: never; Returns: string }
      get_current_user_org_id: { Args: never; Returns: string }
      get_field_weld_delta_by_dimension: {
        Args: {
          p_dimension: string
          p_end_date: string
          p_project_id: string
          p_start_date: string
        }
        Returns: {
          delta_accepted_count: number
          delta_fitup_count: number
          delta_pct_total: number
          delta_weld_complete_count: number
          dimension_id: string
          dimension_name: string
          stencil: string
          welds_with_activity: number
        }[]
      }
      get_milestone_weight: {
        Args: {
          p_component_type: string
          p_project_id: string
          p_standard_milestone: string
        }
        Returns: number
      }
      get_most_common_spec_per_drawing: {
        Args: { p_project_id: string }
        Returns: {
          drawing_id: string
          most_common_spec: string
        }[]
      }
      get_progress_delta_by_dimension: {
        Args: {
          p_dimension: string
          p_end_date: string
          p_project_id: string
          p_start_date: string
        }
        Returns: {
          components_with_activity: number
          delta_install_mh_earned: number
          delta_installed: number
          delta_mh_pct_complete: number
          delta_punch: number
          delta_punch_mh_earned: number
          delta_receive_mh_earned: number
          delta_received: number
          delta_restore_mh_earned: number
          delta_restored: number
          delta_test_mh_earned: number
          delta_tested: number
          delta_total: number
          delta_total_mh_earned: number
          dimension_id: string
          dimension_name: string
          install_mh_budget: number
          mh_budget: number
          punch_mh_budget: number
          receive_mh_budget: number
          restore_mh_budget: number
          test_mh_budget: number
        }[]
      }
      get_project_template_summary: {
        Args: { target_project_id: string }
        Returns: Json
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
      get_weld_summary_by_welder: {
        Args: {
          p_area_ids?: string[]
          p_end_date?: string
          p_package_ids?: string[]
          p_project_id: string
          p_start_date?: string
          p_system_ids?: string[]
          p_welder_ids?: string[]
        }
        Returns: {
          bw_nde_100pct: number
          bw_nde_10pct: number
          bw_nde_5pct: number
          bw_nde_comp_100pct: number
          bw_nde_comp_10pct: number
          bw_nde_comp_5pct: number
          bw_reject_100pct: number
          bw_reject_10pct: number
          bw_reject_5pct: number
          bw_reject_rate: number
          bw_welds_100pct: number
          bw_welds_10pct: number
          bw_welds_5pct: number
          nde_total: number
          reject_rate: number
          reject_total: number
          sw_nde_100pct: number
          sw_nde_10pct: number
          sw_nde_5pct: number
          sw_nde_comp_100pct: number
          sw_nde_comp_10pct: number
          sw_nde_comp_5pct: number
          sw_reject_100pct: number
          sw_reject_10pct: number
          sw_reject_5pct: number
          sw_reject_rate: number
          sw_welds_100pct: number
          sw_welds_10pct: number
          sw_welds_5pct: number
          welder_id: string
          welder_name: string
          welder_stencil: string
          welds_total: number
        }[]
      }
      is_super_admin: { Args: never; Returns: boolean }
      normalize_drawing_number: { Args: { raw: string }; Returns: string }
      normalize_milestone_value: { Args: { p_raw: Json }; Returns: number }
      parse_size_diameter: { Args: { p_size: string }; Returns: number }
      recalculate_components_with_template: {
        Args: { target_component_type: string; target_project_id: string }
        Returns: number
      }
      record_nde_result: {
        Args: {
          p_field_weld_id: string
          p_nde_date: string
          p_nde_notes?: string
          p_nde_result: string
          p_nde_type: string
          p_user_id?: string
        }
        Returns: Json
      }
      refresh_materialized_views: { Args: never; Returns: undefined }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      update_component_milestone: {
        Args: {
          p_component_id: string
          p_metadata?: Json
          p_milestone_name: string
          p_new_value: number
          p_user_id: string
        }
        Returns: Json
      }
      update_nde_result: {
        Args: {
          p_field_weld_id: string
          p_nde_date: string
          p_nde_notes?: string
          p_nde_result: string
          p_nde_type: string
          p_user_id?: string
        }
        Returns: Json
      }
      update_project_template_weights: {
        Args: {
          p_apply_to_existing: boolean
          p_component_type: string
          p_last_updated: string
          p_new_weights: Json
          p_project_id: string
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
      update_weld_assignment: {
        Args: {
          p_date_welded: string
          p_field_weld_id: string
          p_user_id: string
          p_welder_id: string
        }
        Returns: Json
      }
      upsert_aggregate_threaded_pipe: {
        Args: {
          p_additional_linear_feet: number
          p_area_id: string
          p_attributes: Json
          p_current_milestones: Json
          p_drawing_id: string
          p_identity_key: Json
          p_new_line_number: string
          p_project_id: string
          p_system_id: string
          p_template_id: string
          p_test_package_id: string
        }
        Returns: {
          component_id: string
          line_numbers: Json
          total_linear_feet: number
          was_created: boolean
        }[]
      }
      validate_component_identity_key: {
        Args: { p_component_type: string; p_identity_key: Json }
        Returns: boolean
      }
      validate_milestone_weights: {
        Args: { p_milestones_config: Json }
        Returns: boolean
      }
      verify_category_mh_sum: {
        Args: {
          p_budgeted_manhours: number
          p_component_type: string
          p_current_milestones: Json
          p_project_id: string
          p_tolerance?: number
        }
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
