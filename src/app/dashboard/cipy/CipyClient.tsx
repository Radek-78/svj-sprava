'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PageShell, { AddButton, PageEmpty, PageTable, PageTbody, PageTd, PageTh, PageThead, PageTr, SearchInput } from '@/components/PageShell'
import { NAVRHY_VCHODU, type NavrhVchodu } from './navrhyVchodu'

type Jednotka = { id: string; cislo_jednotky: string; vchod: string | null; ulice_vchodu: string | null }
type CipStav = 'aktivni' | 'rezerva' | 'dlouhodobe_nepouzit' | 'ztraceny'

type Cip = {
  id: string
  cislo_cipu: string
  stav: CipStav | null
  poznamka: string | null
  osoba_id: string | null
  externi_prijemce: string | null
  datum_predani: string | null
  jednotka_id: string | null
  jednotky?: Jednotka | null
}

type EvidenceCip = Cip & {
  jeEvidovany: boolean
  poradoveCislo: number | null
}

type CipRow = Omit<Cip, 'jednotky'> & {
  jednotky?: Jednotka | Jednotka[] | null
}

type ModalView = 'detail' | 'edit' | 'nova'
type StatFilter = 'vse' | 'pridelene' | 'rezerva' | 'dlouhodobe-nepouzite' | 'bez-zaznamu' | 'bez-zaznamu-s-vchodem' | 'nezname'
type SortDirection = 'asc' | 'desc'
type CipSortKey = 'cislo' | 'stav' | 'byt' | 'vchod' | 'navrh' | 'datum' | 'poznamka'

type FormState = {
  cislo_cipu: string
  stav: CipStav
  jednotka_id: string
  datum_predani: string
  poznamka: string
}

const EMPTY_FORM: FormState = {
  cislo_cipu: '',
  stav: 'aktivni',
  jednotka_id: '',
  datum_predani: '',
  poznamka: '',
}

const INVENTARNI_POCET_CIPU = 360
const INPUT = 'w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white'
const LABEL = 'block text-xs font-medium text-zinc-500 mb-1'

const STAV_LABELS: Record<CipStav, string> = {
  aktivni: 'Běžný',
  rezerva: 'Rezerva u správce',
  dlouhodobe_nepouzit: 'Dlouhodobě nepoužit',
  ztraceny: 'Ztracený / blokovaný',
}

function formatJednotka(j: Jednotka | null | undefined) {
  if (!j) return 'Sklad / nepřiděleno'
  return j.vchod ? `Byt ${j.cislo_jednotky}, vchod ${j.vchod}` : `Byt ${j.cislo_jednotky}`
}

function getCipNumber(cisloCipu: string) {
  const number = parseInt(cisloCipu.match(/\d+/)?.[0] ?? '', 10)
  return Number.isFinite(number) ? number : null
}

function formatCipNumber(number: number) {
  return String(number).padStart(3, '0')
}

function numericChipSort(a: Pick<Cip, 'cislo_cipu'>, b: Pick<Cip, 'cislo_cipu'>) {
  const an = getCipNumber(a.cislo_cipu) ?? Number.MAX_SAFE_INTEGER
  const bn = getCipNumber(b.cislo_cipu) ?? Number.MAX_SAFE_INTEGER
  return an - bn || a.cislo_cipu.localeCompare(b.cislo_cipu, 'cs')
}

function cipEvidencePriority(cip: Cip) {
  if (cip.jednotka_id) return 5
  if (cip.stav === 'aktivni') return 4
  if (cip.stav === 'rezerva') return 3
  if (cip.stav === 'dlouhodobe_nepouzit') return 2
  if (cip.stav === 'ztraceny') return 1
  return 0
}

function relationOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function normalizeCip(cip: CipRow): Cip {
  return {
    ...cip,
    jednotky: relationOne(cip.jednotky),
  }
}

