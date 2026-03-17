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
  public: {
    Tables: {
      candidate_evaluations: {
        Row: {
          candidate_id: string
          created_at: string
          decision: string | null
          evaluated_at: string | null
          evaluated_by_user_id: string | null
          id: string
          interview_schedule_options: string | null
          job_evaluation_link_id: string
          justification: string | null
        }
        Insert: {
          candidate_id: string
          created_at?: string
          decision?: string | null
          evaluated_at?: string | null
          evaluated_by_user_id?: string | null
          id?: string
          interview_schedule_options?: string | null
          job_evaluation_link_id: string
          justification?: string | null
        }
        Update: {
          candidate_id?: string
          created_at?: string
          decision?: string | null
          evaluated_at?: string | null
          evaluated_by_user_id?: string | null
          id?: string
          interview_schedule_options?: string | null
          job_evaluation_link_id?: string
          justification?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_evaluations_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_evaluations_job_evaluation_link_id_fkey"
            columns: ["job_evaluation_link_id"]
            isOneToOne: false
            referencedRelation: "job_evaluation_links"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_jobs: {
        Row: {
          candidate_id: string
          created_at: string
          id: string
          job_id: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          id?: string
          job_id: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          id?: string
          job_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_jobs_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_share_links: {
        Row: {
          candidate_id: string
          created_at: string
          created_by: string | null
          id: string
          share_token: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          share_token?: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          share_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_share_links_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_tags: {
        Row: {
          candidate_id: string
          created_at: string
          id: string
          tag_id: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          id?: string
          tag_id: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_tags_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          candidate_type: string | null
          created_at: string
          cv_url: string | null
          hr_interview_notes: string | null
          id: string
          internal_status: string | null
          job_id: string | null
          name: string
          position: string | null
          salary_expectation: string | null
          seniority: string | null
          status: string
          technical_test_url: string | null
          updated_at: string
        }
        Insert: {
          candidate_type?: string | null
          created_at?: string
          cv_url?: string | null
          hr_interview_notes?: string | null
          id?: string
          internal_status?: string | null
          job_id?: string | null
          name: string
          position?: string | null
          salary_expectation?: string | null
          seniority?: string | null
          status?: string
          technical_test_url?: string | null
          updated_at?: string
        }
        Update: {
          candidate_type?: string | null
          created_at?: string
          cv_url?: string | null
          hr_interview_notes?: string | null
          id?: string
          internal_status?: string | null
          job_id?: string | null
          name?: string
          position?: string | null
          salary_expectation?: string | null
          seniority?: string | null
          status?: string
          technical_test_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidates_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      hunter_candidate_tags: {
        Row: {
          created_at: string
          hunter_candidate_id: string
          id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          hunter_candidate_id: string
          id?: string
          tag_id: string
        }
        Update: {
          created_at?: string
          hunter_candidate_id?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hunter_candidate_tags_hunter_candidate_id_fkey"
            columns: ["hunter_candidate_id"]
            isOneToOne: false
            referencedRelation: "hunter_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hunter_candidate_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      hunter_candidates: {
        Row: {
          adherent: boolean | null
          adherent_notes: string | null
          candidate_type: string | null
          created_at: string
          cv_url: string | null
          hiring_model: string | null
          hr_notes: string | null
          hunter_email: string | null
          hunter_link_id: string
          hunter_name: string | null
          id: string
          name: string
          position: string | null
          salary_expectation: string | null
          seniority: string | null
          spread_cv_url: string | null
        }
        Insert: {
          adherent?: boolean | null
          adherent_notes?: string | null
          candidate_type?: string | null
          created_at?: string
          cv_url?: string | null
          hiring_model?: string | null
          hr_notes?: string | null
          hunter_email?: string | null
          hunter_link_id: string
          hunter_name?: string | null
          id?: string
          name: string
          position?: string | null
          salary_expectation?: string | null
          seniority?: string | null
          spread_cv_url?: string | null
        }
        Update: {
          adherent?: boolean | null
          adherent_notes?: string | null
          candidate_type?: string | null
          created_at?: string
          cv_url?: string | null
          hiring_model?: string | null
          hr_notes?: string | null
          hunter_email?: string | null
          hunter_link_id?: string
          hunter_name?: string | null
          id?: string
          name?: string
          position?: string | null
          salary_expectation?: string | null
          seniority?: string | null
          spread_cv_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hunter_candidates_hunter_link_id_fkey"
            columns: ["hunter_link_id"]
            isOneToOne: false
            referencedRelation: "hunter_links"
            referencedColumns: ["id"]
          },
        ]
      }
      hunter_links: {
        Row: {
          created_at: string
          created_by: string | null
          hunter_token: string
          id: string
          job_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          hunter_token?: string
          id?: string
          job_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          hunter_token?: string
          id?: string
          job_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hunter_links_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_evaluation_links: {
        Row: {
          created_at: string
          evaluator_token: string
          id: string
          job_id: string
        }
        Insert: {
          created_at?: string
          evaluator_token?: string
          id?: string
          job_id: string
        }
        Update: {
          created_at?: string
          evaluator_token?: string
          id?: string
          job_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_evaluation_links_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          budget: string | null
          client: string | null
          commercial_responsible_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          hiring_model: string | null
          id: string
          recruiter_responsible_id: string | null
          responsible_manager: string | null
          spread_manager_id: string | null
          status: string
          title: string
          updated_at: string
          work_model: string | null
        }
        Insert: {
          budget?: string | null
          client?: string | null
          commercial_responsible_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          hiring_model?: string | null
          id?: string
          recruiter_responsible_id?: string | null
          responsible_manager?: string | null
          spread_manager_id?: string | null
          status?: string
          title: string
          updated_at?: string
          work_model?: string | null
        }
        Update: {
          budget?: string | null
          client?: string | null
          commercial_responsible_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          hiring_model?: string | null
          id?: string
          recruiter_responsible_id?: string | null
          responsible_manager?: string | null
          spread_manager_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          work_model?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_commercial_responsible_id_fkey"
            columns: ["commercial_responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_recruiter_responsible_id_fkey"
            columns: ["recruiter_responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_spread_manager_id_fkey"
            columns: ["spread_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          metadata: Json | null
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          must_change_password: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          is_active?: boolean
          must_change_password?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          must_change_password?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      talent_share_candidates: {
        Row: {
          candidate_id: string
          created_at: string
          id: string
          talent_share_link_id: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          id?: string
          talent_share_link_id: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          id?: string
          talent_share_link_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "talent_share_candidates_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_share_candidates_talent_share_link_id_fkey"
            columns: ["talent_share_link_id"]
            isOneToOne: false
            referencedRelation: "talent_share_links"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_share_links: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          share_token: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          share_token?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          share_token?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_view_evaluation: { Args: { p_link_id: string }; Returns: boolean }
      get_candidate_by_share_token: { Args: { p_token: string }; Returns: Json }
      get_evaluation_data_by_token: { Args: { p_token: string }; Returns: Json }
      get_evaluation_link_by_token: {
        Args: { p_token: string }
        Returns: {
          created_at: string
          evaluator_token: string
          id: string
          job_id: string
        }[]
      }
      get_hunter_form_data: { Args: { p_token: string }; Returns: Json }
      get_my_roles: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      get_talents_by_share_token: { Args: { p_token: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_candidate_owner: { Args: { p_candidate_id: string }; Returns: boolean }
      is_job_owner: { Args: { p_job_id: string }; Returns: boolean }
      validate_evaluation_access: {
        Args: { p_candidate_id: string; p_link_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "comercial" | "gestao_operacao" | "visualizacao_geral"
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
  public: {
    Enums: {
      app_role: ["admin", "comercial", "gestao_operacao", "visualizacao_geral"],
    },
  },
} as const
