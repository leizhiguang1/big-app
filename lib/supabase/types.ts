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
      customers: {
        Row: {
          address1: string | null
          address2: string | null
          allergies: string | null
          city: string | null
          code: string
          consultant_id: string
          country_of_origin: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          external_code: string | null
          first_name: string
          gender: string | null
          home_outlet_id: string
          id: string
          id_number: string | null
          id_type: string
          is_vip: boolean
          join_date: string
          last_name: string | null
          opt_in_marketing: boolean
          opt_in_notifications: boolean
          phone: string
          phone2: string | null
          postcode: string | null
          profile_image_url: string | null
          salutation: string
          source: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          address1?: string | null
          address2?: string | null
          allergies?: string | null
          city?: string | null
          code?: string
          consultant_id: string
          country_of_origin?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          external_code?: string | null
          first_name: string
          gender?: string | null
          home_outlet_id: string
          id?: string
          id_number?: string | null
          id_type?: string
          is_vip?: boolean
          join_date?: string
          last_name?: string | null
          opt_in_marketing?: boolean
          opt_in_notifications?: boolean
          phone: string
          phone2?: string | null
          postcode?: string | null
          profile_image_url?: string | null
          salutation: string
          source?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          address1?: string | null
          address2?: string | null
          allergies?: string | null
          city?: string | null
          code?: string
          consultant_id?: string
          country_of_origin?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          external_code?: string | null
          first_name?: string
          gender?: string | null
          home_outlet_id?: string
          id?: string
          id_number?: string | null
          id_type?: string
          is_vip?: boolean
          join_date?: string
          last_name?: string | null
          opt_in_marketing?: boolean
          opt_in_notifications?: boolean
          phone?: string
          phone2?: string | null
          postcode?: string | null
          profile_image_url?: string | null
          salutation?: string
          source?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_home_outlet_id_fkey"
            columns: ["home_outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_outlets: {
        Row: {
          created_at: string
          employee_id: string
          is_primary: boolean
          outlet_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          is_primary?: boolean
          outlet_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          is_primary?: boolean
          outlet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_outlets_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_outlets_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_shifts: {
        Row: {
          breaks: Json
          created_at: string
          employee_id: string
          end_time: string
          id: string
          is_overnight: boolean
          outlet_id: string
          remarks: string | null
          repeat_end: string | null
          repeat_type: string
          shift_date: string
          start_time: string
          updated_at: string
        }
        Insert: {
          breaks?: Json
          created_at?: string
          employee_id: string
          end_time?: string
          id?: string
          is_overnight?: boolean
          outlet_id: string
          remarks?: string | null
          repeat_end?: string | null
          repeat_type?: string
          shift_date: string
          start_time?: string
          updated_at?: string
        }
        Update: {
          breaks?: Json
          created_at?: string
          employee_id?: string
          end_time?: string
          id?: string
          is_overnight?: boolean
          outlet_id?: string
          remarks?: string | null
          repeat_end?: string | null
          repeat_type?: string
          shift_date?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_shifts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_shifts_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          address1: string | null
          address2: string | null
          address3: string | null
          appointment_sequencing: number | null
          auth_user_id: string | null
          city: string | null
          code: string
          country: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          first_name: string
          gender: string | null
          id: string
          id_number: string | null
          id_type: string
          is_active: boolean
          is_bookable: boolean
          is_online_bookable: boolean
          language: string | null
          last_name: string
          mfa_enabled: boolean
          mobile_app_enabled: boolean
          monthly_sales_target: number
          phone: string | null
          phone2: string | null
          position_id: string | null
          postcode: string | null
          role_id: string | null
          salutation: string | null
          start_date: string | null
          state: string | null
          updated_at: string
          web_login_enabled: boolean
        }
        Insert: {
          address1?: string | null
          address2?: string | null
          address3?: string | null
          appointment_sequencing?: number | null
          auth_user_id?: string | null
          city?: string | null
          code?: string
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          first_name: string
          gender?: string | null
          id?: string
          id_number?: string | null
          id_type?: string
          is_active?: boolean
          is_bookable?: boolean
          is_online_bookable?: boolean
          language?: string | null
          last_name: string
          mfa_enabled?: boolean
          mobile_app_enabled?: boolean
          monthly_sales_target?: number
          phone?: string | null
          phone2?: string | null
          position_id?: string | null
          postcode?: string | null
          role_id?: string | null
          salutation?: string | null
          start_date?: string | null
          state?: string | null
          updated_at?: string
          web_login_enabled?: boolean
        }
        Update: {
          address1?: string | null
          address2?: string | null
          address3?: string | null
          appointment_sequencing?: number | null
          auth_user_id?: string | null
          city?: string | null
          code?: string
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          id_number?: string | null
          id_type?: string
          is_active?: boolean
          is_bookable?: boolean
          is_online_bookable?: boolean
          language?: string | null
          last_name?: string
          mfa_enabled?: boolean
          mobile_app_enabled?: boolean
          monthly_sales_target?: number
          phone?: string | null
          phone2?: string | null
          position_id?: string | null
          postcode?: string | null
          role_id?: string | null
          salutation?: string | null
          start_date?: string | null
          state?: string | null
          updated_at?: string
          web_login_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "employees_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          barcode: string | null
          brand: string | null
          category: string | null
          created_at: string
          discount_cap: number | null
          id: string
          in_transit: number
          is_active: boolean
          locked: number
          low_alert_count: number
          name: string
          price: number
          sku: string
          stock: number
          stock_status: string | null
          supplier: string | null
          type: string
          uom: string
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          brand?: string | null
          category?: string | null
          created_at?: string
          discount_cap?: number | null
          id?: string
          in_transit?: number
          is_active?: boolean
          locked?: number
          low_alert_count?: number
          name: string
          price?: number
          sku: string
          stock?: number
          stock_status?: string | null
          supplier?: string | null
          type?: string
          uom?: string
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          brand?: string | null
          category?: string | null
          created_at?: string
          discount_cap?: number | null
          id?: string
          in_transit?: number
          is_active?: boolean
          locked?: number
          low_alert_count?: number
          name?: string
          price?: number
          sku?: string
          stock?: number
          stock_status?: string | null
          supplier?: string | null
          type?: string
          uom?: string
          updated_at?: string
        }
        Relationships: []
      }
      outlets: {
        Row: {
          address1: string | null
          address2: string | null
          city: string | null
          code: string
          country: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          postcode: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          address1?: string | null
          address2?: string | null
          city?: string | null
          code: string
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          postcode?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          address1?: string | null
          address2?: string | null
          city?: string | null
          code?: string
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          postcode?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      positions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      roles: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          permissions: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          permissions?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          permissions?: Json
          updated_at?: string
        }
        Relationships: []
      }
      rooms: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          outlet_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          outlet_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          outlet_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          category_id: string | null
          consumables: string | null
          created_at: string
          discount_cap: number | null
          duration_min: number
          full_payment: boolean
          id: string
          incentive_type: string | null
          is_active: boolean
          name: string
          price: number
          sku: string
          type: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          consumables?: string | null
          created_at?: string
          discount_cap?: number | null
          duration_min?: number
          full_payment?: boolean
          id?: string
          incentive_type?: string | null
          is_active?: boolean
          name: string
          price?: number
          sku: string
          type?: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          consumables?: string | null
          created_at?: string
          discount_cap?: number | null
          duration_min?: number
          full_payment?: boolean
          id?: string
          incentive_type?: string | null
          is_active?: boolean
          name?: string
          price?: number
          sku?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      gen_code: {
        Args: { prefix: string; seq_name: string; width: number }
        Returns: string
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
