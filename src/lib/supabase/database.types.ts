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
      accounts: {
        Row: {
          account_number: string | null
          balance: number
          bank_name: string | null
          branch: string | null
          card_limit: number | null
          created_at: string
          currency: string
          deleted_at: string | null
          due_day: number | null
          iban: string | null
          id: string
          is_active: boolean
          name: string
          org_id: string
          sort_order: number
          statement_day: number | null
          type: string
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          balance?: number
          bank_name?: string | null
          branch?: string | null
          card_limit?: number | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          due_day?: number | null
          iban?: string | null
          id?: string
          is_active?: boolean
          name: string
          org_id: string
          sort_order?: number
          statement_day?: number | null
          type: string
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          balance?: number
          bank_name?: string | null
          branch?: string | null
          card_limit?: number | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          due_day?: number | null
          iban?: string | null
          id?: string
          is_active?: boolean
          name?: string
          org_id?: string
          sort_order?: number
          statement_day?: number | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          entity_id: string
          entity_type: string
          file_name: string
          id: string
          mime_type: string | null
          org_id: string
          size_bytes: number | null
          storage_path: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          entity_id: string
          entity_type: string
          file_name: string
          id?: string
          mime_type?: string | null
          org_id: string
          size_bytes?: number | null
          storage_path: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          entity_id?: string
          entity_type?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          org_id?: string
          size_bytes?: number | null
          storage_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          id: number
          new_data: Json | null
          old_data: Json | null
          org_id: string
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          org_id: string
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          org_id?: string
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_statement_imports: {
        Row: {
          account_id: string
          created_at: string
          created_by: string | null
          file_name: string | null
          id: string
          org_id: string
          period_from: string | null
          period_to: string | null
          row_count: number
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          created_by?: string | null
          file_name?: string | null
          id?: string
          org_id: string
          period_from?: string | null
          period_to?: string | null
          row_count?: number
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          created_by?: string | null
          file_name?: string | null
          id?: string
          org_id?: string
          period_from?: string | null
          period_to?: string | null
          row_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_statement_imports_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statement_imports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_statement_lines: {
        Row: {
          amount: number
          balance: number | null
          created_at: string
          description: string | null
          id: string
          import_id: string
          line_date: string
          org_id: string
          reference: string | null
          status: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          balance?: number | null
          created_at?: string
          description?: string | null
          id?: string
          import_id: string
          line_date: string
          org_id: string
          reference?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          balance?: number | null
          created_at?: string
          description?: string | null
          id?: string
          import_id?: string
          line_date?: string
          org_id?: string
          reference?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_statement_lines_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "bank_statement_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statement_lines_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statement_lines_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          org_id: string
          parent_id: string | null
          sort_order: number
          type: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          org_id: string
          parent_id?: string | null
          sort_order?: number
          type: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          org_id?: string
          parent_id?: string | null
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      cheque_events: {
        Row: {
          cheque_id: string
          created_at: string
          created_by: string | null
          event_date: string
          id: string
          note: string | null
          org_id: string
          status: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          cheque_id: string
          created_at?: string
          created_by?: string | null
          event_date?: string
          id?: string
          note?: string | null
          org_id: string
          status: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          cheque_id?: string
          created_at?: string
          created_by?: string | null
          event_date?: string
          id?: string
          note?: string | null
          org_id?: string
          status?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cheque_events_cheque_id_fkey"
            columns: ["cheque_id"]
            isOneToOne: false
            referencedRelation: "cheques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cheque_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cheque_events_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      cheques: {
        Row: {
          account_id: string | null
          account_number: string | null
          amount: number
          bank_name: string | null
          branch: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          direction: string
          drawer: string | null
          due_date: string
          exchange_rate: number
          id: string
          image_path: string | null
          issue_date: string
          kind: string
          notes: string | null
          org_id: string
          serial_number: string | null
          status: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          account_number?: string | null
          amount: number
          bank_name?: string | null
          branch?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          direction: string
          drawer?: string | null
          due_date: string
          exchange_rate?: number
          id?: string
          image_path?: string | null
          issue_date?: string
          kind: string
          notes?: string | null
          org_id: string
          serial_number?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          account_number?: string | null
          amount?: number
          bank_name?: string | null
          branch?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          direction?: string
          drawer?: string | null
          due_date?: string
          exchange_rate?: number
          id?: string
          image_path?: string | null
          issue_date?: string
          kind?: string
          notes?: string | null
          org_id?: string
          serial_number?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cheques_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cheques_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_balances"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "cheques_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cheques_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          address: string | null
          category_id: string | null
          city: string | null
          code: string | null
          contact_person: string | null
          country: string | null
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          district: string | null
          email: string | null
          entity_type: string
          iban: string | null
          id: string
          is_active: boolean
          kind: string
          mobile: string | null
          name: string
          notes: string | null
          opening_balance: number
          opening_balance_date: string | null
          org_id: string
          payment_term_days: number | null
          phone: string | null
          price_list_id: string | null
          short_name: string | null
          tags: string[]
          tax_number: string | null
          tax_office: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          category_id?: string | null
          city?: string | null
          code?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          district?: string | null
          email?: string | null
          entity_type?: string
          iban?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          mobile?: string | null
          name: string
          notes?: string | null
          opening_balance?: number
          opening_balance_date?: string | null
          org_id: string
          payment_term_days?: number | null
          phone?: string | null
          price_list_id?: string | null
          short_name?: string | null
          tags?: string[]
          tax_number?: string | null
          tax_office?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          category_id?: string | null
          city?: string | null
          code?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          district?: string | null
          email?: string | null
          entity_type?: string
          iban?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          mobile?: string | null
          name?: string
          notes?: string | null
          opening_balance?: number
          opening_balance_date?: string | null
          org_id?: string
          payment_term_days?: number | null
          phone?: string | null
          price_list_id?: string | null
          short_name?: string | null
          tags?: string[]
          tax_number?: string | null
          tax_office?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_price_list_id_fkey"
            columns: ["price_list_id"]
            isOneToOne: false
            referencedRelation: "price_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      document_lines: {
        Row: {
          created_at: string
          description: string | null
          discount_amount: number
          discount_rate: number
          document_id: string
          gross_amount: number
          id: string
          net_amount: number
          org_id: string
          position: number
          product_id: string | null
          quantity: number
          total_amount: number
          unit_factor: number
          unit_id: string | null
          unit_price: number
          updated_at: string
          vat_amount: number
          vat_rate: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_amount?: number
          discount_rate?: number
          document_id: string
          gross_amount?: number
          id?: string
          net_amount?: number
          org_id: string
          position?: number
          product_id?: string | null
          quantity?: number
          total_amount?: number
          unit_factor?: number
          unit_id?: string | null
          unit_price?: number
          updated_at?: string
          vat_amount?: number
          vat_rate?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_amount?: number
          discount_rate?: number
          document_id?: string
          gross_amount?: number
          id?: string
          net_amount?: number
          org_id?: string
          position?: number
          product_id?: string | null
          quantity?: number
          total_amount?: number
          unit_factor?: number
          unit_id?: string | null
          unit_price?: number
          updated_at?: string
          vat_amount?: number
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_lines_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_lines_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_lines_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          affects_stock: boolean
          category_id: string | null
          contact_id: string | null
          contact_snapshot: Json | null
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          description: string | null
          discount_total: number
          discount_type: string
          discount_value: number
          doc_type: string
          due_date: string | null
          employee_id: string | null
          exchange_rate: number
          id: string
          is_printed: boolean
          issue_date: string
          net_total: number
          notes: string | null
          number: string | null
          org_id: string
          paid_amount: number
          payment_status: string
          prices_include_vat: boolean
          sent_at: string | null
          source_document_id: string | null
          status: string
          subtotal: number
          terms: string | null
          total: number
          total_try: number
          updated_at: string
          valid_until: string | null
          vat_total: number
          warehouse_id: string | null
        }
        Insert: {
          affects_stock?: boolean
          category_id?: string | null
          contact_id?: string | null
          contact_snapshot?: Json | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          description?: string | null
          discount_total?: number
          discount_type?: string
          discount_value?: number
          doc_type: string
          due_date?: string | null
          employee_id?: string | null
          exchange_rate?: number
          id?: string
          is_printed?: boolean
          issue_date?: string
          net_total?: number
          notes?: string | null
          number?: string | null
          org_id: string
          paid_amount?: number
          payment_status?: string
          prices_include_vat?: boolean
          sent_at?: string | null
          source_document_id?: string | null
          status?: string
          subtotal?: number
          terms?: string | null
          total?: number
          total_try?: number
          updated_at?: string
          valid_until?: string | null
          vat_total?: number
          warehouse_id?: string | null
        }
        Update: {
          affects_stock?: boolean
          category_id?: string | null
          contact_id?: string | null
          contact_snapshot?: Json | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          description?: string | null
          discount_total?: number
          discount_type?: string
          discount_value?: number
          doc_type?: string
          due_date?: string | null
          employee_id?: string | null
          exchange_rate?: number
          id?: string
          is_printed?: boolean
          issue_date?: string
          net_total?: number
          notes?: string | null
          number?: string | null
          org_id?: string
          paid_amount?: number
          payment_status?: string
          prices_include_vat?: boolean
          sent_at?: string | null
          source_document_id?: string | null
          status?: string
          subtotal?: number
          terms?: string | null
          total?: number
          total_try?: number
          updated_at?: string
          valid_until?: string | null
          vat_total?: number
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_balances"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "documents_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_balances"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string
          currency: string
          deleted_at: string | null
          department: string | null
          email: string | null
          end_date: string | null
          iban: string | null
          id: string
          is_active: boolean
          name: string
          national_id: string | null
          notes: string | null
          org_id: string
          phone: string | null
          position: string | null
          salary: number | null
          start_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          deleted_at?: string | null
          department?: string | null
          email?: string | null
          end_date?: string | null
          iban?: string | null
          id?: string
          is_active?: boolean
          name: string
          national_id?: string | null
          notes?: string | null
          org_id: string
          phone?: string | null
          position?: string | null
          salary?: number | null
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          deleted_at?: string | null
          department?: string | null
          email?: string | null
          end_date?: string | null
          iban?: string | null
          id?: string
          is_active?: boolean
          name?: string
          national_id?: string | null
          notes?: string | null
          org_id?: string
          phone?: string | null
          position?: string | null
          salary?: number | null
          start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          banknote_buying: number | null
          banknote_selling: number | null
          created_at: string
          currency: string
          forex_buying: number | null
          forex_selling: number | null
          rate_date: string
          source: string
        }
        Insert: {
          banknote_buying?: number | null
          banknote_selling?: number | null
          created_at?: string
          currency: string
          forex_buying?: number | null
          forex_selling?: number | null
          rate_date: string
          source?: string
        }
        Update: {
          banknote_buying?: number | null
          banknote_selling?: number | null
          created_at?: string
          currency?: string
          forex_buying?: number | null
          forex_selling?: number | null
          rate_date?: string
          source?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          org_id: string
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          org_id: string
          role: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          org_id?: string
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          org_id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          org_id: string
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          org_id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      number_series: {
        Row: {
          created_at: string
          doc_type: string
          id: string
          include_year: boolean
          last_year: number | null
          next_number: number
          org_id: string
          padding: number
          prefix: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          doc_type: string
          id?: string
          include_year?: boolean
          last_year?: number | null
          next_number?: number
          org_id: string
          padding?: number
          prefix: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          doc_type?: string
          id?: string
          include_year?: boolean
          last_year?: number | null
          next_number?: number
          org_id?: string
          padding?: number
          prefix?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "number_series_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          base_currency: string
          city: string | null
          code: string
          country: string
          created_at: string
          created_by: string | null
          default_vat_rate: number
          district: string | null
          email: string | null
          iban: string | null
          id: string
          legal_name: string | null
          logo_path: string | null
          name: string
          phone: string | null
          settings: Json
          tax_number: string | null
          tax_office: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          base_currency?: string
          city?: string | null
          code?: string
          country?: string
          created_at?: string
          created_by?: string | null
          default_vat_rate?: number
          district?: string | null
          email?: string | null
          iban?: string | null
          id?: string
          legal_name?: string | null
          logo_path?: string | null
          name: string
          phone?: string | null
          settings?: Json
          tax_number?: string | null
          tax_office?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          base_currency?: string
          city?: string | null
          code?: string
          country?: string
          created_at?: string
          created_by?: string | null
          default_vat_rate?: number
          district?: string | null
          email?: string | null
          iban?: string | null
          id?: string
          legal_name?: string | null
          logo_path?: string | null
          name?: string
          phone?: string | null
          settings?: Json
          tax_number?: string | null
          tax_office?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      payment_allocations: {
        Row: {
          amount: number
          created_at: string
          document_id: string
          id: string
          org_id: string
          transaction_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          document_id: string
          id?: string
          org_id: string
          transaction_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          document_id?: string
          id?: string
          org_id?: string
          transaction_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_allocations_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      price_list_items: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          org_id: string
          price: number
          price_list_id: string
          product_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          org_id: string
          price: number
          price_list_id: string
          product_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          org_id?: string
          price?: number
          price_list_id?: string
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_list_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_list_items_price_list_id_fkey"
            columns: ["price_list_id"]
            isOneToOne: false
            referencedRelation: "price_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_list_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      price_lists: {
        Row: {
          created_at: string
          currency: string
          deleted_at: string | null
          id: string
          includes_vat: boolean
          is_default: boolean
          name: string
          org_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          deleted_at?: string | null
          id?: string
          includes_vat?: boolean
          is_default?: boolean
          name: string
          org_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          deleted_at?: string | null
          id?: string
          includes_vat?: boolean
          is_default?: boolean
          name?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_lists_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_stocks: {
        Row: {
          org_id: string
          product_id: string
          quantity: number
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          org_id: string
          product_id: string
          quantity?: number
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          org_id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_stocks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_stocks_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_stocks_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      product_units: {
        Row: {
          barcode: string | null
          created_at: string
          deleted_at: string | null
          factor: number
          id: string
          org_id: string
          product_id: string
          sale_price: number | null
          unit_id: string
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          created_at?: string
          deleted_at?: string | null
          factor: number
          id?: string
          org_id: string
          product_id: string
          sale_price?: number | null
          unit_id: string
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          created_at?: string
          deleted_at?: string | null
          factor?: number
          id?: string
          org_id?: string
          product_id?: string
          sale_price?: number | null
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_units_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_units_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_units_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          avg_cost: number
          barcode: string | null
          category_id: string | null
          code: string | null
          created_at: string
          created_by: string | null
          critical_stock: number | null
          deleted_at: string | null
          id: string
          image_path: string | null
          is_active: boolean
          name: string
          notes: string | null
          org_id: string
          purchase_currency: string
          purchase_price: number
          purchase_price_includes_vat: boolean
          sale_currency: string
          sale_price: number
          sale_price_includes_vat: boolean
          stock_qty: number
          track_stock: boolean
          type: string
          unit_id: string | null
          updated_at: string
          vat_rate: number
        }
        Insert: {
          avg_cost?: number
          barcode?: string | null
          category_id?: string | null
          code?: string | null
          created_at?: string
          created_by?: string | null
          critical_stock?: number | null
          deleted_at?: string | null
          id?: string
          image_path?: string | null
          is_active?: boolean
          name: string
          notes?: string | null
          org_id: string
          purchase_currency?: string
          purchase_price?: number
          purchase_price_includes_vat?: boolean
          sale_currency?: string
          sale_price?: number
          sale_price_includes_vat?: boolean
          stock_qty?: number
          track_stock?: boolean
          type?: string
          unit_id?: string | null
          updated_at?: string
          vat_rate?: number
        }
        Update: {
          avg_cost?: number
          barcode?: string | null
          category_id?: string | null
          code?: string | null
          created_at?: string
          created_by?: string | null
          critical_stock?: number | null
          deleted_at?: string | null
          id?: string
          image_path?: string | null
          is_active?: boolean
          name?: string
          notes?: string | null
          org_id?: string
          purchase_currency?: string
          purchase_price?: number
          purchase_price_includes_vat?: boolean
          sale_currency?: string
          sale_price?: number
          sale_price_includes_vat?: boolean
          stock_qty?: number
          track_stock?: boolean
          type?: string
          unit_id?: string | null
          updated_at?: string
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          default_org_id: string | null
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_org_id?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_org_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_org_id_fkey"
            columns: ["default_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id?: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          all_day: boolean
          assigned_to: string | null
          color: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          ends_at: string | null
          id: string
          is_done: boolean
          kind: string
          notified_at: string | null
          org_id: string
          related_id: string | null
          related_type: string | null
          remind_at: string | null
          repeat_rule: string | null
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean
          assigned_to?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          is_done?: boolean
          kind?: string
          notified_at?: string | null
          org_id: string
          related_id?: string | null
          related_type?: string | null
          remind_at?: string | null
          repeat_rule?: string | null
          starts_at: string
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean
          assigned_to?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          is_done?: boolean
          kind?: string
          notified_at?: string | null
          org_id?: string
          related_id?: string | null
          related_type?: string | null
          remind_at?: string | null
          repeat_rule?: string | null
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          document_id: string | null
          document_line_id: string | null
          id: string
          movement_date: string
          movement_type: string
          org_id: string
          product_id: string
          quantity: number
          transfer_id: string | null
          unit_cost: number | null
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          document_id?: string | null
          document_line_id?: string | null
          id?: string
          movement_date?: string
          movement_type: string
          org_id: string
          product_id: string
          quantity: number
          transfer_id?: string | null
          unit_cost?: number | null
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          document_id?: string | null
          document_line_id?: string | null
          id?: string
          movement_date?: string
          movement_type?: string
          org_id?: string
          product_id?: string
          quantity?: number
          transfer_id?: string | null
          unit_cost?: number | null
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_document_line_id_fkey"
            columns: ["document_line_id"]
            isOneToOne: false
            referencedRelation: "document_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "stock_transfers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfers: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          from_warehouse_id: string
          id: string
          number: string | null
          org_id: string
          to_warehouse_id: string
          transfer_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          from_warehouse_id: string
          id?: string
          number?: string | null
          org_id: string
          to_warehouse_id: string
          transfer_date?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          from_warehouse_id?: string
          id?: string
          number?: string | null
          org_id?: string
          to_warehouse_id?: string
          transfer_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfers_from_warehouse_id_fkey"
            columns: ["from_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string | null
          amount: number
          amount_try: number | null
          category_id: string | null
          cheque_id: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          description: string | null
          direction: string
          employee_id: string | null
          exchange_rate: number
          id: string
          method: string | null
          org_id: string
          reference: string | null
          to_account_id: string | null
          to_amount: number | null
          txn_date: string
          type: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          amount_try?: number | null
          category_id?: string | null
          cheque_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          description?: string | null
          direction: string
          employee_id?: string | null
          exchange_rate?: number
          id?: string
          method?: string | null
          org_id: string
          reference?: string | null
          to_account_id?: string | null
          to_amount?: number | null
          txn_date?: string
          type: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          amount_try?: number | null
          category_id?: string | null
          cheque_id?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          description?: string | null
          direction?: string
          employee_id?: string | null
          exchange_rate?: number
          id?: string
          method?: string | null
          org_id?: string
          reference?: string | null
          to_account_id?: string | null
          to_amount?: number | null
          txn_date?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_cheque_id_fkey"
            columns: ["cheque_id"]
            isOneToOne: false
            referencedRelation: "cheques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contact_balances"
            referencedColumns: ["contact_id"]
          },
          {
            foreignKeyName: "transactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_balances"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "transactions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          code: string
          created_at: string
          decimals: number
          deleted_at: string | null
          id: string
          name: string
          org_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          decimals?: number
          deleted_at?: string | null
          id?: string
          name: string
          org_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          decimals?: number
          deleted_at?: string | null
          id?: string
          name?: string
          org_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          address: string | null
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          org_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          org_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      contact_balances: {
        Row: {
          balance: number | null
          contact_id: string | null
          org_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_balances: {
        Row: {
          balance: number | null
          employee_id: string | null
          org_id: string | null
        }
        Insert: {
          balance?: never
          employee_id?: string | null
          org_id?: string | null
        }
        Update: {
          balance?: never
          employee_id?: string | null
          org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_invitation: { Args: { p_token: string }; Returns: string }
      account_statement: {
        Args: { p_account: string; p_from?: string; p_to?: string }
        Returns: {
          amount_in: number
          amount_out: number
          balance: number
          description: string
          direction: string
          id: string
          party: string
          reference: string
          txn_date: string
          type: string
        }[]
      }
      adjust_stock: {
        Args: {
          p_date?: string
          p_id?: string
          p_mode?: string
          p_note?: string
          p_org: string
          p_product: string
          p_quantity: number
          p_unit_cost?: number
          p_warehouse: string
        }
        Returns: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          document_id: string | null
          document_line_id: string | null
          id: string
          movement_date: string
          movement_type: string
          org_id: string
          product_id: string
          quantity: number
          transfer_id: string | null
          unit_cost: number | null
          updated_at: string
          warehouse_id: string
        }
        SetofOptions: {
          from: "*"
          to: "stock_movements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      can_write: { Args: { p_org: string }; Returns: boolean }
      contact_balance_at: {
        Args: { p_contact: string; p_date: string }
        Returns: number
      }
      contact_statement: {
        Args: { p_contact: string; p_from?: string; p_to?: string }
        Returns: {
          balance: number
          credit: number
          debit: number
          description: string
          due_date: string
          entry_date: string
          kind: string
          number: string
          ref_id: string
          ref_type: string
        }[]
      }
      create_organization: {
        Args: { p_code?: string; p_details?: Json; p_name: string }
        Returns: string
      }
      dashboard_summary: {
        Args: { p_org: string; p_today?: string }
        Returns: Json
      }
      delete_cheque: { Args: { p_cheque: string }; Returns: undefined }
      delete_document: { Args: { p_doc: string }; Returns: undefined }
      delete_stock_transfer: { Args: { p_id: string }; Returns: undefined }
      document_stock_sign: { Args: { p_doc_type: string }; Returns: number }
      has_role: { Args: { p_org: string; p_roles: string[] }; Returns: boolean }
      is_admin: { Args: { p_org: string }; Returns: boolean }
      is_member: { Args: { p_org: string }; Returns: boolean }
      latest_rate: {
        Args: { p_currency: string; p_date?: string }
        Returns: number
      }
      next_document_number: {
        Args: { p_date?: string; p_doc_type: string; p_org: string }
        Returns: string
      }
      post_document_stock: { Args: { p_doc: string }; Returns: undefined }
      recalc_document: { Args: { p_doc: string }; Returns: undefined }
      refresh_document_payment: { Args: { p_doc: string }; Returns: undefined }
      report_aging: {
        Args: { p_org: string; p_today?: string }
        Returns: {
          contact_id: string
          d0_30: number
          d31_60: number
          d61_90: number
          d90_plus: number
          flow: string
          name: string
          not_due: number
          total: number
        }[]
      }
      report_income_expense: {
        Args: { p_from: string; p_org: string; p_to: string }
        Returns: Json
      }
      report_sales: {
        Args: { p_from: string; p_group?: string; p_org: string; p_to: string }
        Returns: {
          cost: number
          doc_count: number
          key: string
          name: string
          net: number
          profit: number
          quantity: number
          total: number
          vat: number
        }[]
      }
      report_vat: {
        Args: { p_from: string; p_org: string; p_to: string }
        Returns: {
          input_base: number
          input_vat: number
          month: string
          output_base: number
          output_vat: number
          vat_rate: number
        }[]
      }
      save_cheque: {
        Args: { p_cheque: Json }
        Returns: {
          account_id: string | null
          account_number: string | null
          amount: number
          bank_name: string | null
          branch: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          direction: string
          drawer: string | null
          due_date: string
          exchange_rate: number
          id: string
          image_path: string | null
          issue_date: string
          kind: string
          notes: string | null
          org_id: string
          serial_number: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "cheques"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_document: {
        Args: { p_doc: Json; p_lines?: Json; p_payment?: Json }
        Returns: {
          affects_stock: boolean
          category_id: string | null
          contact_id: string | null
          contact_snapshot: Json | null
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          description: string | null
          discount_total: number
          discount_type: string
          discount_value: number
          doc_type: string
          due_date: string | null
          employee_id: string | null
          exchange_rate: number
          id: string
          is_printed: boolean
          issue_date: string
          net_total: number
          notes: string | null
          number: string | null
          org_id: string
          paid_amount: number
          payment_status: string
          prices_include_vat: boolean
          sent_at: string | null
          source_document_id: string | null
          status: string
          subtotal: number
          terms: string | null
          total: number
          total_try: number
          updated_at: string
          valid_until: string | null
          vat_total: number
          warehouse_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "documents"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_stock_transfer: {
        Args: { p_lines: Json; p_transfer: Json }
        Returns: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          from_warehouse_id: string
          id: string
          number: string | null
          org_id: string
          to_warehouse_id: string
          transfer_date: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "stock_transfers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_transaction: {
        Args: { p_allocations?: Json; p_txn: Json }
        Returns: {
          account_id: string | null
          amount: number
          amount_try: number | null
          category_id: string | null
          cheque_id: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          description: string | null
          direction: string
          employee_id: string | null
          exchange_rate: number
          id: string
          method: string | null
          org_id: string
          reference: string | null
          to_account_id: string | null
          to_amount: number | null
          txn_date: string
          type: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_cheque_status: {
        Args: {
          p_account?: string
          p_cheque: string
          p_date?: string
          p_note?: string
          p_status: string
        }
        Returns: {
          account_id: string | null
          account_number: string | null
          amount: number
          bank_name: string | null
          branch: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          direction: string
          drawer: string | null
          due_date: string
          exchange_rate: number
          id: string
          image_path: string | null
          issue_date: string
          kind: string
          notes: string | null
          org_id: string
          serial_number: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "cheques"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_document_status: {
        Args: { p_doc: string; p_status: string }
        Returns: {
          affects_stock: boolean
          category_id: string | null
          contact_id: string | null
          contact_snapshot: Json | null
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          description: string | null
          discount_total: number
          discount_type: string
          discount_value: number
          doc_type: string
          due_date: string | null
          employee_id: string | null
          exchange_rate: number
          id: string
          is_printed: boolean
          issue_date: string
          net_total: number
          notes: string | null
          number: string | null
          org_id: string
          paid_amount: number
          payment_status: string
          prices_include_vat: boolean
          sent_at: string | null
          source_document_id: string | null
          status: string
          subtotal: number
          terms: string | null
          total: number
          total_try: number
          updated_at: string
          valid_until: string | null
          vat_total: number
          warehouse_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "documents"
          isOneToOne: true
          isSetofReturn: false
        }
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

