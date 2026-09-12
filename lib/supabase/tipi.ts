import type { Database } from './database'

export type { Database }

export type Tabelle = Database['public']['Tables']
export type Utente = Tabelle['utenti']['Row']
export type Cliente = Tabelle['clienti']['Row']
export type Sede = Tabelle['sedi']['Row']
export type Impianto = Tabelle['impianti']['Row']
export type Materiale = Tabelle['materiali']['Row']
export type Intervento = Tabelle['interventi']['Row']
export type Rapportino = Tabelle['rapportini']['Row']
export type RigaOre = Tabelle['rapportino_ore']['Row']
export type RigaMateriale = Tabelle['rapportino_materiali']['Row']
export type Impostazioni = Tabelle['impostazioni']['Row']

export type Ruolo = Database['public']['Enums']['ruolo_utente']
export type TipoOra = Database['public']['Enums']['tipo_ora']
export type Priorita = Database['public']['Enums']['priorita_intervento']
export type StatoIntervento = Database['public']['Enums']['stato_intervento']
export type TipoImpianto = Database['public']['Enums']['tipo_impianto']
export type StatoFatturazione = Database['public']['Enums']['stato_fatturazione']
