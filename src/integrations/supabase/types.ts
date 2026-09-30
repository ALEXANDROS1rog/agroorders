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
      ai_transcriptions: {
        Row: {
          created_at: string
          extracted: Json | null
          id: string
          order_id: string | null
          raw_text: string
          source: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          extracted?: Json | null
          id?: string
          order_id?: string | null
          raw_text: string
          source?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          extracted?: Json | null
          id?: string
          order_id?: string | null
          raw_text?: string
          source?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_transcriptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string
          created_at: string
          full_name: string
          id: string
          latitude: number | null
          longitude: number | null
          notes: string
          phone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string
          created_at?: string
          full_name: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string
          phone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          created_at?: string
          full_name?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string
          phone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      deliveries: {
        Row: {
          auto_confirmed: boolean
          created_at: string
          delivered_at: string | null
          delivered_lat: number | null
          delivered_lng: number | null
          id: string
          order_id: string
          route_position: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_confirmed?: boolean
          created_at?: string
          delivered_at?: string | null
          delivered_lat?: number | null
          delivered_lng?: number | null
          id?: string
          order_id: string
          route_position?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_confirmed?: boolean
          created_at?: string
          delivered_at?: string | null
          delivered_lat?: number | null
          delivered_lng?: number | null
          id?: string
          order_id?: string
          route_position?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_routes: {
        Row: {
          created_at: string
          food: number
          fuel: number
          id: string
          net_route_value: number | null
          route_date: string
          tolls: number
          total_expenses: number | null
          total_order_value: number
          updated_at: string
          user_id: string
          wear: number
        }
        Insert: {
          created_at?: string
          food?: number
          fuel?: number
          id?: string
          net_route_value?: number | null
          route_date: string
          tolls?: number
          total_expenses?: number | null
          total_order_value?: number
          updated_at?: string
          user_id: string
          wear?: number
        }
        Update: {
          created_at?: string
          food?: number
          fuel?: number
          id?: string
          net_route_value?: number | null
          route_date?: string
          tolls?: number
          total_expenses?: number | null
          total_order_value?: number
          updated_at?: string
          user_id?: string
          wear?: number
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          unit: string
          unit_price: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          unit?: string
          unit_price?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          unit?: string
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string
          created_at: string
          customer_id: string | null
          id: string
          notes: string
          order_date: string
          order_number: number
          phone: string
          route_id: string | null
          source: string
          status: string
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string
          created_at?: string
          customer_id?: string | null
          id?: string
          notes?: string
          order_date?: string
          order_number?: number
          phone?: string
          route_id?: string | null
          source?: string
          status?: string
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          created_at?: string
          customer_id?: string | null
          id?: string
          notes?: string
          order_date?: string
          order_number?: number
          phone?: string
          route_id?: string | null
          source?: string
          status?: string
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "delivery_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          available: boolean
          category: string
          created_at: string
          id: string
          name: string
          price: number
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          available?: boolean
          category?: string
          created_at?: string
          id?: string
          name: string
          price?: number
          unit?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          available?: boolean
          category?: string
          created_at?: string
          id?: string
          name?: string
          price?: number
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          business_name: string
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string
          preferred_language: string
          updated_at: string
        }
        Insert: {
          business_name?: string
          created_at?: string
          email?: string
          first_name?: string
          id: string
          last_name?: string
          phone?: string
          preferred_language?: string
          updated_at?: string
        }
        Update: {
          business_name?: string
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string
          preferred_language?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      purge_old_history: { Args: never; Returns: undefined }
      recalc_route_value: { Args: { _route: string }; Returns: undefined }
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
    Enums: {},
  },
} as const