function buildEvidenceCipy(cipy: Cip[]): EvidenceCip[] {
  const byNumber = new Map<number, Cip>()
  const extras: Cip[] = []

  for (const cip of [...cipy].sort(numericChipSort)) {
    const number = getCipNumber(cip.cislo_cipu)
    if (number && number >= 1 && number <= INVENTARNI_POCET_CIPU) {
      const existing = byNumber.get(number)
      if (!existing || cipEvidencePriority(cip) > cipEvidencePriority(existing)) {
        byNumber.set(number, cip)
      }
    } else {
      extras.push(cip)
    }
  }

  const inventory = Array.from({ length: INVENTARNI_POCET_CIPU }, (_, index) => {
    const number = index + 1
    const existing = byNumber.get(number)
    if (existing) return { ...existing, jeEvidovany: true, poradoveCislo: number }
    const cisloCipu = formatCipNumber(number)
    return {
      id: `inventar-${cisloCipu}`,
      cislo_cipu: cisloCipu,
      stav: null,
      poznamka: null,
      osoba_id: null,
      externi_prijemce: null,
      datum_predani: null,
      jednotka_id: null,
      jednotky: null,
      jeEvidovany: false,
      poradoveCislo: number,
    }
  })

  return [
    ...inventory,
    ...extras.map(cip => ({ ...cip, jeEvidovany: true, poradoveCislo: getCipNumber(cip.cislo_cipu) })),
  ]
}

function statusBadge(cip: EvidenceCip) {
  if (!cip.jeEvidovany) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 ring-1 ring-amber-200 text-xs font-semibold">
        Bez záznamu
      </span>
    )
  }

  const assigned = Boolean(cip.jednotka_id)
  if (assigned) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 text-xs font-semibold">
        Přidělený
      </span>
    )
  }

  if (cip.stav === 'rezerva') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 ring-1 ring-sky-200 text-xs font-semibold">
        Rezerva
      </span>
    )
  }

  if (cip.stav === 'dlouhodobe_nepouzit') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 ring-1 ring-zinc-300 text-xs font-semibold">
        Dlouhodobě nepoužit
      </span>
    )
  }

  if (cip.stav === 'ztraceny') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-red-50 text-red-700 ring-1 ring-red-200 text-xs font-semibold">
        Blokovaný
      </span>
    )
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200 text-xs font-semibold">
      Volný
    </span>
  )
}

function getNavrhVchodu(cip: Pick<Cip, 'cislo_cipu'>): NavrhVchodu | null {
  const number = getCipNumber(cip.cislo_cipu)
  return number ? NAVRHY_VCHODU[String(number)] ?? null : null
}

