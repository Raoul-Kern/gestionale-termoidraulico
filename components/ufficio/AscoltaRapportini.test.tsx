import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))

const on = vi.fn().mockReturnThis()
const subscribe = vi.fn().mockReturnThis()
const removeChannel = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  clientBrowser: () => ({ channel: () => ({ on, subscribe }), removeChannel }),
}))

import { AscoltaRapportini } from './AscoltaRapportini'

beforeEach(() => {
  refresh.mockClear()
  on.mockClear()
  subscribe.mockClear()
  removeChannel.mockClear()
})

describe('AscoltaRapportini', () => {
  it('si iscrive alle insert sulla tabella rapportini', () => {
    render(<AscoltaRapportini />)

    expect(on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ event: 'INSERT', table: 'rapportini' }),
      expect.any(Function),
    )
    expect(subscribe).toHaveBeenCalled()
  })

  it('ricarica la lista quando arriva un rapportino', () => {
    render(<AscoltaRapportini />)

    const gestore = on.mock.calls[0][2] as () => void
    gestore()

    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('chiude il canale allo smontaggio', () => {
    const { unmount } = render(<AscoltaRapportini />)
    unmount()
    expect(removeChannel).toHaveBeenCalled()
  })
})
