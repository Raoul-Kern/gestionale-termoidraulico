/**
 * Calcoli del rapportino: ricavo, costo, margine e scadenza manutenzione.
 *
 * Funzioni pure, senza accesso al database: ricevono le righe già lette e
 * restituiscono numeri. Le usano sia l'ufficio sia la dashboard del titolare,
 * con la differenza che all'ufficio le colonne di costo non arrivano nemmeno,
 * perché il database gliele revoca.
 */

export type TipoOra = 'viaggio' | 'ordinario' | 'urgenza'

export type RigaOreCalcolo = {
  tipo: TipoOra
  minuti: number
  prezzo_orario: number
  costo_orario?: number | null
}

export type RigaMaterialeCalcolo = {
  quantita: number
  prezzo_vendita: number
  prezzo_acquisto?: number | null
}

export type TotaliIntervento = {
  ricavoOre: number
  costoOre: number
  ricavoMateriali: number
  costoMateriali: number
  totale: number
  margine: number
  marginePercentuale: number
  /**
   * Vero quando almeno una riga di ore ha costo orario a zero: significa che in
   * anagrafica manca la tariffa di costo del tecnico, non che il lavoro non è
   * costato niente. Il margine va mostrato come parziale, non sommato ai totali
   * come fosse un dato completo.
   */
  margineIncompleto: boolean
}

export function calcolaTotali(
  ore: RigaOreCalcolo[],
  materiali: RigaMaterialeCalcolo[],
): TotaliIntervento {
  const ricavoOre = ore.reduce((somma, riga) => somma + (riga.minuti / 60) * riga.prezzo_orario, 0)
  const costoOre = ore.reduce(
    (somma, riga) => somma + (riga.minuti / 60) * (riga.costo_orario ?? 0),
    0,
  )
  const ricavoMateriali = materiali.reduce(
    (somma, riga) => somma + riga.quantita * riga.prezzo_vendita,
    0,
  )
  const costoMateriali = materiali.reduce(
    (somma, riga) => somma + riga.quantita * (riga.prezzo_acquisto ?? 0),
    0,
  )

  const totale = ricavoOre + ricavoMateriali
  const margine = totale - costoOre - costoMateriali

  return {
    ricavoOre,
    costoOre,
    ricavoMateriali,
    costoMateriali,
    totale,
    margine,
    marginePercentuale: totale === 0 ? 0 : (margine / totale) * 100,
    margineIncompleto: ore.some((riga) => !riga.costo_orario),
  }
}

// useGrouping esplicito: in italiano il raggruppamento predefinito parte da
// cinque cifre, e un totale come 4.180,00 € va scritto col punto anche a quattro.
const euro = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  useGrouping: true,
})

export function formattaEuro(valore: number): string {
  // Intl separa cifra e simbolo con uno spazio insecabile: normalizzato a spazio
  // semplice, così i test e le ricerche nel testo non dipendono da un carattere
  // invisibile.
  return euro.format(valore).replace(/ /g, ' ')
}

export function formattaOre(minuti: number): string {
  if (minuti <= 0) return '0 min'

  const ore = Math.floor(minuti / 60)
  const resto = minuti % 60

  if (ore === 0) return `${resto} min`
  if (resto === 0) return `${ore} h`
  return `${ore} h ${resto} min`
}

export type StatoScadenza = 'scaduto' | 'in_scadenza' | 'ok' | 'sconosciuto'

const GIORNI_DI_PREAVVISO = 30
const MILLISECONDI_AL_GIORNO = 86_400_000

export function statoScadenza(prossima: string | null, oggi: Date = new Date()): StatoScadenza {
  if (!prossima) return 'sconosciuto'

  // Il confronto è fra giorni, non fra istanti: un intervento della sera non
  // deve risultare scaduto solo perché il fuso sposta l'ora oltre la mezzanotte.
  const aGiorno = (data: Date) =>
    Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate())

  const scadenza = aGiorno(new Date(`${prossima}T00:00:00Z`))
  const adesso = aGiorno(oggi)

  if (scadenza < adesso) return 'scaduto'

  const giorniMancanti = (scadenza - adesso) / MILLISECONDI_AL_GIORNO
  return giorniMancanti <= GIORNI_DI_PREAVVISO ? 'in_scadenza' : 'ok'
}
