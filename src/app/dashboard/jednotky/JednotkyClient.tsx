'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Jednotka = {
  id: string
  cislo_jednotky: string
  patro: number | null
  vymera_m2: number
  podil_citatel: number
  podil_jmenovatel: number
  poznamka: string | null
  vlastnici: { je_aktivni: boolean; osoby: { jmeno: string | null; prijmeni: string } }[]
  najemnici: { je_aktivni: boolean }[]
}

type Osoba = {
  id: string
  jmeno: string | null
  prijmeni: string
}

type Vlastnik = {
  id: string
  datum_od: string
  osoby: { id: string; jmeno: string | null; prijmeni: string; email: string | null; telefon: string | null }
}

type Najemnik = {
  id: string
  datum_od: string
  osoby: { id: string; jmeno: string | null; prijmeni: string; email: string | null; telefon: string | null }
}

type Detail = {
  jednotka: Jednotka
  vlastnici: Vlastnik[]
  najemnici: Najemnik[]
}

const dnesStr = new Date().toISOString().split('T')[0]

export default function JednotkyClient({ jednotky }: { jednotky: Jednotka[] }) {
  const [vybranaId, setVybranaId] = useState<string | null>(null)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [nacitaniDetail, setNacitaniDetail] = useState(false)
  const [mazani, setMazani] = useState(false)
  const [potvrzeniSmazani, setPotvrzeniSmazani] = useState(false)

  const [formVlastnik, setFormVlastnik] = useState(false)
  const [formNajemnik, setFormNajemnik] = useState(false)
  const [osoby, setOsoby] = useState<Osoba[]>([])
  const [osobaVlastnik, setOsobaVlastnik] = useState('')
  const [datumVlastnik, setDatumVlastnik] = useState(dnesStr)
  const [osobaNajemnik, setOsobaNajemnik] = useState('')
  const [datumNajemnik, setDatumNajemnik] = useState(dnesStr)
  const [ukladani, setUkladani] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  const celkem = jednotky.length
  const sVlastnikem = jednotky.filter(j => j.vlastnici.some(v => v.je_aktivni)).length
  const sNajemnikem = jednotky.filter(j => j.najemnici.some(n => n.je_aktivni)).length

  useEffect(() => {
    if (!vybranaId) { setDetail(null); return }
    setNacitaniDetail(true)
    setPotvrzeniSmazani(false)
    setFormVlastnik(false)
    setFormNajemnik(false)

    async function fetchDetail() {
      const jed = jednotky.find(j => j.id === vybranaId)!
      const [{ data: vl }, { data: naj }, { data: os }] = await Promise.all([
        supabase.from('vlastnici').select('id, datum_od, osoby(id, jmeno, prijmeni, email, telefon)').eq('jednotka_id', vybranaId!).eq('je_aktivni', true),
        supabase.from('najemnici').select('id, datum_od, osoby(id, jmeno, prijmeni, email, telefon)').eq('jednotka_id', vybranaId!).eq('je_aktivni', true),
        supabase.from('osoby').select('id, jmeno, prijmeni').order('prijmeni'),
      ])
      setDetail({ jednotka: jed, vlastnici: (vl ?? []) as unknown as Vlastnik[], najemnici: (naj ?? []) as unknown as Najemnik[] })
      setOsoby(os ?? [])
      setNacitaniDetail(false)
    }
    fetchDetail()
  }, [vybranaId])

  async function refreshVlastnici() {
    const { data: vl } = await supabase.from('vlastnici').select('id, datum_od, osoby(id, jmeno, prijmeni, email, telefon)').eq('jednotka_id', vybranaId!).eq('je_aktivni', true)
    setDetail(prev => prev ? { ...prev, vlastnici: (vl ?? []) as unknown as Vlastnik[] } : null)
  }

  async function refreshNajemnici() {
    const { data: naj } = await supabase.from('najemnici').select('id, datum_od, osoby(id, jmeno, prijmeni, email, telefon)').eq('jednotka_id', vybranaId!).eq('je_aktivni', true)
    setDetail(prev => prev ? { ...prev, najemnici: (naj ?? []) as unknown as Najemnik[] } : null)
  }

  async function handlePridatVlastnika() {
    if (!osobaVlastnik || !vybranaId) return
    setUkladani(true)
    await supabase.from('vlastnici').insert({ jednotka_id: vybranaId, osoba_id: osobaVlastnik, datum_od: datumVlastnik, je_aktivni: true })
    await refreshVlastnici()
    setFormVlastnik(false)
    setOsobaVlastnik('')
    router.refresh()
    setUkladani(false)
  }

  async function handlePridatNajemnika() {
    if (!osobaNajemnik || !vybranaId) return
    setUkladani(true)
    await supabase.from('najemnici').insert({ jednotka_id: vybranaId, osoba_id: osobaNajemnik, datum_od: datumNajemnik, je_aktivni: true })
    await refreshNajemnici()
    setFormNajemnik(false)
    setOsobaNajemnik('')
    router.refresh()
    setUkladani(false)
  }

  async function handleSmazat() {
    if (!vybranaId) return
    setMazani(true)
    await supabase.from('jednotky').delete().eq('id', vybranaId)
    setVybranaId(null)
    router.refresh()
    setMazani(false)
  }

  function formatJmeno(o: { jmeno: string | null; prijmeni: string }) {
    return [o.jmeno, o.prijmeni].filter(Boolean).join(' ')
  }

  const inputCls = 'w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white'

  return (
    <div className="flex h-full">
      {/* Hlavní obsah */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Hlavička */}
        <div className="px-8 pt-7 pb-5 border-b border-zinc-200 bg-stone-50">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Bytové jednotky</h1>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="text-sm text-zinc-500">{celkem} celkem</span>
                <span className="text-zinc-300">·</span>
                <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>{sVlastnikem} obsazeno
                </span>
                <span className="text-zinc-300">·</span>
                <span className="inline-flex items-center gap-1.5 text-sm text-amber-700 font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>{sNajemnikem} s nájemníkem
                </span>
                <span className="text-zinc-300">·</span>
                <span className="inline-flex items-center gap-1.5 text-sm text-zinc-400">
                  <span className="w-2 h-2 rounded-full bg-zinc-300"></span>{celkem - sVlastnikem} volné
                </span>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Link href="/dashboard/jednotky/import"
                className="flex items-center gap-1.5 border border-zinc-300 text-zinc-600 text-sm px-3.5 py-2 rounded-xl hover:bg-zinc-50 transition-colors font-medium">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Import
              </Link>
              <Link href="/dashboard/jednotky/nova"
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
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-zinc-50 border-b border-zinc-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">Číslo</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">Patro</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">Výměra</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">Podíl</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">Vlastník</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">Stav</th>
                  </tr>
                </thead>
                <tbody>
                  {jednotky.map((j) => {
                    const vl = j.vlastnici.filter(v => v.je_aktivni)
                    const maNaj = j.najemnici.some(n => n.je_aktivni)

                    return (
                      <tr
                        key={j.id}
                        onClick={() => setVybranaId(j.id)}
                        className="border-b border-zinc-100 cursor-pointer transition-colors hover:bg-zinc-50"
                      >
                        <td className="px-4 py-2.5">
                          <span className="font-bold text-zinc-900">{j.cislo_jednotky}</span>
                        </td>
                        <td className="px-4 py-2.5 text-zinc-400 tabular-nums text-xs">{j.patro ?? '—'}</td>
                        <td className="px-4 py-2.5 text-zinc-600 tabular-nums">{j.vymera_m2} m²</td>
                        <td className="px-4 py-2.5 text-zinc-400 tabular-nums text-xs">{j.podil_citatel}/{j.podil_jmenovatel}</td>
                        <td className="px-4 py-2.5">
                          {vl.length === 0
                            ? <span className="text-zinc-300 text-xs italic">—</span>
                            : <span className="text-zinc-700">{vl.map((v, i) => <span key={i}>{i > 0 && ', '}{v.osoby.prijmeni}{v.osoby.jmeno ? ` ${v.osoby.jmeno}` : ''}</span>)}</span>
                          }
                        </td>
                        <td className="px-4 py-2.5">
                          {maNaj
                            ? <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-amber-200"><span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>Nájemník</span>
                            : vl.length > 0
                              ? <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>Vlastník</span>
                              : <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-400"><span className="w-1.5 h-1.5 rounded-full bg-zinc-300"></span>Volné</span>
                          }
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2.5 border-t border-zinc-100 bg-zinc-50/50 text-xs text-zinc-400 flex justify-between">
              <span>Celkem {celkem} jednotek</span>
              <span>Kliknutím na řádek zobrazíte detail</span>
            </div>
          </div>
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
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-widest">Bytová jednotka</p>
                <p className="text-2xl font-bold text-white">{detail?.jednotka.cislo_jednotky ?? '...'}</p>
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
              {nacitaniDetail ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-7 h-7 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
                </div>
              ) : detail && (
                <div>
                  {/* Základní info */}
                  <div className="px-6 py-5 border-b border-zinc-100">
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { l: 'Patro', v: detail.jednotka.patro ?? '—' },
                        { l: 'Výměra', v: `${detail.jednotka.vymera_m2} m²` },
                        { l: 'Podíl', v: `${detail.jednotka.podil_citatel}/${detail.jednotka.podil_jmenovatel}` },
                      ].map(({ l, v }) => (
                        <div key={l} className="bg-zinc-50 rounded-xl px-4 py-3">
                          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">{l}</p>
                          <p className="text-sm font-semibold text-zinc-900 mt-0.5">{v}</p>
                        </div>
                      ))}
                    </div>
                    {detail.jednotka.poznamka && (
                      <p className="text-xs text-zinc-500 mt-3 bg-zinc-50 rounded-xl px-4 py-3">{detail.jednotka.poznamka}</p>
                    )}
                  </div>

                  {/* Vlastníci */}
                  <div className="px-6 py-5 border-b border-zinc-100">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Vlastník</p>
                      <button
                        onClick={() => { setFormVlastnik(!formVlastnik); setFormNajemnik(false) }}
                        className="text-xs text-violet-600 hover:text-violet-800 font-medium"
                      >
                        {formVlastnik ? 'Zrušit' : '+ Přidat'}
                      </button>
                    </div>

                    {formVlastnik && (
                      <div className="bg-violet-50 rounded-xl p-4 mb-3 border border-violet-100 space-y-3">
                        <div>
                          <label className="text-xs font-medium text-zinc-600 mb-1 block">Vyberte osobu</label>
                          <select value={osobaVlastnik} onChange={e => setOsobaVlastnik(e.target.value)} className={inputCls}>
                            <option value="">— vyberte osobu —</option>
                            {osoby.map(o => (
                              <option key={o.id} value={o.id}>{o.prijmeni}{o.jmeno ? ` ${o.jmeno}` : ''}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-zinc-600 mb-1 block">Vlastník od</label>
                          <input type="date" value={datumVlastnik} onChange={e => setDatumVlastnik(e.target.value)} className={inputCls} />
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={handlePridatVlastnika}
                            disabled={!osobaVlastnik || ukladani}
                            className="flex-1 bg-violet-600 text-white text-sm py-2 rounded-lg hover:bg-violet-700 transition-colors font-medium disabled:opacity-40"
                          >
                            {ukladani ? 'Ukládám...' : 'Přiřadit vlastníka'}
                          </button>
                        </div>
                      </div>
                    )}

                    {detail.vlastnici.length === 0 ? (
                      <p className="text-sm text-zinc-400 italic">Nepřiřazen</p>
                    ) : (
                      <div className="space-y-2">
                        {detail.vlastnici.map(v => (
                          <div key={v.id} className="bg-zinc-50 rounded-xl p-3 flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-zinc-900 text-sm">{formatJmeno(v.osoby)}</p>
                              {v.osoby.email && <p className="text-xs text-zinc-500 mt-0.5">{v.osoby.email}</p>}
                              {v.osoby.telefon && <p className="text-xs text-zinc-500">{v.osoby.telefon}</p>}
                              <p className="text-[10px] text-zinc-400 mt-1">od {v.datum_od}</p>
                            </div>
                            <Link href={`/dashboard/osoby/${v.osoby.id}`} className="text-xs text-violet-600 hover:text-violet-800 flex-shrink-0 ml-3 mt-0.5">detail →</Link>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Nájemníci */}
                  <div className="px-6 py-5 border-b border-zinc-100">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Nájemník</p>
                      <button
                        onClick={() => { setFormNajemnik(!formNajemnik); setFormVlastnik(false) }}
                        className="text-xs text-violet-600 hover:text-violet-800 font-medium"
                      >
                        {formNajemnik ? 'Zrušit' : '+ Přidat'}
                      </button>
                    </div>

                    {formNajemnik && (
                      <div className="bg-amber-50 rounded-xl p-4 mb-3 border border-amber-100 space-y-3">
                        <div>
                          <label className="text-xs font-medium text-zinc-600 mb-1 block">Vyberte osobu</label>
                          <select value={osobaNajemnik} onChange={e => setOsobaNajemnik(e.target.value)} className={inputCls}>
                            <option value="">— vyberte osobu —</option>
                            {osoby.map(o => (
                              <option key={o.id} value={o.id}>{o.prijmeni}{o.jmeno ? ` ${o.jmeno}` : ''}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-zinc-600 mb-1 block">Nájemník od</label>
                          <input type="date" value={datumNajemnik} onChange={e => setDatumNajemnik(e.target.value)} className={inputCls} />
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={handlePridatNajemnika}
                            disabled={!osobaNajemnik || ukladani}
                            className="flex-1 bg-amber-600 text-white text-sm py-2 rounded-lg hover:bg-amber-700 transition-colors font-medium disabled:opacity-40"
                          >
                            {ukladani ? 'Ukládám...' : 'Přiřadit nájemníka'}
                          </button>
                        </div>
                      </div>
                    )}

                    {detail.najemnici.length === 0 ? (
                      <p className="text-sm text-zinc-400 italic">Nepřiřazen</p>
                    ) : (
                      <div className="space-y-2">
                        {detail.najemnici.map(n => (
                          <div key={n.id} className="bg-amber-50 rounded-xl p-3 ring-1 ring-amber-100 flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-zinc-900 text-sm">{formatJmeno(n.osoby)}</p>
                              {n.osoby.email && <p className="text-xs text-zinc-500 mt-0.5">{n.osoby.email}</p>}
                              {n.osoby.telefon && <p className="text-xs text-zinc-500">{n.osoby.telefon}</p>}
                              <p className="text-[10px] text-zinc-400 mt-1">od {n.datum_od}</p>
                            </div>
                            <Link href={`/dashboard/osoby/${n.osoby.id}`} className="text-xs text-violet-600 hover:text-violet-800 flex-shrink-0 ml-3 mt-0.5">detail →</Link>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Akce */}
                  <div className="px-6 py-5 space-y-2">
                    <Link
                      href={`/dashboard/jednotky/${vybranaId}/upravit`}
                      className="flex items-center justify-center gap-2 w-full border border-zinc-300 text-zinc-700 text-sm py-2.5 rounded-xl hover:bg-zinc-50 transition-colors font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Upravit jednotku
                    </Link>

                    {potvrzeniSmazani ? (
                      <div className="flex gap-2">
                        <button
                          onClick={handleSmazat}
                          disabled={mazani}
                          className="flex-1 bg-red-600 text-white text-sm py-2.5 rounded-xl hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
                        >
                          {mazani ? 'Mažu...' : 'Potvrdit smazání'}
                        </button>
                        <button
                          onClick={() => setPotvrzeniSmazani(false)}
                          className="flex-1 border border-zinc-300 text-zinc-600 text-sm py-2.5 rounded-xl hover:bg-zinc-50 transition-colors"
                        >
                          Zrušit
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setPotvrzeniSmazani(true)}
                        className="w-full border border-red-200 text-red-600 text-sm py-2.5 rounded-xl hover:bg-red-50 transition-colors font-medium"
                      >
                        Smazat jednotku
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
