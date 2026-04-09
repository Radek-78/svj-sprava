'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const inputClass = "w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
const labelClass = "block text-sm font-medium text-gray-700 mb-1.5"

export default function NovaOsobaPage() {
  const router = useRouter()
  const supabase = createClient()
  const [chyba, setChyba] = useState('')
  const [nacitani, setNacitani] = useState(false)
  const [form, setForm] = useState({
    jmeno: '', prijmeni: '', email: '', telefon: '',
    adresa_ulice: '', adresa_mesto: '', adresa_psc: '', poznamka: '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setNacitani(true)
    setChyba('')
    const { error } = await supabase.from('osoby').insert({
      jmeno: form.jmeno,
      prijmeni: form.prijmeni,
      email: form.email || null,
      telefon: form.telefon || null,
      adresa_ulice: form.adresa_ulice || null,
      adresa_mesto: form.adresa_mesto || null,
      adresa_psc: form.adresa_psc || null,
      poznamka: form.poznamka || null,
    })
    if (error) { setChyba('Chyba: ' + error.message); setNacitani(false) }
    else { router.push('/dashboard/osoby'); router.refresh() }
  }

  return (
    <div className="p-8 max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/osoby" className="text-sm text-gray-500 hover:text-gray-700">← Zpět</Link>
        <h2 className="text-2xl font-bold text-gray-900">Nová osoba</h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Jméno <span className="text-gray-400 font-normal">(nepovinné)</span></label>
            <input name="jmeno" value={form.jmeno} onChange={handleChange} placeholder="Jan" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Příjmení / Název firmy *</label>
            <input name="prijmeni" value={form.prijmeni} onChange={handleChange} required placeholder="Novák / s.r.o." className={inputClass} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>E-mail</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="jan@email.cz" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Telefon</label>
            <input name="telefon" value={form.telefon} onChange={handleChange} placeholder="+420 777 123 456" className={inputClass} />
          </div>
        </div>

        <div className="border-t border-gray-100 pt-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Kontaktní adresa</p>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Ulice a číslo</label>
              <input name="adresa_ulice" value={form.adresa_ulice} onChange={handleChange} placeholder="Spojovací 557/1" className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Město</label>
                <input name="adresa_mesto" value={form.adresa_mesto} onChange={handleChange} placeholder="Praha" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>PSČ</label>
                <input name="adresa_psc" value={form.adresa_psc} onChange={handleChange} placeholder="190 00" className={inputClass} />
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className={labelClass}>Poznámka</label>
          <textarea name="poznamka" value={form.poznamka} onChange={handleChange} rows={3} className={inputClass + " resize-none"} />
        </div>

        {chyba && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{chyba}</div>}

        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={nacitani} className="bg-blue-600 text-white text-sm px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
            {nacitani ? 'Ukládám...' : 'Uložit osobu'}
          </button>
          <Link href="/dashboard/osoby" className="text-sm px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors font-medium">
            Zrušit
          </Link>
        </div>
      </form>
    </div>
  )
}
