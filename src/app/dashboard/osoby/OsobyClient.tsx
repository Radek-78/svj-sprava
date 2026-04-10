'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import PageShell, { AddButton, PageEmpty, PageTable, PageTbody, PageTd, PageTh, PageThead, PageTr, SearchInput } from '@/components/PageShell'

// ─── Typy ────────────────────────────────────────────────────────────────────

type Jednotka = { id: string; cislo_jednotky: string; ulice_vchodu: string | null }

type Vazba = {
  id: string
  role: 'vlastnik' | 'najemnik' | 'bydlici'
  typ_vlastnictvi: 'individualni' | 'podilove' | 'sjm' | 'mcp' | null
  podil_citatel: number | null
  podil_jmenovatel: number | null
  datum_od: string | null
  datum_do: string | null
  je_aktivni: boolean
  jednotky: Jednotka
}

type Osoba = {
  id: string
  jmeno: string | null
  prijmeni: string
  titul: string | null
  email: string | null
  telefon: string | null
  mobil: string | null
  kontaktni_ulice: string | null
  kontaktni_mesto: string | null
  kontaktni_psc: string | null
  poznamka: string | null
  jednotky_osoby: Vazba[]
}

type ModalView = 'detail' | 'edit' | 'nova'

type EditForm = {
  jmeno: string
  prijmeni: string
  titul: string
  email: string
  telefon: string
  mobil: string
  kontaktni_ulice: string
  kontaktni_mesto: string
  kontaktni_psc: string
  poznamka: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatJmeno(o: { jmeno: string | null; prijmeni: string }) {
  return [o.prijmeni, o.jmeno].filter(Boolean).join(' ')
}

function roleBadge(role: string) {
  const map: Record<string, { label: string; cls: string }> = {
    vlastnik: { label: 'Vlastník', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
    najemnik: { label: 'Nájemník', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
    bydlici:  { label: 'Bydlící',  cls: 'bg-sky-50 text-sky-700 ring-sky-200' },
  }
  const { label, cls } = map[role] ?? { label: role, cls: 'bg-zinc-100 text-zinc-600 ring-zinc-200' }
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ring-1 ${cls}`}>
      {label}
    </span>
  )
}

function typVlastnictviBadge(typ: string | null) {
  if (!typ || typ === 'individualni') return null
  const colors: Record<string, string> = {
    sjm:      'bg-blue-50 text-blue-700 ring-blue-200',
    mcp:      'bg-indigo-50 text-indigo-700 ring-indigo-200',
    podilove: 'bg-violet-50 text-violet-700 ring-violet-200',
  }
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ring-1 ${colors[typ] ?? 'bg-zinc-100 text-zinc-600'}`}>
      {typ.toUpperCase()}
    </span>
  )
}

const INPUT = 'w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white'
const LABEL = 'block text-xs font-medium text-zinc-500 mb-1'

const EMPTY_FORM: EditForm = {
  jmeno: '', prijmeni: '', titul: '', email: '', telefon: '',
  mobil: '', kontaktni_ulice: '', kontaktni_mesto: '', kontaktni_psc: '', poznamka: '',
}

// ─── Formulář osoby — mimo komponentu, aby React neztrácet focus ─────────────

type OsobaFormProps = {
  editForm: EditForm
  setEditForm: React.Dispatch<React.SetStateAction<EditForm>>
  view: ModalView
  closeModal: () => void
  setView: (v: ModalView) => void
  ukladani: boolean
  chyba: string
  onSubmit: (e: React.FormEvent) => void
  submitLabel: string
}

function OsobaForm({ editForm, setEditForm, view, closeModal, setView, ukladani, chyba, onSubmit, submitLabel }: OsobaFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={LABEL}>Titul</label>
          <input className={INPUT} value={editForm.titul} onChange={e => setEditForm(f => ({ ...f, titul: e.target.value }))} placeholder="Ing., Mgr., …" />
        </div>
        <div>
          <label className={LABEL}>Jméno</label>
          <input className={INPUT} value={editForm.jmeno} onChange={e => setEditForm(f => ({ ...f, jmeno: e.target.value }))} placeholder="Jméno" />
        </div>
        <div>
          <label className={LABEL}>Příjmení *</label>
          <input className={INPUT} required value={editForm.prijmeni} onChange={e => setEditForm(f => ({ ...f, prijmeni: e.target.value }))} placeholder="Příjmení" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>E-mail</label>
          <input className={INPUT} type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
        </div>
        <div>
          <label className={LABEL}>Telefon</label>
          <input className={INPUT} value={editForm.telefon} onChange={e => setEditForm(f => ({ ...f, telefon: e.target.value }))} placeholder="+420 xxx xxx xxx" />
        </div>
      </div>

      <div>
        <label className={LABEL}>Mobil</label>
        <input className={INPUT} value={editForm.mobil} onChange={e => setEditForm(f => ({ ...f, mobil: e.target.value }))} placeholder="+420 xxx xxx xxx" />
      </div>

      <div className="border-t border-zinc-100 pt-4">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Kontaktní adresa</p>
        <div className="space-y-3">
          <div>
            <label className={LABEL}>Ulice a č.p.</label>
            <input className={INPUT} value={editForm.kontaktni_ulice} onChange={e => setEditForm(f => ({ ...f, kontaktni_ulice: e.target.value }))} placeholder="Ulice 123" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className={LABEL}>Město</label>
              <input className={INPUT} value={editForm.kontaktni_mesto} onChange={e => setEditForm(f => ({ ...f, kontaktni_mesto: e.target.value }))} placeholder="Praha" />
            </div>
            <div>
              <label className={LABEL}>PSČ</label>
              <input className={INPUT} value={editForm.kontaktni_psc} onChange={e => setEditForm(f => ({ ...f, kontaktni_psc: e.target.value }))} placeholder="110 00" />
            </div>
          </div>
        </div>
      </div>

      <div>
        <label className={LABEL}>Poznámka</label>
        <textarea className={INPUT} rows={2} value={editForm.poznamka} onChange={e => setEditForm(f => ({ ...f, poznamka: e.target.value }))} placeholder="Interní poznámka…" />
      </div>

      {chyba && <p className="text-sm text-red-600">{chyba}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => view === 'nova' ? closeModal() : setView('detail')}
          className="flex-1 px-4 py-2 rounded-lg border border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
        >
          Zrušit
        </button>
        <button
          type="submit"
          disabled={ukladani}
          className="flex-1 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors"
        >
          {ukladani ? 'Ukládám…' : submitLabel}
        </button>
      </div>
    </form>
  )
}

