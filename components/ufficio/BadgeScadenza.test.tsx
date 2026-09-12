import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BadgeScadenza } from './BadgeScadenza'

const oggi = new Date('2026-09-12T08:00:00Z')

describe('BadgeScadenza', () => {
  it('mostra un badge rosso per le scadenze passate', () => {
    render(<BadgeScadenza prossima="2026-07-01" oggi={oggi} />)
    expect(screen.getByText(/Scaduto/).className).toContain('red')
  })

  it('mostra un badge ambra entro trenta giorni', () => {
    render(<BadgeScadenza prossima="2026-10-01" oggi={oggi} />)
    expect(screen.getByText(/In scadenza/).className).toContain('amber')
  })

  it('mostra la data quando è lontana', () => {
    render(<BadgeScadenza prossima="2027-03-01" oggi={oggi} />)
    expect(screen.getByText('01/03/2027')).toBeInTheDocument()
  })

  it('segnala l assenza di dati di manutenzione', () => {
    render(<BadgeScadenza prossima={null} oggi={oggi} />)
    expect(screen.getByText('Mai registrata')).toBeInTheDocument()
  })

  it('dice da quanti giorni è scaduto', () => {
    render(<BadgeScadenza prossima="2026-09-02" oggi={oggi} />)
    expect(screen.getByText('Scaduto da 10 giorni')).toBeInTheDocument()
  })

  it('usa il singolare per un solo giorno', () => {
    render(<BadgeScadenza prossima="2026-09-11" oggi={oggi} />)
    expect(screen.getByText('Scaduto da 1 giorno')).toBeInTheDocument()
  })
})
