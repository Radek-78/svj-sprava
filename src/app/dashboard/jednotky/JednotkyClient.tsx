'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import PageShell, { AddButton, PageEmpty, PageTable, PageTbody, PageTd, PageTh, PageThead, PageTr } from '@/components/PageShell'

// ─── Typy ────────────────────────────────────────────────────────────────────

type Osoba = { id: string; jmeno: string | null; prijmeni: string }
type Cip = { id: string; cislo_cipu: string; poznamka: string | null }

type Vazba = {
  id: string
  role: 'vlastnik' | 'najemnik' | 'bydlici'
  typ_vlastnictvi: 'individualni' | 'podilove' | 'sjm' | 'mcp' | null
  podil_citatel: number | null
  podil_jmenovatel: number | null
  datum_od: string | null
  datum_do: string | null
  je_aktivni: boolean
  osoby: Osoba
}

type Jednotka = {
  id: string
  cislo_jednotky: string
  var_symbol: string | null
  vchod: string | null
  ulice_vchodu: string | null
  patro: number | null
  uzitna_plocha: number | null
  vytapena_plocha: number | null
  podil_citatel: number | null
  podil_jmenovatel: number | null
  pocet_pokoju: number | null
  poznamka: string | null
  jednotky_osoby: Vazba[]
  jednotky_cipy: Cip[]
}

type ModalView = 'detail' | 'edit' | 'add-vlastnik' | 'add-najemnik' | 'add-bydlici' | 'add-cip'

