import { formattaEuro, formattaOre, type TipoOra } from '@/lib/calcoli'

export type RigaOreDettaglio = { tipo: TipoOra; minuti: number; prezzo_orario: number }
export type RigaMaterialeDettaglio = {
  descrizione: string
  quantita: number
  prezzo_vendita: number
}

const etichettaOra: Record<TipoOra, string> = {
  viaggio: 'Viaggio',
  ordinario: 'Ordinario',
  urgenza: 'Urgenza',
}

/** Il calcolo riga per riga, uguale su schermo e in stampa. */
export function DettaglioRapportino({
  ore,
  materiali,
  ricavoOre,
  ricavoMateriali,
  totale,
}: {
  ore: RigaOreDettaglio[]
  materiali: RigaMaterialeDettaglio[]
  ricavoOre: number
  ricavoMateriali: number
  totale: number
}) {
  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="mb-2 font-[family-name:var(--font-titoli)] text-lg font-semibold">
          Manodopera
        </h2>
        <table className="w-full text-sm">
          <tbody>
            {ore.map((riga, indice) => (
              <tr key={`${riga.tipo}-${indice}`}>
                <td className="border-b border-slate-200 py-2">{etichettaOra[riga.tipo]}</td>
                <td className="border-b border-slate-200 py-2 text-right tabular-nums">
                  {formattaOre(riga.minuti)}
                </td>
                <td className="border-b border-slate-200 py-2 text-right tabular-nums text-slate-600">
                  {formattaEuro(riga.prezzo_orario)} / h
                </td>
                <td className="border-b border-slate-200 py-2 text-right tabular-nums">
                  {formattaEuro((riga.minuti / 60) * riga.prezzo_orario)}
                </td>
              </tr>
            ))}
            {ore.length === 0 && (
              <tr>
                <td className="py-2 text-slate-500" colSpan={4}>
                  Nessuna ora registrata.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="mb-2 font-[family-name:var(--font-titoli)] text-lg font-semibold">
          Materiali
        </h2>
        <table className="w-full text-sm">
          <tbody>
            {materiali.map((riga, indice) => (
              <tr key={`${riga.descrizione}-${indice}`}>
                <td className="border-b border-slate-200 py-2">{riga.descrizione}</td>
                <td className="border-b border-slate-200 py-2 text-right tabular-nums">
                  {riga.quantita}
                </td>
                <td className="border-b border-slate-200 py-2 text-right tabular-nums text-slate-600">
                  {formattaEuro(riga.prezzo_vendita)}
                </td>
                <td className="border-b border-slate-200 py-2 text-right tabular-nums">
                  {formattaEuro(riga.quantita * riga.prezzo_vendita)}
                </td>
              </tr>
            ))}
            {materiali.length === 0 && (
              <tr>
                <td className="py-2 text-slate-500" colSpan={4}>
                  Nessun materiale.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="rounded-xl border border-slate-200 p-4">
        <div className="flex justify-between py-1 text-sm">
          <span className="text-slate-600">Costo ore</span>
          <span className="tabular-nums">{formattaEuro(ricavoOre)}</span>
        </div>
        <div className="flex justify-between py-1 text-sm">
          <span className="text-slate-600">Costo materiali</span>
          <span className="tabular-nums">{formattaEuro(ricavoMateriali)}</span>
        </div>
        <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-base font-semibold">
          <span>Totale intervento</span>
          <span className="tabular-nums">{formattaEuro(totale)}</span>
        </div>
      </section>
    </div>
  )
}
