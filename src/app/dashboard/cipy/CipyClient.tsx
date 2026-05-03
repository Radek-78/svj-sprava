'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PageShell, { AddButton, PageEmpty, PageTable, PageTbody, PageTd, PageTh, PageThead, PageTr, SearchInput } from '@/components/PageShell'

type Osoba = { id: string; jmeno: string | null; prijmeni: string }
type Jednotka = { id: string; cislo_jednotky: string; vchod: string | null; ulice_vchodu: string | null }

type Cip = {
  id: string
  cislo_cipu: string
  poznamka: string | null
  osoba_id: string | null
  externi_prijemce: string | null
  datum_predani: string | null
  jednotka_id: string | null
  osoby?: Osoba | null
  jednotky?: Jednotka | null
}

type CipRow = Omit<Cip, 'osoby' | 'jednotky'> & {
  osoby?: Osoba | Osoba[] | null
  jednotky?: Jednotka | Jednotka[] | null
}

type ModalView = 'detail' | 'edit' | 'nova'
type PrijemceTyp = 'zadny' | 'osoba' | 'externi'

type FormState = {
  cislo_cipu: string
  jednotka_id: string
  prijemce_typ: PrijemceTyp
  osoba_id: string
  externi_prijemce: string
  datum_predani: string
  poznamka: string
}

const EMPTY_FORM: FormState = {
  cislo_cipu: '',
  jednotka_id: '',
  prijemce_typ: 'zadny',
  osoba_id: '',
  externi_prijemce: '',
  datum_predani: '',
  poznamka: '',
}

const INPUT = 'w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white'
const LABEL = 'block text-xs font-medium text-zinc-500 mb-1'

function formatJmeno(o: Osoba) {
  return [o.prijmeni, o.jmeno].filter(Boolean).join(' ')
}

function formatJednotka(j: Jednotka | null | undefined) {
  if (!j) return 'Sklad / nepřiděleno'
  const vchod = [j.ulice_vchodu, j.vchod].filter(Boolean).join('/')
  return vchod ? `Byt ${j.cislo_jednotky}, ${vchod}` : `Byt ${j.cislo_jednotky}`
}

function getPrijemce(cip: Cip) {
  if (cip.osoby) return formatJmeno(cip.osoby)
  if (cip.externi_prijemce) return cip.externi_prijemce
  return 'Nepřiděleno'
}

function numericChipSort(a: Cip, b: Cip) {
  const an = parseInt(a.cislo_cipu.match(/\d+/)?.[0] ?? '0')
  const bn = parseInt(b.cislo_cipu.match(/\d+/)?.[0] ?? '0')
  return an - bn || a.cislo_cipu.localeCompare(b.cislo_cipu, 'cs')
}

function relationOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function normalizeCip(cip: CipRow): Cip {
  return {
    ...cip,
    osoby: relationOne(cip.osoby),
    jednotky: relationOne(cip.jednotky),
  }
}

function statusBadge(cip: Cip) {
  const assigned = Boolean(cip.jednotka_id || cip.osoba_id || cip.externi_prijemce)
  return assigned ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 text-xs font-semibold">
      Přidělený
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200 text-xs font-semibold">
      Volný
    </span>
  )
}

