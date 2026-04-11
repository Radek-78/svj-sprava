'use client'

import { useState, useCallback, useEffect } from 'react'
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
  kontaktni_ulice: '', kontaktni_mesto: '', kontaktni_psc: '', poznamka: '',
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

export default function OsobyClient({ osoby: initial, openId }: { osoby: Osoba[]; openId?: string }) {
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

  useEffect(() => {
    if (openId && osoby.some(o => o.id === openId)) {
      openModal(openId)
      router.replace('/dashboard/osoby')
    }
  }, [openId])

  const vybrana = osoby.find(o => o.id === vybranaId) ?? null

  const navIndex = filtrovane.findIndex(o => o.id === vybranaId)
  const canPrev = navIndex > 0
  const canNext = navIndex < filtrovane.length - 1
  function goPrev() { if (canPrev) openModal(filtrovane[navIndex - 1].id) }
  function goNext() { if (canNext) openModal(filtrovane[navIndex + 1].id) }

  const filtrovane = osoby.filter(o => {
    if (!hledani) return true
    const q = hledani.toLowerCase()
    const jednotkyCisla = o.jednotky_osoby.map(v => v.jednotky.cislo_jednotky).join(' ')
    return (
      o.prijmeni.toLowerCase().includes(q) ||
      (o.jmeno ?? '').toLowerCase().includes(q) ||
      (o.titul ?? '').toLowerCase().includes(q) ||
      (o.email ?? '').toLowerCase().includes(q) ||
      (o.telefon ?? '').toLowerCase().includes(q) ||
      (o.kontaktni_ulice ?? '').toLowerCase().includes(q) ||
      (o.kontaktni_mesto ?? '').toLowerCase().includes(q) ||
      (o.kontaktni_psc ?? '').includes(q) ||
      jednotkyCisla.includes(q)
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
      email: vybrana.email ?? '', telefon: vybrana.telefon ?? '',
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
      email: editForm.email || null, telefon: editForm.telefon || null,
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
      email: editForm.email || null, telefon: editForm.telefon || null,
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
            <PageTh>Telefon</PageTh>
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
              const kontakt = osoba.telefon ?? ''
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
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
            onMouseDown={e => e.stopPropagation()}
          >

            {/* Hlavička */}
            <div className="bg-zinc-950 px-6 py-4 flex items-start justify-between flex-shrink-0">
              <div>
                {view !== 'detail' && (
                  <button onClick={() => { setView('detail'); setChyba('') }}
                    className="flex items-center gap-1 text-zinc-500 hover:text-zinc-300 text-xs mb-1.5 transition-colors">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    Zpět na detail
                  </button>
                )}
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                  {view === 'nova' ? 'Nová osoba' : view === 'edit' ? 'Úprava osoby' : 'Osoba'}
                </p>
                <div className="flex items-baseline gap-2.5 mt-0.5">
                  <p className="text-2xl font-bold text-white">
                    {view === 'nova' ? 'Nová osoba' : vybrana ? formatJmeno(vybrana) : ''}
                  </p>
                  {vybrana?.titul && view === 'detail' && (
                    <span className="text-sm text-zinc-400">{vybrana.titul}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1">
                {view === 'detail' && vybranaId && (
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

            {/* Obsah */}
            <div className="flex-1 overflow-hidden flex flex-col">

              {/* ── DETAIL – dvoupanelový layout ── */}
              {view === 'detail' && vybrana && (
                <div className="flex flex-1 overflow-hidden">

                  {/* Levý panel – kontakty + akce */}
                  <div className="w-72 flex-shrink-0 border-r border-zinc-100 flex flex-col overflow-y-auto">
                    <div className="p-5 flex-1 space-y-1">
                      <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-3">Kontakt</p>

                      {vybrana.email && (
                        <ContactRow icon="email" label="E-mail">
                          <a href={`mailto:${vybrana.email}`} className="text-xs text-zinc-800 hover:text-violet-600 transition-colors break-all leading-relaxed">
                            {vybrana.email}
                          </a>
                        </ContactRow>
                      )}
                      {vybrana.telefon && (
                        <ContactRow icon="phone" label="Telefon">
                          <a href={`tel:${vybrana.telefon}`} className="text-sm text-zinc-800 hover:text-violet-600 transition-colors">
                            {vybrana.telefon}
                          </a>
                        </ContactRow>
                      )}
                      {(vybrana.kontaktni_ulice || vybrana.kontaktni_mesto) && (
                        <ContactRow icon="address" label="Adresa">
                          <p className="text-sm text-zinc-800 leading-snug">
                            {[vybrana.kontaktni_ulice, vybrana.kontaktni_mesto, vybrana.kontaktni_psc].filter(Boolean).join(', ')}
                          </p>
                        </ContactRow>
                      )}
                      {!vybrana.email && !vybrana.telefon && !vybrana.kontaktni_ulice && (
                        <p className="text-sm text-zinc-400 italic">Žádné kontaktní údaje.</p>
                      )}

                      {vybrana.poznamka && (
                        <div className="mt-4 pt-4 border-t border-zinc-50">
                          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-1.5">Poznámka</p>
                          <p className="text-xs text-zinc-500 leading-relaxed">{vybrana.poznamka}</p>
                        </div>
                      )}
                    </div>

                    {/* Akce */}
                    <div className="p-4 border-t border-zinc-100 space-y-2 flex-shrink-0">
                      <button onClick={openEdit}
                        className="flex items-center justify-center gap-2 w-full border border-zinc-200 text-zinc-700 text-sm py-2.5 rounded-xl hover:bg-zinc-50 transition-colors font-medium">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        Upravit osobu
                      </button>
                      {potvrzeni ? (
                        <div className="flex gap-1.5">
                          <button onClick={handleDelete} disabled={mazani}
                            className="flex-1 bg-red-600 text-white text-xs py-2.5 rounded-xl hover:bg-red-700 transition-colors font-medium disabled:opacity-50">
                            {mazani ? 'Mažu…' : 'Potvrdit'}
                          </button>
                          <button onClick={() => setPotvrzeni(false)}
                            className="flex-1 border border-zinc-200 text-zinc-600 text-xs py-2.5 rounded-xl hover:bg-zinc-50 transition-colors">
                            Zrušit
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setPotvrzeni(true)}
                          className="w-full border border-red-200 text-red-500 text-sm py-2.5 rounded-xl hover:bg-red-50 transition-colors font-medium">
                          Smazat osobu
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Pravý panel – jednotky */}
                  <div className="flex-1 overflow-y-auto p-5">
                    <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-3">Jednotky</p>
                    {vybrana.jednotky_osoby.length === 0 ? (
                      <p className="text-sm text-zinc-400 italic">Žádné přiřazení.</p>
                    ) : (
                      <div className="space-y-2">
                        {vybrana.jednotky_osoby
                          .sort((a, b) => Number(b.je_aktivni) - Number(a.je_aktivni))
                          .map(v => (
                            <div
                              key={v.id}
                              onClick={() => { closeModal(); router.push(`/dashboard/jednotky?open=${v.jednotky.id}`) }}
                              className={`px-4 py-3 rounded-xl border transition-colors cursor-pointer ${v.je_aktivni ? 'border-zinc-200 bg-white hover:border-violet-200 hover:bg-violet-50' : 'border-zinc-100 bg-zinc-50 opacity-50 hover:opacity-70'}`}
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-sm text-zinc-900">Jednotka {v.jednotky.cislo_jednotky}</span>
                                    {v.jednotky.ulice_vchodu && <span className="text-xs text-zinc-400">{v.jednotky.ulice_vchodu}</span>}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                    {roleBadge(v.role)}
                                    {typVlastnictviBadge(v.typ_vlastnictvi)}
                                    {v.typ_vlastnictvi === 'podilove' && v.podil_citatel && v.podil_jmenovatel && (
                                      <span className="text-xs text-zinc-500 font-mono">{v.podil_citatel}/{v.podil_jmenovatel}</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-400">
                                    {v.datum_od && <span>od {v.datum_od}</span>}
                                    {v.datum_do && <span>do {v.datum_do}</span>}
                                  </div>
                                </div>
                                {!v.je_aktivni && (
                                  <span className="text-[10px] text-zinc-400 font-medium bg-zinc-100 px-1.5 py-0.5 rounded flex-shrink-0">Ukončeno</span>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── EDIT ── */}
              {view === 'edit' && vybrana && (
                <div className="flex-1 overflow-y-auto px-6 py-5">
                  <OsobaForm {...formProps} onSubmit={handleSaveEdit} submitLabel="Uložit změny" />
                </div>
              )}

              {/* ── NOVÁ ── */}
              {view === 'nova' && (
                <div className="flex-1 overflow-y-auto px-6 py-5">
                  <OsobaForm {...formProps} onSubmit={handleNova} submitLabel="Přidat osobu" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Sub-komponenty ───────────────────────────────────────────────────────────

const ICONS = {
  email: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  ),
  phone: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
    </svg>
  ),
  address: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  ),
}

function ContactRow({ icon, label, children }: { icon: keyof typeof ICONS; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-zinc-50 last:border-0">
      <div className="w-6 h-6 rounded-md bg-zinc-100 flex items-center justify-center flex-shrink-0 mt-0.5 text-zinc-400">
        {ICONS[icon]}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide leading-none mb-0.5">{label}</p>
        {children}
      </div>
    </div>
  )
}
