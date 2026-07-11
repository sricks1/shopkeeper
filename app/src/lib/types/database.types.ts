export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      boards: {
        Row: {
          board_feet: number;
          board_feet_per_piece: number;
          created_at: string | null;
          id: number;
          length: number;
          name: string;
          project_id: number;
          quantity: number | null;
          species: string | null;
          thickness: string;
          thickness_inches: number;
          width: number;
        };
        Insert: {
          board_feet: number;
          board_feet_per_piece: number;
          created_at?: string | null;
          id?: number;
          length: number;
          name: string;
          project_id: number;
          quantity?: number | null;
          species?: string | null;
          thickness: string;
          thickness_inches: number;
          width: number;
        };
        Update: {
          board_feet?: number;
          board_feet_per_piece?: number;
          created_at?: string | null;
          id?: number;
          length?: number;
          name?: string;
          project_id?: number;
          quantity?: number | null;
          species?: string | null;
          thickness?: string;
          thickness_inches?: number;
          width?: number;
        };
        Relationships: [
          {
            foreignKeyName: "boards_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_logs: {
        Row: {
          answer: string;
          created_at: string | null;
          feedback: number | null;
          feedback_comment: string | null;
          id: number;
          question: string;
          sources: Json | null;
        };
        Insert: {
          answer: string;
          created_at?: string | null;
          feedback?: number | null;
          feedback_comment?: string | null;
          id?: never;
          question: string;
          sources?: Json | null;
        };
        Update: {
          answer?: string;
          created_at?: string | null;
          feedback?: number | null;
          feedback_comment?: string | null;
          id?: never;
          question?: string;
          sources?: Json | null;
        };
        Relationships: [];
      };
      chunks: {
        Row: {
          chunk_index: number;
          content: string;
          created_at: string | null;
          document_id: number;
          embedding: string | null;
          id: number;
          metadata: Json | null;
        };
        Insert: {
          chunk_index?: number;
          content: string;
          created_at?: string | null;
          document_id: number;
          embedding?: string | null;
          id?: never;
          metadata?: Json | null;
        };
        Update: {
          chunk_index?: number;
          content?: string;
          created_at?: string | null;
          document_id?: number;
          embedding?: string | null;
          id?: never;
          metadata?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "chunks_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
        ];
      };
      consumable_categories: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          label: string;
          value: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          label: string;
          value: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          label?: string;
          value?: string;
        };
        Relationships: [
          {
            foreignKeyName: "consumable_categories_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      consumable_types: {
        Row: {
          category: string;
          created_at: string;
          created_by: string | null;
          id: string;
          name: string;
          notes: string | null;
          sku: string | null;
          updated_at: string;
          vendor: string | null;
          vendor_url: string | null;
        };
        Insert: {
          category: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          sku?: string | null;
          updated_at?: string;
          vendor?: string | null;
          vendor_url?: string | null;
        };
        Update: {
          category?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          sku?: string | null;
          updated_at?: string;
          vendor?: string | null;
          vendor_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "consumable_types_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      folder_items: {
        Row: {
          created_at: string;
          folder_id: string;
          id: string;
          sort_order: number;
          task_id: string;
        };
        Insert: {
          created_at?: string;
          folder_id: string;
          id?: string;
          sort_order?: number;
          task_id: string;
        };
        Update: {
          created_at?: string;
          folder_id?: string;
          id?: string;
          sort_order?: number;
          task_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "folder_items_folder_id_fkey";
            columns: ["folder_id"];
            isOneToOne: false;
            referencedRelation: "folders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "folder_items_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "staff_tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      folders: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          parent_id: string | null;
          sort_order: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          parent_id?: string | null;
          sort_order?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          parent_id?: string | null;
          sort_order?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "folders_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "folders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "folders_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      hot_tasks: {
        Row: {
          created_at: string;
          task_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          task_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          task_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "hot_tasks_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "staff_tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hot_tasks_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory_items: {
        Row: {
          consumable_type_id: string;
          created_at: string;
          id: string;
          last_ordered_at: string | null;
          stock_status: Database["public"]["Enums"]["stock_status"];
          updated_at: string;
        };
        Insert: {
          consumable_type_id: string;
          created_at?: string;
          id?: string;
          last_ordered_at?: string | null;
          stock_status?: Database["public"]["Enums"]["stock_status"];
          updated_at?: string;
        };
        Update: {
          consumable_type_id?: string;
          created_at?: string;
          id?: string;
          last_ordered_at?: string | null;
          stock_status?: Database["public"]["Enums"]["stock_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_items_consumable_type_id_fkey";
            columns: ["consumable_type_id"];
            isOneToOne: true;
            referencedRelation: "consumable_types";
            referencedColumns: ["id"];
          },
        ];
      };
      issues: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          photo_urls: string[];
          reported_by: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          severity: Database["public"]["Enums"]["issue_severity"];
          status: Database["public"]["Enums"]["issue_status"];
          title: string;
          tool_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          photo_urls?: string[];
          reported_by?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          severity: Database["public"]["Enums"]["issue_severity"];
          status?: Database["public"]["Enums"]["issue_status"];
          title: string;
          tool_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          photo_urls?: string[];
          reported_by?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          severity?: Database["public"]["Enums"]["issue_severity"];
          status?: Database["public"]["Enums"]["issue_status"];
          title?: string;
          tool_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "issues_reported_by_fkey";
            columns: ["reported_by"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "issues_resolved_by_fkey";
            columns: ["resolved_by"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "issues_tool_id_fkey";
            columns: ["tool_id"];
            isOneToOne: false;
            referencedRelation: "tools";
            referencedColumns: ["id"];
          },
        ];
      };
      maintenance_tasks: {
        Row: {
          created_at: string;
          created_by: string | null;
          description: string;
          id: string;
          interval_days: number | null;
          last_performed_at: string | null;
          notes: string | null;
          tool_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          description: string;
          id?: string;
          interval_days?: number | null;
          last_performed_at?: string | null;
          notes?: string | null;
          tool_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          description?: string;
          id?: string;
          interval_days?: number | null;
          last_performed_at?: string | null;
          notes?: string | null;
          tool_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "maintenance_tasks_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "maintenance_tasks_tool_id_fkey";
            columns: ["tool_id"];
            isOneToOne: false;
            referencedRelation: "tools";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          acknowledged_at: string | null;
          acknowledged_by: string | null;
          created_at: string;
          id: string;
          payload: Json;
          recipient_id: string | null;
          type: Database["public"]["Enums"]["notification_type"];
        };
        Insert: {
          acknowledged_at?: string | null;
          acknowledged_by?: string | null;
          created_at?: string;
          id?: string;
          payload?: Json;
          recipient_id?: string | null;
          type: Database["public"]["Enums"]["notification_type"];
        };
        Update: {
          acknowledged_at?: string | null;
          acknowledged_by?: string | null;
          created_at?: string;
          id?: string;
          payload?: Json;
          recipient_id?: string | null;
          type?: Database["public"]["Enums"]["notification_type"];
        };
        Relationships: [
          {
            foreignKeyName: "notifications_acknowledged_by_fkey";
            columns: ["acknowledged_by"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey";
            columns: ["recipient_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      repair_consumables: {
        Row: {
          consumable_type_id: string;
          created_at: string;
          id: string;
          quantity_used: number;
          repair_id: string;
        };
        Insert: {
          consumable_type_id: string;
          created_at?: string;
          id?: string;
          quantity_used: number;
          repair_id: string;
        };
        Update: {
          consumable_type_id?: string;
          created_at?: string;
          id?: string;
          quantity_used?: number;
          repair_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "repair_consumables_consumable_type_id_fkey";
            columns: ["consumable_type_id"];
            isOneToOne: false;
            referencedRelation: "consumable_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "repair_consumables_repair_id_fkey";
            columns: ["repair_id"];
            isOneToOne: false;
            referencedRelation: "repairs";
            referencedColumns: ["id"];
          },
        ];
      };
      repairs: {
        Row: {
          created_at: string;
          description: string;
          id: string;
          issue_id: string | null;
          labor_minutes: number | null;
          notes: string | null;
          performed_by: string | null;
          tool_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description: string;
          id?: string;
          issue_id?: string | null;
          labor_minutes?: number | null;
          notes?: string | null;
          performed_by?: string | null;
          tool_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          id?: string;
          issue_id?: string | null;
          labor_minutes?: number | null;
          notes?: string | null;
          performed_by?: string | null;
          tool_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "repairs_issue_id_fkey";
            columns: ["issue_id"];
            isOneToOne: false;
            referencedRelation: "issues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "repairs_performed_by_fkey";
            columns: ["performed_by"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "repairs_tool_id_fkey";
            columns: ["tool_id"];
            isOneToOne: false;
            referencedRelation: "tools";
            referencedColumns: ["id"];
          },
        ];
      };
      staff: {
        Row: {
          active: boolean;
          created_at: string;
          display_name: string;
          id: string;
          role: Database["public"]["Enums"]["staff_role"];
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          display_name: string;
          id: string;
          role?: Database["public"]["Enums"]["staff_role"];
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          display_name?: string;
          id?: string;
          role?: Database["public"]["Enums"]["staff_role"];
          updated_at?: string;
        };
        Relationships: [];
      };
      staff_tasks: {
        Row: {
          assigned_to: string | null;
          consumable_type_id: string | null;
          created_at: string;
          created_by: string | null;
          date_needed: string | null;
          id: string;
          is_order: boolean;
          name: string;
          notes: string | null;
          priority: Database["public"]["Enums"]["task_priority"];
          scope: Database["public"]["Enums"]["task_scope"];
          status: Database["public"]["Enums"]["task_status"];
          updated_at: string;
        };
        Insert: {
          assigned_to?: string | null;
          consumable_type_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          date_needed?: string | null;
          id?: string;
          is_order?: boolean;
          name: string;
          notes?: string | null;
          priority?: Database["public"]["Enums"]["task_priority"];
          scope?: Database["public"]["Enums"]["task_scope"];
          status?: Database["public"]["Enums"]["task_status"];
          updated_at?: string;
        };
        Update: {
          assigned_to?: string | null;
          consumable_type_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          date_needed?: string | null;
          id?: string;
          is_order?: boolean;
          name?: string;
          notes?: string | null;
          priority?: Database["public"]["Enums"]["task_priority"];
          scope?: Database["public"]["Enums"]["task_scope"];
          status?: Database["public"]["Enums"]["task_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_tasks_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_tasks_consumable_type_id_fkey";
            columns: ["consumable_type_id"];
            isOneToOne: false;
            referencedRelation: "consumable_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_tasks_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      tags: {
        Row: {
          color: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          color?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          color?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tags_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      task_comments: {
        Row: {
          author_id: string | null;
          body: string;
          created_at: string;
          id: string;
          task_id: string;
        };
        Insert: {
          author_id?: string | null;
          body: string;
          created_at?: string;
          id?: string;
          task_id: string;
        };
        Update: {
          author_id?: string | null;
          body?: string;
          created_at?: string;
          id?: string;
          task_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "task_comments_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_comments_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "staff_tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      task_tags: {
        Row: {
          created_at: string;
          tag_id: string;
          task_id: string;
        };
        Insert: {
          created_at?: string;
          tag_id: string;
          task_id: string;
        };
        Update: {
          created_at?: string;
          tag_id?: string;
          task_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "task_tags_tag_id_fkey";
            columns: ["tag_id"];
            isOneToOne: false;
            referencedRelation: "tags";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_tags_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "staff_tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      tool_consumables: {
        Row: {
          consumable_type_id: string;
          created_at: string;
          id: string;
          notes: string | null;
          tool_id: string;
        };
        Insert: {
          consumable_type_id: string;
          created_at?: string;
          id?: string;
          notes?: string | null;
          tool_id: string;
        };
        Update: {
          consumable_type_id?: string;
          created_at?: string;
          id?: string;
          notes?: string | null;
          tool_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tool_consumables_consumable_type_id_fkey";
            columns: ["consumable_type_id"];
            isOneToOne: false;
            referencedRelation: "consumable_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tool_consumables_tool_id_fkey";
            columns: ["tool_id"];
            isOneToOne: false;
            referencedRelation: "tools";
            referencedColumns: ["id"];
          },
        ];
      };
      tools: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          location: string | null;
          manual_url: string | null;
          manufacturer: string | null;
          model: string | null;
          name: string;
          notes: string | null;
          photo_url: string | null;
          purchase_date: string | null;
          serial: string | null;
          slug: string;
          status: Database["public"]["Enums"]["tool_status"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          location?: string | null;
          manual_url?: string | null;
          manufacturer?: string | null;
          model?: string | null;
          name: string;
          notes?: string | null;
          photo_url?: string | null;
          purchase_date?: string | null;
          serial?: string | null;
          slug: string;
          status?: Database["public"]["Enums"]["tool_status"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          location?: string | null;
          manual_url?: string | null;
          manufacturer?: string | null;
          model?: string | null;
          name?: string;
          notes?: string | null;
          photo_url?: string | null;
          purchase_date?: string | null;
          serial?: string | null;
          slug?: string;
          status?: Database["public"]["Enums"]["tool_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tools_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      current_staff_role: {
        Args: never;
        Returns: Database["public"]["Enums"]["staff_role"];
      };
    };
    Enums: {
      consumable_category:
        | "blade"
        | "bearing"
        | "belt"
        | "throat_plate"
        | "filter"
        | "brush"
        | "other"
        | "vacuum_bag";
      issue_severity: "minor" | "needs_attention" | "down";
      issue_status: "open" | "resolved";
      notification_type: "reorder_needed" | "tool_down" | "task_assigned" | "task_comment";
      staff_role: "owner" | "shop_master" | "instructor" | "staff";
      stock_status: "in_stock" | "on_order";
      task_priority: "low" | "normal" | "high";
      task_scope: "team" | "personal";
      task_status: "new" | "todo" | "in_progress" | "done" | "deferred";
      tool_status: "active" | "down" | "retired";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
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
      notification_type: ["reorder_needed", "tool_down", "task_assigned", "task_comment"],
      staff_role: ["owner", "shop_master", "instructor", "staff"],
      stock_status: ["in_stock", "on_order"],
      task_priority: ["low", "normal", "high"],
      task_scope: ["team", "personal"],
      task_status: ["new", "todo", "in_progress", "done", "deferred"],
      tool_status: ["active", "down", "retired"],
    },
  },
} as const;