// ─── Hlavní komponenta ────────────────────────────────────────────────────────

export default function OsobyClient({ osoby: initial }: { osoby: Osoba[] }) {
  const [osoby, setOsoby] = useState(initial)
  const [vybranaId, setVybranaId] = useState<string | null>(null)
  const [view, setView] = useState<ModalView>('detail')
  const [mazani, setMazani] = useState(false)
  const [potvrzeni, setPotvrzeni] = useState(false)
  const [ukladani, setUkladani] = useState(false)
  const [chyba, setChyba] = useState('')
  const [hledani, setHledani] = useState('')
  const [editForm, setEditForm] = useState<EditForm>(EMPTY_FORM)

  const router = useRouter()
  const supabase = createClient()

  const vybrana = osoby.find(o => o.id === vybranaId) ?? null

  const filtrovane = osoby.filter(o => {
    if (!hledani) return true
    const q = hledani.toLowerCase()
    return (
      o.prijmeni.toLowerCase().includes(q) ||
      (o.jmeno ?? '').toLowerCase().includes(q) ||
      (o.email ?? '').toLowerCase().includes(q) ||
      (o.telefon ?? '').toLowerCase().includes(q) ||
      (o.mobil ?? '').toLowerCase().includes(q)
    )
  })

  const celkem = osoby.length
  const vlastnici = new Set(osoby.filter(o => o.jednotky_osoby.some(v => v.role === 'vlastnik' && v.je_aktivni)).map(o => o.id)).size
  const najemnici = new Set(osoby.filter(o => o.jednotky_osoby.some(v => v.role === 'najemnik' && v.je_aktivni)).map(o => o.id)).size

  const refreshOsoby = useCallback(async () => {
    const { data } = await supabase
      .from('osoby')
      .select(`*, jednotky_osoby(id, role, typ_vlastnictvi, podil_citatel, podil_jmenovatel, datum_od, datum_do, je_aktivni, jednotky(id, cislo_jednotky, ulice_vchodu))`)
      .order('prijmeni')
    if (data) setOsoby(data as Osoba[])
  }, [])

  function openModal(id: string) {
    setVybranaId(id); setView('detail'); setPotvrzeni(false); setChyba('')
  }

  function closeModal() {
    setVybranaId(null); setView('detail'); setPotvrzeni(false); setChyba('')
  }

  function openEdit() {
    if (!vybrana) return
    setEditForm({
      jmeno: vybrana.jmeno ?? '', prijmeni: vybrana.prijmeni, titul: vybrana.titul ?? '',
      email: vybrana.email ?? '', telefon: vybrana.telefon ?? '', mobil: vybrana.mobil ?? '',
      kontaktni_ulice: vybrana.kontaktni_ulice ?? '', kontaktni_mesto: vybrana.kontaktni_mesto ?? '',
      kontaktni_psc: vybrana.kontaktni_psc ?? '', poznamka: vybrana.poznamka ?? '',
    })
    setChyba(''); setView('edit')
  }

  function openNova() {
    setVybranaId(null); setEditForm(EMPTY_FORM); setChyba(''); setView('nova')
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!vybranaId) return
    setUkladani(true); setChyba('')
    const { error } = await supabase.from('osoby').update({
      jmeno: editForm.jmeno || null, prijmeni: editForm.prijmeni, titul: editForm.titul || null,
      email: editForm.email || null, telefon: editForm.telefon || null, mobil: editForm.mobil || null,
      kontaktni_ulice: editForm.kontaktni_ulice || null, kontaktni_mesto: editForm.kontaktni_mesto || null,
      kontaktni_psc: editForm.kontaktni_psc || null, poznamka: editForm.poznamka || null,
    }).eq('id', vybranaId)
    if (error) { setChyba(error.message); setUkladani(false); return }
    await refreshOsoby(); router.refresh(); setView('detail'); setUkladani(false)
  }

  async function handleNova(e: React.FormEvent) {
    e.preventDefault()
    if (!editForm.prijmeni.trim()) { setChyba('Příjmení je povinné'); return }
    setUkladani(true); setChyba('')
    const { data, error } = await supabase.from('osoby').insert({
      jmeno: editForm.jmeno || null, prijmeni: editForm.prijmeni, titul: editForm.titul || null,
      email: editForm.email || null, telefon: editForm.telefon || null, mobil: editForm.mobil || null,
      kontaktni_ulice: editForm.kontaktni_ulice || null, kontaktni_mesto: editForm.kontaktni_mesto || null,
      kontaktni_psc: editForm.kontaktni_psc || null, poznamka: editForm.poznamka || null,
    }).select().single()
    if (error) { setChyba(error.message); setUkladani(false); return }
    await refreshOsoby(); router.refresh(); setVybranaId(data.id); setView('detail'); setUkladani(false)
  }

  async function handleDelete() {
    if (!vybranaId) return
    setMazani(true)
    const { error } = await supabase.from('osoby').delete().eq('id', vybranaId)
    if (error) { setChyba(error.message); setMazani(false); return }
    await refreshOsoby(); router.refresh(); closeModal(); setMazani(false)
  }

  const formProps = { editForm, setEditForm, view, closeModal, setView, ukladani, chyba }

  return (
    <>
      <PageShell
        title="Osoby"
        stats={[
          { label: 'celkem', value: celkem },
          { label: 'vlastníků', value: vlastnici, color: 'emerald' },
          { label: 'nájemníků', value: najemnici, color: 'amber' },
        ]}
        actions={
          <>
            <SearchInput value={hledani} onChange={setHledani} placeholder="Hledat osobu…" />
            <AddButton onClick={openNova}>Přidat osobu</AddButton>
          </>
        }
      >
        <PageTable>
          <PageThead>
            <PageTh>Jméno</PageTh>
            <PageTh>E-mail</PageTh>
            <PageTh>Telefon / Mobil</PageTh>
            <PageTh>Adresa</PageTh>
            <PageTh>Jednotky</PageTh>
          </PageThead>
          <PageTbody>
            {filtrovane.length === 0 && (
              <PageEmpty text={hledani ? 'Žádná osoba neodpovídá hledání.' : 'Zatím žádné osoby.'} />
            )}
            {filtrovane.map(osoba => {
              const aktivniVazby = osoba.jednotky_osoby.filter(v => v.je_aktivni)
              const adresa = [osoba.kontaktni_ulice, osoba.kontaktni_mesto].filter(Boolean).join(', ')
              const kontakt = [osoba.telefon, osoba.mobil].filter(Boolean).join(' / ')
              return (
                <PageTr key={osoba.id} onClick={() => openModal(osoba.id)}>
                  <PageTd>
                    <span className="font-medium text-zinc-900 group-hover:text-violet-700 transition-colors">{formatJmeno(osoba)}</span>
                    {osoba.titul && <span className="ml-1.5 text-xs text-zinc-400">{osoba.titul}</span>}
                  </PageTd>
                  <PageTd>{osoba.email ?? <span className="text-zinc-300">—</span>}</PageTd>
                  <PageTd>{kontakt || <span className="text-zinc-300">—</span>}</PageTd>
                  <PageTd>{adresa || <span className="text-zinc-300">—</span>}</PageTd>
                  <PageTd>
                    {aktivniVazby.length === 0 ? <span className="text-zinc-300">—</span> : (
                      <div className="flex flex-wrap gap-1.5">
                        {aktivniVazby.map(v => (
                          <span key={v.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 text-xs font-medium">
                            <span className="font-semibold">{v.jednotky.cislo_jednotky}</span>
                            <span className="text-zinc-400">·</span>
                            {roleBadge(v.role)}
                          </span>
                        ))}
                      </div>
                    )}
                  </PageTd>
                </PageTr>
              )
            })}
          </PageTbody>
        </PageTable>
      </PageShell>

      {/* Modal */}
      {(vybranaId || view === 'nova') && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.3)' }}
          onMouseDown={e => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
            onMouseDown={e => e.stopPropagation()}
          >

            {/* Hlavička */}
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between flex-shrink-0">
              <div>
                {view === 'nova'
                  ? <h2 className="text-base font-semibold text-zinc-900">Nová osoba</h2>
                  : <>
                      <h2 className="text-base font-semibold text-zinc-900">{vybrana ? formatJmeno(vybrana) : ''}</h2>
                      {vybrana?.titul && <p className="text-xs text-zinc-400 mt-0.5">{vybrana.titul}</p>}
                    </>
                }
              </div>
              <button onClick={closeModal} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Obsah */}
            <div className="flex-1 overflow-y-auto px-6 py-5">

              {/* DETAIL */}
              {view === 'detail' && vybrana && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-3">
                    <InfoTile label="E-mail" value={vybrana.email} />
                    <InfoTile label="Telefon" value={vybrana.telefon} />
                    <InfoTile label="Mobil" value={vybrana.mobil} />
                    <InfoTile label="PSČ" value={vybrana.kontaktni_psc} />
                  </div>

                  {(vybrana.kontaktni_ulice || vybrana.kontaktni_mesto) && (
                    <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
                      <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">Adresa</p>
                      <p className="text-sm text-zinc-800">{[vybrana.kontaktni_ulice, vybrana.kontaktni_mesto, vybrana.kontaktni_psc].filter(Boolean).join(', ')}</p>
                    </div>
                  )}

                  {vybrana.poznamka && (
                    <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
                      <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">Poznámka</p>
                      <p className="text-sm text-zinc-600">{vybrana.poznamka}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">Jednotky</p>
                    {vybrana.jednotky_osoby.length === 0 ? (
                      <p className="text-sm text-zinc-400">Žádné přiřazení.</p>
                    ) : (
                      <div className="space-y-2">
                        {vybrana.jednotky_osoby.sort((a, b) => Number(b.je_aktivni) - Number(a.je_aktivni)).map(v => (
                          <div key={v.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${v.je_aktivni ? 'border-zinc-200 bg-white' : 'border-zinc-100 bg-zinc-50 opacity-50'}`}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-zinc-900">Jednotka {v.jednotky.cislo_jednotky}</span>
                                {v.jednotky.ulice_vchodu && <span className="text-xs text-zinc-400">{v.jednotky.ulice_vchodu}</span>}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                {roleBadge(v.role)}
                                {typVlastnictviBadge(v.typ_vlastnictvi)}
                                {v.typ_vlastnictvi === 'podilove' && v.podil_citatel && v.podil_jmenovatel && (
                                  <span className="text-xs text-zinc-500">{v.podil_citatel}/{v.podil_jmenovatel}</span>
                                )}
                                {v.datum_od && <span className="text-xs text-zinc-400">od {v.datum_od}</span>}
                                {v.datum_do && <span className="text-xs text-zinc-400">do {v.datum_do}</span>}
                              </div>
                            </div>
                            {!v.je_aktivni && <span className="text-[10px] text-zinc-400 font-medium">Ukončeno</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-zinc-100 pt-4 flex items-center justify-between">
                    <div>
                      {!potvrzeni ? (
                        <button onClick={() => setPotvrzeni(true)} className="text-xs text-red-500 hover:text-red-700 transition-colors">Smazat osobu</button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-red-600 font-medium">Opravdu smazat?</span>
                          <button onClick={handleDelete} disabled={mazani} className="text-xs px-2.5 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
                            {mazani ? 'Mažu…' : 'Ano, smazat'}
                          </button>
                          <button onClick={() => setPotvrzeni(false)} className="text-xs text-zinc-500 hover:text-zinc-700 transition-colors">Zrušit</button>
                        </div>
                      )}
                    </div>
                    <button onClick={openEdit} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                      </svg>
                      Upravit
                    </button>
                  </div>
                </div>
              )}

              {/* EDIT */}
              {view === 'edit' && vybrana && (
                <OsobaForm {...formProps} onSubmit={handleSaveEdit} submitLabel="Uložit změny" />
              )}

              {/* NOVÁ */}
              {view === 'nova' && (
                <OsobaForm {...formProps} onSubmit={handleNova} submitLabel="Přidat osobu" />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Sub-komponenty ───────────────────────────────────────────────────────────

function InfoTile({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
      <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm font-medium text-zinc-800">{value}</p>
    </div>
  )
}
