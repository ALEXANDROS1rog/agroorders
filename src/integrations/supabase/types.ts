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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
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
          {
            foreignKeyName: "ai_transcriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
          phone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
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
          {
            foreignKeyName: "deliveries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
          route_date?: string
          tolls?: number
          total_expenses?: number | null
          total_order_value?: number
          updated_at?: string
          user_id?: string
          wear?: number
        }
        Relationships: [
          {
            foreignKeyName: "delivery_routes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
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
            foreignKeyName: "order_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
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
            foreignKeyName: "orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      organization_activity: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          id: string
          organization_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          organization_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_activity_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          organization_id: string
          role: string
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id: string
          role: string
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          organization_id: string
          plan_id: string
          status: string
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          organization_id: string
          plan_id: string
          status?: string
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          organization_id?: string
          plan_id?: string
          status?: string
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          stripe_customer_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          owner_id: string
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          available: boolean
          category: string
          created_at: string
          id: string
          name: string
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
          price?: number
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_organization_id: string | null
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
          active_organization_id?: string | null
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
          active_organization_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "profiles_active_organization_id_fkey"
            columns: ["active_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission: string
          role: string
        }
        Insert: {
          permission: string
          role: string
        }
        Update: {
          permission?: string
          role?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          active: boolean
          billing_interval: string
          created_at: string
          currency: string
          features: Json
          id: string
          max_users: number
          name: string
          price: number
          slug: string
          sort_order: number
          stripe_price_id: string | null
        }
        Insert: {
          active?: boolean
          billing_interval?: string
          created_at?: string
          currency?: string
          features?: Json
          id?: string
          max_users: number
          name: string
          price: number
          slug: string
          sort_order?: number
          stripe_price_id?: string | null
        }
        Update: {
          active?: boolean
          billing_interval?: string
          created_at?: string
          currency?: string
          features?: Json
          id?: string
          max_users?: number
          name?: string
          price?: number
          slug?: string
          sort_order?: number
          stripe_price_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation: { Args: { _token: string }; Returns: string }
      change_member_role: {
        Args: { _member: string; _role: string }
        Returns: undefined
      }
      current_org: { Args: never; Returns: string }
      get_invitation: {
        Args: { _token: string }
        Returns: {
          email: string
          expired: boolean
          organization_name: string
          role: string
          status: string
        }[]
      }
      has_org_permission: {
        Args: { _org: string; _perm: string }
        Returns: boolean
      }
      is_org_member: { Args: { _org: string }; Returns: boolean }
      my_invitations: {
        Args: never
        Returns: {
          organization_name: string
          role: string
          token: string
        }[]
      }
      my_org_context: {
        Args: never
        Returns: {
          active_users: number
          features: Json
          max_users: number
          organization_id: string
          organization_name: string
          pending_invites: number
          permissions: string[]
          plan_name: string
          plan_slug: string
          role: string
          subscription_status: string
        }[]
      }
      org_has_feature: {
        Args: { _feature: string; _org: string }
        Returns: boolean
      }
      org_max_users: { Args: { _org: string }; Returns: number }
      org_members_list: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          member_id: string
          role: string
          status: string
          user_id: string
        }[]
      }
      org_role: { Args: { _org: string }; Returns: string }
      org_seats_used: { Args: { _org: string }; Returns: number }
      purge_old_history: { Args: never; Returns: undefined }
      recalc_route_value: { Args: { _route: string }; Returns: undefined }
      remove_member: { Args: { _member: string }; Returns: undefined }
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
