import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PassoMateriali, type MaterialeListino } from './PassoMateriali'

const listino: MaterialeListino[] = [
  { id: 'm1', codice: 'VAL-SFE-12', descrizione: 'Valvola a sfera 1/2', unita: 'pz', prezzo_vendita: 11 },
  { id: 'm2', codice: 'TUB-CU-15', descrizione: 'Tubo rame ricotto 15 mm', unita: 'm', prezzo_vendita: 7.5 },
  { id: 'm3', codice: 'GUA-CAN-12', descrizione: 'Guarnizione canapa 1/2', unita: 'pz', prezzo_vendita: 0.9 },
]

describe('PassoMateriali', () => {
  it('filtra il listino per descrizione', async () => {
    render(<PassoMateriali listino={listino} righe={[]} onCambio={vi.fn()} />)
    await userEvent.type(screen.getByRole('searchbox', { name: /Cerca materiale/i }), 'rame')

    expect(screen.getByText('Tubo rame ricotto 15 mm')).toBeInTheDocument()
    expect(screen.queryByText('Valvola a sfera 1/2')).not.toBeInTheDocument()
  })

  it('filtra anche per codice, senza badare alle maiuscole', async () => {
    render(<PassoMateriali listino={listino} righe={[]} onCambio={vi.fn()} />)
    await userEvent.type(screen.getByRole('searchbox', { name: /Cerca materiale/i }), 'gua-can')
    expect(screen.getByText('Guarnizione canapa 1/2')).toBeInTheDocument()
  })

  it('aggiunge il materiale con quantità uno al primo tocco', async () => {
    const onCambio = vi.fn()
    render(<PassoMateriali listino={listino} righe={[]} onCambio={onCambio} />)

    await userEvent.type(screen.getByRole('searchbox', { name: /Cerca materiale/i }), 'sfera')
    await userEvent.click(screen.getByRole('button', { name: /Aggiungi Valvola a sfera/i }))

    expect(onCambio).toHaveBeenCalledWith([
      { materiale_id: 'm1', descrizione: 'Valvola a sfera 1/2', quantita: 1, prezzo_vendita: 11 },
    ])
  })

  it('incrementa la quantità di una riga già presente', async () => {
    const onCambio = vi.fn()
    render(
      <PassoMateriali
        listino={listino}
        righe={[{ materiale_id: 'm1', descrizione: 'Valvola a sfera 1/2', quantita: 2, prezzo_vendita: 11 }]}
        onCambio={onCambio}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /Aumenta Valvola a sfera/i }))
    expect(onCambio).toHaveBeenCalledWith([
      { materiale_id: 'm1', descrizione: 'Valvola a sfera 1/2', quantita: 3, prezzo_vendita: 11 },
    ])
  })

  it('rimuove la riga quando la quantità scende a zero', async () => {
    const onCambio = vi.fn()
    render(
      <PassoMateriali
        listino={listino}
        righe={[{ materiale_id: 'm1', descrizione: 'Valvola a sfera 1/2', quantita: 1, prezzo_vendita: 11 }]}
        onCambio={onCambio}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /Riduci Valvola a sfera/i }))
    expect(onCambio).toHaveBeenCalledWith([])
  })

  it('mostra il totale dei materiali scelti', () => {
    render(
      <PassoMateriali
        listino={listino}
        righe={[
          { materiale_id: 'm1', descrizione: 'Valvola a sfera 1/2', quantita: 2, prezzo_vendita: 11 },
          { materiale_id: 'm2', descrizione: 'Tubo rame ricotto 15 mm', quantita: 3, prezzo_vendita: 7.5 },
        ]}
        onCambio={vi.fn()}
      />,
    )
    expect(screen.getByText('44,50 €')).toBeInTheDocument()
  })

  it('non cerca con una sola lettera, per non mostrare mezzo listino', async () => {
    render(<PassoMateriali listino={listino} righe={[]} onCambio={vi.fn()} />)
    await userEvent.type(screen.getByRole('searchbox', { name: /Cerca materiale/i }), 'v')
    expect(screen.queryByText('Valvola a sfera 1/2')).not.toBeInTheDocument()
  })
})
