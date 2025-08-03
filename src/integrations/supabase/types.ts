export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
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
          cost_per_unit: number | null
          created_at: string | null
          id: string
          product_id: string | null
          product_name: string
          quantity: string
          removal_date: string
          selling_price: number | null
          total_cost_loss: number | null
        }
        Insert: {
          batch_date: string
          cost_per_unit?: number | null
          created_at?: string | null
          id?: string
          product_id?: string | null
          product_name: string
          quantity: string
          removal_date: string
          selling_price?: number | null
          total_cost_loss?: number | null
        }
        Update: {
          batch_date?: string
          cost_per_unit?: number | null
          created_at?: string | null
          id?: string
          product_id?: string | null
          product_name?: string
          quantity?: string
          removal_date?: string
          selling_price?: number | null
          total_cost_loss?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "expired_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredient_transfers: {
        Row: {
          from_cost_per_unit: number
          from_ingredient_id: string | null
          from_stock_id: string | null
          id: string
          notes: string | null
          price_difference: number | null
          quantity_transferred: number
          to_cost_per_unit: number
          to_ingredient_id: string | null
          to_stock_id: string | null
          transfer_date: string
          transfer_type: string
          unit: string
        }
        Insert: {
          from_cost_per_unit: number
          from_ingredient_id?: string | null
          from_stock_id?: string | null
          id?: string
          notes?: string | null
          price_difference?: number | null
          quantity_transferred: number
          to_cost_per_unit: number
          to_ingredient_id?: string | null
          to_stock_id?: string | null
          transfer_date?: string
          transfer_type: string
          unit: string
        }
        Update: {
          from_cost_per_unit?: number
          from_ingredient_id?: string | null
          from_stock_id?: string | null
          id?: string
          notes?: string | null
          price_difference?: number | null
          quantity_transferred?: number
          to_cost_per_unit?: number
          to_ingredient_id?: string | null
          to_stock_id?: string | null
          transfer_date?: string
          transfer_type?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredient_transfers_from_ingredient_id_fkey"
            columns: ["from_ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredient_transfers_from_stock_id_fkey"
            columns: ["from_stock_id"]
            isOneToOne: false
            referencedRelation: "kitchen_stock"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredient_transfers_to_ingredient_id_fkey"
            columns: ["to_ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredient_transfers_to_stock_id_fkey"
            columns: ["to_stock_id"]
            isOneToOne: false
            referencedRelation: "kitchen_stock"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredients: {
        Row: {
          created_at: string | null
          id: string
          name: string
          price_ex_vat: number
          product_id: string | null
          quantity: string
          supplier: string | null
          total_price: number
          unit: string
          vat_amount: number
          weight: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          price_ex_vat?: number
          product_id?: string | null
          quantity: string
          supplier?: string | null
          total_price?: number
          unit?: string
          vat_amount?: number
          weight?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          price_ex_vat?: number
          product_id?: string | null
          quantity?: string
          supplier?: string | null
          total_price?: number
          unit?: string
          vat_amount?: number
          weight?: number
        }
        Relationships: []
      }
      kitchen_stock: {
        Row: {
          cost_per_unit: number
          created_at: string
          id: string
          ingredient_id: string
          ingredient_name: string
          last_updated: string
          pack_size: number
          quantity_on_hand: number
          total_value: number | null
          unit: string
        }
        Insert: {
          cost_per_unit?: number
          created_at?: string
          id?: string
          ingredient_id: string
          ingredient_name: string
          last_updated?: string
          pack_size: number
          quantity_on_hand?: number
          total_value?: number | null
          unit?: string
        }
        Update: {
          cost_per_unit?: number
          created_at?: string
          id?: string
          ingredient_id?: string
          ingredient_name?: string
          last_updated?: string
          pack_size?: number
          quantity_on_hand?: number
          total_value?: number | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "kitchen_stock_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
        ]
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
      product_recipes: {
        Row: {
          created_at: string | null
          id: string
          is_default: boolean | null
          product_id: string
          recipe_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          product_id: string
          recipe_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          product_id?: string
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_recipes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_recipes_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      production_batches: {
        Row: {
          cost_per_unit: number | null
          created_at: string | null
          id: string
          notes: string | null
          product_id: string | null
          production_date: string
          quantity_produced: number
          recipe_id: string | null
          staff_id: string | null
          staff_name: string
          total_ingredient_cost: number | null
        }
        Insert: {
          cost_per_unit?: number | null
          created_at?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          production_date: string
          quantity_produced: number
          recipe_id?: string | null
          staff_id?: string | null
          staff_name: string
          total_ingredient_cost?: number | null
        }
        Update: {
          cost_per_unit?: number | null
          created_at?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          production_date?: string
          quantity_produced?: number
          recipe_id?: string | null
          staff_id?: string | null
          staff_name?: string
          total_ingredient_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "production_batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_batches_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
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
          pack_price: number | null
          pack_size: number | null
          quantity_used: number
          unit: string
        }
        Insert: {
          batch_id?: string | null
          cost_per_unit: number
          created_at?: string | null
          id?: string
          ingredient_name: string
          pack_price?: number | null
          pack_size?: number | null
          quantity_used: number
          unit: string
        }
        Update: {
          batch_id?: string | null
          cost_per_unit?: number
          created_at?: string | null
          id?: string
          ingredient_name?: string
          pack_price?: number | null
          pack_size?: number | null
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
      production_stock_usage: {
        Row: {
          batch_id: string
          cost_per_unit: number
          id: string
          ingredient_name: string
          kitchen_stock_id: string
          quantity_used: number
          total_cost: number | null
          unit: string
          usage_date: string
        }
        Insert: {
          batch_id: string
          cost_per_unit: number
          id?: string
          ingredient_name: string
          kitchen_stock_id: string
          quantity_used: number
          total_cost?: number | null
          unit: string
          usage_date?: string
        }
        Update: {
          batch_id?: string
          cost_per_unit?: number
          id?: string
          ingredient_name?: string
          kitchen_stock_id?: string
          quantity_used?: number
          total_cost?: number | null
          unit?: string
          usage_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_stock_usage_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "production_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_stock_usage_kitchen_stock_id_fkey"
            columns: ["kitchen_stock_id"]
            isOneToOne: false
            referencedRelation: "kitchen_stock"
            referencedColumns: ["id"]
          },
        ]
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
          punctuality: number
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
          punctuality?: number
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
          punctuality?: number
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
          calculated_cost: number | null
          cost_per_unit: number
          created_at: string
          id: string
          ingredient_name: string
          pack_price: number | null
          pack_size: number | null
          pack_unit: string | null
          quantity: number
          quantity_used: number | null
          recipe_id: string
          unit: string
          used_unit: string | null
        }
        Insert: {
          barcode?: string | null
          calculated_cost?: number | null
          cost_per_unit: number
          created_at?: string
          id?: string
          ingredient_name: string
          pack_price?: number | null
          pack_size?: number | null
          pack_unit?: string | null
          quantity: number
          quantity_used?: number | null
          recipe_id: string
          unit?: string
          used_unit?: string | null
        }
        Update: {
          barcode?: string | null
          calculated_cost?: number | null
          cost_per_unit?: number
          created_at?: string
          id?: string
          ingredient_name?: string
          pack_price?: number | null
          pack_size?: number | null
          pack_unit?: string | null
          quantity?: number
          quantity_used?: number | null
          recipe_id?: string
          unit?: string
          used_unit?: string | null
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
