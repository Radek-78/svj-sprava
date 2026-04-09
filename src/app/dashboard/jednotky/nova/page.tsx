'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const inputClass = "w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
const labelClass = "block text-sm font-medium text-gray-700 mb-1.5"

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
        <Link href="/dashboard/jednotky" className="text-sm text-gray-500 hover:text-gray-700">
          ← Zpět
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">Nová jednotka</h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Číslo jednotky *</label>
            <input
              name="cislo_jednotky"
              value={form.cislo_jednotky}
              onChange={handleChange}
              required
              placeholder="např. 101"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Patro</label>
            <input
              name="patro"
              type="number"
              value={form.patro}
              onChange={handleChange}
              placeholder="např. 1"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Výměra (m²) *</label>
          <input
            name="vymera_m2"
            type="number"
            step="0.01"
            value={form.vymera_m2}
            onChange={handleChange}
            required
            placeholder="např. 68.50"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Vlastnický podíl *</label>
          <div className="flex items-center gap-2">
            <input
              name="podil_citatel"
              type="number"
              value={form.podil_citatel}
              onChange={handleChange}
              required
              placeholder="čitatel"
              className={inputClass}
            />
            <span className="text-gray-400 text-xl font-light">/</span>
            <input
              name="podil_jmenovatel"
              type="number"
              value={form.podil_jmenovatel}
              onChange={handleChange}
              required
              placeholder="jmenovatel"
              className={inputClass}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1.5">Podíl na společných částech domu (z prohlášení vlastníka)</p>
        </div>

        <div>
          <label className={labelClass}>Poznámka</label>
          <textarea
            name="poznamka"
            value={form.poznamka}
            onChange={handleChange}
            rows={3}
            placeholder="Volitelná poznámka..."
            className={inputClass + " resize-none"}
          />
        </div>

        {chyba && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {chyba}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={nacitani}
            className="bg-blue-600 text-white text-sm px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {nacitani ? 'Ukládám...' : 'Uložit jednotku'}
          </button>
          <Link
            href="/dashboard/jednotky"
            className="text-sm px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors font-medium"
          >
            Zrušit
          </Link>
        </div>
      </form>
    </div>
  )
}