function navrhVchoduBadge(navrh: NavrhVchodu | null) {
  if (!navrh) return <span className="text-zinc-300">—</span>
  const title = navrh.jistota === 'jeden_vchod'
    ? `Čip otevíral pouze vchod ${navrh.vchod}: ${navrh.otevreni} z ${navrh.celkem} otevření.`
    : `Dominantní vchod ${navrh.vchod}: ${navrh.otevreni} z ${navrh.celkem} otevření (${navrh.podil} %).`
  return (
    <span title={title} className="inline-flex items-center gap-1.5">
      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-black ${
        navrh.jistota === 'jeden_vchod' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-sky-50 text-sky-700 ring-1 ring-sky-200'
      }`}>
        {navrh.vchod}
      </span>
      <span className="text-xs text-zinc-400 tabular-nums">{navrh.podil} %</span>
    </span>
  )
}

function jePrideleny(cip: Pick<Cip, 'jednotka_id'>) {
  return Boolean(cip.jednotka_id)
}

function jeNeznamy(cip: EvidenceCip) {
  return (
    !jePrideleny(cip) &&
    cip.stav !== 'rezerva' &&
    cip.stav !== 'dlouhodobe_nepouzit' &&
    cip.stav !== 'ztraceny' &&
    !getNavrhVchodu(cip)
  )
}

function matchesStatFilter(cip: EvidenceCip, filter: StatFilter) {
  switch (filter) {
    case 'pridelene':
      return jePrideleny(cip)
    case 'rezerva':
      return cip.jeEvidovany && !jePrideleny(cip) && cip.stav === 'rezerva'
    case 'dlouhodobe-nepouzite':
      return cip.jeEvidovany && !jePrideleny(cip) && cip.stav === 'dlouhodobe_nepouzit'
    case 'bez-zaznamu':
      return !cip.jeEvidovany
    case 'bez-zaznamu-s-vchodem':
      return !cip.jeEvidovany && Boolean(getNavrhVchodu(cip))
    case 'nezname':
      return jeNeznamy(cip)
    case 'vse':
    default:
      return true
  }
}

function compareText(a: string, b: string) {
  return a.localeCompare(b, 'cs', { numeric: true, sensitivity: 'base' })
}

export default function CipyClient({
  cipy: initialCipy,
  jednotky,
}: {
  cipy: CipRow[]
  jednotky: Jednotka[]
}) {
  const [ulozeneCipy, setUlozeneCipy] = useState(initialCipy.map(normalizeCip).sort(numericChipSort))
  const [hledani, setHledani] = useState('')
  const [vybranyId, setVybranyId] = useState<string | null>(null)
  const [view, setView] = useState<ModalView>('detail')
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [ukladani, setUkladani] = useState(false)
  const [mazani, setMazani] = useState(false)
  const [potvrzeni, setPotvrzeni] = useState(false)
  const [chyba, setChyba] = useState('')
  const [vybraneIds, setVybraneIds] = useState<Set<string>>(() => new Set())
  const [hromadneUkladani, setHromadneUkladani] = useState(false)
  const [hromadnaChyba, setHromadnaChyba] = useState('')
  const [statFilter, setStatFilter] = useState<StatFilter>('vse')
  const [sortKey, setSortKey] = useState<CipSortKey>('cislo')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const router = useRouter()
  const supabase = createClient()

  const evidenceCipy = useMemo(() => buildEvidenceCipy(ulozeneCipy), [ulozeneCipy])
  const vybrany = evidenceCipy.find(c => c.id === vybranyId) ?? null

  const filtrovane = useMemo(() => {
    const podleStatistiky = evidenceCipy.filter(c => matchesStatFilter(c, statFilter))
    const q = hledani.trim().toLowerCase()
    const podleHledani = !q ? podleStatistiky : podleStatistiky.filter(c => {
      const jednotka = formatJednotka(c.jednotky).toLowerCase()
      return (
        c.cislo_cipu.toLowerCase().includes(q) ||
        (getNavrhVchodu(c)?.vchod.toLowerCase() ?? '').includes(q) ||
        jednotka.includes(q) ||
        (c.stav ? STAV_LABELS[c.stav].toLowerCase().includes(q) : false) ||
        (c.jeEvidovany ? 'evidovaný' : 'volný sklad nepřiděleno').includes(q) ||
        (c.poznamka ?? '').toLowerCase().includes(q)
      )
    })
    const sorted = [...podleHledani].sort((a, b) => {
      let result = 0
      if (sortKey === 'cislo') result = (getCipNumber(a.cislo_cipu) ?? 0) - (getCipNumber(b.cislo_cipu) ?? 0)
      if (sortKey === 'stav') result = compareText(a.stav ? STAV_LABELS[a.stav] : 'Bez záznamu', b.stav ? STAV_LABELS[b.stav] : 'Bez záznamu')
      if (sortKey === 'byt') result = compareText(a.jednotky?.cislo_jednotky ?? '', b.jednotky?.cislo_jednotky ?? '')
      if (sortKey === 'vchod') result = compareText(a.jednotky?.vchod ?? '', b.jednotky?.vchod ?? '')
      if (sortKey === 'navrh') result = compareText(getNavrhVchodu(a)?.vchod ?? '', getNavrhVchodu(b)?.vchod ?? '')
      if (sortKey === 'datum') result = compareText(a.datum_predani ?? '', b.datum_predani ?? '')
      if (sortKey === 'poznamka') result = compareText(a.poznamka ?? '', b.poznamka ?? '')
      return sortDirection === 'asc' ? result : -result
    })
    return sorted
  }, [evidenceCipy, hledani, statFilter, sortDirection, sortKey])

  const celkem = evidenceCipy.length
  const pridelene = evidenceCipy.filter(jePrideleny).length
  const rezervy = evidenceCipy.filter(c => c.jeEvidovany && !jePrideleny(c) && c.stav === 'rezerva').length
  const dlouhodobeNepouzite = evidenceCipy.filter(c => c.jeEvidovany && !jePrideleny(c) && c.stav === 'dlouhodobe_nepouzit').length
  const bezZaznamu = evidenceCipy.filter(c => !c.jeEvidovany)
  const bezZaznamuSVchodem = bezZaznamu.filter(c => getNavrhVchodu(c)).length
  const neznameCipy = evidenceCipy.filter(jeNeznamy).length

  const navIndex = filtrovane.findIndex(c => c.id === vybranyId)
  const canPrev = navIndex > 0
  const canNext = navIndex >= 0 && navIndex < filtrovane.length - 1
  const vybraneCipy = useMemo(() => evidenceCipy.filter(c => vybraneIds.has(c.id)), [evidenceCipy, vybraneIds])
  const allFilteredSelected = filtrovane.length > 0 && filtrovane.every(c => vybraneIds.has(c.id))

  const refreshCipy = useCallback(async () => {
    const { data } = await supabase
      .from('jednotky_cipy')
      .select(`
        id, cislo_cipu, stav, poznamka, osoba_id, externi_prijemce, datum_predani, jednotka_id,
        jednotky(id, cislo_jednotky, vchod, ulice_vchodu)
      `)
      .order('cislo_cipu')
    const refreshed = data ? (data as unknown as CipRow[]).map(normalizeCip).sort(numericChipSort) : []
    if (data) setUlozeneCipy(refreshed)
    return refreshed
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

  function toggleVybrany(id: string) {
    setVybraneIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setHromadnaChyba('')
  }

  function toggleStatFilter(filter: StatFilter) {
    setStatFilter(prev => prev === filter ? 'vse' : filter)
    setVybraneIds(new Set())
    setHromadnaChyba('')
  }

  function toggleSort(key: CipSortKey) {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
      return
    }
    setSortKey(key)
    setSortDirection('asc')
  }

  function sortFor(key: CipSortKey) {
    return sortKey === key ? sortDirection : null
  }

  function toggleVybraneFiltrovane() {
    setVybraneIds(prev => {
      const next = new Set(prev)
      if (allFilteredSelected) {
        filtrovane.forEach(c => next.delete(c.id))
      } else {
        filtrovane.forEach(c => next.add(c.id))
      }
      return next
    })
    setHromadnaChyba('')
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
      stav: vybrany.stav ?? 'aktivni',
      jednotka_id: vybrany.jednotka_id ?? '',
      datum_predani: vybrany.datum_predani ?? '',
      poznamka: vybrany.poznamka ?? '',
    })
    setChyba('')
    setView('edit')
  }

  function payloadFromForm() {
    return {
      cislo_cipu: form.cislo_cipu.trim(),
      stav: form.stav,
      jednotka_id: form.jednotka_id || null,
      osoba_id: null,
      externi_prijemce: null,
      datum_predani: form.datum_predani || null,
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
    const shouldInsert = view === 'nova' || !vybrany?.jeEvidovany
    const result = shouldInsert
      ? await supabase.from('jednotky_cipy').insert(payload, { count: 'exact' })
      : await supabase.from('jednotky_cipy').update(payload, { count: 'exact' }).eq('id', vybranyId)

    if (result.error) {
      setChyba(result.error.message)
      setUkladani(false)
      return
    }

    if (!shouldInsert && result.count === 0 && vybrany) {
      const fallback = await supabase
        .from('jednotky_cipy')
        .update(payload, { count: 'exact' })
        .eq('cislo_cipu', vybrany.cislo_cipu)
      if (fallback.error) {
        setChyba(fallback.error.message)
        setUkladani(false)
        return
      }
      if (fallback.count === 0) {
        setChyba('Změna se neuložila, databáze nenašla odpovídající čip k úpravě.')
        setUkladani(false)
        return
      }
    }

    const refreshed = await refreshCipy()
    router.refresh()
    const savedNumber = getCipNumber(payload.cislo_cipu)
    const savedCip = refreshed.find(c => savedNumber ? getCipNumber(c.cislo_cipu) === savedNumber : c.cislo_cipu === payload.cislo_cipu)
    setVybranyId(savedCip?.id ?? vybranyId)
    setView('detail')
    setUkladani(false)
  }

  async function handleHromadnyStav(stav: CipStav) {
    if (vybraneCipy.length === 0) return
    setHromadneUkladani(true)
    setHromadnaChyba('')

    const existujici = vybraneCipy.filter(c => c.jeEvidovany)
    const bezZaznamu = vybraneCipy.filter(c => !c.jeEvidovany)

    if (existujici.length > 0) {
      const ids = existujici.map(c => c.id)
      const update = await supabase
        .from('jednotky_cipy')
        .update({ stav }, { count: 'exact' })
        .in('id', ids)
      if (update.error) {
        setHromadnaChyba(update.error.message)
        setHromadneUkladani(false)
        return
      }
      if ((update.count ?? 0) < existujici.length) {
        const cisla = existujici.map(c => c.cislo_cipu)
        const fallback = await supabase
          .from('jednotky_cipy')
          .update({ stav }, { count: 'exact' })
          .in('cislo_cipu', cisla)
        if (fallback.error) {
          setHromadnaChyba(fallback.error.message)
          setHromadneUkladani(false)
          return
        }
      }
    }

    if (bezZaznamu.length > 0) {
      const insert = await supabase
        .from('jednotky_cipy')
        .insert(bezZaznamu.map(c => ({
          cislo_cipu: c.cislo_cipu,
          stav,
          jednotka_id: null,
          osoba_id: null,
          externi_prijemce: null,
          datum_predani: null,
          poznamka: null,
        })))
      if (insert.error) {
        setHromadnaChyba(insert.error.message)
        setHromadneUkladani(false)
        return
      }
    }

    await refreshCipy()
    router.refresh()
    setVybraneIds(new Set())
    setHromadneUkladani(false)
  }

  async function handleDelete() {
    if (!vybranyId || !vybrany?.jeEvidovany) return
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
          { label: 'čipů celkem', value: celkem, active: statFilter === 'vse', onClick: () => toggleStatFilter('vse') },
          { label: 'přiděleno', value: pridelene, dot: 'emerald', color: 'emerald', active: statFilter === 'pridelene', onClick: () => toggleStatFilter('pridelene') },
          { label: 'v rezervě', value: rezervy, dot: 'sky', color: 'sky', active: statFilter === 'rezerva', onClick: () => toggleStatFilter('rezerva') },
          { label: 'dlouhodobě nepoužitých', value: dlouhodobeNepouzite, dot: 'zinc', color: 'zinc', active: statFilter === 'dlouhodobe-nepouzite', onClick: () => toggleStatFilter('dlouhodobe-nepouzite') },
          { label: 'bez záznamu', value: bezZaznamu.length, dot: 'amber', color: 'amber', active: statFilter === 'bez-zaznamu', onClick: () => toggleStatFilter('bez-zaznamu') },
          { label: 'z nich s návrhem vchodu', value: bezZaznamuSVchodem, dot: 'emerald', color: 'emerald', active: statFilter === 'bez-zaznamu-s-vchodem', onClick: () => toggleStatFilter('bez-zaznamu-s-vchodem') },
          { label: 'neznámých', value: neznameCipy, dot: 'zinc', color: 'zinc', active: statFilter === 'nezname', onClick: () => toggleStatFilter('nezname') },
        ]}
        actions={
          <>
            <SearchInput value={hledani} onChange={setHledani} placeholder="Hledat čip…" />
            <AddButton onClick={openNova}>Přidat čip</AddButton>
          </>
        }
      >
        {(vybraneIds.size > 0 || hromadnaChyba) && (
          <div className="sticky top-0 z-30 px-6 py-3 border-b border-violet-100 bg-violet-50/95 backdrop-blur flex items-center justify-between gap-4 shadow-sm">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-900">{vybraneIds.size} vybráno</p>
              {hromadnaChyba && <p className="text-xs text-red-600 mt-0.5">{hromadnaChyba}</p>}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {(['aktivni', 'rezerva', 'dlouhodobe_nepouzit', 'ztraceny'] as const).map(stav => (
                <button
                  key={stav}
                  type="button"
                  disabled={hromadneUkladani}
                  onClick={() => handleHromadnyStav(stav)}
                  className="px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 hover:border-zinc-400 hover:bg-zinc-100 transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {STAV_LABELS[stav]}
                </button>
              ))}
              <button
                type="button"
                disabled={hromadneUkladani}
                onClick={() => { setVybraneIds(new Set()); setHromadnaChyba('') }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-500 hover:bg-white transition-colors disabled:opacity-50"
              >
                Zrušit výběr
              </button>
            </div>
          </div>
        )}
        <PageTable>
          <PageThead>
            <PageTh center>
              <input
                type="checkbox"
                checked={allFilteredSelected}
                onChange={toggleVybraneFiltrovane}
                className="w-4 h-4 rounded accent-violet-600"
                title={allFilteredSelected ? 'Zrušit výběr zobrazených čipů' : 'Vybrat zobrazené čipy'}
              />
            </PageTh>
            <PageTh sortDirection={sortFor('cislo')} onSort={() => toggleSort('cislo')}>Čip</PageTh>
            <PageTh sortDirection={sortFor('stav')} onSort={() => toggleSort('stav')}>Stav</PageTh>
            <PageTh sortDirection={sortFor('byt')} onSort={() => toggleSort('byt')}>Byt</PageTh>
            <PageTh sortDirection={sortFor('vchod')} onSort={() => toggleSort('vchod')}>Vchod</PageTh>
            <PageTh sortDirection={sortFor('navrh')} onSort={() => toggleSort('navrh')}>Návrh vchodu</PageTh>
            <PageTh sortDirection={sortFor('datum')} onSort={() => toggleSort('datum')}>Datum přiřazení</PageTh>
            <PageTh sortDirection={sortFor('poznamka')} onSort={() => toggleSort('poznamka')}>Poznámka</PageTh>
          </PageThead>
          <PageTbody>
            {filtrovane.length === 0 && (
              <PageEmpty text={hledani || statFilter !== 'vse' ? 'Žádný čip neodpovídá filtru.' : 'Zatím žádné čipy.'} />
            )}
            {filtrovane.map(cip => (
              <PageTr key={cip.id} onClick={() => openDetail(cip.id)}>
                <PageTd center>
                  <input
                    type="checkbox"
                    checked={vybraneIds.has(cip.id)}
                    onChange={() => toggleVybrany(cip.id)}
                    onClick={e => e.stopPropagation()}
                    className="w-4 h-4 rounded accent-violet-600"
                    title="Vybrat čip pro hromadnou změnu"
                  />
                </PageTd>
                <PageTd>
                  <span className="font-black text-zinc-950 tabular-nums group-hover:text-violet-700 transition-colors">
                    {cip.cislo_cipu}
                  </span>
                </PageTd>
                <PageTd>{statusBadge(cip)}</PageTd>
                <PageTd>
                  {cip.jednotky ? (
                    <span className="font-medium text-zinc-800">{cip.jednotky.cislo_jednotky}</span>
                  ) : (
                    <span className="text-zinc-300">—</span>
                  )}
                </PageTd>
                <PageTd>
                  {cip.jednotky?.vchod ?? <span className="text-zinc-300">—</span>}
                </PageTd>
                <PageTd>{navrhVchoduBadge(getNavrhVchodu(cip))}</PageTd>
                <PageTd>{cip.datum_predani ?? <span className="text-zinc-300">—</span>}</PageTd>
                <PageTd className="max-w-xs truncate">
                  {cip.poznamka ?? (!cip.jeEvidovany ? <span className="text-zinc-300">bez záznamu</span> : <span className="text-zinc-300">—</span>)}
                </PageTd>
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
                    <DetailBox label="Bytová jednotka">{vybrany.jednotky?.cislo_jednotky ?? 'Sklad / nepřiděleno'}</DetailBox>
                    <DetailBox label="Vchod">{vybrany.jednotky?.vchod ?? '—'}</DetailBox>
                    <DetailBox label="Návrh vchodu">{navrhVchoduBadge(getNavrhVchodu(vybrany))}</DetailBox>
                    <DetailBox label="Typ stavu">{vybrany.stav ? STAV_LABELS[vybrany.stav] : '—'}</DetailBox>
                    <DetailBox label="Evidence">{vybrany.jeEvidovany ? 'Uloženo v evidenci' : 'Zatím bez záznamu'}</DetailBox>
                    <DetailBox label="Datum přiřazení">{vybrany.datum_predani ?? '—'}</DetailBox>
                  </div>

                  <div className="mt-5">
                    <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-2">Poznámka</p>
                    <div className="min-h-16 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                      {vybrany.poznamka ?? <span className="text-zinc-300">{vybrany.jeEvidovany ? '—' : 'Čip je v základním inventáři 001-360, ale zatím nemá uložené přiřazení ani poznámku.'}</span>}
                    </div>
                  </div>

                  {chyba && <p className="mt-4 text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{chyba}</p>}

                  <div className="mt-6 flex gap-2">
                    <button onClick={openEdit}
                      className="flex-1 border border-zinc-200 text-zinc-700 text-sm py-2.5 rounded-xl hover:bg-zinc-50 transition-colors font-medium">
                      {vybrany.jeEvidovany ? 'Upravit čip' : 'Zaevidovat čip'}
                    </button>
                    {vybrany.jeEvidovany && (potvrzeni ? (
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
                    ))}
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
                      <label className={LABEL}>Datum přiřazení</label>
                      <input type="date" value={form.datum_predani} onChange={e => setForm(p => ({ ...p, datum_predani: e.target.value }))} className={INPUT} />
                    </div>
                  </div>

                  <div>
                    <label className={LABEL}>Stav čipu</label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {(['aktivni', 'rezerva', 'dlouhodobe_nepouzit', 'ztraceny'] as const).map(stav => (
                        <button key={stav} type="button" onClick={() => setForm(p => ({ ...p, stav }))}
                          className={`py-2 rounded-lg text-xs font-semibold border transition-colors ${form.stav === stav ? 'bg-zinc-950 text-white border-zinc-950' : 'border-zinc-200 text-zinc-600 hover:border-zinc-400'}`}>
                          {STAV_LABELS[stav]}
                        </button>
                      ))}
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
