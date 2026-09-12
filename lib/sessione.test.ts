import { describe, expect, it } from 'vitest'
import { homePerRuolo } from './sessione'

describe('homePerRuolo', () => {
  it('porta il tecnico alla lista di oggi', () => {
    expect(homePerRuolo('tecnico')).toBe('/oggi')
  })

  it('porta l ufficio al planning', () => {
    expect(homePerRuolo('ufficio')).toBe('/planning')
  })

  it('porta il titolare alla dashboard', () => {
    expect(homePerRuolo('titolare')).toBe('/dashboard')
  })
})
