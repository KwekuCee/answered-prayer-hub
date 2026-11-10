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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: string | null
          id: string
          target_id: string | null
          target_type: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          id?: string
          target_id?: string | null
          target_type?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          id?: string
          target_id?: string | null
          target_type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bus_points: {
        Row: {
          created_at: string
          departure_time: string | null
          id: string
          location: string
          name: string
          program_id: string | null
        }
        Insert: {
          created_at?: string
          departure_time?: string | null
          id?: string
          location?: string
          name: string
          program_id?: string | null
        }
        Update: {
          created_at?: string
          departure_time?: string | null
          id?: string
          location?: string
          name?: string
          program_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bus_points_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      churches: {
        Row: {
          auth_code: string | null
          confirmed: number
          created_at: string
          delegation_notes: string | null
          id: string
          is_external: boolean | null
          location: string | null
          name: string
          pastor_email: string | null
          pastor_name: string | null
          pastor_phone: string | null
          privacy_mode: string | null
          target: number
          updated_at: string
        }
        Insert: {
          auth_code?: string | null
          confirmed?: number
          created_at?: string
          delegation_notes?: string | null
          id?: string
          is_external?: boolean | null
          location?: string | null
          name: string
          pastor_email?: string | null
          pastor_name?: string | null
          pastor_phone?: string | null
          privacy_mode?: string | null
          target?: number
          updated_at?: string
        }
        Update: {
          auth_code?: string | null
          confirmed?: number
          created_at?: string
          delegation_notes?: string | null
          id?: string
          is_external?: boolean | null
          location?: string | null
          name?: string
          pastor_email?: string | null
          pastor_name?: string | null
          pastor_phone?: string | null
          privacy_mode?: string | null
          target?: number
          updated_at?: string
        }
        Relationships: []
      }
      inviters: {
        Row: {
          church_id: string
          confirmed_count: number
          created_at: string
          email: string
          full_name: string
          id: string
          invite_count: number
          phone: string
        }
        Insert: {
          church_id: string
          confirmed_count?: number
          created_at?: string
          email: string
          full_name: string
          id?: string
          invite_count?: number
          phone: string
        }
        Update: {
          church_id?: string
          confirmed_count?: number
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          invite_count?: number
          phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "inviters_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      live_chats: {
        Row: {
          created_at: string
          id: string
          is_deleted: boolean
          message: string
          user_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_deleted?: boolean
          message: string
          user_name?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_deleted?: boolean
          message?: string
          user_name?: string
        }
        Relationships: []
      }
      live_participants: {
        Row: {
          contact: string | null
          id: string
          joined_at: string
          location: string | null
          name: string | null
          program_id: string | null
          viewer_key: string | null
        }
        Insert: {
          contact?: string | null
          id?: string
          joined_at?: string
          location?: string | null
          name?: string | null
          program_id?: string | null
          viewer_key?: string | null
        }
        Update: {
          contact?: string | null
          id?: string
          joined_at?: string
          location?: string | null
          name?: string | null
          program_id?: string | null
          viewer_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_participants_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      live_presence_events: {
        Row: {
          created_at: string
          event: string
          id: string
          metadata: Json | null
          viewer_key: string | null
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          metadata?: Json | null
          viewer_key?: string | null
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          metadata?: Json | null
          viewer_key?: string | null
        }
        Relationships: []
      }
      live_presence_samples: {
        Row: {
          count: number
          id: string
          recorded_at: string
        }
        Insert: {
          count?: number
          id?: string
          recorded_at?: string
        }
        Update: {
          count?: number
          id?: string
          recorded_at?: string
        }
        Relationships: []
      }
      live_stream_settings: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          url?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      live_stream_watchers: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          last_seen: string
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_seen?: string
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_seen?: string
          session_id?: string
        }
        Relationships: []
      }
      members: {
        Row: {
          category: string | null
          choir_delegation_id: string | null
          church_id: string | null
          confirmed: boolean
          created_at: string
          date_of_birth: string | null
          dignitary_constituency: string | null
          dignitary_office: string | null
          dignitary_title: string | null
          email: string | null
          full_name: string
          id: string
          inviter_id: string | null
          is_privacy_protected: boolean | null
          location: string | null
          masked_identifier: string | null
          occupation: string | null
          phone: string
          program_id: string | null
          vip_tier: string | null
        }
        Insert: {
          category?: string | null
          choir_delegation_id?: string | null
          church_id?: string | null
          confirmed?: boolean
          created_at?: string
          date_of_birth?: string | null
          dignitary_constituency?: string | null
          dignitary_office?: string | null
          dignitary_title?: string | null
          email?: string | null
          full_name: string
          id?: string
          inviter_id?: string | null
          is_privacy_protected?: boolean | null
          location?: string | null
          masked_identifier?: string | null
          occupation?: string | null
          phone: string
          program_id?: string | null
          vip_tier?: string | null
        }
        Update: {
          category?: string | null
          choir_delegation_id?: string | null
          church_id?: string | null
          confirmed?: boolean
          created_at?: string
          date_of_birth?: string | null
          dignitary_constituency?: string | null
          dignitary_office?: string | null
          dignitary_title?: string | null
          email?: string | null
          full_name?: string
          id?: string
          inviter_id?: string | null
          is_privacy_protected?: boolean | null
          location?: string | null
          masked_identifier?: string | null
          occupation?: string | null
          phone?: string
          program_id?: string | null
          vip_tier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "inviters"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          church_id: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          user_id: string
          username: string
        }
        Insert: {
          church_id?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          phone?: string | null
          user_id: string
          username: string
        }
        Update: {
          church_id?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          is_active: boolean
          location_name: string
          map_iframe_url: string | null
          name: string
          start_date: string | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          location_name?: string
          map_iframe_url?: string | null
          name: string
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          location_name?: string
          map_iframe_url?: string | null
          name?: string
          start_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          author_name: string
          church_name: string | null
          content: string
          created_at: string
          id: string
          is_approved: boolean
        }
        Insert: {
          author_name: string
          church_name?: string | null
          content: string
          created_at?: string
          id?: string
          is_approved?: boolean
        }
        Update: {
          author_name?: string
          church_name?: string | null
          content?: string
          created_at?: string
          id?: string
          is_approved?: boolean
        }
        Relationships: []
      }
      special_choirs: {
        Row: {
          choir_name: string
          church_id: string | null
          church_name: string | null
          confirmed_members: number
          created_at: string
          estimated_members: number
          id: string
          instrument_requirements: string | null
          leader_email: string | null
          leader_name: string
          leader_phone: string
          rehearsal_schedule: string | null
          status: string
          updated_at: string
        }
        Insert: {
          choir_name: string
          church_id?: string | null
          church_name?: string | null
          confirmed_members?: number
          created_at?: string
          estimated_members?: number
          id?: string
          instrument_requirements?: string | null
          leader_email?: string | null
          leader_name: string
          leader_phone: string
          rehearsal_schedule?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          choir_name?: string
          church_id?: string | null
          church_name?: string | null
          confirmed_members?: number
          created_at?: string
          estimated_members?: number
          id?: string
          instrument_requirements?: string | null
          leader_email?: string | null
          leader_name?: string
          leader_phone?: string
          rehearsal_schedule?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "special_choirs_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      dignitaries: {
        Row: {
          arrival_window: string | null
          contact_email: string | null
          contact_phone: string
          created_at: string
          full_name: string
          id: string
          member_id: string | null
          office_or_portfolio: string
          organization_or_constituency: string | null
          protocol_officer_name: string | null
          protocol_officer_phone: string | null
          security_detail_count: number
          special_seating_zone: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          arrival_window?: string | null
          contact_email?: string | null
          contact_phone: string
          created_at?: string
          full_name: string
          id?: string
          member_id?: string | null
          office_or_portfolio: string
          organization_or_constituency?: string | null
          protocol_officer_name?: string | null
          protocol_officer_phone?: string | null
          security_detail_count?: number
          special_seating_zone?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          arrival_window?: string | null
          contact_email?: string | null
          contact_phone?: string
          created_at?: string
          full_name?: string
          id?: string
          member_id?: string | null
          office_or_portfolio?: string
          organization_or_constituency?: string | null
          protocol_officer_name?: string | null
          protocol_officer_phone?: string | null
          security_detail_count?: number
          special_seating_zone?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dignitaries_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      delete_admin_user: { Args: { target_user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "church_admin"
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
      app_role: ["super_admin", "church_admin"],
    },
  },
} as const
