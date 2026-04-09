'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Osoba = {
  id: string
  jmeno: string | null
  prijmeni: string
  email: string | null
  telefon: string | null
  adresa_ulice: string | null
  adresa_mesto: string | null
  adresa_psc: string | null
  poznamka: string | null
}

type Detail = {
  osoba: Osoba
  jakoVlastnik: { id: string; jednotky: { id: string; cislo_jednotky: string } }[]
  jakoNajemnik: { id: string; jednotky: { id: string; cislo_jednotky: string } }[]
}

const colors = ['bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-indigo-500']

export default function OsobyClient({ osoby }: { osoby: Osoba[] }) {
  const [vybranaId, setVybranaId] = useState<string | null>(null)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [nacitani, setNacitani] = useState(false)
  const [mazani, setMazani] = useState(false)
  const [potvrzeni, setPotvrzeni] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (!vybranaId) { setDetail(null); return }
    setNacitani(true)
    setPotvrzeni(false)

    async function fetchDetail() {
      const osoba = osoby.find(o => o.id === vybranaId)!
      const [{ data: vl }, { data: naj }] = await Promise.all([
        supabase.from('vlastnici').select('id, jednotky(id, cislo_jednotky)').eq('osoba_id', vybranaId!).eq('je_aktivni', true),
        supabase.from('najemnici').select('id, jednotky(id, cislo_jednotky)').eq('osoba_id', vybranaId!).eq('je_aktivni', true),
      ])
      setDetail({
        osoba,
        jakoVlastnik: (vl ?? []) as unknown as Detail['jakoVlastnik'],
        jakoNajemnik: (naj ?? []) as unknown as Detail['jakoNajemnik'],
      })
      setNacitani(false)
    }
    fetchDetail()
  }, [vybranaId])

  async function handleSmazat() {
    if (!vybranaId) return
    setMazani(true)
    await supabase.from('osoby').delete().eq('id', vybranaId)
    setVybranaId(null)
    router.refresh()
    setMazani(false)
  }

  function formatJmeno(o: Osoba) {
    return [o.prijmeni, o.jmeno].filter(Boolean).join(' ')
  }

  function inicialy(o: Osoba) {
    const p = o.prijmeni?.charAt(0) ?? ''
    const j = o.jmeno?.charAt(0) ?? ''
    return (p + j).toUpperCase() || '?'
  }

  return (
    <div className="flex h-full">
      {/* Hlavní obsah */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Hlavička */}
        <div className="px-8 pt-7 pb-5 border-b border-zinc-200 bg-stone-50">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Osoby</h1>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-sm text-zinc-500">{osoby.length} evidovaných osob</span>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Link href="/dashboard/osoby/import"
                className="flex items-center gap-1.5 border border-zinc-300 text-zinc-600 text-sm px-3.5 py-2 rounded-xl hover:bg-zinc-50 transition-colors font-medium">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Import
              </Link>
              <Link href="/dashboard/osoby/nova"
                className="flex items-center gap-1.5 bg-violet-600 text-white text-sm px-3.5 py-2 rounded-xl hover:bg-violet-700 transition-colors font-medium shadow-sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Přidat
              </Link>
            </div>
          </div>
        </div>

        {/* Tabulka */}
        <div className="flex-1 overflow-hidden px-8 py-5">
          {osoby.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-zinc-200">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-zinc-500 text-sm mb-4">Zatím nejsou evidovány žádné osoby.</p>
              <Link href="/dashboard/osoby/nova" className="bg-violet-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-violet-700 transition-colors">
                Přidat první osobu
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden h-full flex flex-col">
              <div className="overflow-y-auto flex-1">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-zinc-50 border-b border-zinc-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">Osoba</th>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">E-mail</th>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">Telefon</th>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">Adresa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {osoby.map((o, idx) => {
                      const barva = colors[idx % colors.length]
                      return (
                        <tr
                          key={o.id}
                          onClick={() => setVybranaId(o.id)}
                          className="border-b border-zinc-100 cursor-pointer transition-colors hover:bg-zinc-50"
                        >
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-3">
                              <div className={`w-7 h-7 rounded-full ${barva} flex items-center justify-center flex-shrink-0`}>
                                <span className="text-white text-[10px] font-bold">{inicialy(o)}</span>
                              </div>
                              <span className="font-semibold text-zinc-900">{formatJmeno(o)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-zinc-500">{o.email || <span className="text-zinc-300 italic text-xs">—</span>}</td>
                          <td className="px-4 py-2.5 text-zinc-500 tabular-nums">{o.telefon || <span className="text-zinc-300 italic text-xs">—</span>}</td>
                          <td className="px-4 py-2.5 text-zinc-500 text-xs">
                            {o.adresa_ulice
                              ? <>{o.adresa_ulice}{o.adresa_mesto ? `, ${o.adresa_mesto}` : ''}</>
                              : <span className="text-zinc-300 italic">—</span>
                            }
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2.5 border-t border-zinc-100 bg-zinc-50/50 text-xs text-zinc-400 flex justify-between">
                <span>Celkem {osoby.length} osob</span>
                <span>Kliknutím na řádek zobrazíte detail</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {vybranaId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setVybranaId(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[88vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal hlavička */}
            <div className="bg-zinc-950 px-6 py-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                {detail && (
                  <div className={`w-10 h-10 rounded-full ${colors[osoby.findIndex(o => o.id === vybranaId) % colors.length]} flex items-center justify-center flex-shrink-0`}>
                    <span className="text-white text-sm font-bold">{inicialy(detail.osoba)}</span>
                  </div>
                )}
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-widest">Osoba</p>
                  <p className="text-xl font-bold text-white leading-tight">{detail ? formatJmeno(detail.osoba) : '...'}</p>
                </div>
              </div>
              <button
                onClick={() => setVybranaId(null)}
                className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/20 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal tělo */}
            <div className="flex-1 overflow-y-auto">
              {nacitani ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-7 h-7 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
                </div>
              ) : detail && (
                <div>
                  {/* Kontakty */}
                  <div className="px-6 py-5 border-b border-zinc-100">
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">Kontakt</p>
                    <div className="space-y-2">
                      {detail.osoba.email && (
                        <div className="flex items-center gap-3 bg-zinc-50 rounded-xl px-4 py-3">
                          <svg className="w-4 h-4 text-zinc-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span className="text-sm text-zinc-700">{detail.osoba.email}</span>
                        </div>
                      )}
                      {detail.osoba.telefon && (
                        <div className="flex items-center gap-3 bg-zinc-50 rounded-xl px-4 py-3">
                          <svg className="w-4 h-4 text-zinc-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span className="text-sm text-zinc-700">{detail.osoba.telefon}</span>
                        </div>
                      )}
                      {detail.osoba.adresa_ulice && (
                        <div className="flex items-start gap-3 bg-zinc-50 rounded-xl px-4 py-3">
                          <svg className="w-4 h-4 text-zinc-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <div>
                            <p className="text-sm text-zinc-700">{detail.osoba.adresa_ulice}</p>
                            {detail.osoba.adresa_mesto && (
                              <p className="text-xs text-zinc-500 mt-0.5">{detail.osoba.adresa_psc} {detail.osoba.adresa_mesto}</p>
                            )}
                          </div>
                        </div>
                      )}
                      {!detail.osoba.email && !detail.osoba.telefon && !detail.osoba.adresa_ulice && (
                        <p className="text-sm text-zinc-400 italic">Žádné kontaktní údaje</p>
                      )}
                    </div>
                    {detail.osoba.poznamka && (
                      <p className="text-xs text-zinc-500 mt-3 bg-zinc-50 rounded-xl px-4 py-3">{detail.osoba.poznamka}</p>
                    )}
                  </div>

                  {/* Vlastník jednotky */}
                  <div className="px-6 py-5 border-b border-zinc-100">
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">Vlastník jednotky</p>
                    {detail.jakoVlastnik.length === 0 ? (
                      <p className="text-sm text-zinc-400 italic">—</p>
                    ) : (
                      <div className="space-y-2">
                        {detail.jakoVlastnik.map(v => (
                          <div key={v.id} className="flex items-center justify-between bg-emerald-50 rounded-xl px-4 py-3 ring-1 ring-emerald-100">
                            <span className="text-sm font-semibold text-zinc-900">Jednotka {v.jednotky.cislo_jednotky}</span>
                            <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">vlastník</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Nájemník v jednotce */}
                  <div className="px-6 py-5 border-b border-zinc-100">
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">Nájemník v jednotce</p>
                    {detail.jakoNajemnik.length === 0 ? (
                      <p className="text-sm text-zinc-400 italic">—</p>
                    ) : (
                      <div className="space-y-2">
                        {detail.jakoNajemnik.map(n => (
                          <div key={n.id} className="flex items-center justify-between bg-amber-50 rounded-xl px-4 py-3 ring-1 ring-amber-100">
                            <span className="text-sm font-semibold text-zinc-900">Jednotka {n.jednotky.cislo_jednotky}</span>
                            <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">nájemník</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Akce */}
                  <div className="px-6 py-5 space-y-2">
                    <Link
                      href={`/dashboard/osoby/${vybranaId}/upravit`}
                      className="flex items-center justify-center gap-2 w-full border border-zinc-300 text-zinc-700 text-sm py-2.5 rounded-xl hover:bg-zinc-50 transition-colors font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Upravit osobu
                    </Link>

                    {potvrzeni ? (
                      <div className="flex gap-2">
                        <button
                          onClick={handleSmazat}
                          disabled={mazani}
                          className="flex-1 bg-red-600 text-white text-sm py-2.5 rounded-xl hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
                        >
                          {mazani ? 'Mažu...' : 'Potvrdit smazání'}
                        </button>
                        <button
                          onClick={() => setPotvrzeni(false)}
                          className="flex-1 border border-zinc-300 text-zinc-600 text-sm py-2.5 rounded-xl hover:bg-zinc-50 transition-colors"
                        >
                          Zrušit
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setPotvrzeni(true)}
                        className="w-full border border-red-200 text-red-600 text-sm py-2.5 rounded-xl hover:bg-red-50 transition-colors font-medium"
                      >
                        Smazat osobu
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
