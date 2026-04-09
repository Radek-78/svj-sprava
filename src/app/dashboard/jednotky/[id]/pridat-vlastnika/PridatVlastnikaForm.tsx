'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const inputClass = "w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
const labelClass = "block text-sm font-medium text-gray-700 mb-1.5"

type Osoba = { id: string; jmeno: string; prijmeni: string }

export default function PridatVlastnikaForm({ jednotkaId, osoby }: { jednotkaId: string; osoby: Osoba[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [rezim, setRezim] = useState<'vybrat' | 'nova'>('vybrat')
  const [osobaId, setOsobaId] = useState('')
  const [datumOd, setDatumOd] = useState(new Date().toISOString().split('T')[0])
  const [chyba, setChyba] = useState('')
  const [nacitani, setNacitani] = useState(false)

  const [novaOsoba, setNovaOsoba] = useState({
    jmeno: '', prijmeni: '', email: '', telefon: '',
    adresa_ulice: '', adresa_mesto: '', adresa_psc: '',
  })

  function handleNovaOsobaChange(e: React.ChangeEvent<HTMLInputElement>) {
    setNovaOsoba(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setNacitani(true)
    setChyba('')

    let finalOsobaId = osobaId

    if (rezim === 'nova') {
      const { data, error } = await supabase.from('osoby').insert({
        jmeno: novaOsoba.jmeno,
        prijmeni: novaOsoba.prijmeni,
        email: novaOsoba.email || null,
        telefon: novaOsoba.telefon || null,
        adresa_ulice: novaOsoba.adresa_ulice || null,
        adresa_mesto: novaOsoba.adresa_mesto || null,
        adresa_psc: novaOsoba.adresa_psc || null,
      }).select().single()
      if (error) { setChyba('Chyba při vytváření osoby: ' + error.message); setNacitani(false); return }
      finalOsobaId = data.id
    }

    const { error } = await supabase.from('vlastnici').insert({
      jednotka_id: jednotkaId,
      osoba_id: finalOsobaId,
      datum_od: datumOd,
      je_aktivni: true,
    })

    if (error) { setChyba('Chyba: ' + error.message); setNacitani(false) }
    else { router.push(`/dashboard/jednotky/${jednotkaId}`); router.refresh() }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
      {/* Přepínač */}
      <div className="flex rounded-lg border border-gray-300 overflow-hidden">
        <button type="button" onClick={() => setRezim('vybrat')}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${rezim === 'vybrat' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
          Vybrat existující osobu
        </button>
        <button type="button" onClick={() => setRezim('nova')}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${rezim === 'nova' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
          Přidat novou osobu
        </button>
      </div>

      {rezim === 'vybrat' ? (
        <div>
          <label className={labelClass}>Vyberte vlastníka *</label>
          {osoby.length === 0 ? (
            <p className="text-sm text-gray-500">Žádné osoby v systému. Zvolte "Přidat novou osobu".</p>
          ) : (
            <select value={osobaId} onChange={e => setOsobaId(e.target.value)} required className={inputClass}>
              <option value="">— vyberte osobu —</option>
              {osoby.map(o => (
                <option key={o.id} value={o.id}>{o.prijmeni} {o.jmeno}</option>
              ))}
            </select>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Jméno *</label>
              <input name="jmeno" value={novaOsoba.jmeno} onChange={handleNovaOsobaChange} required placeholder="Jan" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Příjmení *</label>
              <input name="prijmeni" value={novaOsoba.prijmeni} onChange={handleNovaOsobaChange} required placeholder="Novák" className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>E-mail</label>
              <input name="email" type="email" value={novaOsoba.email} onChange={handleNovaOsobaChange} placeholder="jan@email.cz" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Telefon</label>
              <input name="telefon" value={novaOsoba.telefon} onChange={handleNovaOsobaChange} placeholder="+420 777 123 456" className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Ulice a číslo</label>
            <input name="adresa_ulice" value={novaOsoba.adresa_ulice} onChange={handleNovaOsobaChange} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Město</label>
              <input name="adresa_mesto" value={novaOsoba.adresa_mesto} onChange={handleNovaOsobaChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>PSČ</label>
              <input name="adresa_psc" value={novaOsoba.adresa_psc} onChange={handleNovaOsobaChange} className={inputClass} />
            </div>
          </div>
        </div>
      )}

      <div>
        <label className={labelClass}>Vlastník od *</label>
        <input type="date" value={datumOd} onChange={e => setDatumOd(e.target.value)} required className={inputClass} />
      </div>

      {chyba && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{chyba}</div>}

      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={nacitani} className="bg-blue-600 text-white text-sm px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
          {nacitani ? 'Ukládám...' : 'Přiřadit vlastníka'}
        </button>
        <Link href={`/dashboard/jednotky/${jednotkaId}`} className="text-sm px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors font-medium">
          Zrušit
        </Link>
      </div>
    </form>
  )
}
