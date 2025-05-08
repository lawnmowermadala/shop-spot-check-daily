export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      areas: {
        Row: {
          created_at: string
          description: string
          id: string
          name: string
          photo: string | null
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          name: string
          photo?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          name?: string
          photo?: string | null
        }
        Relationships: []
      }
      assignments: {
        Row: {
          area: string
          assignee_id: number
          assignee_name: string
          created_at: string | null
          id: string
          instructions: string | null
          photo_url: string | null
          status: string
        }
        Insert: {
          area: string
          assignee_id: number
          assignee_name: string
          created_at?: string | null
          id?: string
          instructions?: string | null
          photo_url?: string | null
          status: string
        }
        Update: {
          area?: string
          assignee_id?: number
          assignee_name?: string
          created_at?: string | null
          id?: string
          instructions?: string | null
          photo_url?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      expired_items: {
        Row: {
          batch_date: string
          created_at: string | null
          id: string
          product_name: string
          quantity: string
          removal_date: string
        }
        Insert: {
          batch_date: string
          created_at?: string | null
          id?: string
          product_name: string
          quantity: string
          removal_date: string
        }
        Update: {
          batch_date?: string
          created_at?: string | null
          id?: string
          product_name?: string
          quantity?: string
          removal_date?: string
        }
        Relationships: []
      }
      ingredients: {
        Row: {
          created_at: string | null
          id: string
          name: string
          product_id: string | null
          quantity: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          product_id?: string | null
          quantity: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          product_id?: string | null
          quantity?: string
        }
        Relationships: []
      }
      pos_users: {
        Row: {
          active: boolean | null
          created_at: string | null
          created_by: string | null
          id: string
          password: string
          qr_code: string | null
          role: string
          username: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          password: string
          qr_code?: string | null
          role: string
          username: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          password?: string
          qr_code?: string | null
          role?: string
          username?: string
        }
        Relationships: []
      }
      production_batches: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          product_id: string | null
          production_date: string
          quantity_produced: number
          staff_id: string | null
          staff_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          production_date: string
          quantity_produced: number
          staff_id?: string | null
          staff_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          production_date?: string
          quantity_produced?: number
          staff_id?: string | null
          staff_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      production_cost_batches: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          production_date: string
          quantity_produced: number
          recipe_id: string
          staff_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          production_date: string
          quantity_produced: number
          recipe_id: string
          staff_name: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          production_date?: string
          quantity_produced?: number
          recipe_id?: string
          staff_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_cost_batches_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      production_ingredient_usage: {
        Row: {
          cost_per_unit: number
          created_at: string
          id: string
          ingredient_name: string
          production_id: string
          quantity_used: number
          unit: string
        }
        Insert: {
          cost_per_unit: number
          created_at?: string
          id?: string
          ingredient_name: string
          production_id: string
          quantity_used: number
          unit: string
        }
        Update: {
          cost_per_unit?: number
          created_at?: string
          id?: string
          ingredient_name?: string
          production_id?: string
          quantity_used?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_ingredient_usage_production_id_fkey"
            columns: ["production_id"]
            isOneToOne: false
            referencedRelation: "production_cost_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      production_ingredients: {
        Row: {
          batch_id: string | null
          cost_per_unit: number
          created_at: string | null
          id: string
          ingredient_name: string
          quantity_used: number
          unit: string
        }
        Insert: {
          batch_id?: string | null
          cost_per_unit: number
          created_at?: string | null
          id?: string
          ingredient_name: string
          quantity_used: number
          unit: string
        }
        Update: {
          batch_id?: string | null
          cost_per_unit?: number
          created_at?: string | null
          id?: string
          ingredient_name?: string
          quantity_used?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_ingredients_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "production_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      production_logs: {
        Row: {
          created_at: string | null
          id: string
          product_id: string | null
          product_name: string
          production_date: string
          quantity: number
          staff_id: string
          staff_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id?: string | null
          product_name: string
          production_date: string
          quantity: number
          staff_id: string
          staff_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string | null
          product_name?: string
          production_date?: string
          quantity?: number
          staff_id?: string
          staff_name?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          code: string
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      ratings: {
        Row: {
          comment: string | null
          created_at: string
          customer_service: number
          id: number
          job_performance: number
          overall: number
          product_knowledge: number
          rating_date: string
          staff_id: string
          staff_name: string
          teamwork: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_service: number
          id?: never
          job_performance: number
          overall: number
          product_knowledge: number
          rating_date?: string
          staff_id: string
          staff_name: string
          teamwork: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_service?: number
          id?: never
          job_performance?: number
          overall?: number
          product_knowledge?: number
          rating_date?: string
          staff_id?: string
          staff_name?: string
          teamwork?: number
        }
        Relationships: []
      }
      recipe_ingredients: {
        Row: {
          barcode: string | null
          cost_per_unit: number
          created_at: string
          id: string
          ingredient_name: string
          quantity: number
          recipe_id: string
          unit: string
        }
        Insert: {
          barcode?: string | null
          cost_per_unit: number
          created_at?: string
          id?: string
          ingredient_name: string
          quantity: number
          recipe_id: string
          unit?: string
        }
        Update: {
          barcode?: string | null
          cost_per_unit?: number
          created_at?: string
          id?: string
          ingredient_name?: string
          quantity?: number
          recipe_id?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          batch_size: number
          created_at: string
          description: string | null
          id: string
          name: string
          unit: string
        }
        Insert: {
          batch_size: number
          created_at?: string
          description?: string | null
          id?: string
          name: string
          unit?: string
        }
        Update: {
          batch_size?: number
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          unit?: string
        }
        Relationships: []
      }
      staff: {
        Row: {
          created_at: string | null
          department_id: number | null
          email: string | null
          id: number
          name: string
          new_id: string | null
        }
        Insert: {
          created_at?: string | null
          department_id?: number | null
          email?: string | null
          id?: number
          name: string
          new_id?: string | null
        }
        Update: {
          created_at?: string | null
          department_id?: number | null
          email?: string | null
          id?: number
          name?: string
          new_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_members: {
        Row: {
          created_at: string
          department: string | null
          id: string
          name: string
          position: string | null
        }
        Insert: {
          created_at?: string
          department?: string | null
          id?: string
          name: string
          position?: string | null
        }
        Update: {
          created_at?: string
          department?: string | null
          id?: string
          name?: string
          position?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
