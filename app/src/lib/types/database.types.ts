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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      boards: {
        Row: {
          board_feet: number
          board_feet_per_piece: number
          created_at: string | null
          id: number
          length: number
          name: string
          project_id: number
          quantity: number | null
          species: string | null
          thickness: string
          thickness_inches: number
          width: number
        }
        Insert: {
          board_feet: number
          board_feet_per_piece: number
          created_at?: string | null
          id?: number
          length: number
          name: string
          project_id: number
          quantity?: number | null
          species?: string | null
          thickness: string
          thickness_inches: number
          width: number
        }
        Update: {
          board_feet?: number
          board_feet_per_piece?: number
          created_at?: string | null
          id?: number
          length?: number
          name?: string
          project_id?: number
          quantity?: number | null
          species?: string | null
          thickness?: string
          thickness_inches?: number
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "boards_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_logs: {
        Row: {
          answer: string
          created_at: string | null
          feedback: number | null
          feedback_comment: string | null
          id: number
          question: string
          sources: Json | null
        }
        Insert: {
          answer: string
          created_at?: string | null
          feedback?: number | null
          feedback_comment?: string | null
          id?: never
          question: string
          sources?: Json | null
        }
        Update: {
          answer?: string
          created_at?: string | null
          feedback?: number | null
          feedback_comment?: string | null
          id?: never
          question?: string
          sources?: Json | null
        }
        Relationships: []
      }
      chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string | null
          document_id: number
          embedding: string | null
          id: number
          metadata: Json | null
        }
        Insert: {
          chunk_index?: number
          content: string
          created_at?: string | null
          document_id: number
          embedding?: string | null
          id?: never
          metadata?: Json | null
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string | null
          document_id?: number
          embedding?: string | null
          id?: never
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      consumable_types: {
        Row: {
          category: Database["public"]["Enums"]["consumable_category"]
          created_at: string
          created_by: string | null
          id: string
          name: string
          notes: string | null
          sku: string | null
          updated_at: string
          vendor: string | null
          vendor_url: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["consumable_category"]
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          notes?: string | null
          sku?: string | null
          updated_at?: string
          vendor?: string | null
          vendor_url?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["consumable_category"]
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          notes?: string | null
          sku?: string | null
          updated_at?: string
          vendor?: string | null
          vendor_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consumable_types_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      cut_pieces: {
        Row: {
          created_at: string | null
          id: number
          length: number
          name: string
          project_id: number
          quantity: number | null
          species: string | null
          thickness: string
          width: number
        }
        Insert: {
          created_at?: string | null
          id?: number
          length: number
          name: string
          project_id: number
          quantity?: number | null
          species?: string | null
          thickness: string
          width: number
        }
        Update: {
          created_at?: string | null
          id?: number
          length?: number
          name?: string
          project_id?: number
          quantity?: number | null
          species?: string | null
          thickness?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "cut_pieces_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string | null
          id: number
          metadata: Json | null
          source_id: string
          source_type: Database["public"]["Enums"]["source_type"]
          title: string
          updated_at: string | null
          url: string | null
        }
        Insert: {
          created_at?: string | null
          id?: never
          metadata?: Json | null
          source_id: string
          source_type: Database["public"]["Enums"]["source_type"]
          title: string
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string | null
          id?: never
          metadata?: Json | null
          source_id?: string
          source_type?: Database["public"]["Enums"]["source_type"]
          title?: string
          updated_at?: string | null
          url?: string | null
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          consumable_type_id: string
          created_at: string
          id: string
          last_ordered_at: string | null
          quantity_on_hand: number
          reorder_threshold: number
          updated_at: string
        }
        Insert: {
          consumable_type_id: string
          created_at?: string
          id?: string
          last_ordered_at?: string | null
          quantity_on_hand?: number
          reorder_threshold?: number
          updated_at?: string
        }
        Update: {
          consumable_type_id?: string
          created_at?: string
          id?: string
          last_ordered_at?: string | null
          quantity_on_hand?: number
          reorder_threshold?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_consumable_type_id_fkey"
            columns: ["consumable_type_id"]
            isOneToOne: true
            referencedRelation: "consumable_types"
            referencedColumns: ["id"]
          },
        ]
      }
      issues: {
        Row: {
          created_at: string
          description: string | null
          id: string
          photo_urls: string[]
          reported_by: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: Database["public"]["Enums"]["issue_severity"]
          status: Database["public"]["Enums"]["issue_status"]
          title: string
          tool_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          photo_urls?: string[]
          reported_by?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: Database["public"]["Enums"]["issue_severity"]
          status?: Database["public"]["Enums"]["issue_status"]
          title: string
          tool_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          photo_urls?: string[]
          reported_by?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["issue_severity"]
          status?: Database["public"]["Enums"]["issue_status"]
          title?: string
          tool_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "issues_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_tasks: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          id: string
          interval_days: number | null
          last_performed_at: string | null
          notes: string | null
          tool_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          interval_days?: number | null
          last_performed_at?: string | null
          notes?: string | null
          tool_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          interval_days?: number | null
          last_performed_at?: string | null
          notes?: string | null
          tool_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tasks_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string
          id: string
          payload: Json
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          id?: string
          payload?: Json
          type: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          id?: string
          payload?: Json
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: [
          {
            foreignKeyName: "notifications_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string | null
          cut_plan: Json | null
          description: string | null
          id: number
          name: string
          quantity: number | null
          sheet_cut_plan: Json | null
          updated_at: string | null
          user_id: string
          workflow: string | null
        }
        Insert: {
          created_at?: string | null
          cut_plan?: Json | null
          description?: string | null
          id?: number
          name: string
          quantity?: number | null
          sheet_cut_plan?: Json | null
          updated_at?: string | null
          user_id: string
          workflow?: string | null
        }
        Update: {
          created_at?: string | null
          cut_plan?: Json | null
          description?: string | null
          id?: number
          name?: string
          quantity?: number | null
          sheet_cut_plan?: Json | null
          updated_at?: string | null
          user_id?: string
          workflow?: string | null
        }
        Relationships: []
      }
      repair_consumables: {
        Row: {
          consumable_type_id: string
          created_at: string
          id: string
          quantity_used: number
          repair_id: string
        }
        Insert: {
          consumable_type_id: string
          created_at?: string
          id?: string
          quantity_used: number
          repair_id: string
        }
        Update: {
          consumable_type_id?: string
          created_at?: string
          id?: string
          quantity_used?: number
          repair_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "repair_consumables_consumable_type_id_fkey"
            columns: ["consumable_type_id"]
            isOneToOne: false
            referencedRelation: "consumable_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_consumables_repair_id_fkey"
            columns: ["repair_id"]
            isOneToOne: false
            referencedRelation: "repairs"
            referencedColumns: ["id"]
          },
        ]
      }
      repairs: {
        Row: {
          created_at: string
          description: string
          id: string
          issue_id: string | null
          labor_minutes: number | null
          notes: string | null
          performed_by: string | null
          tool_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          issue_id?: string | null
          labor_minutes?: number | null
          notes?: string | null
          performed_by?: string | null
          tool_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          issue_id?: string | null
          labor_minutes?: number | null
          notes?: string | null
          performed_by?: string | null
          tool_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "repairs_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repairs_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repairs_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
        ]
      }
      sheet_cut_pieces: {
        Row: {
          created_at: string | null
          grain_direction: string | null
          id: number
          length: number
          name: string
          product_type: string
          project_id: number
          quantity: number | null
          thickness: string
          width: number
        }
        Insert: {
          created_at?: string | null
          grain_direction?: string | null
          id?: number
          length: number
          name: string
          product_type: string
          project_id: number
          quantity?: number | null
          thickness: string
          width: number
        }
        Update: {
          created_at?: string | null
          grain_direction?: string | null
          id?: number
          length?: number
          name?: string
          product_type?: string
          project_id?: number
          quantity?: number | null
          thickness?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "sheet_cut_pieces_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      sheet_goods: {
        Row: {
          created_at: string | null
          id: number
          length: number
          name: string
          price_per_sheet: number | null
          product_type: string
          project_id: number
          quantity: number | null
          thickness: string
          width: number
        }
        Insert: {
          created_at?: string | null
          id?: number
          length: number
          name: string
          price_per_sheet?: number | null
          product_type: string
          project_id: number
          quantity?: number | null
          thickness: string
          width: number
        }
        Update: {
          created_at?: string | null
          id?: number
          length?: number
          name?: string
          price_per_sheet?: number | null
          product_type?: string
          project_id?: number
          quantity?: number | null
          thickness?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "sheet_goods_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          active: boolean
          created_at: string
          display_name: string
          id: string
          role: Database["public"]["Enums"]["staff_role"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_name: string
          id: string
          role?: Database["public"]["Enums"]["staff_role"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          display_name?: string
          id?: string
          role?: Database["public"]["Enums"]["staff_role"]
          updated_at?: string
        }
        Relationships: []
      }
      tool_consumables: {
        Row: {
          consumable_type_id: string
          created_at: string
          id: string
          notes: string | null
          tool_id: string
        }
        Insert: {
          consumable_type_id: string
          created_at?: string
          id?: string
          notes?: string | null
          tool_id: string
        }
        Update: {
          consumable_type_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          tool_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_consumables_consumable_type_id_fkey"
            columns: ["consumable_type_id"]
            isOneToOne: false
            referencedRelation: "consumable_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_consumables_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
        ]
      }
      tools: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          location: string | null
          manual_url: string | null
          manufacturer: string | null
          model: string | null
          name: string
          notes: string | null
          photo_url: string | null
          purchase_date: string | null
          serial: string | null
          slug: string
          status: Database["public"]["Enums"]["tool_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          location?: string | null
          manual_url?: string | null
          manufacturer?: string | null
          model?: string | null
          name: string
          notes?: string | null
          photo_url?: string | null
          purchase_date?: string | null
          serial?: string | null
          slug: string
          status?: Database["public"]["Enums"]["tool_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          location?: string | null
          manual_url?: string | null
          manufacturer?: string | null
          model?: string | null
          name?: string
          notes?: string | null
          photo_url?: string | null
          purchase_date?: string | null
          serial?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["tool_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tools_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          address: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string | null
          phone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      woodworking_plans: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          skill_level: string | null
          source_site: string | null
          source_url: string
          title: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          skill_level?: string | null
          source_site?: string | null
          source_url: string
          title: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          skill_level?: string | null
          source_site?: string | null
          source_url?: string
          title?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_staff_role: {
        Args: never
        Returns: Database["public"]["Enums"]["staff_role"]
      }
      match_chunks: {
        Args: {
          filter_source_types?: Database["public"]["Enums"]["source_type"][]
          match_count?: number
          query_embedding: string
          similarity_threshold?: number
        }
        Returns: {
          chunk_content: string
          chunk_id: number
          chunk_metadata: Json
          document_metadata: Json
          document_source_type: Database["public"]["Enums"]["source_type"]
          document_title: string
          document_url: string
          similarity: number
        }[]
      }
    }
    Enums: {
      consumable_category:
        | "blade"
        | "bearing"
        | "belt"
        | "throat_plate"
        | "filter"
        | "brush"
        | "other"
        | "vacuum_bag"
      issue_severity: "minor" | "needs_attention" | "down"
      issue_status: "open" | "resolved"
      notification_type: "reorder_needed" | "tool_down"
      source_type:
        | "betterdocs_article"
        | "betterdocs_faq"
        | "pdf_manual"
        | "class_doc"
        | "discord"
        | "email"
        | "blog_post"
        | "operator_note"
      staff_role: "owner" | "shop_master" | "instructor" | "staff"
      tool_status: "active" | "down" | "retired"
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
      consumable_category: [
        "blade",
        "bearing",
        "belt",
        "throat_plate",
        "filter",
        "brush",
        "other",
        "vacuum_bag",
      ],
      issue_severity: ["minor", "needs_attention", "down"],
      issue_status: ["open", "resolved"],
      notification_type: ["reorder_needed", "tool_down"],
      source_type: [
        "betterdocs_article",
        "betterdocs_faq",
        "pdf_manual",
        "class_doc",
        "discord",
        "email",
        "blog_post",
        "operator_note",
      ],
      staff_role: ["owner", "shop_master", "instructor", "staff"],
      tool_status: ["active", "down", "retired"],
    },
  },
} as const
