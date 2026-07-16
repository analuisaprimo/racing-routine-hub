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
      notification_prefs: {
        Row: {
          aviso_bloco: boolean
          aviso_scuderia: boolean
          aviso_transicao: boolean
          celebracao: boolean
          streak_risco: boolean
          user_id: string
          wind_down: boolean
        }
        Insert: {
          aviso_bloco?: boolean
          aviso_scuderia?: boolean
          aviso_transicao?: boolean
          celebracao?: boolean
          streak_risco?: boolean
          user_id: string
          wind_down?: boolean
        }
        Update: {
          aviso_bloco?: boolean
          aviso_scuderia?: boolean
          aviso_transicao?: boolean
          celebracao?: boolean
          streak_risco?: boolean
          user_id?: string
          wind_down?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          academia_duracao_min: number | null
          created_at: string
          id: string
          nome: string
          onboarding_completo: boolean
          peso_enem: number | null
          peso_escola: number | null
          peso_vestibular: number | null
          sono_fim: string | null
          sono_inicio: string | null
          temporada_label: string | null
          updated_at: string
        }
        Insert: {
          academia_duracao_min?: number | null
          created_at?: string
          id: string
          nome?: string
          onboarding_completo?: boolean
          peso_enem?: number | null
          peso_escola?: number | null
          peso_vestibular?: number | null
          sono_fim?: string | null
          sono_inicio?: string | null
          temporada_label?: string | null
          updated_at?: string
        }
        Update: {
          academia_duracao_min?: number | null
          created_at?: string
          id?: string
          nome?: string
          onboarding_completo?: boolean
          peso_enem?: number | null
          peso_escola?: number | null
          peso_vestibular?: number | null
          sono_fim?: string | null
          sono_inicio?: string | null
          temporada_label?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      routine_blocks: {
        Row: {
          created_at: string
          dia_semana: number
          fim: string
          id: string
          inicio: string
          label: string | null
          tipo: Database["public"]["Enums"]["block_type"]
          travado: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          dia_semana: number
          fim: string
          id?: string
          inicio: string
          label?: string | null
          tipo: Database["public"]["Enums"]["block_type"]
          travado?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          dia_semana?: number
          fim?: string
          id?: string
          inicio?: string
          label?: string | null
          tipo?: Database["public"]["Enums"]["block_type"]
          travado?: boolean
          user_id?: string
        }
        Relationships: []
      }
      scuderia_tasks: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          prazo: string | null
          prioridade: number
          sobrou_oficina: boolean
          status: Database["public"]["Enums"]["task_status"]
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          prazo?: string | null
          prioridade?: number
          sobrou_oficina?: boolean
          status?: Database["public"]["Enums"]["task_status"]
          titulo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          prazo?: string | null
          prioridade?: number
          sobrou_oficina?: boolean
          status?: Database["public"]["Enums"]["task_status"]
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      streaks: {
        Row: {
          atual: number
          melhor: number
          ultima_data: string | null
          user_id: string
        }
        Insert: {
          atual?: number
          melhor?: number
          ultima_data?: string | null
          user_id: string
        }
        Update: {
          atual?: number
          melhor?: number
          ultima_data?: string | null
          user_id?: string
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          concluido: boolean
          created_at: string
          data: string
          duracao_min: number
          id: string
          reacao: Database["public"]["Enums"]["session_reaction"] | null
          subject_id: string | null
          tipo_ciclo: string | null
          user_id: string
        }
        Insert: {
          concluido?: boolean
          created_at?: string
          data?: string
          duracao_min: number
          id?: string
          reacao?: Database["public"]["Enums"]["session_reaction"] | null
          subject_id?: string | null
          tipo_ciclo?: string | null
          user_id: string
        }
        Update: {
          concluido?: boolean
          created_at?: string
          data?: string
          duracao_min?: number
          id?: string
          reacao?: Database["public"]["Enums"]["session_reaction"] | null
          subject_id?: string | null
          tipo_ciclo?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          categoria: Database["public"]["Enums"]["subject_category"]
          cor: string | null
          created_at: string
          id: string
          meta_semanal_min: number | null
          nome: string
          prova_proxima: string | null
          risco: number
          user_id: string
        }
        Insert: {
          categoria?: Database["public"]["Enums"]["subject_category"]
          cor?: string | null
          created_at?: string
          id?: string
          meta_semanal_min?: number | null
          nome: string
          prova_proxima?: string | null
          risco?: number
          user_id: string
        }
        Update: {
          categoria?: Database["public"]["Enums"]["subject_category"]
          cor?: string | null
          created_at?: string
          id?: string
          meta_semanal_min?: number | null
          nome?: string
          prova_proxima?: string | null
          risco?: number
          user_id?: string
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
      block_type:
        | "escola"
        | "scuderia"
        | "academia"
        | "deslocamento"
        | "sono"
        | "livre"
        | "jantar"
        | "boxes"
      session_reaction: "tranquila" | "apertada" | "travei"
      subject_category: "escola" | "enem" | "vestibular" | "scuderia"
      task_status: "boxes" | "volta" | "bandeirada"
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
    Enums: {
      block_type: [
        "escola",
        "scuderia",
        "academia",
        "deslocamento",
        "sono",
        "livre",
        "jantar",
        "boxes",
      ],
      session_reaction: ["tranquila", "apertada", "travei"],
      subject_category: ["escola", "enem", "vestibular", "scuderia"],
      task_status: ["boxes", "volta", "bandeirada"],
    },
  },
} as const
