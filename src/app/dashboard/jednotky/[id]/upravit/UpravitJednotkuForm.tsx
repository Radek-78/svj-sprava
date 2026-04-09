'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const inputClass = "w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
const labelClass = "block text-sm font-medium text-gray-700 mb-1.5"

type Jednotka = {
  id: string
  cislo_jednotky: string
  patro: number | null
  vymera_m2: number
  podil_citatel: number
  podil_jmenovatel: number
  poznamka: string | null
}

export default function UpravitJednotkuForm({ jednotka }: { jednotka: Jednotka }) {
  const router = useRouter()
  const supabase = createClient()
  const [chyba, setChyba] = useState('')
  const [nacitani, setNacitani] = useState(false)

  const [form, setForm] = useState({
    cislo_jednotky: jednotka.cislo_jednotky,
    patro: jednotka.patro?.toString() ?? '',
    vymera_m2: jednotka.vymera_m2.toString(),
    podil_citatel: jednotka.podil_citatel.toString(),
    podil_jmenovatel: jednotka.podil_jmenovatel.toString(),
    poznamka: jednotka.poznamka ?? '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setNacitani(true)
    setChyba('')

    const { error } = await supabase.from('jednotky').update({
      cislo_jednotky: form.cislo_jednotky,
      patro: form.patro ? parseInt(form.patro) : null,
      vymera_m2: parseFloat(form.vymera_m2),
      podil_citatel: parseInt(form.podil_citatel),
      podil_jmenovatel: parseInt(form.podil_jmenovatel),
      poznamka: form.poznamka || null,
    }).eq('id', jednotka.id)

    if (error) {
      setChyba('Nepodařilo se uložit změny: ' + error.message)
      setNacitani(false)
    } else {
      router.push(`/dashboard/jednotky/${jednotka.id}`)
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Číslo jednotky *</label>
          <input name="cislo_jednotky" value={form.cislo_jednotky} onChange={handleChange} required className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Patro</label>
          <input name="patro" type="number" value={form.patro} onChange={handleChange} className={inputClass} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Výměra (m²) *</label>
        <input name="vymera_m2" type="number" step="0.01" value={form.vymera_m2} onChange={handleChange} required className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>Vlastnický podíl *</label>
        <div className="flex items-center gap-2">
          <input name="podil_citatel" type="number" value={form.podil_citatel} onChange={handleChange} required placeholder="čitatel" className={inputClass} />
          <span className="text-gray-400 text-xl font-light">/</span>
          <input name="podil_jmenovatel" type="number" value={form.podil_jmenovatel} onChange={handleChange} required placeholder="jmenovatel" className={inputClass} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Poznámka</label>
        <textarea name="poznamka" value={form.poznamka} onChange={handleChange} rows={3} className={inputClass + " resize-none"} />
      </div>

      {chyba && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{chyba}</div>
      )}

      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={nacitani} className="bg-blue-600 text-white text-sm px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
          {nacitani ? 'Ukládám...' : 'Uložit změny'}
        </button>
        <Link href={`/dashboard/jednotky/${jednotka.id}`} className="text-sm px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors font-medium">
          Zrušit
        </Link>
      </div>
    </form>
  )
}