type EditForm = {
  cislo_jednotky: string
  var_symbol: string
  vchod: string
  ulice_vchodu: string
  patro: string
  uzitna_plocha: string
  vytapena_plocha: string
  podil_citatel: string
  podil_jmenovatel: string
  pocet_pokoju: string
  poznamka: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatJmeno(o: Osoba) {
  return [o.prijmeni, o.jmeno].filter(Boolean).join(' ')
}

function typVlastnictviLabel(typ: string | null) {
  const map: Record<string, string> = {
    individualni: 'Individuální',
    podilove: 'Podílové',
    sjm: 'SJM',
    mcp: 'MCP',
  }
  return typ ? (map[typ] ?? typ) : ''
}

function typVlastnictviBadge(typ: string | null) {
  if (!typ || typ === 'individualni') return null
  const colors: Record<string, string> = {
    sjm: 'bg-blue-50 text-blue-700 ring-blue-200',
    mcp: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
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

// ─── Komponenta ───────────────────────────────────────────────────────────────

export default function JednotkyClient({ jednotky: initial, openId }: { jednotky: Jednotka[]; openId?: string }) {
  const [jednotky, setJednotky] = useState(initial)
  const [vybranaId, setVybranaId] = useState<string | null>(null)
  const [view, setView] = useState<ModalView>('detail')
  const [vsechnyOsoby, setVsechnyOsoby] = useState<Osoba[]>([])
  const [mazani, setMazani] = useState(false)
  const [potvrzeni, setPotvrzeni] = useState(false)
  const [ukladani, setUkladani] = useState(false)
  const [chyba, setChyba] = useState('')

  const [editForm, setEditForm] = useState<EditForm>({
    cislo_jednotky: '', var_symbol: '', vchod: '', ulice_vchodu: '', patro: '', uzitna_plocha: '',
    vytapena_plocha: '', podil_citatel: '', podil_jmenovatel: '10000',
    pocet_pokoju: '', poznamka: '',
  })

  // Add vlastník form
  const [avTyp, setAvTyp] = useState<'individualni' | 'podilove' | 'sjm' | 'mcp'>('individualni')
  const [avOsoba1, setAvOsoba1] = useState('')
  const [avOsoba2, setAvOsoba2] = useState('')
  const [avPodilC, setAvPodilC] = useState('')
  const [avPodilJ, setAvPodilJ] = useState('')
  const [avPodilC2, setAvPodilC2] = useState('')
  const [avPodilJ2, setAvPodilJ2] = useState('')
  const [avDatum, setAvDatum] = useState(new Date().toISOString().split('T')[0])

  // Add nájemník / bydlící form
  const [anOsoba, setAnOsoba] = useState('')
  const [anDatum, setAnDatum] = useState(new Date().toISOString().split('T')[0])

  // Add čip form
  const [acCislo, setAcCislo] = useState('')
  const [acPoznamka, setAcPoznamka] = useState('')

  const router = useRouter()
  const supabase = createClient()

  // Otevřít modal přes URL parametr ?open=ID
  useEffect(() => {
    if (openId && jednotky.some(j => j.id === openId)) {
      openModal(openId)
      router.replace('/dashboard/jednotky')
    }
  }, [openId])

  const vybrana = jednotky.find(j => j.id === vybranaId) ?? null

  // Aktivní vazby
  const aktivniVlastnici = vybrana?.jednotky_osoby.filter(v => v.role === 'vlastnik' && v.je_aktivni) ?? []
  const aktivniNajemnik = vybrana?.jednotky_osoby.filter(v => v.role === 'najemnik' && v.je_aktivni) ?? []
  const aktivniBydlici = vybrana?.jednotky_osoby.filter(v => v.role === 'bydlici' && v.je_aktivni) ?? []

  // Statistiky
  const celkem = jednotky.length
  const obsazeno = jednotky.filter(j => j.jednotky_osoby.some(v => v.role === 'vlastnik' && v.je_aktivni)).length
  const pronajato = jednotky.filter(j => j.jednotky_osoby.some(v => v.role === 'najemnik' && v.je_aktivni)).length

  // Načíst osoby při otevření modalu
  useEffect(() => {
    if (!vybranaId) return
    supabase.from('osoby').select('id, jmeno, prijmeni').order('prijmeni')
      .then(({ data }) => setVsechnyOsoby(data ?? []))
  }, [vybranaId])

  // Refresh dat ze serveru
  const refreshJednotky = useCallback(async () => {
    const { data } = await supabase
      .from('jednotky')
      .select(`*, jednotky_osoby(id, role, typ_vlastnictvi, podil_citatel, podil_jmenovatel, datum_od, datum_do, je_aktivni, osoby(id, jmeno, prijmeni)), jednotky_cipy(id, cislo_cipu, poznamka)`)
      .order('cislo_jednotky')
    if (data) setJednotky(data as unknown as Jednotka[])
  }, [])

  function openModal(id: string) {
    setVybranaId(id)
    setView('detail')
    setPotvrzeni(false)
    setChyba('')
  }

  function closeModal() {
    setVybranaId(null)
    setView('detail')
    setPotvrzeni(false)
    setChyba('')
  }

  function openEdit() {
    if (!vybrana) return
    setEditForm({
      cislo_jednotky: vybrana.cislo_jednotky,
      var_symbol: vybrana.var_symbol ?? '',
      vchod: vybrana.vchod ?? '',
      ulice_vchodu: vybrana.ulice_vchodu ?? '',
      patro: vybrana.patro?.toString() ?? '',
      uzitna_plocha: vybrana.uzitna_plocha?.toString() ?? '',
      vytapena_plocha: vybrana.vytapena_plocha?.toString() ?? '',
      podil_citatel: vybrana.podil_citatel?.toString() ?? '',
      podil_jmenovatel: vybrana.podil_jmenovatel?.toString() ?? '10000',
      pocet_pokoju: vybrana.pocet_pokoju?.toString() ?? '',
      poznamka: vybrana.poznamka ?? '',
    })
    setChyba('')
    setView('edit')
  }

  function openAddVlastnik() {
    setAvTyp('individualni'); setAvOsoba1(''); setAvOsoba2('')
    setAvPodilC(''); setAvPodilJ(''); setAvPodilC2(''); setAvPodilJ2('')
    setAvDatum(new Date().toISOString().split('T')[0])
    setChyba(''); setView('add-vlastnik')
  }

  function openAddNajemnik() {
    setAnOsoba(''); setAnDatum(new Date().toISOString().split('T')[0])
    setChyba(''); setView('add-najemnik')
  }

  function openAddBydlici() {
    setAnOsoba(''); setAnDatum(new Date().toISOString().split('T')[0])
    setChyba(''); setView('add-bydlici')
  }

  function openAddCip() {
    setAcCislo(''); setAcPoznamka('')
    setChyba(''); setView('add-cip')
  }

  // ── Uložit úpravu jednotky ──
  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!vybranaId) return
    setUkladani(true); setChyba('')
    const { error } = await supabase.from('jednotky').update({
      cislo_jednotky: editForm.cislo_jednotky,
      var_symbol: editForm.var_symbol || null,
      vchod: editForm.vchod || null,
      ulice_vchodu: editForm.ulice_vchodu || null,
      patro: editForm.patro ? parseInt(editForm.patro) : null,
      uzitna_plocha: editForm.uzitna_plocha ? parseFloat(editForm.uzitna_plocha) : null,
      vytapena_plocha: editForm.vytapena_plocha ? parseFloat(editForm.vytapena_plocha) : null,
      podil_citatel: editForm.podil_citatel ? parseInt(editForm.podil_citatel) : null,
      podil_jmenovatel: editForm.podil_jmenovatel ? parseInt(editForm.podil_jmenovatel) : null,
      pocet_pokoju: editForm.pocet_pokoju ? parseInt(editForm.pocet_pokoju) : null,
      poznamka: editForm.poznamka || null,
    }).eq('id', vybranaId)
    if (error) { setChyba(error.message); setUkladani(false); return }
    await refreshJednotky()
    router.refresh()
    setView('detail')
    setUkladani(false)
  }

  // ── Přidat vlastníka ──
  async function handleAddVlastnik(e: React.FormEvent) {
    e.preventDefault()
    if (!vybranaId || !avOsoba1) return
    setUkladani(true); setChyba('')

    const zaznamy: object[] = []

    if (avTyp === 'individualni') {
      zaznamy.push({ jednotka_id: vybranaId, osoba_id: avOsoba1, role: 'vlastnik', typ_vlastnictvi: 'individualni', datum_od: avDatum, je_aktivni: true })
    } else if (avTyp === 'sjm' || avTyp === 'mcp') {
      zaznamy.push({ jednotka_id: vybranaId, osoba_id: avOsoba1, role: 'vlastnik', typ_vlastnictvi: avTyp, datum_od: avDatum, je_aktivni: true })
      if (avOsoba2) zaznamy.push({ jednotka_id: vybranaId, osoba_id: avOsoba2, role: 'vlastnik', typ_vlastnictvi: avTyp, datum_od: avDatum, je_aktivni: true })
    } else if (avTyp === 'podilove') {
      zaznamy.push({ jednotka_id: vybranaId, osoba_id: avOsoba1, role: 'vlastnik', typ_vlastnictvi: 'podilove', podil_citatel: parseInt(avPodilC) || null, podil_jmenovatel: parseInt(avPodilJ) || null, datum_od: avDatum, je_aktivni: true })
      if (avOsoba2) zaznamy.push({ jednotka_id: vybranaId, osoba_id: avOsoba2, role: 'vlastnik', typ_vlastnictvi: 'podilove', podil_citatel: parseInt(avPodilC2) || null, podil_jmenovatel: parseInt(avPodilJ2) || null, datum_od: avDatum, je_aktivni: true })
    }

    const { error } = await supabase.from('jednotky_osoby').insert(zaznamy)
    if (error) { setChyba(error.message); setUkladani(false); return }
    await refreshJednotky()
    router.refresh()
    setView('detail')
    setUkladani(false)
  }

  // ── Přidat nájemníka / bydlícího ──
  async function handleAddVazba(role: 'najemnik' | 'bydlici') {
    if (!vybranaId || !anOsoba) return
    setUkladani(true); setChyba('')
    const { error } = await supabase.from('jednotky_osoby').insert({
      jednotka_id: vybranaId, osoba_id: anOsoba, role, datum_od: anDatum, je_aktivni: true,
    })
    if (error) { setChyba(error.message); setUkladani(false); return }
    await refreshJednotky()
    router.refresh()
    setView('detail')
    setUkladani(false)
  }

  // ── Přidat čip ──
  async function handleAddCip(e: React.FormEvent) {
    e.preventDefault()
    if (!vybranaId || !acCislo) return
    setUkladani(true); setChyba('')
    const { error } = await supabase.from('jednotky_cipy').insert({
      jednotka_id: vybranaId, cislo_cipu: acCislo, poznamka: acPoznamka || null,
    })
    if (error) { setChyba(error.message); setUkladani(false); return }
    await refreshJednotky()
    router.refresh()
    setView('detail')
    setUkladani(false)
  }

  // ── Smazat čip ──
  async function handleDeleteCip(cipId: string) {
    const { error } = await supabase.from('jednotky_cipy').delete().eq('id', cipId)
    if (error) { setChyba(error.message); return }
    await refreshJednotky()
    router.refresh()
  }

  // ── Ukončit vazbu ──
  async function handleUkoncitVazbu(vazbaId: string) {
    await supabase.from('jednotky_osoby').update({ je_aktivni: false, datum_do: new Date().toISOString().split('T')[0] }).eq('id', vazbaId)
    await refreshJednotky()
    router.refresh()
  }

  // ── Smazat vazbu ──
  async function handleSmazatVazbu(vazbaId: string) {
    await supabase.from('jednotky_osoby').delete().eq('id', vazbaId)
    await refreshJednotky()
    router.refresh()
  }

  // ── Smazat jednotku ──
  async function handleSmazat() {
    if (!vybranaId) return
    setMazani(true)
    await supabase.from('jednotky').delete().eq('id', vybranaId)
    await refreshJednotky()
    router.refresh()
    closeModal()
    setMazani(false)
  }

  // ─── Render tabulky ──────────────────────────────────────────────────────────

  function renderVlastnikCell(j: Jednotka) {
    const vl = j.jednotky_osoby.filter(v => v.role === 'vlastnik' && v.je_aktivni)
    if (vl.length === 0) return <span className="text-zinc-300 italic text-xs">—</span>

    // SJM / MCP – zobraz spolu
    const typ = vl[0].typ_vlastnictvi
    if (typ === 'sjm' || typ === 'mcp') {
      return (
        <span className="text-zinc-700 text-sm">
          <span className={`mr-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded ring-1 ${typ === 'sjm' ? 'bg-blue-50 text-blue-700 ring-blue-200' : 'bg-indigo-50 text-indigo-700 ring-indigo-200'}`}>
            {typ.toUpperCase()}
          </span>
          {vl.map(v => formatJmeno(v.osoby)).join(' + ')}
        </span>
      )
    }
    // Podílové
    if (typ === 'podilove') {
      return (
        <span className="text-zinc-700 text-sm">
          {vl.map((v, i) => (
            <span key={v.id}>{i > 0 && ', '}
              {v.podil_citatel && v.podil_jmenovatel && (
                <span className="text-zinc-400 text-xs mr-1">{v.podil_citatel}/{v.podil_jmenovatel}</span>
              )}
              {formatJmeno(v.osoby)}
            </span>
          ))}
        </span>
      )
    }
    // Individuální
    return <span className="text-zinc-700 text-sm">{vl.map(v => formatJmeno(v.osoby)).join(', ')}</span>
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
    <PageShell
      title="Bytové jednotky"
      stats={[
        { label: 'jednotek', value: celkem },
        { label: 'obsazeno', value: obsazeno, dot: 'emerald', color: 'emerald' },
        { label: 'pronajato', value: pronajato, dot: 'amber', color: 'amber' },
        { label: 'volné', value: celkem - obsazeno, dot: 'zinc' },
      ]}
      actions={
        <AddButton onClick={() => {/* TODO */}}>Přidat jednotku</AddButton>
      }
    >
      <PageTable>
        <PageThead>
          <PageTh>Číslo</PageTh>
          <PageTh>Vchod</PageTh>
          <PageTh>Patro</PageTh>
          <PageTh>Plocha</PageTh>
          <PageTh>Podíl</PageTh>
          <PageTh>Vlastník</PageTh>
          <PageTh>Nájemník</PageTh>
          <PageTh center>Hlášeni</PageTh>
          <PageTh>Stav</PageTh>
        </PageThead>
        <PageTbody>
          {jednotky.length === 0 && <PageEmpty text="Zatím žádné jednotky." />}
          {jednotky.map(j => {
            const naj = j.jednotky_osoby.find(v => v.role === 'najemnik' && v.je_aktivni)
            const pocetBydlici = j.jednotky_osoby.filter(v => v.role === 'bydlici' && v.je_aktivni).length
            const maVlastnika = j.jednotky_osoby.some(v => v.role === 'vlastnik' && v.je_aktivni)
            const maNajemnika = !!naj
            return (
              <PageTr key={j.id} onClick={() => openModal(j.id)}>
                <PageTd><span className="font-medium text-zinc-900 group-hover:text-violet-700 transition-colors">{j.cislo_jednotky}</span></PageTd>
                <PageTd>{j.vchod ? <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-xs font-bold">{j.vchod}</span> : <span className="text-zinc-300">—</span>}</PageTd>
                <PageTd>{j.patro ?? <span className="text-zinc-300">—</span>}</PageTd>
                <PageTd className="tabular-nums">{j.uzitna_plocha ? `${j.uzitna_plocha} m²` : <span className="text-zinc-300">—</span>}</PageTd>
                <PageTd className="tabular-nums text-xs text-zinc-500">{j.podil_citatel && j.podil_jmenovatel ? `${j.podil_citatel}/${j.podil_jmenovatel}` : <span className="text-zinc-300">—</span>}</PageTd>
                <PageTd>{renderVlastnikCell(j)}</PageTd>
                <PageTd>{naj ? <span className="text-zinc-700">{formatJmeno(naj.osoby)}</span> : <span className="text-zinc-300">—</span>}</PageTd>
                <PageTd center>
                  {pocetBydlici > 0
                    ? <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">{pocetBydlici}</span>
                    : <span className="text-zinc-300">—</span>}
                </PageTd>
                <PageTd>
                  {maNajemnika
                    ? <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-amber-200"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />Pronajato</span>
                    : maVlastnika
                      ? <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Obsazeno</span>
                      : <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium bg-zinc-100 text-zinc-400"><span className="w-1.5 h-1.5 rounded-full bg-zinc-300" />Volné</span>}
                </PageTd>
              </PageTr>
            )
          })}
        </PageTbody>
      </PageTable>
    </PageShell>

      {/* ─── Modal ─────────────────────────────────────────────────────────────── */}
      {/* NOTE: modal is rendered outside PageShell so it overlays everything */}
      {vybranaId && vybrana && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.3)' }}
          onMouseDown={e => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
            onMouseDown={e => e.stopPropagation()}
          >
            {/* Modal hlavička */}
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
                  {view === 'detail' ? 'Bytová jednotka' : view === 'edit' ? 'Úprava jednotky' : view === 'add-vlastnik' ? 'Přidat vlastníka' : view === 'add-najemnik' ? 'Přidat nájemníka' : 'Přidat osobu k pobytu'}
                </p>
                <div className="flex items-baseline gap-3 mt-0.5">
                  <p className="text-2xl font-bold text-white">{vybrana.cislo_jednotky}</p>
                  {vybrana.ulice_vchodu && <p className="text-sm text-zinc-400">{vybrana.ulice_vchodu}</p>}
                  {vybrana.vchod && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white/10 text-zinc-300 text-xs font-semibold">
                      Vchod {vybrana.vchod}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={closeModal}
                className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/20 transition-colors mt-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Modal tělo */}
            <div className="flex-1 overflow-hidden flex flex-col">

              {/* ── DETAIL – dvoupanelový layout ── */}
              {view === 'detail' && (
                <div className="flex flex-1 overflow-hidden">

                  {/* Levý panel – informace o jednotce */}
                  <div className="w-64 flex-shrink-0 border-r border-zinc-100 flex flex-col overflow-y-auto">
                    <div className="p-5 flex-1">
                      <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-3">Informace o jednotce</p>
                      <div className="space-y-0">
                        {[
                          { l: 'Patro', v: vybrana.patro != null ? String(vybrana.patro) : '—' },
                          { l: 'Užitná plocha', v: vybrana.uzitna_plocha ? `${vybrana.uzitna_plocha} m²` : '—' },
                          { l: 'Vlastnický podíl', v: vybrana.podil_citatel ? `${vybrana.podil_citatel}/${vybrana.podil_jmenovatel}` : '—' },
                          { l: 'Variabilní symbol', v: vybrana.var_symbol ?? '—' },
                        ].map(({ l, v }) => (
                          <div key={l} className="flex items-baseline justify-between py-2.5 border-b border-zinc-50 last:border-0">
                            <span className="text-xs text-zinc-400 shrink-0 mr-2">{l}</span>
                            <span className="text-sm font-semibold text-zinc-900 tabular-nums text-right">{v}</span>
                          </div>
                        ))}
                      </div>
                      {vybrana.poznamka && (
                        <div className="mt-4 bg-zinc-50 rounded-xl px-3 py-2.5">
                          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">Poznámka</p>
                          <p className="text-xs text-zinc-600">{vybrana.poznamka}</p>
                        </div>
                      )}
                    </div>

                    {/* Akce */}
                    <div className="p-4 border-t border-zinc-100 space-y-2 flex-shrink-0">
                      <button onClick={openEdit}
                        className="flex items-center justify-center gap-2 w-full border border-zinc-200 text-zinc-700 text-sm py-2.5 rounded-xl hover:bg-zinc-50 transition-colors font-medium">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        Upravit jednotku
                      </button>
                      {potvrzeni ? (
                        <div className="flex gap-1.5">
                          <button onClick={handleSmazat} disabled={mazani}
                            className="flex-1 bg-red-600 text-white text-xs py-2.5 rounded-xl hover:bg-red-700 transition-colors font-medium disabled:opacity-50">
                            {mazani ? 'Mažu...' : 'Potvrdit smazání'}
                          </button>
                          <button onClick={() => setPotvrzeni(false)}
                            className="flex-1 border border-zinc-200 text-zinc-600 text-xs py-2.5 rounded-xl hover:bg-zinc-50 transition-colors">
                            Zrušit
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setPotvrzeni(true)}
                          className="w-full border border-red-200 text-red-500 text-sm py-2.5 rounded-xl hover:bg-red-50 transition-colors font-medium">
                          Smazat jednotku
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Pravý panel – osoby */}
                  <div className="flex-1 overflow-y-auto">

                    {/* Vlastníci */}
                    <div className="px-6 py-4 border-b border-zinc-100">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Vlastnictví</p>
                        <button onClick={openAddVlastnik} className="text-xs text-violet-600 hover:text-violet-800 font-medium">+ Přidat</button>
                      </div>
                      {aktivniVlastnici.length === 0 ? (
                        <p className="text-sm text-zinc-400 italic">Nepřiřazen</p>
                      ) : (
                        <div className="space-y-2">
                          {(() => {
                            const typ = aktivniVlastnici[0].typ_vlastnictvi
                            if (typ === 'sjm' || typ === 'mcp') {
                              return (
                                <div className="bg-zinc-50 rounded-xl p-3">
                                  <div className="flex items-center gap-2 mb-1">
                                    {typVlastnictviBadge(typ)}
                                    <span className="text-xs text-zinc-400">{aktivniVlastnici[0].datum_od ? `od ${aktivniVlastnici[0].datum_od}` : ''}</span>
                                </div>
                                {aktivniVlastnici.map(v => (
                                  <div key={v.id} className="flex items-center justify-between mt-1">
                                    <span className="text-sm font-semibold text-zinc-900">{formatJmeno(v.osoby)}</span>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <button onClick={() => handleUkoncitVazbu(v.id)} className="text-[10px] text-amber-500 hover:text-amber-700">ukončit</button>
                                      <button onClick={() => handleSmazatVazbu(v.id)} className="text-[10px] text-red-400 hover:text-red-600">smazat</button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )
                          }
                          return aktivniVlastnici.map(v => (
                            <div key={v.id} className="bg-zinc-50 rounded-xl p-3 flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  {typVlastnictviBadge(v.typ_vlastnictvi)}
                                  {v.podil_citatel && <span className="text-xs text-zinc-400 font-mono">{v.podil_citatel}/{v.podil_jmenovatel}</span>}
                                  <span className="text-sm font-semibold text-zinc-900">{formatJmeno(v.osoby)}</span>
                                </div>
                                {v.datum_od && <p className="text-[10px] text-zinc-400 mt-0.5">od {v.datum_od}</p>}
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                <button onClick={() => handleUkoncitVazbu(v.id)} className="text-[10px] text-amber-500 hover:text-amber-700">ukončit</button>
                                <button onClick={() => handleSmazatVazbu(v.id)} className="text-[10px] text-red-400 hover:text-red-600">smazat</button>
                              </div>
                            </div>
                          ))
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Nájemník */}
                  <div className="px-6 py-4 border-b border-zinc-100">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Nájemník</p>
                      <button onClick={openAddNajemnik} className="text-xs text-violet-600 hover:text-violet-800 font-medium">+ Přidat</button>
                    </div>
                    {aktivniNajemnik.length === 0 ? (
                      <p className="text-sm text-zinc-400 italic">Nepřiřazen</p>
                    ) : (
                      <div className="space-y-2">
                        {aktivniNajemnik.map(n => (
                          <div key={n.id} className="bg-amber-50 rounded-xl p-3 ring-1 ring-amber-100 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-zinc-900">{formatJmeno(n.osoby)}</p>
                              {n.datum_od && <p className="text-[10px] text-zinc-400 mt-0.5">od {n.datum_od}</p>}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                              <button onClick={() => handleUkoncitVazbu(n.id)} className="text-[10px] text-amber-500 hover:text-amber-700">ukončit</button>
                              <button onClick={() => handleSmazatVazbu(n.id)} className="text-[10px] text-red-400 hover:text-red-600">smazat</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Hlášeni k pobytu */}
                  <div className="px-6 py-4 border-b border-zinc-100">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Hlášeni k pobytu</p>
                      <button onClick={openAddBydlici} className="text-xs text-violet-600 hover:text-violet-800 font-medium">+ Přidat</button>
                    </div>
                    {aktivniBydlici.length === 0 ? (
                      <p className="text-sm text-zinc-400 italic">Nikdo není hlášen</p>
                    ) : (
                      <div className="space-y-1.5">
                        {aktivniBydlici.map(b => (
                          <div key={b.id} className="bg-blue-50 rounded-xl px-3 py-2.5 ring-1 ring-blue-100 flex items-center justify-between">
                            <span className="text-sm font-semibold text-zinc-900">{formatJmeno(b.osoby)}</span>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                              <button onClick={() => handleUkoncitVazbu(b.id)} className="text-[10px] text-amber-500 hover:text-amber-700">odhlásit</button>
                              <button onClick={() => handleSmazatVazbu(b.id)} className="text-[10px] text-red-400 hover:text-red-600">smazat</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Vchodové čipy */}
                  <div className="px-6 py-4 border-b border-zinc-100">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Vchodové čipy</p>
                      <button onClick={openAddCip} className="text-xs text-violet-600 hover:text-violet-800 font-medium">+ Přidat</button>
                    </div>
                    {vybrana.jednotky_cipy?.length === 0 ? (
                      <p className="text-sm text-zinc-400 italic">Žádné čipy nejsou registrovány</p>
                    ) : (
                      <div className="space-y-1.5">
                        {vybrana.jednotky_cipy?.map(c => (
                          <div key={c.id} className="bg-zinc-50 rounded-xl px-3 py-2.5 ring-1 ring-zinc-100 flex items-center justify-between">
                            <div className="min-w-0">
                              <span className="text-sm font-mono font-bold text-zinc-900">{c.cislo_cipu}</span>
                              {c.poznamka && <p className="text-[10px] text-zinc-400 truncate">{c.poznamka}</p>}
                            </div>
                            <button onClick={() => handleDeleteCip(c.id)} className="text-zinc-400 hover:text-red-500 transition-colors ml-2 p-1">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  </div>
                </div>
              )}

              {/* ── EDIT ── */}
              {view === 'edit' && (
                <div className="flex-1 overflow-y-auto">
                <form onSubmit={handleSaveEdit} className="px-6 py-5 space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className={LABEL}>Číslo jednotky *</label>
                      <input value={editForm.cislo_jednotky} onChange={e => setEditForm(p => ({ ...p, cislo_jednotky: e.target.value }))} required className={INPUT} />
                    </div>
                    <div>
                      <label className={LABEL}>Vchod</label>
                      <select value={editForm.vchod} onChange={e => setEditForm(p => ({ ...p, vchod: e.target.value }))} className={INPUT}>
                        <option value="">—</option>
                        {['A','B','C','D','E'].map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={LABEL}>Patro</label>
                      <input type="number" value={editForm.patro} onChange={e => setEditForm(p => ({ ...p, patro: e.target.value }))} className={INPUT} />
                    </div>
                  </div>
                  <div>
                    <label className={LABEL}>Variabilní symbol</label>
                    <input value={editForm.var_symbol} onChange={e => setEditForm(p => ({ ...p, var_symbol: e.target.value }))} className={INPUT} placeholder="např. 2051711011" />
                  </div>
                  <div>
                    <label className={LABEL}>Ulice vchodu</label>
                    <input value={editForm.ulice_vchodu} onChange={e => setEditForm(p => ({ ...p, ulice_vchodu: e.target.value }))} className={INPUT} placeholder="Spojovací 557/A" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL}>Užitná plocha (m²)</label>
                      <input type="number" step="0.01" value={editForm.uzitna_plocha} onChange={e => setEditForm(p => ({ ...p, uzitna_plocha: e.target.value }))} className={INPUT} />
                    </div>
                    <div>
                      <label className={LABEL}>Vytápěná plocha (m²)</label>
                      <input type="number" step="0.01" value={editForm.vytapena_plocha} onChange={e => setEditForm(p => ({ ...p, vytapena_plocha: e.target.value }))} className={INPUT} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL}>Vlastnický podíl (čitatel)</label>
                      <input type="number" value={editForm.podil_citatel} onChange={e => setEditForm(p => ({ ...p, podil_citatel: e.target.value }))} className={INPUT} placeholder="135" />
                    </div>
                    <div>
                      <label className={LABEL}>Jmenovatel</label>
                      <input type="number" value={editForm.podil_jmenovatel} onChange={e => setEditForm(p => ({ ...p, podil_jmenovatel: e.target.value }))} className={INPUT} placeholder="10000" />
                    </div>
                  </div>

                  <div>
                    <label className={LABEL}>Poznámka</label>
                    <textarea value={editForm.poznamka} onChange={e => setEditForm(p => ({ ...p, poznamka: e.target.value }))} rows={3} className={INPUT + ' resize-none'} />
                  </div>
                  {chyba && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{chyba}</p>}
                  <div className="flex gap-2 pt-1">
                    <button type="submit" disabled={ukladani}
                      className="flex-1 bg-zinc-950 text-white text-sm py-2.5 rounded-xl hover:bg-zinc-800 transition-colors font-medium disabled:opacity-50">
                      {ukladani ? 'Ukládám...' : 'Uložit změny'}
                    </button>
                    <button type="button" onClick={() => setView('detail')}
                      className="flex-1 border border-zinc-200 text-zinc-700 text-sm py-2.5 rounded-xl hover:bg-zinc-50 transition-colors">
                      Zrušit
                    </button>
                  </div>
                </form>
                </div>
              )}

              {/* ── ADD VLASTNÍK ── */}
              {view === 'add-vlastnik' && (
                <div className="flex-1 overflow-y-auto">
                <form onSubmit={handleAddVlastnik} className="px-6 py-5 space-y-4">
                  <div>
                    <label className={LABEL}>Typ vlastnictví</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(['individualni', 'podilove', 'sjm', 'mcp'] as const).map(t => (
                        <button key={t} type="button" onClick={() => setAvTyp(t)}
                          className={`py-2 rounded-lg text-xs font-semibold border transition-colors ${avTyp === t ? 'bg-zinc-950 text-white border-zinc-950' : 'border-zinc-200 text-zinc-600 hover:border-zinc-400'}`}>
                          {t === 'individualni' ? 'Individuální' : t === 'podilove' ? 'Podílové' : t.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={LABEL}>{avTyp === 'sjm' || avTyp === 'mcp' ? 'Osoba 1' : 'Osoba'}</label>
                    <select value={avOsoba1} onChange={e => setAvOsoba1(e.target.value)} required className={INPUT}>
                      <option value="">— vyberte osobu —</option>
                      {vsechnyOsoby.map(o => <option key={o.id} value={o.id}>{formatJmeno(o)}</option>)}
                    </select>
                  </div>

                  {avTyp === 'podilove' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={LABEL}>Podíl – čitatel</label>
                        <input type="number" value={avPodilC} onChange={e => setAvPodilC(e.target.value)} placeholder="1" className={INPUT} />
                      </div>
                      <div>
                        <label className={LABEL}>Jmenovatel</label>
                        <input type="number" value={avPodilJ} onChange={e => setAvPodilJ(e.target.value)} placeholder="2" className={INPUT} />
                      </div>
                    </div>
                  )}

                  {(avTyp === 'sjm' || avTyp === 'mcp' || avTyp === 'podilove') && (
                    <div>
                      <label className={LABEL}>Osoba 2</label>
                      <select value={avOsoba2} onChange={e => setAvOsoba2(e.target.value)} className={INPUT}>
                        <option value="">— vyberte osobu —</option>
                        {vsechnyOsoby.map(o => <option key={o.id} value={o.id}>{formatJmeno(o)}</option>)}
                      </select>
                    </div>
                  )}

                  {avTyp === 'podilove' && avOsoba2 && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={LABEL}>Podíl osoby 2 – čitatel</label>
                        <input type="number" value={avPodilC2} onChange={e => setAvPodilC2(e.target.value)} className={INPUT} />
                      </div>
                      <div>
                        <label className={LABEL}>Jmenovatel</label>
                        <input type="number" value={avPodilJ2} onChange={e => setAvPodilJ2(e.target.value)} className={INPUT} />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className={LABEL}>Vlastník od</label>
                    <input type="date" value={avDatum} onChange={e => setAvDatum(e.target.value)} className={INPUT} />
                  </div>
                  {chyba && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{chyba}</p>}
                  <div className="flex gap-2">
                    <button type="submit" disabled={ukladani || !avOsoba1}
                      className="flex-1 bg-zinc-950 text-white text-sm py-2.5 rounded-xl hover:bg-zinc-800 transition-colors font-medium disabled:opacity-40">
                      {ukladani ? 'Ukládám...' : 'Přiřadit vlastníka'}
                    </button>
                    <button type="button" onClick={() => setView('detail')}
                      className="flex-1 border border-zinc-200 text-zinc-600 text-sm py-2.5 rounded-xl hover:bg-zinc-50">Zrušit</button>
                  </div>
                </form>
                </div>
              )}

              {/* ── ADD NÁJEMNÍK / BYDLÍCÍ ── */}
              {(view === 'add-najemnik' || view === 'add-bydlici') && (
                <div className="flex-1 overflow-y-auto">
                <div className="px-6 py-5 space-y-4">
                  <div>
                    <label className={LABEL}>Osoba</label>
                    <select
                      value={anOsoba}
                      onChange={e => {
                        const sid = e.target.value
                        setAnOsoba(sid)
                        const vl = aktivniVlastnici.find(v => v.osoby.id === sid)
                        if (vl?.datum_od) setAnDatum(vl.datum_od)
                        else setAnDatum(new Date().toISOString().split('T')[0])
                      }}
                      className={INPUT}
                    >
                      <option value="">— vyberte osobu —</option>
                      {vsechnyOsoby.map(o => <option key={o.id} value={o.id}>{formatJmeno(o)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={LABEL}>{view === 'add-najemnik' ? 'Nájemník od' : 'Hlášen od'}</label>
                    <input type="date" value={anDatum} onChange={e => setAnDatum(e.target.value)} className={INPUT} />
                  </div>
                  {chyba && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{chyba}</p>}
                  <div className="flex gap-2">
                    <button onClick={() => handleAddVazba(view === 'add-najemnik' ? 'najemnik' : 'bydlici')}
                      disabled={ukladani || !anOsoba}
                      className="flex-1 bg-zinc-950 text-white text-sm py-2.5 rounded-xl hover:bg-zinc-800 transition-colors font-medium disabled:opacity-40">
                      {ukladani ? 'Ukládám...' : view === 'add-najemnik' ? 'Přiřadit nájemníka' : 'Přidat k pobytu'}
                    </button>
                    <button onClick={() => setView('detail')}
                      className="flex-1 border border-zinc-200 text-zinc-600 text-sm py-2.5 rounded-xl hover:bg-zinc-50">Zrušit</button>
                  </div>
                </div>
                </div>
              )}

              {/* ── ADD ČIP ── */}
              {view === 'add-cip' && (
                <div className="flex-1 overflow-y-auto">
                <form onSubmit={handleAddCip} className="px-6 py-5 space-y-4">
                  <div>
                    <label className={LABEL}>Číslo čipu *</label>
                    <input value={acCislo} onChange={e => setAcCislo(e.target.value)} required placeholder="např. 042" className={INPUT} />
                  </div>
                  <div>
                    <label className={LABEL}>Poznámka</label>
                    <input value={acPoznamka} onChange={e => setAcPoznamka(e.target.value)} placeholder="např. předáno 10.4." className={INPUT} />
                  </div>
                  {chyba && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{chyba}</p>}
                  <div className="flex gap-2">
                    <button type="submit" disabled={ukladani || !acCislo}
                      className="flex-1 bg-zinc-950 text-white text-sm py-2.5 rounded-xl hover:bg-zinc-800 transition-colors font-medium disabled:opacity-40">
                      {ukladani ? 'Ukládám...' : 'Přidat čip'}
                    </button>
                    <button type="button" onClick={() => setView('detail')}
                      className="flex-1 border border-zinc-200 text-zinc-600 text-sm py-2.5 rounded-xl hover:bg-zinc-50">Zrušit</button>
                  </div>
                </form>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  )
}
