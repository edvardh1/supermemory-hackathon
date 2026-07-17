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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      application_events: {
        Row: {
          application_id: string
          created_at: string
          detail: Json | null
          event_type: string
          id: number
        }
        Insert: {
          application_id: string
          created_at?: string
          detail?: Json | null
          event_type: string
          id?: never
        }
        Update: {
          application_id?: string
          created_at?: string
          detail?: Json | null
          event_type?: string
          id?: never
        }
        Relationships: [
          {
            foreignKeyName: "application_events_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          answers: Json | null
          confirmation_ref: string | null
          cover_letter_path: string | null
          created_at: string
          error: string | null
          id: string
          job_id: string
          profile_id: string
          resume_path: string | null
          status: Database["public"]["Enums"]["application_status"]
          submitted_at: string | null
          updated_at: string
          verification: Json | null
        }
        Insert: {
          answers?: Json | null
          confirmation_ref?: string | null
          cover_letter_path?: string | null
          created_at?: string
          error?: string | null
          id?: string
          job_id: string
          profile_id: string
          resume_path?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string | null
          updated_at?: string
          verification?: Json | null
        }
        Update: {
          answers?: Json | null
          confirmation_ref?: string | null
          cover_letter_path?: string | null
          created_at?: string
          error?: string | null
          id?: string
          job_id?: string
          profile_id?: string
          resume_path?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string | null
          updated_at?: string
          verification?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          ats_identifier: string | null
          ats_platform: Database["public"]["Enums"]["ats_platform"]
          created_at: string
          id: string
          logo_url: string | null
          name: string
          updated_at: string
          website: string | null
        }
        Insert: {
          ats_identifier?: string | null
          ats_platform?: Database["public"]["Enums"]["ats_platform"]
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          ats_identifier?: string | null
          ats_platform?: Database["public"]["Enums"]["ats_platform"]
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      job_preferences: {
        Row: {
          created_at: string
          employment_types: string[] | null
          excluded_keywords: string[] | null
          id: string
          is_active: boolean
          keywords: string[] | null
          locations: string[] | null
          min_salary: number | null
          profile_id: string
          remote_only: boolean
          titles: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          employment_types?: string[] | null
          excluded_keywords?: string[] | null
          id?: string
          is_active?: boolean
          keywords?: string[] | null
          locations?: string[] | null
          min_salary?: number | null
          profile_id: string
          remote_only?: boolean
          titles?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          employment_types?: string[] | null
          excluded_keywords?: string[] | null
          id?: string
          is_active?: boolean
          keywords?: string[] | null
          locations?: string[] | null
          min_salary?: number | null
          profile_id?: string
          remote_only?: boolean
          titles?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          category: string | null
          closed_at: string | null
          company_id: string
          compensation_raw: string | null
          created_at: string
          department: string | null
          description_md: string | null
          employment_type: string | null
          external_id: string
          first_seen_at: string
          id: string
          is_remote: boolean | null
          last_seen_at: string
          location: string | null
          platform: Database["public"]["Enums"]["ats_platform"]
          posted_at: string | null
          raw: Json | null
          salary_currency: string | null
          salary_max: number | null
          salary_min: number | null
          status: Database["public"]["Enums"]["job_status"]
          team: string | null
          title: string
          updated_at: string
          url: string
          workplace_type: Database["public"]["Enums"]["workplace_type"]
        }
        Insert: {
          category?: string | null
          closed_at?: string | null
          company_id: string
          compensation_raw?: string | null
          created_at?: string
          department?: string | null
          description_md?: string | null
          employment_type?: string | null
          external_id: string
          first_seen_at?: string
          id?: string
          is_remote?: boolean | null
          last_seen_at?: string
          location?: string | null
          platform: Database["public"]["Enums"]["ats_platform"]
          posted_at?: string | null
          raw?: Json | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          status?: Database["public"]["Enums"]["job_status"]
          team?: string | null
          title: string
          updated_at?: string
          url: string
          workplace_type?: Database["public"]["Enums"]["workplace_type"]
        }
        Update: {
          category?: string | null
          closed_at?: string | null
          company_id?: string
          compensation_raw?: string | null
          created_at?: string
          department?: string | null
          description_md?: string | null
          employment_type?: string | null
          external_id?: string
          first_seen_at?: string
          id?: string
          is_remote?: boolean | null
          last_seen_at?: string
          location?: string | null
          platform?: Database["public"]["Enums"]["ats_platform"]
          posted_at?: string | null
          raw?: Json | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          status?: Database["public"]["Enums"]["job_status"]
          team?: string | null
          title?: string
          updated_at?: string
          url?: string
          workplace_type?: Database["public"]["Enums"]["workplace_type"]
        }
        Relationships: [
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          application_id: string | null
          body: string | null
          created_at: string
          id: string
          profile_id: string
          read_at: string | null
          title: string
          type: string
        }
        Insert: {
          action_url?: string | null
          application_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          profile_id: string
          read_at?: string | null
          title: string
          type?: string
        }
        Update: {
          action_url?: string | null
          application_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          profile_id?: string
          read_at?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          application_mode: string
          city: string | null
          country: string | null
          created_at: string
          default_answers: Json | null
          email: string | null
          full_name: string | null
          github_url: string | null
          id: string
          linkedin_url: string | null
          location: string | null
          phone: string | null
          portfolio_url: string | null
          postal_code: string | null
          resume_path: string | null
          updated_at: string
          work_authorization: Json | null
        }
        Insert: {
          address?: string | null
          application_mode?: string
          city?: string | null
          country?: string | null
          created_at?: string
          default_answers?: Json | null
          email?: string | null
          full_name?: string | null
          github_url?: string | null
          id: string
          linkedin_url?: string | null
          location?: string | null
          phone?: string | null
          portfolio_url?: string | null
          postal_code?: string | null
          resume_path?: string | null
          updated_at?: string
          work_authorization?: Json | null
        }
        Update: {
          address?: string | null
          application_mode?: string
          city?: string | null
          country?: string | null
          created_at?: string
          default_answers?: Json | null
          email?: string | null
          full_name?: string | null
          github_url?: string | null
          id?: string
          linkedin_url?: string | null
          location?: string | null
          phone?: string | null
          portfolio_url?: string | null
          postal_code?: string | null
          resume_path?: string | null
          updated_at?: string
          work_authorization?: Json | null
        }
        Relationships: []
      }
      resume_data: {
        Row: {
          certifications: Json | null
          created_at: string
          education: Json | null
          experience: Json | null
          headline: string | null
          id: string
          languages: Json | null
          links: Json | null
          parse_error: string | null
          parse_status: string
          parsed_at: string | null
          profile_id: string
          projects: Json | null
          raw: Json | null
          skills: Json | null
          source_resume_path: string | null
          summary: string | null
          updated_at: string
          years_experience: number | null
        }
        Insert: {
          certifications?: Json | null
          created_at?: string
          education?: Json | null
          experience?: Json | null
          headline?: string | null
          id?: string
          languages?: Json | null
          links?: Json | null
          parse_error?: string | null
          parse_status?: string
          parsed_at?: string | null
          profile_id: string
          projects?: Json | null
          raw?: Json | null
          skills?: Json | null
          source_resume_path?: string | null
          summary?: string | null
          updated_at?: string
          years_experience?: number | null
        }
        Update: {
          certifications?: Json | null
          created_at?: string
          education?: Json | null
          experience?: Json | null
          headline?: string | null
          id?: string
          languages?: Json | null
          links?: Json | null
          parse_error?: string | null
          parse_status?: string
          parsed_at?: string | null
          profile_id?: string
          projects?: Json | null
          raw?: Json | null
          skills?: Json | null
          source_resume_path?: string | null
          summary?: string | null
          updated_at?: string
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "resume_data_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scrape_runs: {
        Row: {
          company_id: string | null
          error: string | null
          finished_at: string | null
          id: string
          jobs_closed: number | null
          jobs_created: number | null
          jobs_found: number | null
          jobs_updated: number | null
          platform: Database["public"]["Enums"]["ats_platform"]
          started_at: string
          status: Database["public"]["Enums"]["scrape_run_status"]
        }
        Insert: {
          company_id?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          jobs_closed?: number | null
          jobs_created?: number | null
          jobs_found?: number | null
          jobs_updated?: number | null
          platform: Database["public"]["Enums"]["ats_platform"]
          started_at?: string
          status?: Database["public"]["Enums"]["scrape_run_status"]
        }
        Update: {
          company_id?: string | null
          error?: string | null
          finished_at?: string | null
          id?: string
          jobs_closed?: number | null
          jobs_created?: number | null
          jobs_found?: number | null
          jobs_updated?: number | null
          platform?: Database["public"]["Enums"]["ats_platform"]
          started_at?: string
          status?: Database["public"]["Enums"]["scrape_run_status"]
        }
        Relationships: [
          {
            foreignKeyName: "scrape_runs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      application_status:
        | "draft"
        | "queued"
        | "in_progress"
        | "submitted"
        | "failed"
        | "needs_review"
        | "withdrawn"
      ats_platform:
        | "ashby"
        | "greenhouse"
        | "lever"
        | "workable"
        | "smartrecruiters"
        | "workday"
        | "other"
      job_status: "open" | "closed" | "filled" | "unknown"
      scrape_run_status: "running" | "succeeded" | "failed"
      workplace_type: "remote" | "hybrid" | "on_site" | "unspecified"
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
      application_status: [
        "draft",
        "queued",
        "in_progress",
        "submitted",
        "failed",
        "needs_review",
        "withdrawn",
      ],
      ats_platform: [
        "ashby",
        "greenhouse",
        "lever",
        "workable",
        "smartrecruiters",
        "workday",
        "other",
      ],
      job_status: ["open", "closed", "filled", "unknown"],
      scrape_run_status: ["running", "succeeded", "failed"],
      workplace_type: ["remote", "hybrid", "on_site", "unspecified"],
    },
  },
} as const
