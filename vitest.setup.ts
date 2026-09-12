import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Senza questo ogni render resta attaccato al documento e il test successivo
// trova due volte lo stesso elemento.
afterEach(cleanup)
