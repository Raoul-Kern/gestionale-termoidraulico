'use client'

import { useActionState } from 'react'
import { accedi } from './azioni'

export default function Login() {
  const [stato, azione, inCorso] = useActionState(accedi, null)

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 p-6">
      <div>
        <h1 className="font-[family-name:var(--font-titoli)] text-3xl font-semibold">
          Rapportini
        </h1>
        <p className="mt-1 text-sm text-slate-600">Accedi per vedere i lavori di oggi.</p>
      </div>

      <form action={azione} className="flex flex-col gap-4">
        <label htmlFor="email" className="flex flex-col gap-1 text-sm text-slate-600">
          Email
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="username"
            className="h-14 rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-900"
          />
        </label>

        <label htmlFor="password" className="flex flex-col gap-1 text-sm text-slate-600">
          Password
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="h-14 rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-900"
          />
        </label>

        {stato?.errore && (
          <p role="alert" className="text-sm text-red-700">
            {stato.errore}
          </p>
        )}

        <button
          type="submit"
          disabled={inCorso}
          className="h-14 rounded-xl bg-[#27705c] text-base font-medium text-white disabled:opacity-60"
        >
          {inCorso ? 'Accesso in corso…' : 'Entra'}
        </button>
      </form>
    </main>
  )
}
