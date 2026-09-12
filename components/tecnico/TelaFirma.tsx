'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Firma del cliente sul telefono.
 *
 * La tela va preparata quando è visibile: con il passo ancora nascosto misura
 * 0x0 e il tratto non comparirebbe. Su ridimensionamento il contenuto viene
 * salvato e ridisegnato, altrimenti ruotare il telefono cancella la firma.
 */
export function TelaFirma({
  valore,
  onCambio,
}: {
  valore: string | null
  onCambio: (dataUrl: string | null) => void
}) {
  const tela = useRef<HTMLCanvasElement>(null)
  const [disegnando, setDisegnando] = useState(false)

  const prepara = useCallback(() => {
    const canvas = tela.current
    if (!canvas) return

    const larghezza = canvas.clientWidth
    const altezza = canvas.clientHeight
    if (!larghezza || !altezza) return

    const precedente = canvas.width && canvas.height ? canvas.toDataURL('image/png') : null
    const scala = window.devicePixelRatio || 1

    canvas.width = larghezza * scala
    canvas.height = altezza * scala

    const contesto = canvas.getContext('2d')
    if (!contesto) return

    contesto.setTransform(scala, 0, 0, scala, 0, 0)
    contesto.lineWidth = 2.4
    contesto.lineCap = 'round'
    contesto.strokeStyle = '#101c21'
    contesto.fillStyle = '#ffffff'
    contesto.fillRect(0, 0, larghezza, altezza)

    const daRipristinare = precedente && valore ? precedente : valore
    if (daRipristinare) {
      const immagine = new Image()
      immagine.onload = () => contesto.drawImage(immagine, 0, 0, larghezza, altezza)
      immagine.src = daRipristinare
    }
  }, [valore])

  useEffect(() => {
    prepara()

    let attesa: ReturnType<typeof setTimeout>
    const alRidimensionamento = () => {
      clearTimeout(attesa)
      attesa = setTimeout(prepara, 150)
    }

    window.addEventListener('resize', alRidimensionamento)
    return () => {
      clearTimeout(attesa)
      window.removeEventListener('resize', alRidimensionamento)
    }
  }, [prepara])

  function posizione(evento: React.PointerEvent<HTMLCanvasElement>) {
    const rettangolo = evento.currentTarget.getBoundingClientRect()
    return { x: evento.clientX - rettangolo.left, y: evento.clientY - rettangolo.top }
  }

  return (
    <div className="flex flex-col gap-3">
      <canvas
        ref={tela}
        aria-label="Area per la firma del cliente"
        className="h-48 w-full touch-none rounded-2xl border-2 border-dashed border-slate-300 bg-white"
        onPointerDown={(evento) => {
          evento.currentTarget.setPointerCapture(evento.pointerId)
          const contesto = evento.currentTarget.getContext('2d')
          if (!contesto) return
          const { x, y } = posizione(evento)
          contesto.beginPath()
          contesto.moveTo(x, y)
          setDisegnando(true)
        }}
        onPointerMove={(evento) => {
          if (!disegnando) return
          const contesto = evento.currentTarget.getContext('2d')
          if (!contesto) return
          const { x, y } = posizione(evento)
          contesto.lineTo(x, y)
          contesto.stroke()
        }}
        onPointerUp={(evento) => {
          setDisegnando(false)
          onCambio(evento.currentTarget.toDataURL('image/png'))
        }}
      />

      <button
        type="button"
        onClick={() => {
          onCambio(null)
          const canvas = tela.current
          const contesto = canvas?.getContext('2d')
          if (!canvas || !contesto) return
          contesto.fillStyle = '#ffffff'
          contesto.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight)
        }}
        className="h-12 rounded-xl border border-slate-300 bg-white text-sm"
      >
        Cancella firma
      </button>
    </div>
  )
}
