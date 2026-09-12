import { describe, expect, it } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  it('unisce le classi', () => {
    expect(cn('p-2', 'text-sm')).toBe('p-2 text-sm')
  })

  it('l ultima classe in conflitto vince', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })

  it('ignora i valori falsy', () => {
    expect(cn('p-2', false, undefined, 'm-1')).toBe('p-2 m-1')
  })
})
