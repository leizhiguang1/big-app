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
      appointment_follow_ups: {
        Row: {
          appointment_id: string
          author_id: string | null
          content: string
          created_at: string
          customer_id: string | null
          has_reminder: boolean
          id: string
          is_pinned: boolean
          reminder_date: string | null
          reminder_done: boolean
          reminder_employee_id: string | null
          reminder_method: string | null
          updated_at: string
        }
        Insert: {
          appointment_id: string
          author_id?: string | null
          content: string
          created_at?: string
          customer_id?: string | null
          has_reminder?: boolean
          id?: string
          is_pinned?: boolean
          reminder_date?: string | null
          reminder_done?: boolean
          reminder_employee_id?: string | null
          reminder_method?: string | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          author_id?: string | null
          content?: string
          created_at?: string
          customer_id?: string | null
          has_reminder?: boolean
          id?: string
          is_pinned?: boolean
          reminder_date?: string | null
          reminder_done?: boolean
          reminder_employee_id?: string | null
          reminder_method?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_follow_ups_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_follow_ups_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_follow_ups_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_follow_ups_reminder_employee_id_fkey"
            columns: ["reminder_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_line_item_incentives: {
        Row: {
          created_at: string
          created_by: string | null
          employee_id: string
          id: string
          line_item_id: string
          percent: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          employee_id: string
          id?: string
          line_item_id: string
          percent?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          employee_id?: string
          id?: string
          line_item_id?: string
          percent?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_line_item_incentives_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_line_item_incentives_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_line_item_incentives_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "appointment_line_items"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_line_items: {
        Row: {
          appointment_id: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          is_cancelled: boolean
          item_type: string
          notes: string | null
          product_id: string | null
          quantity: number
          service_id: string | null
          surface: string | null
          tax_id: string | null
          tooth_number: string | null
          total: number | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          is_cancelled?: boolean
          item_type?: string
          notes?: string | null
          product_id?: string | null
          quantity?: number
          service_id?: string | null
          surface?: string | null
          tax_id?: string | null
          tooth_number?: string | null
          total?: number | null
          unit_price: number
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          is_cancelled?: boolean
          item_type?: string
          notes?: string | null
          product_id?: string | null
          quantity?: number
          service_id?: string | null
          surface?: string | null
          tax_id?: string | null
          tooth_number?: string | null
          total?: number | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_line_items_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_line_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_line_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_line_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_line_items_tax_id_fkey"
            columns: ["tax_id"]
            isOneToOne: false
            referencedRelation: "taxes"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_status_log: {
        Row: {
          appointment_id: string
          changed_at: string
          changed_by: string | null
          from_status: string | null
          id: string
          to_status: string
        }
        Insert: {
          appointment_id: string
          changed_at?: string
          changed_by?: string | null
          from_status?: string | null
          id?: string
          to_status: string
        }
        Update: {
          appointment_id?: string
          changed_at?: string
          changed_by?: string | null
          from_status?: string | null
          id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_status_log_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_status_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          block_title: string | null
          booking_ref: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          employee_id: string | null
          end_at: string
          follow_up: string | null
          id: string
          is_time_block: boolean
          lead_attended_by_id: string | null
          lead_name: string | null
          lead_phone: string | null
          lead_source: string | null
          notes: string | null
          outlet_id: string
          paid_via: string | null
          payment_remark: string | null
          payment_status: string
          room_id: string | null
          start_at: string
          status: string
          tags: string[]
          updated_at: string
        }
        Insert: {
          block_title?: string | null
          booking_ref?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          employee_id?: string | null
          end_at: string
          follow_up?: string | null
          id?: string
          is_time_block?: boolean
          lead_attended_by_id?: string | null
          lead_name?: string | null
          lead_phone?: string | null
          lead_source?: string | null
          notes?: string | null
          outlet_id: string
          paid_via?: string | null
          payment_remark?: string | null
          payment_status?: string
          room_id?: string | null
          start_at: string
          status?: string
          tags?: string[]
          updated_at?: string
        }
        Update: {
          block_title?: string | null
          booking_ref?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          employee_id?: string | null
          end_at?: string
          follow_up?: string | null
          id?: string
          is_time_block?: boolean
          lead_attended_by_id?: string | null
          lead_name?: string | null
          lead_phone?: string | null
          lead_source?: string | null
          notes?: string | null
          outlet_id?: string
          paid_via?: string | null
          payment_remark?: string | null
          payment_status?: string
          room_id?: string | null
          start_at?: string
          status?: string
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_lead_attended_by_id_fkey"
            columns: ["lead_attended_by_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      cancellations: {
        Row: {
          amount: number
          cancelled_at: string
          cn_number: string
          created_at: string
          id: string
          outlet_id: string
          processed_by: string | null
          reason: string | null
          sales_order_id: string
          tax: number
          updated_at: string
        }
        Insert: {
          amount?: number
          cancelled_at?: string
          cn_number: string
          created_at?: string
          id?: string
          outlet_id: string
          processed_by?: string | null
          reason?: string | null
          sales_order_id: string
          tax?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          cancelled_at?: string
          cn_number?: string
          created_at?: string
          id?: string
          outlet_id?: string
          processed_by?: string | null
          reason?: string | null
          sales_order_id?: string
          tax?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cancellations_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cancellations_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cancellations_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      case_notes: {
        Row: {
          appointment_id: string | null
          content: string
          created_at: string
          customer_id: string
          employee_id: string | null
          id: string
          is_cancelled: boolean
          is_pinned: boolean
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          content: string
          created_at?: string
          customer_id: string
          employee_id?: string | null
          id?: string
          is_cancelled?: boolean
          is_pinned?: boolean
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          content?: string
          created_at?: string
          customer_id?: string
          employee_id?: string | null
          id?: string
          is_cancelled?: boolean
          is_pinned?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_notes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_notes_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_documents: {
        Row: {
          appointment_id: string | null
          created_at: string
          customer_id: string
          file_name: string
          id: string
          mime_type: string
          size_bytes: number
          storage_path: string
          updated_at: string
          uploaded_by_id: string | null
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          customer_id: string
          file_name: string
          id?: string
          mime_type: string
          size_bytes: number
          storage_path: string
          updated_at?: string
          uploaded_by_id?: string | null
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          customer_id?: string
          file_name?: string
          id?: string
          mime_type?: string
          size_bytes?: number
          storage_path?: string
          updated_at?: string
          uploaded_by_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_documents_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_documents_uploaded_by_id_fkey"
            columns: ["uploaded_by_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address1: string | null
          address2: string | null
          city: string | null
          code: string
          consultant_id: string
          country_of_origin: string | null
          created_at: string
          date_of_birth: string | null
          drug_allergies: string | null
          email: string | null
          external_code: string | null
          first_name: string
          gender: string | null
          home_outlet_id: string
          id: string
          id_number: string | null
          id_type: string
          is_staff: boolean
          is_vip: boolean
          join_date: string
          last_name: string | null
          medical_alert: string | null
          medical_conditions: string[]
          opt_in_marketing: boolean
          opt_in_notifications: boolean
          passport_no: string | null
          phone: string
          phone2: string | null
          postcode: string | null
          profile_image_path: string | null
          salutation: string
          smoker: string | null
          source: string | null
          state: string | null
          tag: string | null
          updated_at: string
        }
        Insert: {
          address1?: string | null
          address2?: string | null
          city?: string | null
          code?: string
          consultant_id: string
          country_of_origin?: string | null
          created_at?: string
          date_of_birth?: string | null
          drug_allergies?: string | null
          email?: string | null
          external_code?: string | null
          first_name: string
          gender?: string | null
          home_outlet_id: string
          id?: string
          id_number?: string | null
          id_type?: string
          is_staff?: boolean
          is_vip?: boolean
          join_date?: string
          last_name?: string | null
          medical_alert?: string | null
          medical_conditions?: string[]
          opt_in_marketing?: boolean
          opt_in_notifications?: boolean
          passport_no?: string | null
          phone: string
          phone2?: string | null
          postcode?: string | null
          profile_image_path?: string | null
          salutation: string
          smoker?: string | null
          source?: string | null
          state?: string | null
          tag?: string | null
          updated_at?: string
        }
        Update: {
          address1?: string | null
          address2?: string | null
          city?: string | null
          code?: string
          consultant_id?: string
          country_of_origin?: string | null
          created_at?: string
          date_of_birth?: string | null
          drug_allergies?: string | null
          email?: string | null
          external_code?: string | null
          first_name?: string
          gender?: string | null
          home_outlet_id?: string
          id?: string
          id_number?: string | null
          id_type?: string
          is_staff?: boolean
          is_vip?: boolean
          join_date?: string
          last_name?: string | null
          medical_alert?: string | null
          medical_conditions?: string[]
          opt_in_marketing?: boolean
          opt_in_notifications?: boolean
          passport_no?: string | null
          phone?: string
          phone2?: string | null
          postcode?: string | null
          profile_image_path?: string | null
          salutation?: string
          smoker?: string | null
          source?: string | null
          state?: string | null
          tag?: string | null
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
          pin_hash: string | null
          position_id: string | null
          postcode: string | null
          profile_image_path: string | null
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
          pin_hash?: string | null
          position_id?: string | null
          postcode?: string | null
          profile_image_path?: string | null
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
          pin_hash?: string | null
          position_id?: string | null
          postcode?: string | null
          profile_image_path?: string | null
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
      inventory_brands: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_categories: {
        Row: {
          created_at: string
          external_code: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          external_code?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          external_code?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_item_taxes: {
        Row: {
          created_at: string
          inventory_item_id: string
          tax_id: string
        }
        Insert: {
          created_at?: string
          inventory_item_id: string
          tax_id: string
        }
        Update: {
          created_at?: string
          inventory_item_id?: string
          tax_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_item_taxes_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_item_taxes_tax_id_fkey"
            columns: ["tax_id"]
            isOneToOne: false
            referencedRelation: "taxes"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          barcode: string | null
          brand_id: string | null
          category_id: string | null
          cost_price: number
          created_at: string
          discount_cap: number | null
          e_invoice_code: string | null
          external_code: string | null
          id: string
          image_path: string | null
          in_transit: number
          is_active: boolean
          is_controlled: boolean | null
          is_sellable: boolean
          kind: string
          location: string | null
          locked: number
          name: string
          needs_replenish_reminder: boolean | null
          prescription_default_billing_qty: number | null
          prescription_dosage: number | null
          prescription_dosage_uom_id: string | null
          prescription_duration: string | null
          prescription_frequency: string | null
          prescription_notes: string | null
          prescription_reason: string | null
          purchasing_to_stock_factor: number
          purchasing_uom_id: string
          selling_price: number
          sku: string
          stock: number
          stock_alert_count: number
          stock_status: string | null
          stock_to_use_factor: number | null
          stock_uom_id: string
          supplier_id: string | null
          updated_at: string
          use_uom_id: string | null
        }
        Insert: {
          barcode?: string | null
          brand_id?: string | null
          category_id?: string | null
          cost_price?: number
          created_at?: string
          discount_cap?: number | null
          e_invoice_code?: string | null
          external_code?: string | null
          id?: string
          image_path?: string | null
          in_transit?: number
          is_active?: boolean
          is_controlled?: boolean | null
          is_sellable?: boolean
          kind: string
          location?: string | null
          locked?: number
          name: string
          needs_replenish_reminder?: boolean | null
          prescription_default_billing_qty?: number | null
          prescription_dosage?: number | null
          prescription_dosage_uom_id?: string | null
          prescription_duration?: string | null
          prescription_frequency?: string | null
          prescription_notes?: string | null
          prescription_reason?: string | null
          purchasing_to_stock_factor?: number
          purchasing_uom_id: string
          selling_price?: number
          sku: string
          stock?: number
          stock_alert_count?: number
          stock_status?: string | null
          stock_to_use_factor?: number | null
          stock_uom_id: string
          supplier_id?: string | null
          updated_at?: string
          use_uom_id?: string | null
        }
        Update: {
          barcode?: string | null
          brand_id?: string | null
          category_id?: string | null
          cost_price?: number
          created_at?: string
          discount_cap?: number | null
          e_invoice_code?: string | null
          external_code?: string | null
          id?: string
          image_path?: string | null
          in_transit?: number
          is_active?: boolean
          is_controlled?: boolean | null
          is_sellable?: boolean
          kind?: string
          location?: string | null
          locked?: number
          name?: string
          needs_replenish_reminder?: boolean | null
          prescription_default_billing_qty?: number | null
          prescription_dosage?: number | null
          prescription_dosage_uom_id?: string | null
          prescription_duration?: string | null
          prescription_frequency?: string | null
          prescription_notes?: string | null
          prescription_reason?: string | null
          purchasing_to_stock_factor?: number
          purchasing_uom_id?: string
          selling_price?: number
          sku?: string
          stock?: number
          stock_alert_count?: number
          stock_status?: string | null
          stock_to_use_factor?: number | null
          stock_uom_id?: string
          supplier_id?: string | null
          updated_at?: string
          use_uom_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "inventory_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "inventory_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_prescription_dosage_uom_id_fkey"
            columns: ["prescription_dosage_uom_id"]
            isOneToOne: false
            referencedRelation: "inventory_uoms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_purchasing_uom_id_fkey"
            columns: ["purchasing_uom_id"]
            isOneToOne: false
            referencedRelation: "inventory_uoms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_stock_uom_id_fkey"
            columns: ["stock_uom_id"]
            isOneToOne: false
            referencedRelation: "inventory_uoms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_use_uom_id_fkey"
            columns: ["use_uom_id"]
            isOneToOne: false
            referencedRelation: "inventory_uoms"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string
          created_by: string | null
          delta: number
          id: string
          item_id: string
          notes: string | null
          reason: string
          ref_id: string | null
          ref_type: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          delta: number
          id?: string
          item_id: string
          notes?: string | null
          reason: string
          ref_id?: string | null
          ref_type?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          delta?: number
          id?: string
          item_id?: string
          notes?: string | null
          reason?: string
          ref_id?: string | null
          ref_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_uoms: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      medical_certificates: {
        Row: {
          appointment_id: string
          code: string
          created_at: string
          customer_id: string
          duration_days: number
          end_date: string
          half_day_period: string | null
          has_half_day: boolean
          id: string
          issuing_employee_id: string | null
          outlet_id: string
          pdf_path: string | null
          reason: string | null
          slip_type: string
          start_date: string
          updated_at: string
        }
        Insert: {
          appointment_id: string
          code?: string
          created_at?: string
          customer_id: string
          duration_days: number
          end_date: string
          half_day_period?: string | null
          has_half_day?: boolean
          id?: string
          issuing_employee_id?: string | null
          outlet_id: string
          pdf_path?: string | null
          reason?: string | null
          slip_type: string
          start_date: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          code?: string
          created_at?: string
          customer_id?: string
          duration_days?: number
          end_date?: string
          half_day_period?: string | null
          has_half_day?: boolean
          id?: string
          issuing_employee_id?: string | null
          outlet_id?: string
          pdf_path?: string | null
          reason?: string | null
          slip_type?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_certificates_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_certificates_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_certificates_issuing_employee_id_fkey"
            columns: ["issuing_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_certificates_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string | null
          content_type: string
          conversation_id: string
          created_at: string
          direction: string
          id: string
          media_mime: string | null
          media_url: string | null
          sent_at: string
          status: string
          wa_message_id: string | null
        }
        Insert: {
          body?: string | null
          content_type?: string
          conversation_id: string
          created_at?: string
          direction: string
          id?: string
          media_mime?: string | null
          media_url?: string | null
          sent_at?: string
          status?: string
          wa_message_id?: string | null
        }
        Update: {
          body?: string | null
          content_type?: string
          conversation_id?: string
          created_at?: string
          direction?: string
          id?: string
          media_mime?: string | null
          media_url?: string | null
          sent_at?: string
          status?: string
          wa_message_id?: string | null
        }
        Relationships: []
      }
      outlet_customer_counters: {
        Row: {
          last_seq: number
          outlet_id: string
          updated_at: string
        }
        Insert: {
          last_seq?: number
          outlet_id: string
          updated_at?: string
        }
        Update: {
          last_seq?: number
          outlet_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outlet_customer_counters_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: true
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      outlets: {
        Row: {
          address1: string | null
          address2: string | null
          bank_account_number: string | null
          bank_name: string | null
          city: string | null
          code: string
          company_reg_name: string | null
          company_reg_number: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          location_link: string | null
          location_video_url: string | null
          logo_url: string | null
          name: string
          nick_name: string | null
          phone: string | null
          phone2: string | null
          postcode: string | null
          show_reg_number_on_invoice: boolean
          show_tax_number_on_invoice: boolean
          state: string | null
          tax_number: string | null
          updated_at: string
          wa_connection_id: string | null
          waze_name: string | null
        }
        Insert: {
          address1?: string | null
          address2?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          city?: string | null
          code: string
          company_reg_name?: string | null
          company_reg_number?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          location_link?: string | null
          location_video_url?: string | null
          logo_url?: string | null
          name: string
          nick_name?: string | null
          phone?: string | null
          phone2?: string | null
          postcode?: string | null
          show_reg_number_on_invoice?: boolean
          show_tax_number_on_invoice?: boolean
          state?: string | null
          tax_number?: string | null
          updated_at?: string
          wa_connection_id?: string | null
          waze_name?: string | null
        }
        Update: {
          address1?: string | null
          address2?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          city?: string | null
          code?: string
          company_reg_name?: string | null
          company_reg_number?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          location_link?: string | null
          location_video_url?: string | null
          logo_url?: string | null
          name?: string
          nick_name?: string | null
          phone?: string | null
          phone2?: string | null
          postcode?: string | null
          show_reg_number_on_invoice?: boolean
          show_tax_number_on_invoice?: boolean
          state?: string | null
          tax_number?: string | null
          updated_at?: string
          wa_connection_id?: string | null
          waze_name?: string | null
        }
        Relationships: []
      }
      passcodes: {
        Row: {
          applied_on: string | null
          created_at: string
          created_by_employee_id: string | null
          expires_at: string
          function: string
          id: string
          outlet_id: string
          passcode: string
          remarks: string | null
          updated_at: string
          used_at: string | null
          used_by_employee_id: string | null
        }
        Insert: {
          applied_on?: string | null
          created_at?: string
          created_by_employee_id?: string | null
          expires_at?: string
          function: string
          id?: string
          outlet_id: string
          passcode: string
          remarks?: string | null
          updated_at?: string
          used_at?: string | null
          used_by_employee_id?: string | null
        }
        Update: {
          applied_on?: string | null
          created_at?: string
          created_by_employee_id?: string | null
          expires_at?: string
          function?: string
          id?: string
          outlet_id?: string
          passcode?: string
          remarks?: string | null
          updated_at?: string
          used_at?: string | null
          used_by_employee_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "passcodes_created_by_employee_id_fkey"
            columns: ["created_by_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passcodes_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passcodes_used_by_employee_id_fkey"
            columns: ["used_by_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_allocations: {
        Row: {
          amount: number
          created_at: string
          id: string
          payment_id: string
          sale_item_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          payment_id: string
          sale_item_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          payment_id?: string
          sale_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_sale_item_id_fkey"
            columns: ["sale_item_id"]
            isOneToOne: false
            referencedRelation: "sale_items"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          is_builtin: boolean
          name: string
          requires_approval_code: boolean
          requires_bank: boolean
          requires_card_type: boolean
          requires_months: boolean
          requires_reference_no: boolean
          requires_remarks: boolean
          requires_trace_no: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_builtin?: boolean
          name: string
          requires_approval_code?: boolean
          requires_bank?: boolean
          requires_card_type?: boolean
          requires_months?: boolean
          requires_reference_no?: boolean
          requires_remarks?: boolean
          requires_trace_no?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_builtin?: boolean
          name?: string
          requires_approval_code?: boolean
          requires_bank?: boolean
          requires_card_type?: boolean
          requires_months?: boolean
          requires_reference_no?: boolean
          requires_remarks?: boolean
          requires_trace_no?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          approval_code: string | null
          bank: string | null
          card_type: string | null
          created_at: string
          id: string
          invoice_no: string
          months: number | null
          outlet_id: string
          paid_at: string
          payment_mode: string
          processed_by: string | null
          reference_no: string | null
          remarks: string | null
          sales_order_id: string
          trace_no: string | null
        }
        Insert: {
          amount: number
          approval_code?: string | null
          bank?: string | null
          card_type?: string | null
          created_at?: string
          id?: string
          invoice_no: string
          months?: number | null
          outlet_id: string
          paid_at?: string
          payment_mode: string
          processed_by?: string | null
          reference_no?: string | null
          remarks?: string | null
          sales_order_id: string
          trace_no?: string | null
        }
        Update: {
          amount?: number
          approval_code?: string | null
          bank?: string | null
          card_type?: string | null
          created_at?: string
          id?: string
          invoice_no?: string
          months?: number | null
          outlet_id?: string
          paid_at?: string
          payment_mode?: string
          processed_by?: string | null
          reference_no?: string | null
          remarks?: string | null
          sales_order_id?: string
          trace_no?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_payment_mode_fk"
            columns: ["payment_mode"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "payments_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
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
      sale_items: {
        Row: {
          created_at: string
          discount: number
          id: string
          inventory_item_id: string | null
          item_name: string
          item_type: string
          quantity: number
          sales_order_id: string
          service_id: string | null
          sku: string | null
          tax_amount: number
          tax_id: string | null
          tax_name: string | null
          tax_rate_pct: number | null
          total: number | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          discount?: number
          id?: string
          inventory_item_id?: string | null
          item_name: string
          item_type?: string
          quantity: number
          sales_order_id: string
          service_id?: string | null
          sku?: string | null
          tax_amount?: number
          tax_id?: string | null
          tax_name?: string | null
          tax_rate_pct?: number | null
          total?: number | null
          unit_price: number
        }
        Update: {
          created_at?: string
          discount?: number
          id?: string
          inventory_item_id?: string | null
          item_name?: string
          item_type?: string
          quantity?: number
          sales_order_id?: string
          service_id?: string | null
          sku?: string | null
          tax_amount?: number
          tax_id?: string | null
          tax_name?: string | null
          tax_rate_pct?: number | null
          total?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_tax_id_fkey"
            columns: ["tax_id"]
            isOneToOne: false
            referencedRelation: "taxes"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          amount_paid: number
          appointment_id: string | null
          consultant_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          discount: number
          frontdesk_message: string | null
          id: string
          outlet_id: string
          outstanding: number | null
          remarks: string | null
          rounding: number
          so_number: string
          sold_at: string
          status: string
          subtotal: number
          tax: number
          total: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          appointment_id?: string | null
          consultant_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount?: number
          frontdesk_message?: string | null
          id?: string
          outlet_id: string
          outstanding?: number | null
          remarks?: string | null
          rounding?: number
          so_number: string
          sold_at?: string
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          appointment_id?: string | null
          consultant_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount?: number
          frontdesk_message?: string | null
          id?: string
          outlet_id?: string
          outstanding?: number | null
          remarks?: string | null
          rounding?: number
          so_number?: string
          sold_at?: string
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_outlet_id_fkey"
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
      service_inventory_items: {
        Row: {
          created_at: string
          default_quantity: number
          id: string
          inventory_item_id: string
          service_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_quantity?: number
          id?: string
          inventory_item_id: string
          service_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_quantity?: number
          id?: string
          inventory_item_id?: string
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_inventory_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_inventory_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_taxes: {
        Row: {
          created_at: string
          service_id: string
          tax_id: string
        }
        Insert: {
          created_at?: string
          service_id: string
          tax_id: string
        }
        Update: {
          created_at?: string
          service_id?: string
          tax_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_taxes_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_taxes_tax_id_fkey"
            columns: ["tax_id"]
            isOneToOne: false
            referencedRelation: "taxes"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          allow_cash_price_range: boolean
          allow_redemption_without_payment: boolean
          category_id: string | null
          created_at: string
          discount_cap: number | null
          duration_min: number
          external_code: string | null
          id: string
          image_url: string | null
          incentive_type: string | null
          is_active: boolean
          name: string
          other_fees: number
          price: number
          price_max: number | null
          price_min: number | null
          sku: string
          type: string
          updated_at: string
        }
        Insert: {
          allow_cash_price_range?: boolean
          allow_redemption_without_payment?: boolean
          category_id?: string | null
          created_at?: string
          discount_cap?: number | null
          duration_min?: number
          external_code?: string | null
          id?: string
          image_url?: string | null
          incentive_type?: string | null
          is_active?: boolean
          name: string
          other_fees?: number
          price?: number
          price_max?: number | null
          price_min?: number | null
          sku: string
          type?: string
          updated_at?: string
        }
        Update: {
          allow_cash_price_range?: boolean
          allow_redemption_without_payment?: boolean
          category_id?: string | null
          created_at?: string
          discount_cap?: number | null
          duration_min?: number
          external_code?: string | null
          id?: string
          image_url?: string | null
          incentive_type?: string | null
          is_active?: boolean
          name?: string
          other_fees?: number
          price?: number
          price_max?: number | null
          price_min?: number | null
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
      suppliers: {
        Row: {
          account_number: string | null
          address_1: string | null
          address_2: string | null
          city: string | null
          country: string | null
          created_at: string
          description: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          mobile_number: string | null
          name: string
          office_phone: string | null
          payment_terms_unit: string | null
          payment_terms_value: number | null
          postcode: string | null
          state: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          account_number?: string | null
          address_1?: string | null
          address_2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          mobile_number?: string | null
          name: string
          office_phone?: string | null
          payment_terms_unit?: string | null
          payment_terms_value?: number | null
          postcode?: string | null
          state?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          account_number?: string | null
          address_1?: string | null
          address_2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          mobile_number?: string | null
          name?: string
          office_phone?: string | null
          payment_terms_unit?: string | null
          payment_terms_value?: number | null
          postcode?: string | null
          state?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      taxes: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          rate_pct: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          rate_pct: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          rate_pct?: number
          updated_at?: string
        }
        Relationships: []
      }
      wa_api_keys: {
        Row: {
          client_name: string
          created_at: string | null
          id: string
          is_active: boolean | null
          key_hash: string
          key_prefix: string
        }
        Insert: {
          client_name: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash: string
          key_prefix: string
        }
        Update: {
          client_name?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash?: string
          key_prefix?: string
        }
        Relationships: []
      }
      wa_chat_cache: {
        Row: {
          connection_id: string
          is_group: boolean
          jid: string
          last_message_from_me: boolean | null
          last_message_preview: string | null
          last_sender_name: string | null
          last_ts: number
          name: string | null
          unread_count: number
          updated_at: string
        }
        Insert: {
          connection_id: string
          is_group?: boolean
          jid: string
          last_message_from_me?: boolean | null
          last_message_preview?: string | null
          last_sender_name?: string | null
          last_ts?: number
          name?: string | null
          unread_count?: number
          updated_at?: string
        }
        Update: {
          connection_id?: string
          is_group?: boolean
          jid?: string
          last_message_from_me?: boolean | null
          last_message_preview?: string | null
          last_sender_name?: string | null
          last_ts?: number
          name?: string | null
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wa_chat_cache_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "wa_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_connections: {
        Row: {
          api_key_id: string
          auth_dir: string
          connected_at: string | null
          created_at: string | null
          id: string
          label: string | null
          last_seen_at: string | null
          metadata: Json
          phone: string | null
          status: string
          updated_at: string | null
          webhook_secret: string | null
          webhook_url: string
        }
        Insert: {
          api_key_id: string
          auth_dir: string
          connected_at?: string | null
          created_at?: string | null
          id?: string
          label?: string | null
          last_seen_at?: string | null
          metadata?: Json
          phone?: string | null
          status?: string
          updated_at?: string | null
          webhook_secret?: string | null
          webhook_url: string
        }
        Update: {
          api_key_id?: string
          auth_dir?: string
          connected_at?: string | null
          created_at?: string | null
          id?: string
          label?: string | null
          last_seen_at?: string | null
          metadata?: Json
          phone?: string | null
          status?: string
          updated_at?: string | null
          webhook_secret?: string | null
          webhook_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "wa_connections_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "wa_api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_message_cache: {
        Row: {
          connection_id: string
          content_type: string | null
          created_at: string
          from_me: boolean
          jid: string
          media_type: string | null
          media_url: string | null
          raw_message: Json | null
          sender_jid: string | null
          sender_name: string | null
          text: string | null
          transcript: string | null
          ts: number
          wa_message_id: string
        }
        Insert: {
          connection_id: string
          content_type?: string | null
          created_at?: string
          from_me?: boolean
          jid: string
          media_type?: string | null
          media_url?: string | null
          raw_message?: Json | null
          sender_jid?: string | null
          sender_name?: string | null
          text?: string | null
          transcript?: string | null
          ts: number
          wa_message_id: string
        }
        Update: {
          connection_id?: string
          content_type?: string | null
          created_at?: string
          from_me?: boolean
          jid?: string
          media_type?: string | null
          media_url?: string | null
          raw_message?: Json | null
          sender_jid?: string | null
          sender_name?: string | null
          text?: string | null
          transcript?: string | null
          ts?: number
          wa_message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wa_message_cache_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "wa_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_message_log: {
        Row: {
          connection_id: string
          content_type: string | null
          created_at: string | null
          direction: string
          from_jid: string | null
          id: string
          status: string | null
          to_jid: string | null
          wa_message_id: string | null
        }
        Insert: {
          connection_id: string
          content_type?: string | null
          created_at?: string | null
          direction: string
          from_jid?: string | null
          id?: string
          status?: string | null
          to_jid?: string | null
          wa_message_id?: string | null
        }
        Update: {
          connection_id?: string
          content_type?: string | null
          created_at?: string | null
          direction?: string
          from_jid?: string | null
          id?: string
          status?: string | null
          to_jid?: string | null
          wa_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wa_message_log_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "wa_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_webhook_log: {
        Row: {
          attempt_count: number | null
          connection_id: string
          created_at: string | null
          delivered: boolean | null
          delivered_at: string | null
          event_type: string
          id: string
          last_error: string | null
          payload: Json
        }
        Insert: {
          attempt_count?: number | null
          connection_id: string
          created_at?: string | null
          delivered?: boolean | null
          delivered_at?: string | null
          event_type: string
          id?: string
          last_error?: string | null
          payload: Json
        }
        Update: {
          attempt_count?: number | null
          connection_id?: string
          created_at?: string | null
          delivered?: boolean | null
          delivered_at?: string | null
          event_type?: string
          id?: string
          last_error?: string | null
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "wa_webhook_log_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "wa_connections"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      collect_appointment_payment: {
        Args: {
          p_allocations?: Json
          p_appointment_id: string
          p_discount: number
          p_frontdesk_message?: string
          p_items: Json
          p_payments: Json
          p_processed_by: string
          p_remarks: string
          p_rounding: number
          p_sold_at?: string
          p_tax: number
        }
        Returns: Json
      }
      gen_booking_ref: { Args: never; Returns: string }
      gen_code: {
        Args: { prefix: string; seq_name: string; width: number }
        Returns: string
      }
      gen_customer_code: { Args: { p_outlet_id: string }; Returns: string }
      set_employee_pin: {
        Args: { p_employee_id: string; p_pin: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      verify_employee_pin: {
        Args: { p_employee_id: string; p_pin: string }
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