export default function CipyClient({
  cipy: initialCipy,
  jednotky,
  osoby,
}: {
  cipy: CipRow[]
  jednotky: Jednotka[]
  osoby: Osoba[]
}) {
  const [cipy, setCipy] = useState(initialCipy.map(normalizeCip).sort(numericChipSort))
  const [hledani, setHledani] = useState('')
  const [vybranyId, setVybranyId] = useState<string | null>(null)
  const [view, setView] = useState<ModalView>('detail')
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [ukladani, setUkladani] = useState(false)
  const [mazani, setMazani] = useState(false)
  const [potvrzeni, setPotvrzeni] = useState(false)
  const [chyba, setChyba] = useState('')

  const router = useRouter()
  const supabase = createClient()

  const vybrany = cipy.find(c => c.id === vybranyId) ?? null

  const filtrovane = useMemo(() => {
    const q = hledani.trim().toLowerCase()
    if (!q) return cipy
    return cipy.filter(c => {
      const jednotka = formatJednotka(c.jednotky).toLowerCase()
      return (
        c.cislo_cipu.toLowerCase().includes(q) ||
        getPrijemce(c).toLowerCase().includes(q) ||
        jednotka.includes(q) ||
        (c.poznamka ?? '').toLowerCase().includes(q)
      )
    })
  }, [cipy, hledani])

  const celkem = cipy.length
  const pridelene = cipy.filter(c => c.jednotka_id || c.osoba_id || c.externi_prijemce).length
  const volne = celkem - pridelene
  const bytySCipy = new Set(cipy.filter(c => c.jednotka_id).map(c => c.jednotka_id)).size

  const navIndex = filtrovane.findIndex(c => c.id === vybranyId)
  const canPrev = navIndex > 0
  const canNext = navIndex >= 0 && navIndex < filtrovane.length - 1

  const refreshCipy = useCallback(async () => {
    const { data } = await supabase
      .from('jednotky_cipy')
      .select(`
        id, cislo_cipu, poznamka, osoba_id, externi_prijemce, datum_predani, jednotka_id,
        osoby(id, jmeno, prijmeni),
        jednotky(id, cislo_jednotky, vchod, ulice_vchodu)
      `)
      .order('cislo_cipu')
    if (data) setCipy((data as unknown as CipRow[]).map(normalizeCip).sort(numericChipSort))
  }, [supabase])

  function openDetail(id: string) {
    setVybranyId(id)
    setView('detail')
    setPotvrzeni(false)
    setChyba('')
  }

  function closeModal() {
    setVybranyId(null)
    setView('detail')
    setPotvrzeni(false)
    setChyba('')
  }

  function openNova() {
    setVybranyId(null)
    setForm(EMPTY_FORM)
    setChyba('')
    setPotvrzeni(false)
    setView('nova')
  }

  function openEdit() {
    if (!vybrany) return
    setForm({
      cislo_cipu: vybrany.cislo_cipu,
      jednotka_id: vybrany.jednotka_id ?? '',
      prijemce_typ: vybrany.osoba_id ? 'osoba' : vybrany.externi_prijemce ? 'externi' : 'zadny',
      osoba_id: vybrany.osoba_id ?? '',
      externi_prijemce: vybrany.externi_prijemce ?? '',
      datum_predani: vybrany.datum_predani ?? '',
      poznamka: vybrany.poznamka ?? '',
    })
    setChyba('')
    setView('edit')
  }

  function payloadFromForm() {
    return {
      cislo_cipu: form.cislo_cipu.trim(),
      jednotka_id: form.jednotka_id || null,
      osoba_id: form.prijemce_typ === 'osoba' ? (form.osoba_id || null) : null,
      externi_prijemce: form.prijemce_typ === 'externi' ? (form.externi_prijemce.trim() || null) : null,
      datum_predani: form.prijemce_typ === 'zadny' ? null : (form.datum_predani || null),
      poznamka: form.poznamka.trim() || null,
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.cislo_cipu.trim()) {
      setChyba('Číslo čipu je povinné.')
      return
    }
    setUkladani(true)
    setChyba('')

    const payload = payloadFromForm()
    const { data, error } = view === 'nova'
      ? await supabase.from('jednotky_cipy').insert(payload).select('id').single()
      : await supabase.from('jednotky_cipy').update(payload).eq('id', vybranyId).select('id').single()

    if (error) {
      setChyba(error.message)
      setUkladani(false)
      return
    }

    await refreshCipy()
    router.refresh()
    setVybranyId(data.id)
    setView('detail')
    setUkladani(false)
  }

  async function handleDelete() {
    if (!vybranyId) return
    setMazani(true)
    setChyba('')
    const { error } = await supabase.from('jednotky_cipy').delete().eq('id', vybranyId)
    if (error) {
      setChyba(error.message)
      setMazani(false)
      return
    }
    await refreshCipy()
    router.refresh()
    setMazani(false)
    closeModal()
  }

  function goPrev() {
    if (canPrev) openDetail(filtrovane[navIndex - 1].id)
  }

  function goNext() {
    if (canNext) openDetail(filtrovane[navIndex + 1].id)
  }

  return (
    <>
      <PageShell
        title="Čipy"
        stats={[
          { label: 'celkem', value: celkem },
          { label: 'přiděleno', value: pridelene, dot: 'emerald', color: 'emerald' },
          { label: 'volných', value: volne, dot: 'zinc', color: 'zinc' },
          { label: 'bytů s čipem', value: bytySCipy, dot: 'sky', color: 'sky' },
        ]}
        actions={
          <>
            <SearchInput value={hledani} onChange={setHledani} placeholder="Hledat čip…" />
            <AddButton onClick={openNova}>Přidat čip</AddButton>
          </>
        }
      >
        <PageTable>
          <PageThead>
            <PageTh>Čip</PageTh>
            <PageTh>Stav</PageTh>
            <PageTh>Přiděleno komu</PageTh>
            <PageTh>Byt</PageTh>
            <PageTh>Vchod</PageTh>
            <PageTh>Datum předání</PageTh>
            <PageTh>Poznámka</PageTh>
          </PageThead>
          <PageTbody>
            {filtrovane.length === 0 && (
              <PageEmpty text={hledani ? 'Žádný čip neodpovídá hledání.' : 'Zatím žádné čipy.'} />
            )}
            {filtrovane.map(cip => (
              <PageTr key={cip.id} onClick={() => openDetail(cip.id)}>
                <PageTd>
                  <span className="font-black text-zinc-950 tabular-nums group-hover:text-violet-700 transition-colors">
                    {cip.cislo_cipu}
                  </span>
                </PageTd>
                <PageTd>{statusBadge(cip)}</PageTd>
                <PageTd className={getPrijemce(cip) === 'Nepřiděleno' ? 'text-zinc-300' : ''}>{getPrijemce(cip)}</PageTd>
                <PageTd>
                  {cip.jednotky ? (
                    <span className="font-medium text-zinc-800">{cip.jednotky.cislo_jednotky}</span>
                  ) : (
                    <span className="text-zinc-300">—</span>
                  )}
                </PageTd>
                <PageTd>
                  {cip.jednotky ? [cip.jednotky.ulice_vchodu, cip.jednotky.vchod].filter(Boolean).join('/') || <span className="text-zinc-300">—</span> : <span className="text-zinc-300">—</span>}
                </PageTd>
                <PageTd>{cip.datum_predani ?? <span className="text-zinc-300">—</span>}</PageTd>
                <PageTd className="max-w-xs truncate">{cip.poznamka ?? <span className="text-zinc-300">—</span>}</PageTd>
              </PageTr>
            ))}
          </PageTbody>
        </PageTable>
      </PageShell>

      {(vybranyId || view === 'nova') && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.3)' }}
          onMouseDown={e => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
            onMouseDown={e => e.stopPropagation()}
          >
            <div className="bg-zinc-950 px-6 py-4 flex items-start justify-between flex-shrink-0">
              <div>
                {view !== 'detail' && vybranyId && (
                  <button onClick={() => { setView('detail'); setChyba('') }}
                    className="flex items-center gap-1 text-zinc-500 hover:text-zinc-300 text-xs mb-1.5 transition-colors">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    Zpět na detail
                  </button>
                )}
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                  {view === 'nova' ? 'Nový čip' : view === 'edit' ? 'Úprava čipu' : 'Čip'}
                </p>
                <p className="text-2xl font-bold text-white mt-0.5">
                  {view === 'nova' ? 'Nový čip' : vybrany?.cislo_cipu}
                </p>
              </div>
              <div className="flex items-center gap-2 mt-1">
                {view === 'detail' && vybranyId && (
                  <div className="flex items-center gap-1">
                    <button onClick={goPrev} disabled={!canPrev}
                      className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/20 transition-colors disabled:opacity-25 disabled:cursor-not-allowed">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <span className="text-[11px] text-zinc-500 tabular-nums min-w-[3rem] text-center">{navIndex + 1} / {filtrovane.length}</span>
                    <button onClick={goNext} disabled={!canNext}
                      className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/20 transition-colors disabled:opacity-25 disabled:cursor-not-allowed">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </div>
                )}
                <button onClick={closeModal}
                  className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/20 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {view === 'detail' && vybrany && (
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-4">
                    <DetailBox label="Stav">{statusBadge(vybrany)}</DetailBox>
                    <DetailBox label="Přiděleno komu">{getPrijemce(vybrany)}</DetailBox>
                    <DetailBox label="Byt a vchod">{formatJednotka(vybrany.jednotky)}</DetailBox>
                    <DetailBox label="Datum předání">{vybrany.datum_predani ?? '—'}</DetailBox>
                  </div>

                  <div className="mt-5">
                    <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-2">Poznámka</p>
                    <div className="min-h-16 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                      {vybrany.poznamka ?? <span className="text-zinc-300">—</span>}
                    </div>
                  </div>

                  {chyba && <p className="mt-4 text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{chyba}</p>}

                  <div className="mt-6 flex gap-2">
                    <button onClick={openEdit}
                      className="flex-1 border border-zinc-200 text-zinc-700 text-sm py-2.5 rounded-xl hover:bg-zinc-50 transition-colors font-medium">
                      Upravit čip
                    </button>
                    {potvrzeni ? (
                      <>
                        <button onClick={handleDelete} disabled={mazani}
                          className="flex-1 bg-red-600 text-white text-sm py-2.5 rounded-xl hover:bg-red-700 transition-colors font-medium disabled:opacity-50">
                          {mazani ? 'Mažu...' : 'Potvrdit smazání'}
                        </button>
                        <button onClick={() => setPotvrzeni(false)}
                          className="flex-1 border border-zinc-200 text-zinc-600 text-sm py-2.5 rounded-xl hover:bg-zinc-50 transition-colors">
                          Zrušit
                        </button>
                      </>
                    ) : (
                      <button onClick={() => setPotvrzeni(true)}
                        className="flex-1 border border-red-200 text-red-500 text-sm py-2.5 rounded-xl hover:bg-red-50 transition-colors font-medium">
                        Smazat čip
                      </button>
                    )}
                  </div>
                </div>
              )}

              {(view === 'edit' || view === 'nova') && (
                <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL}>Číslo čipu *</label>
                      <input value={form.cislo_cipu} onChange={e => setForm(p => ({ ...p, cislo_cipu: e.target.value }))} required autoFocus className={INPUT} placeholder="např. 042" />
                    </div>
                    <div>
                      <label className={LABEL}>Datum předání</label>
                      <input type="date" value={form.datum_predani} onChange={e => setForm(p => ({ ...p, datum_predani: e.target.value }))} className={INPUT} disabled={form.prijemce_typ === 'zadny'} />
                    </div>
                  </div>

                  <div>
                    <label className={LABEL}>Jednotka</label>
                    <select value={form.jednotka_id} onChange={e => setForm(p => ({ ...p, jednotka_id: e.target.value }))} className={INPUT}>
                      <option value="">Sklad / nepřiděleno žádnému bytu</option>
                      {jednotky.map(j => (
                        <option key={j.id} value={j.id}>{formatJednotka(j)}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={LABEL}>Příjemce</label>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {(['zadny', 'osoba', 'externi'] as const).map(t => (
                        <button key={t} type="button" onClick={() => setForm(p => ({ ...p, prijemce_typ: t }))}
                          className={`py-2 rounded-lg text-xs font-semibold border transition-colors ${form.prijemce_typ === t ? 'bg-zinc-950 text-white border-zinc-950' : 'border-zinc-200 text-zinc-600 hover:border-zinc-400'}`}>
                          {t === 'zadny' ? 'Bez příjemce' : t === 'osoba' ? 'Osoba' : 'Externí'}
                        </button>
                      ))}
                    </div>
                    {form.prijemce_typ === 'osoba' && (
                      <select value={form.osoba_id} onChange={e => setForm(p => ({ ...p, osoba_id: e.target.value }))} className={INPUT}>
                        <option value="">— vyberte osobu —</option>
                        {osoby.map(o => <option key={o.id} value={o.id}>{formatJmeno(o)}</option>)}
                      </select>
                    )}
                    {form.prijemce_typ === 'externi' && (
                      <input value={form.externi_prijemce} onChange={e => setForm(p => ({ ...p, externi_prijemce: e.target.value }))} className={INPUT} placeholder="Jméno příjemce mimo evidenci osob" />
                    )}
                  </div>

                  <div>
                    <label className={LABEL}>Poznámka</label>
                    <textarea value={form.poznamka} onChange={e => setForm(p => ({ ...p, poznamka: e.target.value }))} rows={3} className={`${INPUT} resize-none`} />
                  </div>

                  {chyba && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{chyba}</p>}

                  <div className="flex gap-2 pt-1">
                    <button type="submit" disabled={ukladani || !form.cislo_cipu.trim()}
                      className="flex-1 bg-zinc-950 text-white text-sm py-2.5 rounded-xl hover:bg-zinc-800 transition-colors font-medium disabled:opacity-40">
                      {ukladani ? 'Ukládám...' : view === 'nova' ? 'Přidat čip' : 'Uložit změny'}
                    </button>
                    <button type="button" onClick={view === 'nova' ? closeModal : () => setView('detail')}
                      className="flex-1 border border-zinc-200 text-zinc-600 text-sm py-2.5 rounded-xl hover:bg-zinc-50 transition-colors">
                      Zrušit
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function DetailBox({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-100 bg-white px-4 py-3">
      <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-1.5">{label}</p>
      <div className="text-sm font-medium text-zinc-800 min-h-6 flex items-center">{children}</div>
    </div>
  )
}
