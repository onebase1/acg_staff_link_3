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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_workflow: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          priority: string | null
          status: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          priority?: string | null
          status: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          priority?: string | null
          status?: string
          type?: string
        }
        Relationships: []
      }
      admin_workflows: {
        Row: {
          agency_id: string
          assigned_to: string | null
          auto_created: boolean | null
          created_by: string | null
          created_date: string | null
          data: Json | null
          deadline: string | null
          description: string | null
          escalation_count: number | null
          id: string
          name: string
          priority: string | null
          related_entity: Json | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string | null
          title: string | null
          type: string | null
          updated_date: string | null
          workflow_type: string | null
        }
        Insert: {
          agency_id: string
          assigned_to?: string | null
          auto_created?: boolean | null
          created_by?: string | null
          created_date?: string | null
          data?: Json | null
          deadline?: string | null
          description?: string | null
          escalation_count?: number | null
          id?: string
          name: string
          priority?: string | null
          related_entity?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          title?: string | null
          type?: string | null
          updated_date?: string | null
          workflow_type?: string | null
        }
        Update: {
          agency_id?: string
          assigned_to?: string | null
          auto_created?: boolean | null
          created_by?: string | null
          created_date?: string | null
          data?: Json | null
          deadline?: string | null
          description?: string | null
          escalation_count?: number | null
          id?: string
          name?: string
          priority?: string | null
          related_entity?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          title?: string | null
          type?: string | null
          updated_date?: string | null
          workflow_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_workflows_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      agencies: {
        Row: {
          address: Json | null
          auto_approve_timesheets: boolean | null
          auto_generate_invoices: boolean | null
          bank_details: Json | null
          billing_email: string | null
          company_number: string | null
          contact_email: string | null
          contact_phone: string | null
          created_by: string | null
          created_date: string | null
          dbs_check_expiry_alerts: boolean | null
          document_expiry_warnings: boolean | null
          email: string | null
          email_notifications: boolean | null
          id: string
          invoice_frequency: string | null
          logo_url: string | null
          mandatory_training_reminders: boolean | null
          name: string
          payment_terms_days: number | null
          phone: string | null
          registration_number: string | null
          send_payment_reminders: boolean | null
          settings: Json | null
          sms_notifications: boolean | null
          sms_shift_confirmations: boolean | null
          status: string | null
          subscription_tier: string | null
          updated_date: string | null
          vat_number: string | null
          whatsapp_global_notifications: boolean | null
          whatsapp_notifications: boolean | null
        }
        Insert: {
          address?: Json | null
          auto_approve_timesheets?: boolean | null
          auto_generate_invoices?: boolean | null
          bank_details?: Json | null
          billing_email?: string | null
          company_number?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_by?: string | null
          created_date?: string | null
          dbs_check_expiry_alerts?: boolean | null
          document_expiry_warnings?: boolean | null
          email?: string | null
          email_notifications?: boolean | null
          id?: string
          invoice_frequency?: string | null
          logo_url?: string | null
          mandatory_training_reminders?: boolean | null
          name: string
          payment_terms_days?: number | null
          phone?: string | null
          registration_number?: string | null
          send_payment_reminders?: boolean | null
          settings?: Json | null
          sms_notifications?: boolean | null
          sms_shift_confirmations?: boolean | null
          status?: string | null
          subscription_tier?: string | null
          updated_date?: string | null
          vat_number?: string | null
          whatsapp_global_notifications?: boolean | null
          whatsapp_notifications?: boolean | null
        }
        Update: {
          address?: Json | null
          auto_approve_timesheets?: boolean | null
          auto_generate_invoices?: boolean | null
          bank_details?: Json | null
          billing_email?: string | null
          company_number?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_by?: string | null
          created_date?: string | null
          dbs_check_expiry_alerts?: boolean | null
          document_expiry_warnings?: boolean | null
          email?: string | null
          email_notifications?: boolean | null
          id?: string
          invoice_frequency?: string | null
          logo_url?: string | null
          mandatory_training_reminders?: boolean | null
          name?: string
          payment_terms_days?: number | null
          phone?: string | null
          registration_number?: string | null
          send_payment_reminders?: boolean | null
          settings?: Json | null
          sms_notifications?: boolean | null
          sms_shift_confirmations?: boolean | null
          status?: string | null
          subscription_tier?: string | null
          updated_date?: string | null
          vat_number?: string | null
          whatsapp_global_notifications?: boolean | null
          whatsapp_notifications?: boolean | null
        }
        Relationships: []
      }
      agency_admin_invitations: {
        Row: {
          admin_name: string | null
          agency_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invite_token: string
          invited_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_name?: string | null
          agency_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invite_token?: string
          invited_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_name?: string | null
          agency_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invite_token?: string
          invited_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_admin_invitations_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_admin_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_comments: {
        Row: {
          author_id: string | null
          content: string
          created_at: string | null
          id: string
          post_id: string
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          post_id: string
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "blog_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_id: string
          content: string
          created_at: string | null
          id: string
          is_published: boolean | null
          published_at: string | null
          slug: string
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "blog_users"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_users: {
        Row: {
          bio: string | null
          created_at: string | null
          display_name: string | null
          email: string
          id: string
          updated_at: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          email: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          agency_id: string
          booking_date: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          client_id: string | null
          confirmation_method: string | null
          confirmed_by_client_at: string | null
          confirmed_by_staff_at: string | null
          created_by: string | null
          created_date: string | null
          end_time: string | null
          feedback_from_client: string | null
          feedback_from_staff: string | null
          id: string
          notes: string | null
          rating_by_client: number | null
          rating_by_staff: number | null
          shift_date: string | null
          shift_id: string
          staff_id: string
          start_time: string | null
          status: string | null
          timesheet_id: string | null
          updated_date: string | null
        }
        Insert: {
          agency_id: string
          booking_date?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          client_id?: string | null
          confirmation_method?: string | null
          confirmed_by_client_at?: string | null
          confirmed_by_staff_at?: string | null
          created_by?: string | null
          created_date?: string | null
          end_time?: string | null
          feedback_from_client?: string | null
          feedback_from_staff?: string | null
          id?: string
          notes?: string | null
          rating_by_client?: number | null
          rating_by_staff?: number | null
          shift_date?: string | null
          shift_id: string
          staff_id: string
          start_time?: string | null
          status?: string | null
          timesheet_id?: string | null
          updated_date?: string | null
        }
        Update: {
          agency_id?: string
          booking_date?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          client_id?: string | null
          confirmation_method?: string | null
          confirmed_by_client_at?: string | null
          confirmed_by_staff_at?: string | null
          created_by?: string | null
          created_date?: string | null
          end_time?: string | null
          feedback_from_client?: string | null
          feedback_from_staff?: string | null
          id?: string
          notes?: string | null
          rating_by_client?: number | null
          rating_by_staff?: number | null
          shift_date?: string | null
          shift_id?: string
          staff_id?: string
          start_time?: string | null
          status?: string | null
          timesheet_id?: string | null
          updated_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts_formatted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      change_logs: {
        Row: {
          affected_entity_id: string
          affected_entity_type: string
          agency_id: string
          change_description: string | null
          change_type: string
          changed_at: string
          changed_by: string | null
          changed_by_email: string | null
          created_by: string | null
          created_date: string | null
          flagged_for_review: boolean | null
          id: string
          ip_address: string | null
          new_value: string | null
          new_values: Json | null
          notifications_sent: number | null
          old_value: string | null
          old_values: Json | null
          reason: string | null
          reviewed: boolean | null
          reviewed_at: string | null
          reviewed_by: string | null
          risk_level: string | null
          updated_date: string | null
        }
        Insert: {
          affected_entity_id: string
          affected_entity_type: string
          agency_id: string
          change_description?: string | null
          change_type: string
          changed_at?: string
          changed_by?: string | null
          changed_by_email?: string | null
          created_by?: string | null
          created_date?: string | null
          flagged_for_review?: boolean | null
          id?: string
          ip_address?: string | null
          new_value?: string | null
          new_values?: Json | null
          notifications_sent?: number | null
          old_value?: string | null
          old_values?: Json | null
          reason?: string | null
          reviewed?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_level?: string | null
          updated_date?: string | null
        }
        Update: {
          affected_entity_id?: string
          affected_entity_type?: string
          agency_id?: string
          change_description?: string | null
          change_type?: string
          changed_at?: string
          changed_by?: string | null
          changed_by_email?: string | null
          created_by?: string | null
          created_date?: string | null
          flagged_for_review?: boolean | null
          id?: string
          ip_address?: string | null
          new_value?: string | null
          new_values?: Json | null
          notifications_sent?: number | null
          old_value?: string | null
          old_values?: Json | null
          reason?: string | null
          reviewed?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_level?: string | null
          updated_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "change_logs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: Json | null
          agency_id: string
          bed_capacity: number | null
          billing_email: string | null
          contact_person: Json | null
          contract_terms: Json | null
          cqc_rating: string | null
          created_by: string | null
          created_date: string | null
          day_shift_end: string | null
          day_shift_start: string | null
          email: string | null
          enabled_roles: Json | null
          geofence_enabled: boolean | null
          geofence_radius_meters: number | null
          gps_geofence: Json | null
          id: string
          internal_locations: Json | null
          location: Json | null
          location_coordinates: Json | null
          name: string
          night_shift_end: string | null
          night_shift_start: string | null
          notes: string | null
          payment_terms: Json | null
          phone: string | null
          preferred_staff: Json | null
          rating: number | null
          shift_window_type: string | null
          status: string | null
          total_bookings: number | null
          type: string | null
          updated_date: string | null
          work_location_coordinates: string | null
        }
        Insert: {
          address?: Json | null
          agency_id: string
          bed_capacity?: number | null
          billing_email?: string | null
          contact_person?: Json | null
          contract_terms?: Json | null
          cqc_rating?: string | null
          created_by?: string | null
          created_date?: string | null
          day_shift_end?: string | null
          day_shift_start?: string | null
          email?: string | null
          enabled_roles?: Json | null
          geofence_enabled?: boolean | null
          geofence_radius_meters?: number | null
          gps_geofence?: Json | null
          id?: string
          internal_locations?: Json | null
          location?: Json | null
          location_coordinates?: Json | null
          name: string
          night_shift_end?: string | null
          night_shift_start?: string | null
          notes?: string | null
          payment_terms?: Json | null
          phone?: string | null
          preferred_staff?: Json | null
          rating?: number | null
          shift_window_type?: string | null
          status?: string | null
          total_bookings?: number | null
          type?: string | null
          updated_date?: string | null
          work_location_coordinates?: string | null
        }
        Update: {
          address?: Json | null
          agency_id?: string
          bed_capacity?: number | null
          billing_email?: string | null
          contact_person?: Json | null
          contract_terms?: Json | null
          cqc_rating?: string | null
          created_by?: string | null
          created_date?: string | null
          day_shift_end?: string | null
          day_shift_start?: string | null
          email?: string | null
          enabled_roles?: Json | null
          geofence_enabled?: boolean | null
          geofence_radius_meters?: number | null
          gps_geofence?: Json | null
          id?: string
          internal_locations?: Json | null
          location?: Json | null
          location_coordinates?: Json | null
          name?: string
          night_shift_end?: string | null
          night_shift_start?: string | null
          notes?: string | null
          payment_terms?: Json | null
          phone?: string | null
          preferred_staff?: Json | null
          rating?: number | null
          shift_window_type?: string | null
          status?: string | null
          total_bookings?: number | null
          type?: string | null
          updated_date?: string | null
          work_location_coordinates?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance: {
        Row: {
          agency_id: string | null
          created_by: string | null
          created_date: string | null
          document_name: string | null
          document_type: string
          document_url: string | null
          expiry_date: string | null
          file_url: string | null
          id: string
          issue_date: string | null
          issuing_authority: string | null
          notes: string | null
          reference_number: string | null
          reminder_14d_sent: boolean | null
          reminder_30d_sent: boolean | null
          reminder_7d_sent: boolean | null
          reminder_sent: boolean | null
          staff_id: string
          status: string | null
          updated_date: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          agency_id?: string | null
          created_by?: string | null
          created_date?: string | null
          document_name?: string | null
          document_type: string
          document_url?: string | null
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          issue_date?: string | null
          issuing_authority?: string | null
          notes?: string | null
          reference_number?: string | null
          reminder_14d_sent?: boolean | null
          reminder_30d_sent?: boolean | null
          reminder_7d_sent?: boolean | null
          reminder_sent?: boolean | null
          staff_id: string
          status?: string | null
          updated_date?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          agency_id?: string | null
          created_by?: string | null
          created_date?: string | null
          document_name?: string | null
          document_type?: string
          document_url?: string | null
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          issue_date?: string | null
          issuing_authority?: string | null
          notes?: string | null
          reference_number?: string | null
          reminder_14d_sent?: boolean | null
          reminder_30d_sent?: boolean | null
          reminder_7d_sent?: boolean | null
          reminder_sent?: boolean | null
          staff_id?: string
          status?: string | null
          updated_date?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          agency_id: string | null
          created_at: string
          id: string
          reason: string | null
          shift_id: string | null
          status: string
          timesheet_id: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          agency_id?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          shift_id?: string | null
          status: string
          timesheet_id?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          agency_id?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          shift_id?: string | null
          status?: string
          timesheet_id?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      groups: {
        Row: {
          agency_id: string
          created_date: string | null
          description: string | null
          id: string
          name: string
          staff_members: string[] | null
          updated_date: string | null
        }
        Insert: {
          agency_id: string
          created_date?: string | null
          description?: string | null
          id?: string
          name: string
          staff_members?: string[] | null
          updated_date?: string | null
        }
        Update: {
          agency_id?: string
          created_date?: string | null
          description?: string | null
          id?: string
          name?: string
          staff_members?: string[] | null
          updated_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "groups_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_amendments: {
        Row: {
          agency_id: string
          amended_by: string | null
          amended_invoice_id: string | null
          amended_total: number | null
          amendment_date: string
          amendment_reason: string | null
          amendment_type: string
          amendment_version: number | null
          amount_change: number
          approved_at: string | null
          approved_by: string | null
          audit_trail: Json | null
          changes_made: Json | null
          client_approved_at: string | null
          client_dispute_reason: string | null
          client_notified_at: string | null
          created_by: string | null
          created_date: string | null
          credit_note_id: string | null
          credit_note_required: boolean | null
          description: string | null
          email_trail: Json | null
          id: string
          invoice_id: string
          metadata: Json | null
          original_invoice_id: string | null
          original_total: number | null
          payment_already_received: boolean | null
          pdf_url: string | null
          reason: string | null
          requires_client_approval: boolean | null
          risk_level: string | null
          sent_at: string | null
          status: string | null
          total_difference: number | null
          updated_date: string | null
        }
        Insert: {
          agency_id: string
          amended_by?: string | null
          amended_invoice_id?: string | null
          amended_total?: number | null
          amendment_date?: string
          amendment_reason?: string | null
          amendment_type: string
          amendment_version?: number | null
          amount_change?: number
          approved_at?: string | null
          approved_by?: string | null
          audit_trail?: Json | null
          changes_made?: Json | null
          client_approved_at?: string | null
          client_dispute_reason?: string | null
          client_notified_at?: string | null
          created_by?: string | null
          created_date?: string | null
          credit_note_id?: string | null
          credit_note_required?: boolean | null
          description?: string | null
          email_trail?: Json | null
          id?: string
          invoice_id: string
          metadata?: Json | null
          original_invoice_id?: string | null
          original_total?: number | null
          payment_already_received?: boolean | null
          pdf_url?: string | null
          reason?: string | null
          requires_client_approval?: boolean | null
          risk_level?: string | null
          sent_at?: string | null
          status?: string | null
          total_difference?: number | null
          updated_date?: string | null
        }
        Update: {
          agency_id?: string
          amended_by?: string | null
          amended_invoice_id?: string | null
          amended_total?: number | null
          amendment_date?: string
          amendment_reason?: string | null
          amendment_type?: string
          amendment_version?: number | null
          amount_change?: number
          approved_at?: string | null
          approved_by?: string | null
          audit_trail?: Json | null
          changes_made?: Json | null
          client_approved_at?: string | null
          client_dispute_reason?: string | null
          client_notified_at?: string | null
          created_by?: string | null
          created_date?: string | null
          credit_note_id?: string | null
          credit_note_required?: boolean | null
          description?: string | null
          email_trail?: Json | null
          id?: string
          invoice_id?: string
          metadata?: Json | null
          original_invoice_id?: string | null
          original_total?: number | null
          payment_already_received?: boolean | null
          pdf_url?: string | null
          reason?: string | null
          requires_client_approval?: boolean | null
          risk_level?: string | null
          sent_at?: string | null
          status?: string | null
          total_difference?: number | null
          updated_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_amendments_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_amendments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          agency_id: string
          amended_at: string | null
          amended_by: string | null
          amendment_reason: string | null
          amendment_version: number | null
          amount_paid: number | null
          amount_paid_date: string | null
          balance_due: number | null
          client_id: string
          created_by: string | null
          created_date: string | null
          due_date: string | null
          id: string
          immutable_sent_snapshot: Json | null
          invoice_date: string
          invoice_number: string | null
          is_amendment: boolean | null
          issued_date: string | null
          last_reminder_sent: string | null
          line_items: Json | null
          notes: string | null
          original_invoice_id: string | null
          paid_date: string | null
          payment_method: string | null
          pdf_url: string | null
          period_end: string | null
          period_start: string | null
          reminder_sent_count: number | null
          sent_at: string | null
          sent_date: string | null
          status: string | null
          subtotal: number | null
          superseded_by_invoice_id: string | null
          timesheet_ids: string[] | null
          total: number | null
          updated_date: string | null
          vat_amount: number | null
          vat_rate: number | null
          viewed_at: string | null
        }
        Insert: {
          agency_id: string
          amended_at?: string | null
          amended_by?: string | null
          amendment_reason?: string | null
          amendment_version?: number | null
          amount_paid?: number | null
          amount_paid_date?: string | null
          balance_due?: number | null
          client_id: string
          created_by?: string | null
          created_date?: string | null
          due_date?: string | null
          id?: string
          immutable_sent_snapshot?: Json | null
          invoice_date: string
          invoice_number?: string | null
          is_amendment?: boolean | null
          issued_date?: string | null
          last_reminder_sent?: string | null
          line_items?: Json | null
          notes?: string | null
          original_invoice_id?: string | null
          paid_date?: string | null
          payment_method?: string | null
          pdf_url?: string | null
          period_end?: string | null
          period_start?: string | null
          reminder_sent_count?: number | null
          sent_at?: string | null
          sent_date?: string | null
          status?: string | null
          subtotal?: number | null
          superseded_by_invoice_id?: string | null
          timesheet_ids?: string[] | null
          total?: number | null
          updated_date?: string | null
          vat_amount?: number | null
          vat_rate?: number | null
          viewed_at?: string | null
        }
        Update: {
          agency_id?: string
          amended_at?: string | null
          amended_by?: string | null
          amendment_reason?: string | null
          amendment_version?: number | null
          amount_paid?: number | null
          amount_paid_date?: string | null
          balance_due?: number | null
          client_id?: string
          created_by?: string | null
          created_date?: string | null
          due_date?: string | null
          id?: string
          immutable_sent_snapshot?: Json | null
          invoice_date?: string
          invoice_number?: string | null
          is_amendment?: boolean | null
          issued_date?: string | null
          last_reminder_sent?: string | null
          line_items?: Json | null
          notes?: string | null
          original_invoice_id?: string | null
          paid_date?: string | null
          payment_method?: string | null
          pdf_url?: string | null
          period_end?: string | null
          period_start?: string | null
          reminder_sent_count?: number | null
          sent_at?: string | null
          sent_date?: string | null
          status?: string | null
          subtotal?: number | null
          superseded_by_invoice_id?: string | null
          timesheet_ids?: string[] | null
          total?: number | null
          updated_date?: string | null
          vat_amount?: number | null
          vat_rate?: number | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_shifts: {
        Row: {
          care_home_id: string
          claimed_at: string | null
          claimed_by_agency_id: string | null
          commission_rate: number | null
          created_date: string | null
          date: string
          description: string | null
          end_time: string
          filled_by_staff_id: string | null
          hourly_rate: number
          id: string
          location_coordinates: Json | null
          requirements: string | null
          role: string
          specialization: string | null
          start_time: string
          status: string | null
          total_hours: number | null
          updated_date: string | null
          urgency: string | null
        }
        Insert: {
          care_home_id: string
          claimed_at?: string | null
          claimed_by_agency_id?: string | null
          commission_rate?: number | null
          created_date?: string | null
          date: string
          description?: string | null
          end_time: string
          filled_by_staff_id?: string | null
          hourly_rate: number
          id?: string
          location_coordinates?: Json | null
          requirements?: string | null
          role: string
          specialization?: string | null
          start_time: string
          status?: string | null
          total_hours?: number | null
          updated_date?: string | null
          urgency?: string | null
        }
        Update: {
          care_home_id?: string
          claimed_at?: string | null
          claimed_by_agency_id?: string | null
          commission_rate?: number | null
          created_date?: string | null
          date?: string
          description?: string | null
          end_time?: string
          filled_by_staff_id?: string | null
          hourly_rate?: number
          id?: string
          location_coordinates?: Json | null
          requirements?: string | null
          role?: string
          specialization?: string | null
          start_time?: string
          status?: string | null
          total_hours?: number | null
          updated_date?: string | null
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_shifts_care_home_id_fkey"
            columns: ["care_home_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_shifts_claimed_by_agency_id_fkey"
            columns: ["claimed_by_agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_shifts_filled_by_staff_id_fkey"
            columns: ["filled_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_queue: {
        Row: {
          agency_id: string | null
          channel: string | null
          content: string | null
          created_at: string | null
          created_by: string | null
          created_date: string | null
          email_message_id: string | null
          error_message: string | null
          id: string
          item_count: number | null
          message: string
          metadata: Json | null
          notification_type: string
          pending_items: Json | null
          priority: string | null
          recipient_email: string | null
          recipient_first_name: string | null
          recipient_id: string | null
          recipient_phone: string | null
          recipient_type: string
          retry_count: number | null
          scheduled_for: string | null
          scheduled_send_at: string | null
          sent: boolean | null
          sent_at: string | null
          status: string | null
          subject: string | null
          type: string | null
          updated_date: string | null
          user_id: string | null
        }
        Insert: {
          agency_id?: string | null
          channel?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          created_date?: string | null
          email_message_id?: string | null
          error_message?: string | null
          id?: string
          item_count?: number | null
          message: string
          metadata?: Json | null
          notification_type: string
          pending_items?: Json | null
          priority?: string | null
          recipient_email?: string | null
          recipient_first_name?: string | null
          recipient_id?: string | null
          recipient_phone?: string | null
          recipient_type: string
          retry_count?: number | null
          scheduled_for?: string | null
          scheduled_send_at?: string | null
          sent?: boolean | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          type?: string | null
          updated_date?: string | null
          user_id?: string | null
        }
        Update: {
          agency_id?: string | null
          channel?: string | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          created_date?: string | null
          email_message_id?: string | null
          error_message?: string | null
          id?: string
          item_count?: number | null
          message?: string
          metadata?: Json | null
          notification_type?: string
          pending_items?: Json | null
          priority?: string | null
          recipient_email?: string | null
          recipient_first_name?: string | null
          recipient_id?: string | null
          recipient_phone?: string | null
          recipient_type?: string
          retry_count?: number | null
          scheduled_for?: string | null
          scheduled_send_at?: string | null
          sent?: boolean | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          type?: string | null
          updated_date?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_queue_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          delivered_at: string | null
          error_message: string | null
          failed_at: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          phone_number: string
          read_at: string | null
          sent_at: string | null
          staff_id: string | null
          status: string
          template_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          phone_number: string
          read_at?: string | null
          sent_at?: string | null
          staff_id?: string | null
          status?: string
          template_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          phone_number?: string
          read_at?: string | null
          sent_at?: string | null
          staff_id?: string | null
          status?: string
          template_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      operational_costs: {
        Row: {
          agency_id: string
          amount: number
          billing_period: string | null
          category: string | null
          cost_date: string
          cost_per_shift: number | null
          cost_type: string
          created_by: string | null
          created_date: string | null
          currency: string | null
          description: string | null
          id: string
          invoice_id: string | null
          invoice_url: string | null
          metadata: Json | null
          notes: string | null
          paid_date: string | null
          projected_cost: number | null
          roi_impact: string | null
          service_category: string | null
          service_name: string | null
          shift_id: string | null
          staff_id: string | null
          status: string | null
          updated_date: string | null
          usage_metrics: Json | null
        }
        Insert: {
          agency_id: string
          amount?: number
          billing_period?: string | null
          category?: string | null
          cost_date: string
          cost_per_shift?: number | null
          cost_type: string
          created_by?: string | null
          created_date?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          invoice_id?: string | null
          invoice_url?: string | null
          metadata?: Json | null
          notes?: string | null
          paid_date?: string | null
          projected_cost?: number | null
          roi_impact?: string | null
          service_category?: string | null
          service_name?: string | null
          shift_id?: string | null
          staff_id?: string | null
          status?: string | null
          updated_date?: string | null
          usage_metrics?: Json | null
        }
        Update: {
          agency_id?: string
          amount?: number
          billing_period?: string | null
          category?: string | null
          cost_date?: string
          cost_per_shift?: number | null
          cost_type?: string
          created_by?: string | null
          created_date?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          invoice_id?: string | null
          invoice_url?: string | null
          metadata?: Json | null
          notes?: string | null
          paid_date?: string | null
          projected_cost?: number | null
          roi_impact?: string | null
          service_category?: string | null
          service_name?: string | null
          shift_id?: string | null
          staff_id?: string | null
          status?: string | null
          updated_date?: string | null
          usage_metrics?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "operational_costs_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_costs_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_costs_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_costs_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts_formatted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_costs_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      payslips: {
        Row: {
          agency_id: string
          bank_details: Json | null
          created_by: string | null
          created_date: string | null
          deductions: number | null
          gross_pay: number | null
          id: string
          net_pay: number | null
          ni: number | null
          notes: string | null
          paid_at: string | null
          payment_date: string | null
          payment_method: string | null
          payslip_number: string | null
          pdf_url: string | null
          pension: number | null
          period_end: string
          period_start: string
          staff_id: string
          status: string | null
          tax: number | null
          timesheets: Json | null
          total_deductions: number | null
          total_hours: number | null
          updated_date: string | null
        }
        Insert: {
          agency_id: string
          bank_details?: Json | null
          created_by?: string | null
          created_date?: string | null
          deductions?: number | null
          gross_pay?: number | null
          id?: string
          net_pay?: number | null
          ni?: number | null
          notes?: string | null
          paid_at?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payslip_number?: string | null
          pdf_url?: string | null
          pension?: number | null
          period_end: string
          period_start: string
          staff_id: string
          status?: string | null
          tax?: number | null
          timesheets?: Json | null
          total_deductions?: number | null
          total_hours?: number | null
          updated_date?: string | null
        }
        Update: {
          agency_id?: string
          bank_details?: Json | null
          created_by?: string | null
          created_date?: string | null
          deductions?: number | null
          gross_pay?: number | null
          id?: string
          net_pay?: number | null
          ni?: number | null
          notes?: string | null
          paid_at?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payslip_number?: string | null
          pdf_url?: string | null
          pension?: number | null
          period_end?: string
          period_start?: string
          staff_id?: string
          status?: string | null
          tax?: number | null
          timesheets?: Json | null
          total_deductions?: number | null
          total_hours?: number | null
          updated_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payslips_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          agency_id: string | null
          client_id: string | null
          created_at: string | null
          created_date: string | null
          email: string
          full_name: string | null
          id: string
          is_super_admin: boolean | null
          phone: string | null
          profile_photo_url: string | null
          role: string | null
          updated_at: string | null
          user_type: string | null
        }
        Insert: {
          agency_id?: string | null
          client_id?: string | null
          created_at?: string | null
          created_date?: string | null
          email: string
          full_name?: string | null
          id: string
          is_super_admin?: boolean | null
          phone?: string | null
          profile_photo_url?: string | null
          role?: string | null
          updated_at?: string | null
          user_type?: string | null
        }
        Update: {
          agency_id?: string | null
          client_id?: string | null
          created_at?: string | null
          created_date?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_super_admin?: boolean | null
          phone?: string | null
          profile_photo_url?: string | null
          role?: string | null
          updated_at?: string | null
          user_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          actual_staff_id: string | null
          admin_closed_at: string | null
          admin_closed_by: string | null
          admin_closure_outcome: string | null
          admin_closure_required: boolean | null
          agency_id: string
          approaching_staff_location: Json | null
          archived: boolean | null
          archived_at: string | null
          assigned_staff_id: string | null
          booking_id: string | null
          break_duration_minutes: number | null
          broadcast_sent_at: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          charge_rate: number | null
          client_id: string
          confirmation_reminder_sent: boolean | null
          created_by: string | null
          created_date: string | null
          date: string
          duration_hours: number | null
          end_time: string
          escalation_deadline: string | null
          financial_locked: boolean | null
          financial_locked_at: string | null
          financial_locked_by: string | null
          financial_snapshot: Json | null
          id: string
          is_replacement: boolean | null
          location: string | null
          marketplace_added_at: string | null
          marketplace_visible: boolean | null
          notes: string | null
          on_duty_contact: Json | null
          pay_rate: number | null
          pay_rate_override: Json | null
          reassignment_history: Json | null
          recurrence_pattern: string | null
          recurring: boolean | null
          reminder_24h_sent: boolean | null
          reminder_24h_sent_at: string | null
          reminder_2h_sent: boolean | null
          reminder_2h_sent_at: string | null
          replaced_shift_id: string | null
          requirements: Json | null
          role: string | null
          role_required: string
          shift_ended_at: string | null
          shift_journey_log: Json | null
          shift_started_at: string | null
          shift_type: string
          staff_confirmation_confidence_score: number | null
          staff_confirmation_method: string | null
          staff_confirmation_requested_at: string | null
          staff_confirmed_at: string | null
          staff_confirmed_completion: boolean | null
          start_time: string
          status: string | null
          timesheet_id: string | null
          timesheet_received: boolean | null
          timesheet_received_at: string | null
          timesheet_reminder_sent: boolean | null
          timesheet_reminder_sent_at: string | null
          updated_date: string | null
          urgency: string | null
          verification_workflow_id: string | null
          work_location_within_site: string | null
        }
        Insert: {
          actual_staff_id?: string | null
          admin_closed_at?: string | null
          admin_closed_by?: string | null
          admin_closure_outcome?: string | null
          admin_closure_required?: boolean | null
          agency_id: string
          approaching_staff_location?: Json | null
          archived?: boolean | null
          archived_at?: string | null
          assigned_staff_id?: string | null
          booking_id?: string | null
          break_duration_minutes?: number | null
          broadcast_sent_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          charge_rate?: number | null
          client_id: string
          confirmation_reminder_sent?: boolean | null
          created_by?: string | null
          created_date?: string | null
          date: string
          duration_hours?: number | null
          end_time?: string
          escalation_deadline?: string | null
          financial_locked?: boolean | null
          financial_locked_at?: string | null
          financial_locked_by?: string | null
          financial_snapshot?: Json | null
          id?: string
          is_replacement?: boolean | null
          location?: string | null
          marketplace_added_at?: string | null
          marketplace_visible?: boolean | null
          notes?: string | null
          on_duty_contact?: Json | null
          pay_rate?: number | null
          pay_rate_override?: Json | null
          reassignment_history?: Json | null
          recurrence_pattern?: string | null
          recurring?: boolean | null
          reminder_24h_sent?: boolean | null
          reminder_24h_sent_at?: string | null
          reminder_2h_sent?: boolean | null
          reminder_2h_sent_at?: string | null
          replaced_shift_id?: string | null
          requirements?: Json | null
          role?: string | null
          role_required: string
          shift_ended_at?: string | null
          shift_journey_log?: Json | null
          shift_started_at?: string | null
          shift_type: string
          staff_confirmation_confidence_score?: number | null
          staff_confirmation_method?: string | null
          staff_confirmation_requested_at?: string | null
          staff_confirmed_at?: string | null
          staff_confirmed_completion?: boolean | null
          start_time?: string
          status?: string | null
          timesheet_id?: string | null
          timesheet_received?: boolean | null
          timesheet_received_at?: string | null
          timesheet_reminder_sent?: boolean | null
          timesheet_reminder_sent_at?: string | null
          updated_date?: string | null
          urgency?: string | null
          verification_workflow_id?: string | null
          work_location_within_site?: string | null
        }
        Update: {
          actual_staff_id?: string | null
          admin_closed_at?: string | null
          admin_closed_by?: string | null
          admin_closure_outcome?: string | null
          admin_closure_required?: boolean | null
          agency_id?: string
          approaching_staff_location?: Json | null
          archived?: boolean | null
          archived_at?: string | null
          assigned_staff_id?: string | null
          booking_id?: string | null
          break_duration_minutes?: number | null
          broadcast_sent_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          charge_rate?: number | null
          client_id?: string
          confirmation_reminder_sent?: boolean | null
          created_by?: string | null
          created_date?: string | null
          date?: string
          duration_hours?: number | null
          end_time?: string
          escalation_deadline?: string | null
          financial_locked?: boolean | null
          financial_locked_at?: string | null
          financial_locked_by?: string | null
          financial_snapshot?: Json | null
          id?: string
          is_replacement?: boolean | null
          location?: string | null
          marketplace_added_at?: string | null
          marketplace_visible?: boolean | null
          notes?: string | null
          on_duty_contact?: Json | null
          pay_rate?: number | null
          pay_rate_override?: Json | null
          reassignment_history?: Json | null
          recurrence_pattern?: string | null
          recurring?: boolean | null
          reminder_24h_sent?: boolean | null
          reminder_24h_sent_at?: string | null
          reminder_2h_sent?: boolean | null
          reminder_2h_sent_at?: string | null
          replaced_shift_id?: string | null
          requirements?: Json | null
          role?: string | null
          role_required?: string
          shift_ended_at?: string | null
          shift_journey_log?: Json | null
          shift_started_at?: string | null
          shift_type?: string
          staff_confirmation_confidence_score?: number | null
          staff_confirmation_method?: string | null
          staff_confirmation_requested_at?: string | null
          staff_confirmed_at?: string | null
          staff_confirmed_completion?: boolean | null
          start_time?: string
          status?: string | null
          timesheet_id?: string | null
          timesheet_received?: boolean | null
          timesheet_received_at?: string | null
          timesheet_reminder_sent?: boolean | null
          timesheet_reminder_sent_at?: string | null
          updated_date?: string | null
          urgency?: string | null
          verification_workflow_id?: string | null
          work_location_within_site?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shifts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_assigned_staff_id_fkey"
            columns: ["assigned_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          address: Json | null
          agency_id: string
          availability: Json | null
          can_work_as_senior: boolean | null
          created_by: string | null
          created_date: string | null
          date_joined: string | null
          date_of_birth: string | null
          driving_license_expiry: string | null
          driving_license_number: string | null
          email: string | null
          emergency_contact: Json | null
          employment_history: Json | null
          employment_type: string | null
          first_name: string
          gps_consent: boolean | null
          gps_consent_date: string | null
          gps_consent_status: string | null
          groups: Json | null
          hourly_rate: number | null
          id: string
          invite_expires: string | null
          invite_token: string | null
          last_known_location: Json | null
          last_name: string
          mandatory_training: Json | null
          medication_trained: boolean | null
          medication_training_expiry: string | null
          months_of_experience: number | null
          nmc_pin: string | null
          nmc_register_part: string | null
          occupational_health: Json | null
          opt_out_shift_reminders: boolean | null
          phone: string | null
          profile_photo_uploaded_date: string | null
          profile_photo_url: string | null
          proposed_first_shift_date: string | null
          rating: number | null
          references: Json | null
          role: string
          role_hierarchy: Json | null
          skills: Json | null
          status: string | null
          suspension_reason: string | null
          total_shifts_completed: number | null
          updated_date: string | null
          user_id: string | null
          whatsapp_linked_at: string | null
          whatsapp_number: string | null
          whatsapp_number_verified: string | null
          whatsapp_pin: string | null
        }
        Insert: {
          address?: Json | null
          agency_id: string
          availability?: Json | null
          can_work_as_senior?: boolean | null
          created_by?: string | null
          created_date?: string | null
          date_joined?: string | null
          date_of_birth?: string | null
          driving_license_expiry?: string | null
          driving_license_number?: string | null
          email?: string | null
          emergency_contact?: Json | null
          employment_history?: Json | null
          employment_type?: string | null
          first_name: string
          gps_consent?: boolean | null
          gps_consent_date?: string | null
          gps_consent_status?: string | null
          groups?: Json | null
          hourly_rate?: number | null
          id?: string
          invite_expires?: string | null
          invite_token?: string | null
          last_known_location?: Json | null
          last_name: string
          mandatory_training?: Json | null
          medication_trained?: boolean | null
          medication_training_expiry?: string | null
          months_of_experience?: number | null
          nmc_pin?: string | null
          nmc_register_part?: string | null
          occupational_health?: Json | null
          opt_out_shift_reminders?: boolean | null
          phone?: string | null
          profile_photo_uploaded_date?: string | null
          profile_photo_url?: string | null
          proposed_first_shift_date?: string | null
          rating?: number | null
          references?: Json | null
          role: string
          role_hierarchy?: Json | null
          skills?: Json | null
          status?: string | null
          suspension_reason?: string | null
          total_shifts_completed?: number | null
          updated_date?: string | null
          user_id?: string | null
          whatsapp_linked_at?: string | null
          whatsapp_number?: string | null
          whatsapp_number_verified?: string | null
          whatsapp_pin?: string | null
        }
        Update: {
          address?: Json | null
          agency_id?: string
          availability?: Json | null
          can_work_as_senior?: boolean | null
          created_by?: string | null
          created_date?: string | null
          date_joined?: string | null
          date_of_birth?: string | null
          driving_license_expiry?: string | null
          driving_license_number?: string | null
          email?: string | null
          emergency_contact?: Json | null
          employment_history?: Json | null
          employment_type?: string | null
          first_name?: string
          gps_consent?: boolean | null
          gps_consent_date?: string | null
          gps_consent_status?: string | null
          groups?: Json | null
          hourly_rate?: number | null
          id?: string
          invite_expires?: string | null
          invite_token?: string | null
          last_known_location?: Json | null
          last_name?: string
          mandatory_training?: Json | null
          medication_trained?: boolean | null
          medication_training_expiry?: string | null
          months_of_experience?: number | null
          nmc_pin?: string | null
          nmc_register_part?: string | null
          occupational_health?: Json | null
          opt_out_shift_reminders?: boolean | null
          phone?: string | null
          profile_photo_uploaded_date?: string | null
          profile_photo_url?: string | null
          proposed_first_shift_date?: string | null
          rating?: number | null
          references?: Json | null
          role?: string
          role_hierarchy?: Json | null
          skills?: Json | null
          status?: string | null
          suspension_reason?: string | null
          total_shifts_completed?: number | null
          updated_date?: string | null
          user_id?: string | null
          whatsapp_linked_at?: string | null
          whatsapp_number?: string | null
          whatsapp_number_verified?: string | null
          whatsapp_pin?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheets: {
        Row: {
          actual_end_time: string | null
          actual_start_time: string | null
          agency_id: string
          approval_notes: string | null
          approved_at: string | null
          approved_by: string | null
          auto_approved: boolean | null
          booking_id: string | null
          break_duration: number | null
          break_duration_minutes: number | null
          break_minutes: number | null
          charge_rate: number | null
          client_approved_at: string | null
          client_charge_amount: number | null
          client_id: string | null
          client_signature: string | null
          clock_in: string | null
          clock_in_location: Json | null
          clock_in_photo: string | null
          clock_in_time: string | null
          clock_out: string | null
          clock_out_geofence_distance_meters: number | null
          clock_out_geofence_validated: boolean | null
          clock_out_location: Json | null
          clock_out_photo: string | null
          clock_out_time: string | null
          created_at: string | null
          created_by: string | null
          created_date: string | null
          device_info: Json | null
          end_time: string | null
          financial_locked: boolean | null
          financial_locked_at: string | null
          financial_locked_by: string | null
          financial_snapshot: Json | null
          geofence_distance_meters: number | null
          geofence_validated: boolean | null
          geofence_violation_reason: string | null
          gps_validation_status: string | null
          hourly_rate: number | null
          hours_worked: number | null
          id: string
          incomplete_flag: boolean | null
          incomplete_reason: string | null
          invoice_id: string | null
          ip_address: string | null
          location_in: Json | null
          location_out: Json | null
          location_verified: boolean | null
          notes: string | null
          overtime_flag: boolean | null
          overtime_hours: number | null
          pay_rate: number | null
          payslip_id: string | null
          raw_total_hours: number | null
          rejection_reason: string | null
          shift_date: string | null
          shift_id: string | null
          staff_approved_at: string | null
          staff_id: string
          staff_pay_amount: number | null
          staff_signature: string | null
          start_time: string | null
          status: string | null
          total_amount: number | null
          total_hours: number | null
          updated_at: string | null
          updated_date: string | null
          uploaded_documents: Json | null
          validation_completed_at: string | null
          validation_confidence: number | null
          validation_decision: string | null
          validation_issues: Json | null
          validation_notes: string | null
          validation_warnings: Json | null
          verified_at_location: boolean | null
          week_ending: string | null
          work_location_within_site: string | null
        }
        Insert: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          agency_id: string
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          auto_approved?: boolean | null
          booking_id?: string | null
          break_duration?: number | null
          break_duration_minutes?: number | null
          break_minutes?: number | null
          charge_rate?: number | null
          client_approved_at?: string | null
          client_charge_amount?: number | null
          client_id?: string | null
          client_signature?: string | null
          clock_in?: string | null
          clock_in_location?: Json | null
          clock_in_photo?: string | null
          clock_in_time?: string | null
          clock_out?: string | null
          clock_out_geofence_distance_meters?: number | null
          clock_out_geofence_validated?: boolean | null
          clock_out_location?: Json | null
          clock_out_photo?: string | null
          clock_out_time?: string | null
          created_at?: string | null
          created_by?: string | null
          created_date?: string | null
          device_info?: Json | null
          end_time?: string | null
          financial_locked?: boolean | null
          financial_locked_at?: string | null
          financial_locked_by?: string | null
          financial_snapshot?: Json | null
          geofence_distance_meters?: number | null
          geofence_validated?: boolean | null
          geofence_violation_reason?: string | null
          gps_validation_status?: string | null
          hourly_rate?: number | null
          hours_worked?: number | null
          id?: string
          incomplete_flag?: boolean | null
          incomplete_reason?: string | null
          invoice_id?: string | null
          ip_address?: string | null
          location_in?: Json | null
          location_out?: Json | null
          location_verified?: boolean | null
          notes?: string | null
          overtime_flag?: boolean | null
          overtime_hours?: number | null
          pay_rate?: number | null
          payslip_id?: string | null
          raw_total_hours?: number | null
          rejection_reason?: string | null
          shift_date?: string | null
          shift_id?: string | null
          staff_approved_at?: string | null
          staff_id: string
          staff_pay_amount?: number | null
          staff_signature?: string | null
          start_time?: string | null
          status?: string | null
          total_amount?: number | null
          total_hours?: number | null
          updated_at?: string | null
          updated_date?: string | null
          uploaded_documents?: Json | null
          validation_completed_at?: string | null
          validation_confidence?: number | null
          validation_decision?: string | null
          validation_issues?: Json | null
          validation_notes?: string | null
          validation_warnings?: Json | null
          verified_at_location?: boolean | null
          week_ending?: string | null
          work_location_within_site?: string | null
        }
        Update: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          agency_id?: string
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          auto_approved?: boolean | null
          booking_id?: string | null
          break_duration?: number | null
          break_duration_minutes?: number | null
          break_minutes?: number | null
          charge_rate?: number | null
          client_approved_at?: string | null
          client_charge_amount?: number | null
          client_id?: string | null
          client_signature?: string | null
          clock_in?: string | null
          clock_in_location?: Json | null
          clock_in_photo?: string | null
          clock_in_time?: string | null
          clock_out?: string | null
          clock_out_geofence_distance_meters?: number | null
          clock_out_geofence_validated?: boolean | null
          clock_out_location?: Json | null
          clock_out_photo?: string | null
          clock_out_time?: string | null
          created_at?: string | null
          created_by?: string | null
          created_date?: string | null
          device_info?: Json | null
          end_time?: string | null
          financial_locked?: boolean | null
          financial_locked_at?: string | null
          financial_locked_by?: string | null
          financial_snapshot?: Json | null
          geofence_distance_meters?: number | null
          geofence_validated?: boolean | null
          geofence_violation_reason?: string | null
          gps_validation_status?: string | null
          hourly_rate?: number | null
          hours_worked?: number | null
          id?: string
          incomplete_flag?: boolean | null
          incomplete_reason?: string | null
          invoice_id?: string | null
          ip_address?: string | null
          location_in?: Json | null
          location_out?: Json | null
          location_verified?: boolean | null
          notes?: string | null
          overtime_flag?: boolean | null
          overtime_hours?: number | null
          pay_rate?: number | null
          payslip_id?: string | null
          raw_total_hours?: number | null
          rejection_reason?: string | null
          shift_date?: string | null
          shift_id?: string | null
          staff_approved_at?: string | null
          staff_id?: string
          staff_pay_amount?: number | null
          staff_signature?: string | null
          start_time?: string | null
          status?: string | null
          total_amount?: number | null
          total_hours?: number | null
          updated_at?: string | null
          updated_date?: string | null
          uploaded_documents?: Json | null
          validation_completed_at?: string | null
          validation_confidence?: number | null
          validation_decision?: string | null
          validation_issues?: Json | null
          validation_notes?: string | null
          validation_warnings?: Json | null
          verified_at_location?: boolean | null
          week_ending?: string | null
          work_location_within_site?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timesheets_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts_formatted"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      cron_job_runs: {
        Row: {
          command: string | null
          database: string | null
          end_time: string | null
          job_pid: number | null
          jobid: number | null
          jobname: string | null
          return_message: string | null
          runid: number | null
          start_time: string | null
          status: string | null
          username: string | null
        }
        Relationships: []
      }
      cron_job_status: {
        Row: {
          active: boolean | null
          command: string | null
          database: string | null
          jobid: number | null
          jobname: string | null
          nodename: string | null
          nodeport: number | null
          schedule: string | null
          username: string | null
        }
        Insert: {
          active?: boolean | null
          command?: string | null
          database?: string | null
          jobid?: number | null
          jobname?: string | null
          nodename?: string | null
          nodeport?: number | null
          schedule?: string | null
          username?: string | null
        }
        Update: {
          active?: boolean | null
          command?: string | null
          database?: string | null
          jobid?: number | null
          jobname?: string | null
          nodename?: string | null
          nodeport?: number | null
          schedule?: string | null
          username?: string | null
        }
        Relationships: []
      }
      shifts_formatted: {
        Row: {
          duration_hours: number | null
          end_time: string | null
          id: string | null
          shift_type: string | null
          start_time: string | null
        }
        Insert: {
          duration_hours?: number | null
          end_time?: never
          id?: string | null
          shift_type?: string | null
          start_time?: never
        }
        Update: {
          duration_hours?: number | null
          end_time?: never
          id?: string | null
          shift_type?: string | null
          start_time?: never
        }
        Relationships: []
      }
    }
    Functions: {
      backfill_shift_type: { Args: never; Returns: undefined }
      backfill_shift_type_safe: {
        Args: never
        Returns: {
          updated_count: number
        }[]
      }
      bulk_update_past_shifts_to_awaiting_closure: {
        Args: { cutoff_date: string }
        Returns: {
          updated_count: number
        }[]
      }
      create_agency_with_admin: {
        Args: {
          p_address?: Json
          p_admin_email: string
          p_admin_full_name?: string
          p_bank_details?: Json
          p_billing_email?: string
          p_contact_email: string
          p_contact_phone?: string
          p_invoice_frequency?: string
          p_name: string
          p_payment_terms_days?: number
          p_registration_number?: string
          p_status?: string
          p_vat_number?: string
        }
        Returns: {
          admin_email: string
          admin_name: string
          agency_id: string
          invitation_id: string
          invite_token: string
        }[]
      }
      delete_all_shift_data: { Args: never; Returns: Json }
      get_user_agency: { Args: never; Returns: string }
      get_user_agency_id: { Args: never; Returns: string }
      get_user_client_id: { Args: never; Returns: string }
      get_user_profile: {
        Args: never
        Returns: {
          agency_id: string
          client_id: string
          email: string
          full_name: string
          id: string
          phone: string
          profile_photo_url: string
          user_type: string
        }[]
      }
      get_user_type: { Args: never; Returns: string }
      is_agency_admin: { Args: never; Returns: boolean }
      is_agency_staff: { Args: never; Returns: boolean }
      is_client: { Args: never; Returns: boolean }
      is_super_admin:
        | { Args: { user_id: string }; Returns: boolean }
        | { Args: never; Returns: boolean }
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
