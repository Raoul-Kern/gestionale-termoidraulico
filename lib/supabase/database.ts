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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      clienti: {
        Row: {
          aggiornato_il: string
          codice_fiscale: string | null
          creato_il: string
          email: string | null
          id: string
          note: string | null
          partita_iva: string | null
          ragione_sociale: string
          telefono: string | null
        }
        Insert: {
          aggiornato_il?: string
          codice_fiscale?: string | null
          creato_il?: string
          email?: string | null
          id?: string
          note?: string | null
          partita_iva?: string | null
          ragione_sociale: string
          telefono?: string | null
        }
        Update: {
          aggiornato_il?: string
          codice_fiscale?: string | null
          creato_il?: string
          email?: string | null
          id?: string
          note?: string | null
          partita_iva?: string | null
          ragione_sociale?: string
          telefono?: string | null
        }
        Relationships: []
      }
      impianti: {
        Row: {
          aggiornato_il: string
          attivo: boolean
          creato_il: string
          id: string
          intervallo_mesi: number
          marca: string | null
          matricola: string | null
          modello: string | null
          prossima_manutenzione: string | null
          sede_id: string
          tipo: Database["public"]["Enums"]["tipo_impianto"]
          ultima_manutenzione: string | null
        }
        Insert: {
          aggiornato_il?: string
          attivo?: boolean
          creato_il?: string
          id?: string
          intervallo_mesi?: number
          marca?: string | null
          matricola?: string | null
          modello?: string | null
          prossima_manutenzione?: string | null
          sede_id: string
          tipo: Database["public"]["Enums"]["tipo_impianto"]
          ultima_manutenzione?: string | null
        }
        Update: {
          aggiornato_il?: string
          attivo?: boolean
          creato_il?: string
          id?: string
          intervallo_mesi?: number
          marca?: string | null
          matricola?: string | null
          modello?: string | null
          prossima_manutenzione?: string | null
          sede_id?: string
          tipo?: Database["public"]["Enums"]["tipo_impianto"]
          ultima_manutenzione?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "impianti_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedi"
            referencedColumns: ["id"]
          },
        ]
      }
      impostazioni: {
        Row: {
          aggiornato_il: string
          id: boolean
          prezzo_ora_ordinaria: number
          prezzo_ora_urgenza: number
          prezzo_ora_viaggio: number
        }
        Insert: {
          aggiornato_il?: string
          id?: boolean
          prezzo_ora_ordinaria?: number
          prezzo_ora_urgenza?: number
          prezzo_ora_viaggio?: number
        }
        Update: {
          aggiornato_il?: string
          id?: boolean
          prezzo_ora_ordinaria?: number
          prezzo_ora_urgenza?: number
          prezzo_ora_viaggio?: number
        }
        Relationships: []
      }
      interventi: {
        Row: {
          aggiornato_il: string
          creato_il: string
          data: string
          descrizione: string
          durata_prevista_minuti: number
          id: string
          impianto_id: string | null
          ora_inizio: string | null
          priorita: Database["public"]["Enums"]["priorita_intervento"]
          sede_id: string
          stato: Database["public"]["Enums"]["stato_intervento"]
          tecnico_id: string | null
        }
        Insert: {
          aggiornato_il?: string
          creato_il?: string
          data: string
          descrizione: string
          durata_prevista_minuti?: number
          id?: string
          impianto_id?: string | null
          ora_inizio?: string | null
          priorita?: Database["public"]["Enums"]["priorita_intervento"]
          sede_id: string
          stato?: Database["public"]["Enums"]["stato_intervento"]
          tecnico_id?: string | null
        }
        Update: {
          aggiornato_il?: string
          creato_il?: string
          data?: string
          descrizione?: string
          durata_prevista_minuti?: number
          id?: string
          impianto_id?: string | null
          ora_inizio?: string | null
          priorita?: Database["public"]["Enums"]["priorita_intervento"]
          sede_id?: string
          stato?: Database["public"]["Enums"]["stato_intervento"]
          tecnico_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interventi_impianto_della_sede"
            columns: ["sede_id", "impianto_id"]
            isOneToOne: false
            referencedRelation: "impianti"
            referencedColumns: ["sede_id", "id"]
          },
          {
            foreignKeyName: "interventi_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventi_tecnico_id_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "utenti"
            referencedColumns: ["id"]
          },
        ]
      }
      materiali: {
        Row: {
          aggiornato_il: string
          attivo: boolean
          codice: string
          creato_il: string
          descrizione: string
          id: string
          prezzo_acquisto: number
          prezzo_vendita: number
          unita: string
        }
        Insert: {
          aggiornato_il?: string
          attivo?: boolean
          codice: string
          creato_il?: string
          descrizione: string
          id?: string
          prezzo_acquisto?: number
          prezzo_vendita?: number
          unita?: string
        }
        Update: {
          aggiornato_il?: string
          attivo?: boolean
          codice?: string
          creato_il?: string
          descrizione?: string
          id?: string
          prezzo_acquisto?: number
          prezzo_vendita?: number
          unita?: string
        }
        Relationships: []
      }
      rapportini: {
        Row: {
          aggiornato_il: string
          chiuso_il: string
          creato_il: string
          firma_url: string | null
          firmatario: string | null
          id: string
          intervento_id: string
          note: string | null
          stato_fatturazione: Database["public"]["Enums"]["stato_fatturazione"]
          tecnico_id: string
        }
        Insert: {
          aggiornato_il?: string
          chiuso_il?: string
          creato_il?: string
          firma_url?: string | null
          firmatario?: string | null
          id?: string
          intervento_id: string
          note?: string | null
          stato_fatturazione?: Database["public"]["Enums"]["stato_fatturazione"]
          tecnico_id: string
        }
        Update: {
          aggiornato_il?: string
          chiuso_il?: string
          creato_il?: string
          firma_url?: string | null
          firmatario?: string | null
          id?: string
          intervento_id?: string
          note?: string | null
          stato_fatturazione?: Database["public"]["Enums"]["stato_fatturazione"]
          tecnico_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rapportini_intervento_id_fkey"
            columns: ["intervento_id"]
            isOneToOne: true
            referencedRelation: "interventi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportini_intervento_id_fkey"
            columns: ["intervento_id"]
            isOneToOne: true
            referencedRelation: "interventi_con_margine"
            referencedColumns: ["intervento_id"]
          },
          {
            foreignKeyName: "rapportini_tecnico_id_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "utenti"
            referencedColumns: ["id"]
          },
        ]
      }
      rapportino_materiali: {
        Row: {
          creato_il: string
          descrizione: string
          id: string
          materiale_id: string | null
          prezzo_acquisto: number
          prezzo_vendita: number
          quantita: number
          rapportino_id: string
        }
        Insert: {
          creato_il?: string
          descrizione: string
          id?: string
          materiale_id?: string | null
          prezzo_acquisto?: number
          prezzo_vendita: number
          quantita: number
          rapportino_id: string
        }
        Update: {
          creato_il?: string
          descrizione?: string
          id?: string
          materiale_id?: string | null
          prezzo_acquisto?: number
          prezzo_vendita?: number
          quantita?: number
          rapportino_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rapportino_materiali_materiale_id_fkey"
            columns: ["materiale_id"]
            isOneToOne: false
            referencedRelation: "materiali"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rapportino_materiali_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "interventi_con_margine"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "rapportino_materiali_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "rapportini"
            referencedColumns: ["id"]
          },
        ]
      }
      rapportino_ore: {
        Row: {
          costo_orario: number
          creato_il: string
          id: string
          minuti: number
          prezzo_orario: number
          rapportino_id: string
          tipo: Database["public"]["Enums"]["tipo_ora"]
        }
        Insert: {
          costo_orario?: number
          creato_il?: string
          id?: string
          minuti: number
          prezzo_orario: number
          rapportino_id: string
          tipo: Database["public"]["Enums"]["tipo_ora"]
        }
        Update: {
          costo_orario?: number
          creato_il?: string
          id?: string
          minuti?: number
          prezzo_orario?: number
          rapportino_id?: string
          tipo?: Database["public"]["Enums"]["tipo_ora"]
        }
        Relationships: [
          {
            foreignKeyName: "rapportino_ore_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "interventi_con_margine"
            referencedColumns: ["rapportino_id"]
          },
          {
            foreignKeyName: "rapportino_ore_rapportino_id_fkey"
            columns: ["rapportino_id"]
            isOneToOne: false
            referencedRelation: "rapportini"
            referencedColumns: ["id"]
          },
        ]
      }
      sedi: {
        Row: {
          aggiornato_il: string
          cap: string | null
          cliente_id: string
          comune: string | null
          creato_il: string
          etichetta: string
          id: string
          indirizzo: string
          note_accesso: string | null
        }
        Insert: {
          aggiornato_il?: string
          cap?: string | null
          cliente_id: string
          comune?: string | null
          creato_il?: string
          etichetta?: string
          id?: string
          indirizzo: string
          note_accesso?: string | null
        }
        Update: {
          aggiornato_il?: string
          cap?: string | null
          cliente_id?: string
          comune?: string | null
          creato_il?: string
          etichetta?: string
          id?: string
          indirizzo?: string
          note_accesso?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sedi_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clienti"
            referencedColumns: ["id"]
          },
        ]
      }
      utenti: {
        Row: {
          aggiornato_il: string
          attivo: boolean
          colore: string
          creato_il: string
          id: string
          nome: string
          ruolo: Database["public"]["Enums"]["ruolo_utente"]
          tariffa_costo_oraria: number
        }
        Insert: {
          aggiornato_il?: string
          attivo?: boolean
          colore?: string
          creato_il?: string
          id: string
          nome: string
          ruolo?: Database["public"]["Enums"]["ruolo_utente"]
          tariffa_costo_oraria?: number
        }
        Update: {
          aggiornato_il?: string
          attivo?: boolean
          colore?: string
          creato_il?: string
          id?: string
          nome?: string
          ruolo?: Database["public"]["Enums"]["ruolo_utente"]
          tariffa_costo_oraria?: number
        }
        Relationships: []
      }
    }
    Views: {
      interventi_con_margine: {
        Row: {
          cliente_id: string | null
          costo_materiali: number | null
          costo_ore: number | null
          data: string | null
          intervento_id: string | null
          margine: number | null
          margine_incompleto: boolean | null
          rapportino_id: string | null
          ricavo_materiali: number | null
          ricavo_ore: number | null
          stato_fatturazione:
            | Database["public"]["Enums"]["stato_fatturazione"]
            | null
          tecnico_id: string | null
          totale_intervento: number | null
        }
        Relationships: [
          {
            foreignKeyName: "interventi_tecnico_id_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "utenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sedi_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clienti"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      listino_con_costi: {
        Args: never
        Returns: {
          codice: string
          descrizione: string
          id: string
          prezzo_acquisto: number
          prezzo_vendita: number
          ricarico_percentuale: number
          unita: string
        }[]
      }
      margini: {
        Args: { al: string; dal: string }
        Returns: {
          cliente_id: string | null
          costo_materiali: number | null
          costo_ore: number | null
          data: string | null
          intervento_id: string | null
          margine: number | null
          margine_incompleto: boolean | null
          rapportino_id: string | null
          ricavo_materiali: number | null
          ricavo_ore: number | null
          stato_fatturazione:
            | Database["public"]["Enums"]["stato_fatturazione"]
            | null
          tecnico_id: string | null
          totale_intervento: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "interventi_con_margine"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      ruolo_corrente: {
        Args: never
        Returns: Database["public"]["Enums"]["ruolo_utente"]
      }
    }
    Enums: {
      priorita_intervento: "bassa" | "normale" | "urgente"
      ruolo_utente: "tecnico" | "ufficio" | "titolare"
      stato_fatturazione: "da_fatturare" | "fatturato" | "non_fatturabile"
      stato_intervento: "programmato" | "in_corso" | "chiuso" | "annullato"
      tipo_impianto: "caldaia" | "condizionatore" | "pompa_calore" | "altro"
      tipo_ora: "viaggio" | "ordinario" | "urgenza"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      priorita_intervento: ["bassa", "normale", "urgente"],
      ruolo_utente: ["tecnico", "ufficio", "titolare"],
      stato_fatturazione: ["da_fatturare", "fatturato", "non_fatturabile"],
      stato_intervento: ["programmato", "in_corso", "chiuso", "annullato"],
      tipo_impianto: ["caldaia", "condizionatore", "pompa_calore", "altro"],
      tipo_ora: ["viaggio", "ordinario", "urgenza"],
    },
  },
} as const
