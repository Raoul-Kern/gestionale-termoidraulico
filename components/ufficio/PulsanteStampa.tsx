'use client'

export function PulsanteStampa() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg bg-[#27705c] px-4 py-2 text-sm font-medium text-white"
    >
      Stampa o salva in PDF
    </button>
  )
}
