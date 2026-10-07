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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      game_rounds: {
        Row: {
          closed_at: string | null
          closes_at: string | null
          created_at: string
          decision_window_minutes: number
          id: string
          opens_at: string | null
          period_label: string
          round_number: number
          scenario_summary: string
          scenario_title: string
          session_id: string
          status: Database["public"]["Enums"]["round_status"]
        }
        Insert: {
          closed_at?: string | null
          closes_at?: string | null
          created_at?: string
          decision_window_minutes?: number
          id?: string
          opens_at?: string | null
          period_label: string
          round_number: number
          scenario_summary: string
          scenario_title: string
          session_id: string
          status?: Database["public"]["Enums"]["round_status"]
        }
        Update: {
          closed_at?: string | null
          closes_at?: string | null
          created_at?: string
          decision_window_minutes?: number
          id?: string
          opens_at?: string | null
          period_label?: string
          round_number?: number
          scenario_summary?: string
          scenario_title?: string
          session_id?: string
          status?: Database["public"]["Enums"]["round_status"]
        }
        Relationships: [
          {
            foreignKeyName: "game_rounds_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      game_sessions: {
        Row: {
          academic_year: string | null
          ai_submission_form_url: string | null
          code: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          is_test: boolean
          model_version: string
          registration_locked_at: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["session_status"]
          title: string
          updated_at: string
        }
        Insert: {
          academic_year?: string | null
          ai_submission_form_url?: string | null
          code: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_test?: boolean
          model_version?: string
          registration_locked_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          title: string
          updated_at?: string
        }
        Update: {
          academic_year?: string | null
          ai_submission_form_url?: string | null
          code?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_test?: boolean
          model_version?: string
          registration_locked_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      session_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          event_type: string
          id: number
          payload: Json
          session_id: string
          team_id: string | null
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          event_type: string
          id?: never
          payload?: Json
          session_id: string
          team_id?: string | null
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          event_type?: string
          id?: never
          payload?: Json
          session_id?: string
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      session_materials: {
        Row: {
          created_at: string
          description: string | null
          file_type: string
          id: string
          required: boolean
          session_id: string
          sort_order: number
          source_url: string | null
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_type: string
          id?: string
          required?: boolean
          session_id: string
          sort_order: number
          source_url?: string | null
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          file_type?: string
          id?: string
          required?: boolean
          session_id?: string
          sort_order?: number
          source_url?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_materials_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_members: {
        Row: {
          joined_at: string
          role: Database["public"]["Enums"]["app_role"]
          session_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          session_id: string
          user_id: string
        }
        Update: {
          joined_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_members_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_authorizations: {
        Row: {
          authorized_at: string
          authorized_by: string
          claimed_at: string | null
          claimed_by: string | null
          email: string
          id: string
          revoked_at: string | null
          revoked_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          session_id: string
        }
        Insert: {
          authorized_at?: string
          authorized_by: string
          claimed_at?: string | null
          claimed_by?: string | null
          email: string
          id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          role: Database["public"]["Enums"]["app_role"]
          session_id: string
        }
        Update: {
          authorized_at?: string
          authorized_by?: string
          claimed_at?: string | null
          claimed_by?: string | null
          email?: string
          id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_authorizations_authorized_by_fkey"
            columns: ["authorized_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_authorizations_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_authorizations_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_authorizations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      team_ai_submissions: {
        Row: {
          confirmed_cleaned: boolean
          external_reference_url: string | null
          id: string
          provider: string
          session_id: string
          status: Database["public"]["Enums"]["ai_submission_status"]
          submitted_at: string
          submitted_by: string
          team_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          confirmed_cleaned?: boolean
          external_reference_url?: string | null
          id?: string
          provider: string
          session_id: string
          status?: Database["public"]["Enums"]["ai_submission_status"]
          submitted_at?: string
          submitted_by: string
          team_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          confirmed_cleaned?: boolean
          external_reference_url?: string | null
          id?: string
          provider?: string
          session_id?: string
          status?: Database["public"]["Enums"]["ai_submission_status"]
          submitted_at?: string
          submitted_by?: string
          team_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_ai_submissions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_ai_submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_ai_submissions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_ai_submissions_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_final_scores: {
        Row: {
          calculated_at: string
          competitive_position: number
          cumulative_ufcf: number
          enterprise_value: number
          final_ebitda_margin: number
          final_game_value: number
          final_net_debt: number
          final_premium_share: number
          final_revenue: number
          full_game_result: Json
          id: string
          implied_equity_value: number
          model_version: string
          pv_explicit_ufcf: number
          pv_terminal_value: number
          risk_penalty: number
          session_id: string
          strategic_health: number
          team_id: string
        }
        Insert: {
          calculated_at?: string
          competitive_position: number
          cumulative_ufcf: number
          enterprise_value: number
          final_ebitda_margin: number
          final_game_value: number
          final_net_debt: number
          final_premium_share: number
          final_revenue: number
          full_game_result: Json
          id?: string
          implied_equity_value: number
          model_version: string
          pv_explicit_ufcf: number
          pv_terminal_value: number
          risk_penalty: number
          session_id: string
          strategic_health: number
          team_id: string
        }
        Update: {
          calculated_at?: string
          competitive_position?: number
          cumulative_ufcf?: number
          enterprise_value?: number
          final_ebitda_margin?: number
          final_game_value?: number
          final_net_debt?: number
          final_premium_share?: number
          final_revenue?: number
          full_game_result?: Json
          id?: string
          implied_equity_value?: number
          model_version?: string
          pv_explicit_ufcf?: number
          pv_terminal_value?: number
          risk_penalty?: number
          session_id?: string
          strategic_health?: number
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_final_scores_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_final_scores_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          joined_at: string
          team_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          team_id: string
          user_id: string
        }
        Update: {
          joined_at?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_round_decisions: {
        Row: {
          capex_pct: number
          connected_rnd_allocation: number
          created_at: string
          hv_price_change: number
          id: string
          inventory_days: number
          marketing_change: number
          natural_rubber_hedge: number
          objective: Database["public"]["Enums"]["round_objective"]
          receivable_days: number
          rnd_pct: number
          round_id: string
          status: Database["public"]["Enums"]["decision_status"]
          std_price_change: number
          submitted_at: string | null
          submitted_by: string | null
          team_id: string
          updated_at: string
        }
        Insert: {
          capex_pct: number
          connected_rnd_allocation: number
          created_at?: string
          hv_price_change: number
          id?: string
          inventory_days: number
          marketing_change: number
          natural_rubber_hedge: number
          objective: Database["public"]["Enums"]["round_objective"]
          receivable_days: number
          rnd_pct: number
          round_id: string
          status?: Database["public"]["Enums"]["decision_status"]
          std_price_change: number
          submitted_at?: string | null
          submitted_by?: string | null
          team_id: string
          updated_at?: string
        }
        Update: {
          capex_pct?: number
          connected_rnd_allocation?: number
          created_at?: string
          hv_price_change?: number
          id?: string
          inventory_days?: number
          marketing_change?: number
          natural_rubber_hedge?: number
          objective?: Database["public"]["Enums"]["round_objective"]
          receivable_days?: number
          rnd_pct?: number
          round_id?: string
          status?: Database["public"]["Enums"]["decision_status"]
          std_price_change?: number
          submitted_at?: string | null
          submitted_by?: string | null
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_round_decisions_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "game_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_round_decisions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_round_decisions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_round_results: {
        Row: {
          adjusted_ebitda_margin: number
          calculated_at: string
          id: string
          model_version: string
          net_debt: number
          premium_revenue_share: number
          result: Json
          round_id: string
          strategic_health: number
          team_id: string
          total_revenue: number
          unlevered_free_cash_flow: number
        }
        Insert: {
          adjusted_ebitda_margin: number
          calculated_at?: string
          id?: string
          model_version: string
          net_debt: number
          premium_revenue_share: number
          result: Json
          round_id: string
          strategic_health: number
          team_id: string
          total_revenue: number
          unlevered_free_cash_flow: number
        }
        Update: {
          adjusted_ebitda_margin?: number
          calculated_at?: string
          id?: string
          model_version?: string
          net_debt?: number
          premium_revenue_share?: number
          result?: Json
          round_id?: string
          strategic_health?: number
          team_id?: string
          total_revenue?: number
          unlevered_free_cash_flow?: number
        }
        Relationships: [
          {
            foreignKeyName: "team_round_results_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "game_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_round_results_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          created_by: string
          id: string
          join_code: string
          name: string
          session_id: string
          status: Database["public"]["Enums"]["team_status"]
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          join_code: string
          name: string
          session_id: string
          status?: Database["public"]["Enums"]["team_status"]
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          join_code?: string
          name?: string
          session_id?: string
          status?: Database["public"]["Enums"]["team_status"]
        }
        Relationships: [
          {
            foreignKeyName: "teams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_archive_session: {
        Args: { p_session_id: string }
        Returns: Database["public"]["Enums"]["session_status"]
      }
      admin_authorize_staff: {
        Args: {
          p_email: string
          p_role: Database["public"]["Enums"]["app_role"]
          p_session_id: string
        }
        Returns: string
      }
      admin_create_session: {
        Args: {
          p_academic_year: string
          p_code: string
          p_is_test: boolean
          p_model_version: string
          p_title: string
        }
        Returns: string
      }
      admin_duplicate_session: {
        Args: { p_code: string; p_source_session_id: string; p_title: string }
        Returns: string
      }
      admin_revoke_staff: {
        Args: { p_authorization_id: string }
        Returns: undefined
      }
      complete_google_session_join: {
        Args: { p_session_code: string }
        Returns: {
          assigned_role: Database["public"]["Enums"]["app_role"]
          session_id: string
        }[]
      }
      create_team: {
        Args: { p_name: string }
        Returns: {
          join_code: string
          team_id: string
        }[]
      }
      join_team: { Args: { p_code: string }; Returns: string }
      leave_team: { Args: { p_team_id: string }; Returns: undefined }
      session_team_count: { Args: { p_session_id: string }; Returns: number }
      student_final_benchmark: {
        Args: { p_session_id: string }
        Returns: {
          median_final_game_value: number
          own_rank: number
          total_teams: number
        }[]
      }
      submit_ai_evidence: {
        Args: {
          p_confirmed_cleaned: boolean
          p_external_reference_url?: string
          p_provider: string
        }
        Returns: string
      }
      submit_team_round_decision: {
        Args: { p_round_id: string }
        Returns: Database["public"]["Enums"]["decision_status"]
      }
      teacher_extend_round: {
        Args: { p_minutes?: number; p_round_id: string }
        Returns: string
      }
      teacher_finalize_round: {
        Args: { p_final_scores?: Json; p_results: Json; p_round_id: string }
        Returns: Database["public"]["Enums"]["round_status"]
      }
      teacher_open_round: {
        Args: { p_round_id: string; p_window_minutes?: number }
        Returns: Database["public"]["Enums"]["round_status"]
      }
      teacher_restart_simulation: {
        Args: { p_session_id: string }
        Returns: Database["public"]["Enums"]["session_status"]
      }
      teacher_session_counts: {
        Args: { p_session_id: string }
        Returns: {
          confirmed_team_count: number
          registered_students: number
          team_count: number
          unassigned_students: number
        }[]
      }
      teacher_set_ai_submission_form_url: {
        Args: { p_session_id: string; p_url: string }
        Returns: string
      }
      teacher_set_session_status: {
        Args: {
          p_session_id: string
          p_status: Database["public"]["Enums"]["session_status"]
        }
        Returns: Database["public"]["Enums"]["session_status"]
      }
      teacher_set_team_status: {
        Args: {
          p_status: Database["public"]["Enums"]["team_status"]
          p_team_id: string
        }
        Returns: Database["public"]["Enums"]["team_status"]
      }
      teacher_verify_ai_evidence: {
        Args: { p_team_id: string }
        Returns: Database["public"]["Enums"]["ai_submission_status"]
      }
      validate_registration_access: {
        Args: { p_code: string; p_email: string }
        Returns: boolean
      }
    }
    Enums: {
      ai_submission_status: "submitted" | "verified"
      app_role: "student" | "teacher" | "admin"
      decision_status: "draft" | "submitted"
      round_objective:
        | "crescita"
        | "margine"
        | "cassa"
        | "resilienza"
        | "innovazione"
      round_status: "scheduled" | "open" | "closed"
      session_status:
        | "draft"
        | "registration_open"
        | "locked"
        | "live"
        | "completed"
        | "archived"
      team_status: "forming" | "confirmed" | "active" | "completed"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      ai_submission_status: ["submitted", "verified"],
      app_role: ["student", "teacher", "admin"],
      decision_status: ["draft", "submitted"],
      round_objective: [
        "crescita",
        "margine",
        "cassa",
        "resilienza",
        "innovazione",
      ],
      round_status: ["scheduled", "open", "closed"],
      session_status: [
        "draft",
        "registration_open",
        "locked",
        "live",
        "completed",
        "archived",
      ],
      team_status: ["forming", "confirmed", "active", "completed"],
    },
  },
} as const
