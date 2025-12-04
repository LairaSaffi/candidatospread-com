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
      candidates: {
        Row: {
          created_at: string
          cv_url: string | null
          hr_interview_notes: string | null
          id: string
          job_id: string
          name: string
          status: string
          technical_test_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          cv_url?: string | null
          hr_interview_notes?: string | null
          id?: string
          job_id: string
          name: string
          status?: string
          technical_test_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          cv_url?: string | null
          hr_interview_notes?: string | null
          id?: string
          job_id?: string
          name?: string
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
          client: string | null
          commercial_responsible: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          recruiter_responsible: string | null
          responsible_manager: string | null
          spread_manager: string | null
          status: string
          title: string
          updated_at: string
          work_model: string | null
        }
        Insert: {
          client?: string | null
          commercial_responsible?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          recruiter_responsible?: string | null
          responsible_manager?: string | null
          spread_manager?: string | null
          status?: string
          title: string
          updated_at?: string
          work_model?: string | null
        }
        Update: {
          client?: string | null
          commercial_responsible?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          recruiter_responsible?: string | null
          responsible_manager?: string | null
          spread_manager?: string | null
          status?: string
          title?: string
          updated_at?: string
          work_model?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_view_evaluation: { Args: { p_link_id: string }; Returns: boolean }
      get_evaluation_link_by_token: {
        Args: { p_token: string }
        Returns: {
          created_at: string
          evaluator_token: string
          id: string
          job_id: string
        }[]
      }
      validate_evaluation_access: {
        Args: { p_candidate_id: string; p_link_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
