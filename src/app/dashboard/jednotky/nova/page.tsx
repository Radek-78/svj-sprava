'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NovaJednotkaPage() {
  const router = useRouter()
  const supabase = createClient()
  const [chyba, setChyba] = useState('')
  const [nacitani, setNacitani] = useState(false)

  const [form, setForm] = useState({
    cislo_jednotky: '',
    patro: '',
    vymera_m2: '',
    podil_citatel: '',
    podil_jmenovatel: '',
    poznamka: '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setNacitani(true)
    setChyba('')

    const { error } = await supabase.from('jednotky').insert({
      cislo_jednotky: form.cislo_jednotky,
      patro: form.patro ? parseInt(form.patro) : null,
      vymera_m2: parseFloat(form.vymera_m2),
      podil_citatel: parseInt(form.podil_citatel),
      podil_jmenovatel: parseInt(form.podil_jmenovatel),
      poznamka: form.poznamka || null,
    })

    if (error) {
      setChyba('Nepodařilo se uložit jednotku: ' + error.message)
      setNacitani(false)
    } else {
      router.push('/dashboard/jednotky')
      router.refresh()
    }
  }

  return (
    <div className="p-8 max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/jednotky" className="text-gray-400 hover:text-gray-600 text-sm">
          ← Zpět
        </Link>
        <h2 className="text-xl font-semibold text-gray-900">Nová jednotka</h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Číslo jednotky *</label>
            <input
              name="cislo_jednotky"
              value={form.cislo_jednotky}
              onChange={handleChange}
              required
              placeholder="např. 101"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Patro</label>
            <input
              name="patro"
              type="number"
              value={form.patro}
              onChange={handleChange}
              placeholder="např. 1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Výměra (m²) *</label>
          <input
            name="vymera_m2"
            type="number"
            step="0.01"
            value={form.vymera_m2}
            onChange={handleChange}
            required
            placeholder="např. 68.50"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Vlastnický podíl *</label>
          <div className="flex items-center gap-2">
            <input
              name="podil_citatel"
              type="number"
              value={form.podil_citatel}
              onChange={handleChange}
              required
              placeholder="čitatel"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-400 text-lg">/</span>
            <input
              name="podil_jmenovatel"
              type="number"
              value={form.podil_jmenovatel}
              onChange={handleChange}
              required
              placeholder="jmenovatel"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">Podíl na společných částech domu (z prohlášení vlastníka)</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Poznámka</label>
          <textarea
            name="poznamka"
            value={form.poznamka}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {chyba && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
            {chyba}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={nacitani}
            className="bg-blue-600 text-white text-sm px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {nacitani ? 'Ukládám...' : 'Uložit jednotku'}
          </button>
          <Link
            href="/dashboard/jednotky"
            className="text-sm px-5 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Zrušit
          </Link>
        </div>
      </form>
    </div>
  )
}
