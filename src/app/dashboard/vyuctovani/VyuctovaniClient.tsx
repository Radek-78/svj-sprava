'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import PageShell, { PageEmpty, PageTable, PageTbody, PageTd, PageTh, PageThead, PageTr, SearchInput } from '@/components/PageShell'

type Person = { id: string; jmeno: string | null; prijmeni: string; email: string | null }
type Unit = { id: string; cislo_jednotky: string; vchod: string | null; ulice_vchodu: string | null }
type MeterReading = {
  id: string
  cislo_merice: string
  typ: string
  datum_od: string | null
  datum_do: string | null
  pocatecni_stav: number | null
  koncovy_stav: number | null
  spotreba: number | null
}

type Settlement = {
  id: string
  osoba_id: string
  jednotka_id: string
  rok: number
  obdobi_od: string
  obdobi_do: string
  cislo_dokladu: string | null
  variabilni_symbol: string | null
  uzivatel_text: string | null
  typ_vysledku: 'preplatek' | 'nedoplatek' | 'nula'
  castka: number | null
  zaplacena_zaloha: number | null
  predepsana_zaloha: number | null
  naklad_celkem: number | null
  celkovy_predpis: number | null
  nevyuctovatelne_predpis: number | null
  prispevek_sprava_domu: number | null
  zdroj_soubor: string | null
  osoby: Person | null
  jednotky: Unit | null
  odecty_vodomeru: MeterReading[]
}

const moneyFormatter = new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 })
const numberFormatter = new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 2 })

function formatPerson(person: Person | null) {
  if (!person) return 'Neznámá osoba'
  return [person.prijmeni, person.jmeno].filter(Boolean).join(' ')
}

function formatMoney(value: number | null | undefined) {
  return typeof value === 'number' ? moneyFormatter.format(value) : '—'
}

function formatNumber(value: number | null | undefined, unit = '') {
  return typeof value === 'number' ? `${numberFormatter.format(value)}${unit}` : '—'
}

function signedAmount(row: Settlement) {
  const value = row.castka ?? 0
  if (row.typ_vysledku === 'nedoplatek') return -Math.abs(value)
  if (row.typ_vysledku === 'preplatek') return Math.abs(value)
  return 0
}

function resultLabel(row: Settlement) {
  if (row.typ_vysledku === 'nedoplatek') return `Nedoplatek ${formatMoney(row.castka)}`
  if (row.typ_vysledku === 'preplatek') return `Přeplatek ${formatMoney(row.castka)}`
  return 'Vyrovnáno'
}

function compareMessage(row: Settlement, allRows: Settlement[]) {
  const previous = allRows
    .filter(item => item.osoba_id === row.osoba_id && item.jednotka_id === row.jednotka_id && item.obdobi_od < row.obdobi_od)
    .at(-1)
  if (!previous) return 'První záznam'

  const diff = signedAmount(row) - signedAmount(previous)
  if (Math.abs(diff) < 1) return 'Bez změny výsledku'
  return `${diff > 0 ? '+' : ''}${formatMoney(diff)} proti předchozímu`
}

function waterWarning(reading: MeterReading, row: Settlement, allRows: Settlement[]) {
  if (typeof reading.spotreba !== 'number') return null
  const previous = allRows
    .flatMap(item => item.odecty_vodomeru.map(meter => ({ meter, row: item })))
    .filter(item =>
      item.row.jednotka_id === row.jednotka_id &&
      item.meter.cislo_merice === reading.cislo_merice &&
      typeof item.meter.spotreba === 'number' &&
      item.row.obdobi_od < row.obdobi_od
    )
  if (previous.length === 0) return null

  const average = previous.reduce((sum, item) => sum + (item.meter.spotreba ?? 0), 0) / previous.length
  if (average <= 0) return null
  const ratio = reading.spotreba / average
  if (ratio >= 1.5) return `Spotřeba je ${Math.round((ratio - 1) * 100)} % nad dosavadním průměrem.`
  if (ratio <= 0.5) return `Spotřeba je ${Math.round((1 - ratio) * 100)} % pod dosavadním průměrem.`
  return null
}

function settlementWarning(row: Settlement, allRows: Settlement[]) {
  const previousRows = allRows.filter(item => item.osoba_id === row.osoba_id && item.jednotka_id === row.jednotka_id && item.obdobi_od < row.obdobi_od)
  if (previousRows.length === 0) return null
  const averageCost = previousRows.reduce((sum, item) => sum + (item.naklad_celkem ?? 0), 0) / previousRows.length
  if (!row.naklad_celkem || averageCost <= 0) return null
  const ratio = row.naklad_celkem / averageCost
  if (ratio >= 1.35) return `Náklad je ${Math.round((ratio - 1) * 100)} % nad průměrem minulých vyúčtování.`
  if (ratio <= 0.65) return `Náklad je ${Math.round((1 - ratio) * 100)} % pod průměrem minulých vyúčtování.`
  return null
}

