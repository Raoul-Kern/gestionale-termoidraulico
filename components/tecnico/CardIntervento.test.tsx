import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CardIntervento, type InterventoDelGiorno } from './CardIntervento'

const base: InterventoDelGiorno = {
  id: 'int-1',
  ora_inizio: '09:30:00',
  descrizione: 'Sostituzione valvola termostatica',
  priorita: 'normale',
  stato: 'programmato',
  cliente: 'Panificio Rossi S.r.l.',
  indirizzo: 'Via Industriale 8',
  comune: 'Brescia',
  haRapportino: false,
}

describe('CardIntervento', () => {
  it('mostra ora, cliente, indirizzo e descrizione', () => {
    render(<CardIntervento intervento={base} />)
    expect(screen.getByText('09:30')).toBeInTheDocument()
    expect(screen.getByText('Panificio Rossi S.r.l.')).toBeInTheDocument()
    expect(screen.getByText(/Via Industriale 8/)).toBeInTheDocument()
    expect(screen.getByText(/Sostituzione valvola/)).toBeInTheDocument()
  })

  it('evidenzia le urgenze', () => {
    render(<CardIntervento intervento={{ ...base, priorita: 'urgente' }} />)
    expect(screen.getByText('Urgente')).toBeInTheDocument()
  })

  it('invita ad aprire il rapportino quando non esiste', () => {
    render(<CardIntervento intervento={base} />)
    expect(screen.getByRole('link', { name: /Apri rapportino/i })).toHaveAttribute(
      'href',
      '/rapportino/int-1',
    )
  })

  it('segnala il rapportino già chiuso', () => {
    render(<CardIntervento intervento={{ ...base, stato: 'chiuso', haRapportino: true }} />)
    expect(screen.getByText('Chiuso')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Rivedi rapportino/i })).toBeInTheDocument()
  })

  it('mostra un segnaposto se manca l ora di inizio', () => {
    render(<CardIntervento intervento={{ ...base, ora_inizio: null }} />)
    expect(screen.getByText('Orario libero')).toBeInTheDocument()
  })

  it('apre la navigazione verso l indirizzo con un solo tocco', () => {
    render(<CardIntervento intervento={base} />)
    expect(screen.getByRole('link', { name: /Naviga/i })).toHaveAttribute(
      'href',
      expect.stringContaining(encodeURIComponent('Via Industriale 8')),
    )
  })
})
