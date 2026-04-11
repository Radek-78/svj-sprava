'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import PageShell, { AddButton, PageEmpty, PageTable, PageTbody, PageTd, PageTh, PageThead, PageTr, SearchInput } from '@/components/PageShell'

// ─── Typy ────────────────────────────────────────────────────────────────────

type Osoba = { id: string; jmeno: string | null; prijmeni: string; email: string | null; telefon: string | null }
type OsobaMinimal = { id: string; jmeno: string | null; prijmeni: string }
type Cip = { 
  id: string; 
  cislo_cipu: string; 
  poznamka: string | null; 
  osoba_id: string | null; 
  externi_prijemce: string | null; 
  datum_predani: string | null;
  osoby?: Osoba | null;
}

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
  pravdepodobny_pronajem: boolean
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

function formatJmeno(o: OsobaMinimal) {
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

function KontaktWarnings({ vlastnici }: { vlastnici: Vazba[] }) {
  if (vlastnici.length === 0) return null
  const missingPhone = vlastnici.some(v => !v.osoby.telefon)
  const missingEmail = vlastnici.some(v => !v.osoby.email)
  if (!missingPhone && !missingEmail) return null
  return (
    <div className="flex items-center gap-1">
      {missingPhone && (
        <span title="Chybí telefon" className="text-red-400">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
          </svg>
        </span>
      )}
      {missingEmail && (
        <span title="Chybí email" className="text-amber-400">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </span>
      )}
    </div>
  )
}

const INPUT = 'w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white'
const LABEL = 'block text-xs font-medium text-zinc-500 mb-1'

// ─── Komponenta ───────────────────────────────────────────────────────────────

export default function JednotkyClient({ jednotky: initial, openId }: { jednotky: Jednotka[]; openId?: string }) {
  const [jednotky, setJednotky] = useState(initial)
  const [vybranaId, setVybranaId] = useState<string | null>(null)
  const [view, setView] = useState<ModalView>('detail')
  const [vsechnyOsoby, setVsechnyOsoby] = useState<OsobaMinimal[]>([])
  const [mazani, setMazani] = useState(false)
  const [potvrzeni, setPotvrzeni] = useState(false)
  const [ukladani, setUkladani] = useState(false)
  const [chyba, setChyba] = useState('')

  const [hledani, setHledani] = useState('')

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
  const [acTypPrijemce, setAcTypPrijemce] = useState<'osoba' | 'externi'>('osoba')
  const [acOsobaId, setAcOsobaId] = useState('')
  const [acExterniJmeno, setAcExterniJmeno] = useState('')
  const [acDatum, setAcDatum] = useState(new Date().toISOString().split('T')[0])

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
      .select(`
        *, 
        jednotky_osoby(id, role, typ_vlastnictvi, podil_citatel, podil_jmenovatel, datum_od, datum_do, je_aktivni, osoby(id, jmeno, prijmeni)), 
        jednotky_cipy(id, cislo_cipu, poznamka, osoba_id, externi_prijemce, datum_predani, osoby(id, jmeno, prijmeni))
      `)
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
    setAcCislo(''); setAcPoznamka(''); setAcTypPrijemce('osoba'); setAcOsobaId(''); setAcExterniJmeno('')
    setAcDatum(new Date().toISOString().split('T')[0])
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
      jednotka_id: vybranaId, 
      cislo_cipu: acCislo, 
      poznamka: acPoznamka || null,
      osoba_id: acTypPrijemce === 'osoba' ? (acOsobaId || null) : null,
      externi_prijemce: acTypPrijemce === 'externi' ? (acExterniJmeno || null) : null,
      datum_predani: acDatum || null,
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

  // ── Přepnout pravděpodobný pronájem ──
  async function handleTogglePravdepodobnyPronajem() {
    if (!vybranaId || !vybrana) return
    const novyStav = !vybrana.pravdepodobny_pronajem
    const { error } = await supabase
      .from('jednotky')
      .update({ pravdepodobny_pronajem: novyStav })
      .eq('id', vybranaId)
    
    if (error) {
      setChyba(error.message)
      return
    }
    await refreshJednotky()
    router.refresh()
  }

  // ─── Filtrování ──────────────────────────────────────────────────────────────

  const filtrovane = jednotky.filter(j => {
    if (!hledani) return true
    const q = hledani.toLowerCase()
    const vlastnici = j.jednotky_osoby
      .filter(v => v.role === 'vlastnik' && v.je_aktivni)
      .map(v => formatJmeno(v.osoby))
      .join(' ')
    const najemnik = j.jednotky_osoby.find(v => v.role === 'najemnik' && v.je_aktivni)
    return (
      j.cislo_jednotky.toLowerCase().includes(q) ||
      (j.vchod ?? '').toLowerCase().includes(q) ||
      (j.ulice_vchodu ?? '').toLowerCase().includes(q) ||
      (j.patro?.toString() ?? '').includes(q) ||
      (j.var_symbol ?? '').includes(q) ||
      vlastnici.toLowerCase().includes(q) ||
      (najemnik ? formatJmeno(najemnik.osoby).toLowerCase().includes(q) : false)
    )
  })

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
        <>
          <SearchInput value={hledani} onChange={setHledani} placeholder="Hledat jednotku…" />
          <AddButton onClick={() => {/* TODO */}}>Přidat jednotku</AddButton>
        </>
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
          <PageTh center> </PageTh>
        </PageThead>
        <PageTbody>
          {filtrovane.length === 0 && <PageEmpty text={hledani ? 'Žádná jednotka neodpovídá hledání.' : 'Zatím žádné jednotky.'} />}
          {filtrovane.map(j => {
            const naj = j.jednotky_osoby.find(v => v.role === 'najemnik' && v.je_aktivni)
            const pocetBydlici = j.jednotky_osoby.filter(v => v.role === 'bydlici' && v.je_aktivni).length
            const maVlastnika = j.jednotky_osoby.some(v => v.role === 'vlastnik' && v.je_aktivni)
            const maNajemnika = !!naj
            const aktivniVlastnici = j.jednotky_osoby.filter(v => v.role === 'vlastnik' && v.je_aktivni)
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
                      ? <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                          {j.pravdepodobny_pronajem && <span className="mr-0.5 text-[10px]" title="Očekávaný pronájem">📬</span>}
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Obsazeno
                        </span>
                      : j.pravdepodobny_pronajem
                        ? <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold bg-violet-50 text-violet-700 ring-1 ring-violet-200 shadow-sm animate-pulse">
                            📬 Očekáváno
                          </span>
                        : <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium bg-zinc-100 text-zinc-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
                            Volné
                          </span>}
                </PageTd>
                <PageTd center><KontaktWarnings vlastnici={aktivniVlastnici} /></PageTd>
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
            className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden"
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

              {/* ── DETAIL – třípanelový layout ── */}
              {view === 'detail' && (
                <div className="flex flex-1 overflow-hidden font-sans">

                  {/* 1. SLOUPEC: Informace o jednotce (w-64) */}
                  <div className="w-60 flex-shrink-0 border-r border-zinc-100 flex flex-col overflow-y-auto bg-zinc-50/10">
                    <div className="p-5 flex-1">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4">Informace o jednotce</p>
                      <div className="space-y-0.5">
                        {[
                          { l: 'Patro', v: vybrana.patro != null ? String(vybrana.patro) : '—' },
                          { l: 'Užitná plocha', v: vybrana.uzitna_plocha ? `${vybrana.uzitna_plocha} m²` : '—' },
                          { l: 'Vlastnický podíl', v: vybrana.podil_citatel ? `${vybrana.podil_citatel}/${vybrana.podil_jmenovatel}` : '—' },
                          { l: 'Variabilní symbol', v: vybrana.var_symbol ?? '—' },
                        ].map(({ l, v }) => (
                          <div key={l} className="flex flex-col py-2 border-b border-zinc-50 last:border-0">
                            <span className="text-[10px] font-semibold text-zinc-400 uppercase mb-0.5">{l}</span>
                            <span className="text-sm font-bold text-zinc-900 tabular-nums">{v}</span>
                          </div>
                        ))}
                      </div>

                      <button 
                        onClick={handleTogglePravdepodobnyPronajem}
                        className={`mt-4 w-full flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                          vybrana.pravdepodobny_pronajem 
                            ? 'bg-violet-50 border-violet-200 text-violet-700 shadow-sm' 
                            : 'bg-white border-zinc-100 text-zinc-400 hover:border-zinc-200 hover:text-zinc-500'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`p-1 rounded-lg ${vybrana.pravdepodobny_pronajem ? 'bg-violet-500 text-white' : 'bg-zinc-100 text-zinc-400'}`}>
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-wider">Očekávaný pronájem</span>
                        </div>
                        <div className={`w-7 h-4 rounded-full p-0.5 transition-colors ${vybrana.pravdepodobny_pronajem ? 'bg-violet-500' : 'bg-zinc-200'}`}>
                          <div className={`w-3 h-3 bg-white rounded-full shadow-sm transform transition-transform ${vybrana.pravdepodobny_pronajem ? 'translate-x-3' : 'translate-x-0'}`} />
                        </div>
                      </button>

                      {vybrana.poznamka && (
                        <div className="mt-4 bg-white border border-zinc-100 rounded-xl p-3 shadow-sm">
                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Poznámka</p>
                          <p className="text-xs text-zinc-600 leading-relaxed">{vybrana.poznamka}</p>
                        </div>
                      )}
                    </div>

                    {/* Akce */}
                    <div className="p-4 border-t border-zinc-100 space-y-2 flex-shrink-0">
                      <button onClick={openEdit}
                        className="flex items-center justify-center gap-2 w-full bg-white border border-zinc-200 text-zinc-700 text-xs py-2.5 rounded-xl hover:bg-zinc-50 transition-all font-bold shadow-sm active:scale-[0.98]">
                        <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        Upravit jednotku
                      </button>
                      {potvrzeni ? (
                         <div className="flex gap-2">
                           <button onClick={handleSmazat} disabled={mazani}
                             className="flex-1 bg-red-600 text-white text-[10px] py-2.5 rounded-xl hover:bg-red-700 transition-all font-bold disabled:opacity-50 shadow-md shadow-red-100">
                             {mazani ? 'Mažu...' : 'Potvrdit'}
                           </button>
                           <button onClick={() => setPotvrzeni(false)}
                             className="flex-1 bg-white border border-zinc-200 text-zinc-600 text-[10px] py-2.5 rounded-xl hover:bg-zinc-50 transition-all font-bold">
                             Zrušit
                           </button>
                         </div>
                       ) : (
                         <button onClick={() => setPotvrzeni(true)}
                           className="w-full border border-red-100 text-red-500 text-xs py-2.5 rounded-xl hover:bg-red-50 transition-all font-bold">
                           Smazat jednotku
                         </button>
                       )}
                    </div>
                  </div>

                  {/* 2. SLOUPEC: Osoby (flex-1) */}
                  <div className="flex-1 overflow-y-auto border-r border-zinc-100 bg-white">
                    {/* Vlastnictví */}
                    <div className="px-6 py-4 border-b border-zinc-100">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                          </div>
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Vlastnictví</p>
                        </div>
                        <button onClick={openAddVlastnik} className="text-[10px] bg-violet-50 text-violet-600 hover:bg-violet-100 font-bold px-2.5 py-1 rounded-lg transition-colors">+ PŘIDAT</button>
                      </div>
                      {aktivniVlastnici.length === 0 ? (
                        <p className="text-xs text-zinc-400 italic px-1">Nepřiřazen</p>
                      ) : (
                        <div className="space-y-2">
                          {(() => {
                            const typ = aktivniVlastnici[0].typ_vlastnictvi
                            if (typ === 'sjm' || typ === 'mcp') {
                              return (
                                <div className="bg-zinc-50/50 rounded-xl p-3 border border-zinc-100">
                                  <div className="flex items-center gap-2.5 mb-2">
                                    {typVlastnictviBadge(typ)}
                                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">{aktivniVlastnici[0].datum_od ? `od ${aktivniVlastnici[0].datum_od}` : ''}</span>
                                </div>
                                <div className="space-y-1.5">
                                  {aktivniVlastnici.map(v => (
                                    <div key={v.id} onClick={() => { closeModal(); router.push(`/dashboard/osoby?open=${v.osoby.id}`) }} className="flex items-center justify-between bg-white px-2.5 py-2 rounded-lg border border-zinc-200/60 shadow-sm cursor-pointer hover:border-violet-200 hover:bg-violet-50 transition-colors">
                                      <span className="text-xs font-bold text-zinc-900">{formatJmeno(v.osoby)}</span>
                                      <div className="flex items-center gap-1">
                                        <button onClick={e => { e.stopPropagation(); handleUkoncitVazbu(v.id) }} className="text-[9px] text-amber-500 hover:bg-amber-50 px-2 py-1 rounded-lg font-bold transition-colors">Ukončit</button>
                                        <button onClick={e => { e.stopPropagation(); handleSmazatVazbu(v.id) }} className="text-[9px] text-red-400 hover:bg-red-50 px-2 py-1 rounded-lg font-bold transition-colors">Smazat</button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )
                          }
                          return aktivniVlastnici.map(v => (
                            <div key={v.id} onClick={() => { closeModal(); router.push(`/dashboard/osoby?open=${v.osoby.id}`) }} className="bg-white rounded-xl p-3 border border-zinc-200 shadow-sm cursor-pointer hover:border-violet-200 hover:bg-violet-50 transition-colors flex items-center justify-between group">
                              <div className="flex items-center gap-3">
                                {typVlastnictviBadge(v.typ_vlastnictvi)}
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-zinc-900">{formatJmeno(v.osoby)}</span>
                                    {v.podil_citatel && <span className="text-[10px] font-black text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-md tabular-nums">{v.podil_citatel}/{v.podil_jmenovatel}</span>}
                                  </div>
                                  {v.datum_od && <p className="text-[9px] font-medium text-zinc-400">od {v.datum_od}</p>}
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <button onClick={e => { e.stopPropagation(); handleUkoncitVazbu(v.id) }} className="text-[9px] text-amber-500 hover:bg-amber-50 px-2 py-1 rounded-lg font-bold">Ukončit</button>
                                <button onClick={e => { e.stopPropagation(); handleSmazatVazbu(v.id) }} className="text-[9px] text-red-400 hover:bg-red-50 px-2 py-1 rounded-lg font-bold">Smazat</button>
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
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                          </div>
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Nájemník</p>
                        </div>
                        <button onClick={openAddNajemnik} className="text-[10px] bg-amber-50 text-amber-600 hover:bg-amber-100 font-bold px-2.5 py-1 rounded-lg transition-colors">+ PŘIDAT</button>
                      </div>
                      {aktivniNajemnik.length === 0 ? (
                        <p className="text-xs text-zinc-400 italic px-1">Nepřiřazen</p>
                      ) : (
                        <div className="space-y-2">
                          {aktivniNajemnik.map(n => (
                            <div key={n.id} onClick={() => { closeModal(); router.push(`/dashboard/osoby?open=${n.osoby.id}`) }} className="bg-amber-50/20 rounded-xl p-3 border border-amber-100/50 flex items-center justify-between group cursor-pointer hover:border-violet-200 hover:bg-violet-50 transition-colors">
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-zinc-900">{formatJmeno(n.osoby)}</span>
                                {n.datum_od && <p className="text-[9px] font-bold text-amber-600/60">od {n.datum_od}</p>}
                              </div>
                              <div className="flex items-center gap-1">
                                <button onClick={e => { e.stopPropagation(); handleUkoncitVazbu(n.id) }} className="text-[9px] text-amber-600 hover:bg-amber-100 px-2 py-1 rounded-lg font-bold">Ukončit</button>
                                <button onClick={e => { e.stopPropagation(); handleSmazatVazbu(n.id) }} className="text-[9px] text-red-400 hover:bg-red-50 px-2 py-1 rounded-lg font-bold">Smazat</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Hlášeni k pobytu */}
                    <div className="px-6 py-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                          </div>
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Hlášeni k pobytu</p>
                        </div>
                        <button onClick={openAddBydlici} className="text-[10px] bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold px-2.5 py-1 rounded-lg transition-colors">+ PŘIDAT</button>
                      </div>
                      {aktivniBydlici.length === 0 ? (
                        <p className="text-xs text-zinc-400 italic px-1">Nikdo není hlášen</p>
                      ) : (
                        <div className="bg-blue-50/5 border border-blue-100/30 rounded-xl divide-y divide-blue-50/50">
                          {aktivniBydlici.map(b => (
                            <div key={b.id} onClick={() => { closeModal(); router.push(`/dashboard/osoby?open=${b.osoby.id}`) }} className="px-3 py-2 flex items-center justify-between group cursor-pointer hover:bg-violet-50 transition-colors first:rounded-t-xl last:rounded-b-xl">
                              <span className="text-xs font-medium text-zinc-900">{formatJmeno(b.osoby)}</span>
                              <div className="flex items-center gap-1">
                                <button onClick={e => { e.stopPropagation(); handleUkoncitVazbu(b.id) }} className="text-[9px] text-blue-600 hover:bg-blue-100 px-2 py-0.5 rounded-md font-bold">Odhlásit</button>
                                <button onClick={e => { e.stopPropagation(); handleSmazatVazbu(b.id) }} className="text-[9px] text-red-300 hover:bg-red-50 px-2 py-0.5 rounded-md font-bold">Smazat</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 3. SLOUPEC: Čipy (w-72) */}
                  <div className="w-72 flex-shrink-0 flex flex-col overflow-y-auto bg-zinc-50/20">
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-zinc-900 text-zinc-100 shadow-md">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                          </div>
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Čipy</p>
                        </div>
                        <button onClick={openAddCip} className="text-[9px] bg-zinc-950 text-white hover:bg-zinc-800 font-bold px-2 py-1 rounded-md transition-all">+ PŘIDAT</button>
                      </div>

                      {(() => {
                        const serazeneCipy = [...(vybrana.jednotky_cipy || [])].sort((a, b) => {
                          const an = parseInt(a.cislo_cipu.match(/\d+/)?.[0] || '0')
                          const bn = parseInt(b.cislo_cipu.match(/\d+/)?.[0] || '0')
                          return an - bn || a.cislo_cipu.localeCompare(b.cislo_cipu)
                        })

                        if (serazeneCipy.length === 0) return <p className="text-xs text-zinc-400 italic px-1">Žádné čipy</p>

                        return (
                          <div className="space-y-1.5">
                            {serazeneCipy.map(c => (
                              <div key={c.id} className="group relative bg-white rounded-xl p-2.5 border border-zinc-200 shadow-sm transition-all hover:border-zinc-300">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs font-black text-zinc-900">{c.cislo_cipu}</span>
                                      {c.datum_predani && <span className="text-[9px] font-bold text-zinc-400 tabular-nums">{new Date(c.datum_predani).toLocaleDateString('cs-CZ')}</span>}
                                    </div>
                                    <p className="text-[11px] font-bold text-zinc-700 truncate">
                                      {c.osoby ? formatJmeno(c.osoby) : c.externi_prijemce || <span className="text-zinc-300 font-normal italic">nepřiřazen</span>}
                                    </p>
                                    {c.poznamka && (
                                      <p className="text-[9px] text-zinc-400 leading-tight mt-1 line-clamp-1">{c.poznamka}</p>
                                    )}
                                  </div>
                                  <button onClick={() => handleDeleteCip(c.id)} className="text-zinc-300 hover:text-red-500 flex-shrink-0">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      })()}
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
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL}>Číslo čipu *</label>
                      <input value={acCislo} onChange={e => setAcCislo(e.target.value)} required placeholder="např. 042" className={INPUT} />
                    </div>
                    <div>
                      <label className={LABEL}>Datum předání</label>
                      <input type="date" value={acDatum} onChange={e => setAcDatum(e.target.value)} className={INPUT} />
                    </div>
                  </div>

                  <div>
                    <label className={LABEL}>Předáno komu</label>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {(['osoba', 'externi'] as const).map(t => (
                        <button key={t} type="button" onClick={() => setAcTypPrijemce(t)}
                          className={`py-2 rounded-lg text-xs font-semibold border transition-colors ${acTypPrijemce === t ? 'bg-zinc-950 text-white border-zinc-950' : 'border-zinc-200 text-zinc-600 hover:border-zinc-400'}`}>
                          {t === 'osoba' ? 'Osoba ze seznamu' : 'Externí osoba'}
                        </button>
                      ))}
                    </div>

                    {acTypPrijemce === 'osoba' ? (
                      <select value={acOsobaId} onChange={e => setAcOsobaId(e.target.value)} className={INPUT}>
                        <option value="">— vyberte osobu —</option>
                        {vsechnyOsoby.map(o => <option key={o.id} value={o.id}>{formatJmeno(o)}</option>)}
                      </select>
                    ) : (
                      <input value={acExterniJmeno} onChange={e => setAcExterniJmeno(e.target.value)} placeholder="Jméno externí osoby" className={INPUT} />
                    )}
                  </div>

                  <div>
                    <label className={LABEL}>Poznámka</label>
                    <input value={acPoznamka} onChange={e => setAcPoznamka(e.target.value)} placeholder="např. vráceno při opravě" className={INPUT} />
                  </div>

                  {chyba && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{chyba}</p>}
                  <div className="flex gap-2">
                    <button type="submit" disabled={ukladani || !acCislo}
                      className="flex-1 bg-zinc-950 text-white text-sm py-2.5 rounded-xl hover:bg-zinc-800 transition-colors font-medium disabled:opacity-40">
                      {ukladani ? 'Ukládám...' : 'Uložit čip'}
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