export default function VyuctovaniClient({ initialVyuctovani, initialError, openId }: { initialVyuctovani: Settlement[]; initialError: string | null; openId?: string }) {
  const router = useRouter()
  const [vyuctovani] = useState(initialVyuctovani)
  const [hledani, setHledani] = useState('')
  const [vybranaId, setVybranaId] = useState<string | null>(() => (
    openId && initialVyuctovani.some(v => v.id === openId) ? openId : null
  ))
  const [message] = useState(initialError ? `Tabulka vyúčtování zatím není dostupná: ${initialError}` : '')

  const sortedRows = useMemo(
    () => [...vyuctovani].sort((a, b) => a.obdobi_od.localeCompare(b.obdobi_od) || a.rok - b.rok),
    [vyuctovani]
  )
  const readings = sortedRows.flatMap(row => row.odecty_vodomeru)
  const filtrovaneRows = useMemo(() => {
    const query = hledani.trim().toLowerCase()
    if (!query) return sortedRows
    return sortedRows.filter(row => [
      row.rok,
      row.cislo_dokladu,
      row.variabilni_symbol,
      formatPerson(row.osoby),
      row.uzivatel_text,
      row.jednotky?.cislo_jednotky,
      row.odecty_vodomeru.map(o => o.cislo_merice).join(' '),
    ].filter(Boolean).join(' ').toLowerCase().includes(query))
  }, [hledani, sortedRows])
  const vybrana = sortedRows.find(row => row.id === vybranaId) ?? null
  const warningCount = sortedRows.reduce((count, row) => {
    const settlement = settlementWarning(row, sortedRows) ? 1 : 0
    const water = row.odecty_vodomeru.some(reading => waterWarning(reading, row, sortedRows)) ? 1 : 0
    return count + settlement + water
  }, 0)

  return (
    <PageShell
      title="Vyúčtování"
      stats={[
        { label: 'záznamů', value: sortedRows.length },
        { label: 'odečtů', value: readings.length, dot: 'sky', color: 'sky' },
        { label: 'upozornění', value: warningCount, dot: warningCount ? 'amber' : 'emerald', color: warningCount ? 'amber' : 'emerald' },
      ]}
      actions={
        <>
          <SearchInput value={hledani} onChange={setHledani} placeholder="Hledat vyúčtování…" />
          <div className="relative group">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 shadow-sm hover:text-zinc-950 hover:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              aria-label="Návod k importu"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M12 8.25h.008v.008H12V8.25z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <div className="pointer-events-none absolute right-0 top-11 z-30 hidden w-80 rounded-lg border border-zinc-200 bg-white p-4 text-xs text-zinc-600 shadow-xl group-hover:block">
              <p className="font-black text-zinc-950">Import PDF</p>
              <p className="mt-2 text-zinc-500">Náhled bez zápisu:</p>
              <code className="mt-1 block rounded-md bg-zinc-950 px-2 py-1.5 text-white">npm run import:vyuctovani</code>
              <p className="mt-3 text-zinc-500">Uložení do DB:</p>
              <code className="mt-1 block rounded-md bg-zinc-950 px-2 py-1.5 text-white">npm run import:vyuctovani -- --save</code>
            </div>
          </div>
        </>
      }
    >
      <div className="p-6 space-y-6">
        {message && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
            {message}
          </div>
        )}

        <section className="rounded-lg border border-zinc-200 overflow-hidden">
          <PageTable>
            <PageThead>
              <PageTh>Období</PageTh>
              <PageTh>Osoba</PageTh>
              <PageTh>Jednotka</PageTh>
              <PageTh>Výsledek</PageTh>
              <PageTh>Zálohy</PageTh>
              <PageTh>Voda</PageTh>
              <PageTh>Porovnání</PageTh>
            </PageThead>
            <PageTbody>
              {filtrovaneRows.length === 0 ? (
                <PageEmpty text={hledani ? 'Žádné vyúčtování neodpovídá hledání.' : 'Zatím není uloženo žádné vyúčtování.'} />
              ) : filtrovaneRows.map(row => {
                const settlementAlert = settlementWarning(row, sortedRows)
                const waterAlerts = row.odecty_vodomeru.map(reading => waterWarning(reading, row, sortedRows)).filter(Boolean)
                return (
                  <PageTr key={row.id} onClick={() => setVybranaId(row.id)}>
                    <PageTd>
                      <div className="font-bold text-zinc-950">{row.rok}</div>
                      <div className="text-xs text-zinc-400">{row.obdobi_od} až {row.obdobi_do}</div>
                    </PageTd>
                    <PageTd>
                      <div className="font-semibold text-zinc-800">{formatPerson(row.osoby)}</div>
                      <div className="text-xs text-zinc-400">{row.uzivatel_text}</div>
                    </PageTd>
                    <PageTd>
                      <span className="font-bold text-zinc-900">{row.jednotky?.cislo_jednotky ?? '—'}</span>
                    </PageTd>
                    <PageTd>
                      <span className={row.typ_vysledku === 'nedoplatek' ? 'font-bold text-red-700' : 'font-bold text-emerald-700'}>{resultLabel(row)}</span>
                      <div className="text-xs text-zinc-400">{compareMessage(row, sortedRows)}</div>
                    </PageTd>
                    <PageTd>
                      <div className="text-zinc-800">{formatMoney(row.predepsana_zaloha)}</div>
                      <div className="text-xs text-zinc-400">měsíčně cca {formatMoney(row.predepsana_zaloha ? row.predepsana_zaloha / 12 : null)}</div>
                    </PageTd>
                    <PageTd>
                      {row.odecty_vodomeru.length === 0 ? '—' : row.odecty_vodomeru.map(reading => (
                        <div key={reading.id} className="text-xs leading-5">
                          <span className="font-bold text-zinc-800">{formatNumber(reading.spotreba, ' m3')}</span>
                          <span className="text-zinc-400"> · {reading.cislo_merice}</span>
                        </div>
                      ))}
                    </PageTd>
                    <PageTd>
                      {settlementAlert || waterAlerts.length > 0 ? (
                        <div className="space-y-1">
                          {[settlementAlert, ...waterAlerts].filter(Boolean).map((alert, index) => (
                            <div key={index} className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">{alert}</div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-emerald-700 font-semibold">Bez výrazné odchylky</span>
                      )}
                    </PageTd>
                  </PageTr>
                )
              })}
            </PageTbody>
          </PageTable>
        </section>
      </div>

      {vybrana && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.3)' }}
          onMouseDown={e => { if (e.target === e.currentTarget) { setVybranaId(null); router.replace('/dashboard/vyuctovani') } }}
        >
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl" onMouseDown={e => e.stopPropagation()}>
            <div className="flex items-start justify-between bg-zinc-950 px-6 py-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-zinc-500">Vyúčtování</p>
                <h2 className="mt-0.5 text-2xl font-bold text-white">{vybrana.rok} · {formatPerson(vybrana.osoby)}</h2>
                <p className="mt-1 text-xs text-zinc-400">Jednotka {vybrana.jednotky?.cislo_jednotky ?? '—'} · {vybrana.obdobi_od} až {vybrana.obdobi_do}</p>
              </div>
              <button
                onClick={() => { setVybranaId(null); router.replace('/dashboard/vyuctovani') }}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-zinc-400 hover:bg-white/20 hover:text-white"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="grid gap-4 p-6 md:grid-cols-3">
              <div className="rounded-lg border border-zinc-200 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Výsledek</p>
                <p className={`mt-1 text-lg font-black ${vybrana.typ_vysledku === 'nedoplatek' ? 'text-red-700' : 'text-emerald-700'}`}>{resultLabel(vybrana)}</p>
                <p className="mt-1 text-xs text-zinc-400">{compareMessage(vybrana, sortedRows)}</p>
              </div>
              <div className="rounded-lg border border-zinc-200 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Zálohy a náklad</p>
                <p className="mt-1 text-sm text-zinc-800">Zálohy: <b>{formatMoney(vybrana.predepsana_zaloha)}</b></p>
                <p className="mt-1 text-sm text-zinc-800">Náklad: <b>{formatMoney(vybrana.naklad_celkem)}</b></p>
              </div>
              <div className="rounded-lg border border-zinc-200 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Doklad</p>
                <p className="mt-1 text-sm text-zinc-800">Číslo: <b>{vybrana.cislo_dokladu ?? '—'}</b></p>
                <p className="mt-1 text-sm text-zinc-800">VS: <b>{vybrana.variabilni_symbol ?? '—'}</b></p>
              </div>
              <div className="md:col-span-3 rounded-lg border border-zinc-200 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Vodoměry</p>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {vybrana.odecty_vodomeru.length === 0 ? <p className="text-sm text-zinc-400">Žádný odečet.</p> : vybrana.odecty_vodomeru.map(o => (
                    <div key={o.id} className="rounded-lg bg-sky-50 px-3 py-2 text-sm ring-1 ring-sky-100">
                      <p className="font-bold text-sky-800">{o.typ} {o.cislo_merice}</p>
                      <p className="text-xs text-sky-700">{formatNumber(o.pocatecni_stav)} → {formatNumber(o.koncovy_stav)} · spotřeba {formatNumber(o.spotreba, ' m3')}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  )
}
