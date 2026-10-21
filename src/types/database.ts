export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string;
          client_name: string;
          contact_name: string | null;
          organization: string;
          email: string | null;
          phone: string | null;
          parcel_address: string;
          city: string;
          state: string;
          deal_stage: "meeting_1" | "meeting_2" | "demo_prep" | "proposal" | "contract" | "active";
          alerts_enabled: boolean;
          target_programs: string[];
          original_call_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_name: string;
          contact_name?: string | null;
          organization: string;
          email?: string | null;
          phone?: string | null;
          parcel_address: string;
          city: string;
          state: string;
          deal_stage?: "meeting_1" | "meeting_2" | "demo_prep" | "proposal" | "contract" | "active";
          alerts_enabled?: boolean;
          target_programs?: string[];
          original_call_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["clients"]["Insert"]>;
        Relationships: [];
      };
      transcripts: {
        Row: {
          id: string;
          client_id: string | null;
          project_label: string;
          organization: string;
          meeting_type: "meeting_1" | "meeting_2" | "ad_hoc" | "funding_feed";
          source: "Granola" | "Zoom" | "Manual" | "Grants.gov";
          call_date: string;
          programs: string[];
          status: "new" | "extracting" | "ready" | "approved";
          stage: "intake" | "extracted" | "in-review" | "approved";
          raw_text: string;
          external_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id?: string | null;
          project_label: string;
          organization: string;
          meeting_type?: "meeting_1" | "meeting_2" | "ad_hoc" | "funding_feed";
          source?: "Granola" | "Zoom" | "Manual" | "Grants.gov";
          call_date?: string;
          programs?: string[];
          status?: "new" | "extracting" | "ready" | "approved";
          stage?: "intake" | "extracted" | "in-review" | "approved";
          raw_text: string;
          external_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["transcripts"]["Insert"]>;
        Relationships: [];
      };
      extractions: {
        Row: {
          id: string;
          transcript_id: string | null;
          client_id: string | null;
          category:
            "pain_point" | "required_info" | "missing_document" | "next_step" | "state_subsidy";
          title: string;
          body: string;
          facts: string[];
          routing: "program-level" | "site-level";
          status: "pending" | "approved" | "rejected";
          confidence: "High" | "Medium" | "Low";
          created_at: string;
        };
        Insert: {
          id?: string;
          transcript_id?: string | null;
          client_id?: string | null;
          category:
            "pain_point" | "required_info" | "missing_document" | "next_step" | "state_subsidy";
          title: string;
          body: string;
          facts?: string[];
          routing?: "program-level" | "site-level";
          status?: "pending" | "approved" | "rejected";
          confidence?: "High" | "Medium" | "Low";
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["extractions"]["Insert"]>;
        Relationships: [];
      };
      knowledge_programs: {
        Row: {
          id: string;
          name: string;
          state: string;
          administrator: string;
          level: "Federal" | "State" | "Local" | "Quasi";
          jurisdiction: string;
          cities: string[];
          coverage: number;
          funds: string;
          overview: string;
          eligibility_criteria: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          state: string;
          administrator: string;
          level: "Federal" | "State" | "Local" | "Quasi";
          jurisdiction: string;
          cities?: string[];
          coverage?: number;
          funds: string;
          overview: string;
          eligibility_criteria?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["knowledge_programs"]["Insert"]>;
        Relationships: [];
      };
      program_notes: {
        Row: {
          id: string;
          program_id: string;
          state: string;
          text: string;
          source_call: string | null;
          call_date: string | null;
          routing: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          program_id: string;
          state: string;
          text: string;
          source_call?: string | null;
          call_date?: string | null;
          routing?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["program_notes"]["Insert"]>;
        Relationships: [];
      };
      program_contacts: {
        Row: {
          id: string;
          program_id: string;
          name: string;
          title: string;
          org: string;
          phone: string | null;
          email: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          program_id: string;
          name: string;
          title: string;
          org: string;
          phone?: string | null;
          email?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["program_contacts"]["Insert"]>;
        Relationships: [];
      };
      program_documents: {
        Row: {
          id: string;
          program_id: string;
          title: string;
          kind: string;
          citation: string;
          approved_on: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          program_id: string;
          title: string;
          kind: string;
          citation: string;
          approved_on: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["program_documents"]["Insert"]>;
        Relationships: [];
      };
      app_documents: {
        Row: {
          id: string;
          client_id: string | null;
          program_id: string | null;
          title: string;
          type: string;
          program: string | null;
          jurisdiction: string | null;
          state: string | null;
          status: "Approved" | "Pending review" | "Needed";
          added_on: string | null;
          file_name: string;
          storage_path: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id?: string | null;
          program_id?: string | null;
          title: string;
          type: string;
          program?: string | null;
          jurisdiction?: string | null;
          state?: string | null;
          status?: "Approved" | "Pending review" | "Needed";
          added_on?: string | null;
          file_name: string;
          storage_path?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["app_documents"]["Insert"]>;
        Relationships: [];
      };
      client_alerts: {
        Row: {
          id: string;
          client_id: string;
          title: string;
          trigger: string;
          status: "draft" | "approved" | "sent";
          created_on: string | null;
          sent_on: string | null;
          draft_email: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          title: string;
          trigger: string;
          status?: "draft" | "approved" | "sent";
          created_on?: string | null;
          sent_on?: string | null;
          draft_email: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["client_alerts"]["Insert"]>;
        Relationships: [];
      };
      proposals_and_reports: {
        Row: {
          id: string;
          client_id: string;
          project_label: string;
          report_type: "proposal" | "demo" | "contract_spec" | "stacking_report";
          title: string;
          generated_on: string | null;
          program_count: number;
          parcel_summary: string | null;
          focus: string[];
          programs: Json;
          stacking: string | null;
          cash_flow: Json;
          citations: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          project_label: string;
          report_type?: "proposal" | "demo" | "contract_spec" | "stacking_report";
          title: string;
          generated_on?: string | null;
          program_count?: number;
          parcel_summary?: string | null;
          focus?: string[];
          programs?: Json;
          stacking?: string | null;
          cash_flow?: Json;
          citations?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["proposals_and_reports"]["Insert"]>;
        Relationships: [];
      };
      answer_log: {
        Row: {
          id: string;
          question: string;
          answer: string;
          state: string | null;
          parcel: string | null;
          citations: Json;
          source: "chatbot" | "preview" | "manual";
          rating: "good" | "needs-work" | "wrong" | null;
          failure_cause: "retrieval" | "prompt" | "not-loaded" | null;
          review_note: string | null;
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          question: string;
          answer: string;
          state?: string | null;
          parcel?: string | null;
          citations?: Json;
          source?: "chatbot" | "preview" | "manual";
          rating?: "good" | "needs-work" | "wrong" | null;
          failure_cause?: "retrieval" | "prompt" | "not-loaded" | null;
          review_note?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["answer_log"]["Insert"]>;
        Relationships: [];
      };
      golden_set: {
        Row: {
          id: string;
          question: string;
          state: string;
          expected_answer: string;
          required_programs: string[];
          source_answer_id: string | null;
          last_run_at: string | null;
          last_run_answer: string | null;
          last_run_passed: boolean | null;
          last_run_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          question: string;
          state: string;
          expected_answer: string;
          required_programs?: string[];
          source_answer_id?: string | null;
          last_run_at?: string | null;
          last_run_answer?: string | null;
          last_run_passed?: boolean | null;
          last_run_reason?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["golden_set"]["Insert"]>;
        Relationships: [];
      };
      funding_feed_dismissed: {
        Row: {
          opportunity_id: string;
          title: string;
          dismissed_at: string;
        };
        Insert: {
          opportunity_id: string;
          title: string;
          dismissed_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["funding_feed_dismissed"]["Insert"]>;
        Relationships: [];
      };
      app_activity_log: {
        Row: {
          id: string;
          action: string;
          subject: string;
          detail: string;
          occurred_at: string;
          status: "approved" | "review" | "generated" | "updated";
          created_at: string;
        };
        Insert: {
          id?: string;
          action: string;
          subject: string;
          detail: string;
          occurred_at?: string;
          status?: "approved" | "review" | "generated" | "updated";
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["app_activity_log"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
