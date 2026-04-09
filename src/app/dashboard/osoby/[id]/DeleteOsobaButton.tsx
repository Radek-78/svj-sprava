'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function DeleteOsobaButton({ id, jmeno }: { id: string; jmeno: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [potvrzeni, setPotvrzeni] = useState(false)
  const [nacitani, setNacitani] = useState(false)

  async function handleSmazani() {
    setNacitani(true)
    await supabase.from('osoby').delete().eq('id', id)
    router.push('/dashboard/osoby')
    router.refresh()
  }

  if (potvrzeni) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-red-600">Opravdu smazat <strong>{jmeno}</strong>?</span>
        <button onClick={handleSmazani} disabled={nacitani}
          className="bg-red-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50">
          {nacitani ? 'Mažu...' : 'Ano, smazat'}
        </button>
        <button onClick={() => setPotvrzeni(false)}
          className="text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
          Zrušit
        </button>
      </div>
    )
  }

  return (
    <button onClick={() => setPotvrzeni(true)}
      className="text-sm text-red-600 hover:text-red-800 font-medium border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors">
      Smazat osobu
    </button>
  )
}
