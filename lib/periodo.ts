/** Periodo della dashboard: mese corrente per difetto, estremi validati. */

const FORMATO = /^\d{4}-\d{2}-\d{2}$/

const iso = (anno: number, mese: number, giorno: number) =>
  `${anno}-${String(mese).padStart(2, '0')}-${String(giorno).padStart(2, '0')}`

export function periodoCorrente(riferimento: Date = new Date()) {
  const anno = riferimento.getUTCFullYear()
  const mese = riferimento.getUTCMonth() + 1
  const ultimo = new Date(Date.UTC(anno, mese, 0)).getUTCDate()

  return { dal: iso(anno, mese, 1), al: iso(anno, mese, ultimo) }
}

function valida(valore: string | undefined): string | null {
  if (!valore || !FORMATO.test(valore)) return null

  // Il formato giusto non basta: 2026-02-31 passerebbe il controllo e
  // scivolerebbe al primo marzo.
  const data = new Date(`${valore}T00:00:00Z`)
  if (Number.isNaN(data.getTime())) return null
  return data.toISOString().slice(0, 10) === valore ? valore : null
}

export function periodoDaParametri(
  dal: string | undefined,
  al: string | undefined,
  riferimento: Date = new Date(),
) {
  const primo = valida(dal)
  const secondo = valida(al)

  if (!primo || !secondo) return periodoCorrente(riferimento)
  return primo <= secondo ? { dal: primo, al: secondo } : { dal: secondo, al: primo }
}
