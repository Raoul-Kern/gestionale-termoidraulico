'use client'

import { useActionState, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { creaClienteRapido, creaIntervento } from '@/app/(ufficio)/planning/azioni'

export type SedeSceglibile = {
  id: string
  etichetta: string
  indirizzo: string
  cliente: string
}

export type TecnicoSceglibile = { id: string; nome: string }

export function DialogIntervento({
  data,
  sedi,
  tecnici,
}: {
  data: string
  sedi: SedeSceglibile[]
  tecnici: TecnicoSceglibile[]
}) {
  const finestra = useRef<HTMLDialogElement>(null)
  const router = useRouter()
  const [stato, azione, inCorso] = useActionState(creaIntervento, null)
  const [sedeScelta, setSedeScelta] = useState('')
  const [clienteNuovo, setClienteNuovo] = useState(false)
  const [erroreCliente, setErroreCliente] = useState<string | null>(null)

  // Le sedi arrivano ordinate per cliente: raggrupparle evita una tendina di
  // cento indirizzi tutti uguali.
  const perCliente = sedi.reduce<Record<string, SedeSceglibile[]>>((gruppi, sede) => {
    gruppi[sede.cliente] = [...(gruppi[sede.cliente] ?? []), sede]
    return gruppi
  }, {})

  async function creaCliente(dati: FormData) {
    setErroreCliente(null)
    try {
      const { sedeId } = await creaClienteRapido(dati)
      setSedeScelta(sedeId)
      setClienteNuovo(false)
      router.refresh()
    } catch (errore) {
      setErroreCliente(errore instanceof Error ? errore.message : 'Cliente non creato.')
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => finestra.current?.showModal()}
        className="h-10 rounded-lg bg-[#27705c] px-4 text-sm font-medium text-white"
      >
        Nuovo intervento
      </button>

      <dialog
        ref={finestra}
        className="w-[min(32rem,92vw)] rounded-2xl border border-slate-200 p-0 backdrop:bg-slate-900/40"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="font-[family-name:var(--font-titoli)] text-xl font-semibold">
            Nuovo intervento
          </h2>
          <button
            type="button"
            onClick={() => finestra.current?.close()}
            className="rounded-lg px-3 py-1 text-sm text-slate-600"
          >
            Chiudi
          </button>
        </div>

        <form action={azione} className="flex flex-col gap-4 px-5 py-4">
          <label htmlFor="sede_id" className="flex flex-col gap-1 text-sm text-slate-600">
            Cliente e sede
            <select
              id="sede_id"
              name="sede_id"
              required
              value={sedeScelta}
              onChange={(evento) => setSedeScelta(evento.target.value)}
              className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-base"
            >
              <option value="">Scegli…</option>
              {Object.entries(perCliente).map(([cliente, sediCliente]) => (
                <optgroup key={cliente} label={cliente}>
                  {sediCliente.map((sede) => (
                    <option key={sede.id} value={sede.id}>
                      {sede.etichetta} — {sede.indirizzo}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => setClienteNuovo((aperto) => !aperto)}
            className="self-start text-sm text-[#1f5c4b] underline"
          >
            {clienteNuovo ? 'Annulla cliente nuovo' : 'Il cliente non è in anagrafica'}
          </button>

          <div className="grid gap-3 sm:grid-cols-2">
            <label htmlFor="data" className="flex flex-col gap-1 text-sm text-slate-600">
              Data
              <input
                id="data"
                name="data"
                type="date"
                defaultValue={data}
                required
                className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-base"
              />
            </label>

            <label htmlFor="ora_inizio" className="flex flex-col gap-1 text-sm text-slate-600">
              Ora
              <input
                id="ora_inizio"
                name="ora_inizio"
                type="time"
                className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-base"
              />
            </label>

            <label htmlFor="tecnico_id" className="flex flex-col gap-1 text-sm text-slate-600">
              Tecnico
              <select
                id="tecnico_id"
                name="tecnico_id"
                className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-base"
              >
                <option value="">Da assegnare</option>
                {tecnici.map((tecnico) => (
                  <option key={tecnico.id} value={tecnico.id}>
                    {tecnico.nome}
                  </option>
                ))}
              </select>
            </label>

            <label htmlFor="priorita" className="flex flex-col gap-1 text-sm text-slate-600">
              Priorità
              <select
                id="priorita"
                name="priorita"
                defaultValue="normale"
                className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-base"
              >
                <option value="bassa">Bassa</option>
                <option value="normale">Normale</option>
                <option value="urgente">Urgente</option>
              </select>
            </label>
          </div>

          <label htmlFor="durata" className="flex flex-col gap-1 text-sm text-slate-600">
            Durata prevista (minuti)
            <input
              id="durata"
              name="durata"
              type="number"
              min={15}
              step={15}
              defaultValue={60}
              className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-base"
            />
          </label>

          <label htmlFor="descrizione" className="flex flex-col gap-1 text-sm text-slate-600">
            Cosa va fatto
            <textarea
              id="descrizione"
              name="descrizione"
              required
              className="min-h-20 rounded-lg border border-slate-300 bg-white p-3 text-base"
            />
          </label>

          {stato?.errore && (
            <p role="alert" className="text-sm text-red-700">
              {stato.errore}
            </p>
          )}

          <button
            type="submit"
            disabled={inCorso}
            className="h-12 rounded-lg bg-[#27705c] text-base font-medium text-white disabled:opacity-60"
          >
            {inCorso ? 'Salvo…' : 'Crea intervento'}
          </button>
        </form>

        {clienteNuovo && (
          <form
            action={creaCliente}
            className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4"
          >
            <h3 className="text-sm font-medium">Cliente nuovo</h3>

            <input
              name="ragione_sociale"
              required
              placeholder="Ragione sociale o cognome"
              aria-label="Ragione sociale"
              className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-base"
            />
            <input
              name="indirizzo"
              required
              placeholder="Indirizzo"
              aria-label="Indirizzo"
              className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-base"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                name="comune"
                placeholder="Comune"
                aria-label="Comune"
                className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-base"
              />
              <input
                name="telefono"
                placeholder="Telefono"
                aria-label="Telefono"
                className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-base"
              />
            </div>

            {erroreCliente && (
              <p role="alert" className="text-sm text-red-700">
                {erroreCliente}
              </p>
            )}

            <button
              type="submit"
              className="h-11 rounded-lg border border-[#27705c] text-sm font-medium text-[#1f5c4b]"
            >
              Salva cliente e scegli la sede
            </button>
          </form>
        )}
      </dialog>
    </>
  )
}
