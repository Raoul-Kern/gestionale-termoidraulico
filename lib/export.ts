/**
 * Export per il commercialista.
 *
 * Punto e virgola come separatore e virgola come decimale: è quello che Excel
 * in italiano apre senza chiedere niente.
 */

export type RigaExport = {
  numero: string
  data: string
  cliente: string
  partita_iva: string | null
  descrizione: string
  ore: number
  importo_ore: number
  importo_materiali: number
  totale: number
}

const INTESTAZIONE = [
  'Numero',
  'Data',
  'Cliente',
  'Partita IVA',
  'Descrizione',
  'Ore',
  'Importo ore',
  'Importo materiali',
  'Totale',
]

function campo(valore: string): string {
  if (/[;"\n\r]/.test(valore)) return `"${valore.replace(/"/g, '""')}"`
  return valore
}

function numero(valore: number): string {
  return valore.toFixed(2).replace('.', ',')
}

export function generaCsv(righe: RigaExport[]): string {
  const corpo = righe.map((riga) =>
    [
      campo(riga.numero),
      riga.data,
      campo(riga.cliente),
      campo(riga.partita_iva ?? ''),
      campo(riga.descrizione),
      numero(riga.ore),
      numero(riga.importo_ore),
      numero(riga.importo_materiali),
      numero(riga.totale),
    ].join(';'),
  )

  return [INTESTAZIONE.join(';'), ...corpo].join('\n') + '\n'
}
