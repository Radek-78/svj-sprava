'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [heslo, setHeslo] = useState('')
  const [chyba, setChyba] = useState('')
  const [nacitani, setNacitani] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handlePrihlaseni(e: React.FormEvent) {
    e.preventDefault()
    setNacitani(true)
    setChyba('')

    const { error } = await supabase.auth.signInWithPassword({ email, password: heslo })

    if (error) {
      setChyba('Nesprávný email nebo heslo.')
      setNacitani(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-blue-600 mb-4">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900">SVJ Správa</h1>
            <p className="text-sm text-gray-500 mt-1">Přihlaste se do systému</p>
          </div>

          <form onSubmit={handlePrihlaseni} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="vas@email.cz"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Heslo
              </label>
              <input
                type="password"
                value={heslo}
                onChange={e => setHeslo(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            {chyba && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
                {chyba}
              </div>
            )}

            <button
              type="submit"
              disabled={nacitani}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {nacitani ? 'Přihlašování...' : 'Přihlásit se'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
