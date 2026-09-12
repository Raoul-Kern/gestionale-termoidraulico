import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PassoOre } from './PassoOre'

const tariffe = { viaggio: 30, ordinario: 40, urgenza: 60 }

describe('PassoOre', () => {
  it('mostra una riga per ogni tipo di ora', () => {
    render(
      <PassoOre ore={[]} timerAvviatoIl={null} tariffe={tariffe} onCambio={vi.fn()} onTimer={vi.fn()} />,
    )
    expect(screen.getByText('Viaggio')).toBeInTheDocument()
    expect(screen.getByText('Ordinario')).toBeInTheDocument()
    expect(screen.getByText('Urgenza')).toBeInTheDocument()
  })

  it('aggiunge quindici minuti al tocco del più', async () => {
    const onCambio = vi.fn()
    render(
      <PassoOre ore={[]} timerAvviatoIl={null} tariffe={tariffe} onCambio={onCambio} onTimer={vi.fn()} />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Aggiungi 15 minuti a ordinario' }))
    expect(onCambio).toHaveBeenCalledWith([{ tipo: 'ordinario', minuti: 15, prezzo_orario: 40 }])
  })

  it('non scende sotto zero minuti', async () => {
    const onCambio = vi.fn()
    render(
      <PassoOre
        ore={[{ tipo: 'ordinario', minuti: 15, prezzo_orario: 40 }]}
        timerAvviatoIl={null}
        tariffe={tariffe}
        onCambio={onCambio}
        onTimer={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Togli 15 minuti a ordinario' }))
    expect(onCambio).toHaveBeenCalledWith([])
  })

  it('avvia il timer e comunica il timestamp di avvio', async () => {
    const onTimer = vi.fn()
    render(
      <PassoOre ore={[]} timerAvviatoIl={null} tariffe={tariffe} onCambio={vi.fn()} onTimer={onTimer} />,
    )

    await userEvent.click(screen.getByRole('button', { name: /Avvia timer/i }))
    expect(onTimer).toHaveBeenCalledWith(expect.any(Number))
  })

  it('a timer avviato mostra i minuti trascorsi e propone di fermarlo', () => {
    render(
      <PassoOre
        ore={[]}
        timerAvviatoIl={Date.now() - 25 * 60_000}
        tariffe={tariffe}
        onCambio={vi.fn()}
        onTimer={vi.fn()}
      />,
    )

    expect(screen.getByText('25 min')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Ferma timer/i })).toBeInTheDocument()
  })

  it('fermando il timer somma i minuti alle ore ordinarie', async () => {
    const onCambio = vi.fn()
    const onTimer = vi.fn()
    render(
      <PassoOre
        ore={[{ tipo: 'ordinario', minuti: 20, prezzo_orario: 40 }]}
        timerAvviatoIl={Date.now() - 40 * 60_000}
        tariffe={tariffe}
        onCambio={onCambio}
        onTimer={onTimer}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /Ferma timer/i }))

    expect(onCambio).toHaveBeenCalledWith([{ tipo: 'ordinario', minuti: 60, prezzo_orario: 40 }])
    expect(onTimer).toHaveBeenCalledWith(null)
  })

  it('mostra la tariffa applicata a ogni tipo di ora', () => {
    render(
      <PassoOre ore={[]} timerAvviatoIl={null} tariffe={tariffe} onCambio={vi.fn()} onTimer={vi.fn()} />,
    )
    expect(screen.getByText('60,00 € / h')).toBeInTheDocument()
  })
})
