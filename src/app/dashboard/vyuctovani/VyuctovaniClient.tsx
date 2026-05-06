'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import PageShell, { AddButton, PageEmpty, PageTable, PageTbody, PageTd, PageTh, PageThead, PageTr } from '@/components/PageShell'
import type { ParsedVyuctovani } from '@/lib/vyuctovani/parser'

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

type PreviewCandidate = {
  id: string
  jmeno?: string | null
  prijmeni?: string
  email?: string | null
  cislo_jednotky?: string
  vchod?: string | null
  ulice_vchodu?: string | null
  score?: number
}

type PreviewItem = {
  clientId: string
  parsed: Omit<ParsedVyuctovani, 'rawText'>
  osobaCandidates: PreviewCandidate[]
  jednotkaCandidates: PreviewCandidate[]
  selectedOsobaId: string | null
  selectedJednotkaId: string | null
}

const moneyFormatter = new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 })
const numberFormatter = new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 2 })

function formatPerson(person: Person | PreviewCandidate | null) {
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

export default function VyuctovaniClient({ initialVyuctovani, initialError }: { initialVyuctovani: Settlement[]; initialError: string | null }) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [vyuctovani] = useState(initialVyuctovani)
  const [preview, setPreview] = useState<PreviewItem[]>([])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(initialError ? `Tabulka vyúčtování zatím není dostupná: ${initialError}` : '')

  const sortedRows = useMemo(
    () => [...vyuctovani].sort((a, b) => a.obdobi_od.localeCompare(b.obdobi_od) || a.rok - b.rok),
    [vyuctovani]
  )
  const readings = sortedRows.flatMap(row => row.odecty_vodomeru)
  const warningCount = sortedRows.reduce((count, row) => {
    const settlement = settlementWarning(row, sortedRows) ? 1 : 0
    const water = row.odecty_vodomeru.some(reading => waterWarning(reading, row, sortedRows)) ? 1 : 0
    return count + settlement + water
  }, 0)

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    setMessage('')
    const formData = new FormData()
    Array.from(files).forEach(file => formData.append('files', file))
    const response = await fetch('/api/import/vyuctovani/preview', { method: 'POST', body: formData })
    const data = await response.json()
    setUploading(false)
    if (!response.ok) {
      setMessage(data.error ?? 'Import se nepodařilo načíst.')
      return
    }
    setPreview(data.results ?? [])
  }

  function updateSelection(clientId: string, key: 'selectedOsobaId' | 'selectedJednotkaId', value: string) {
    setPreview(items => items.map(item => item.clientId === clientId ? { ...item, [key]: value || null } : item))
  }

  async function saveImport() {
    const incomplete = preview.find(item => !item.selectedOsobaId || !item.selectedJednotkaId)
    if (incomplete) {
      setMessage('Před uložením je potřeba u všech souborů vybrat osobu i jednotku.')
      return
    }
    setSaving(true)
    setMessage('')
    const response = await fetch('/api/import/vyuctovani/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: preview.map(item => ({
          parsed: item.parsed,
          osobaId: item.selectedOsobaId,
          jednotkaId: item.selectedJednotkaId,
        })),
      }),
    })
    const data = await response.json()
    setSaving(false)
    if (!response.ok) {
      setMessage(data.error ?? 'Uložení se nepodařilo.')
      return
    }
    setPreview([])
    setMessage(`Uloženo ${data.saved?.length ?? 0} vyúčtování.`)
    router.refresh()
  }

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
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            multiple
            className="sr-only"
            onChange={event => handleFiles(event.target.files)}
          />
          <AddButton onClick={() => fileInputRef.current?.click()}>Import PDF</AddButton>
        </>
      }
    >
      <div className="p-6 space-y-6">
        {message && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
            {message}
          </div>
        )}

        <section className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-black text-zinc-950">Import vyúčtování</h2>
                <p className="mt-1 text-xs leading-5 text-zinc-500">PDF se použije pouze pro načtení dat. Do databáze se ukládá osoba, jednotka, období, zálohy, výsledek a odečty.</p>
              </div>
              {uploading && <span className="rounded-full bg-sky-100 px-2 py-1 text-xs font-bold text-sky-800">Načítám</span>}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white">
            <div className="border-b border-zinc-100 px-4 py-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-black text-zinc-950">Náhled před uložením</h2>
              {preview.length > 0 && (
                <button
                  type="button"
                  onClick={saveImport}
                  disabled={saving}
                  className="rounded-lg bg-zinc-950 px-3 py-2 text-xs font-bold text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  {saving ? 'Ukládám…' : 'Uložit potvrzené'}
                </button>
              )}
            </div>
            {preview.length === 0 ? (
              <div className="px-4 py-8 text-sm text-zinc-400">Po výběru PDF se tady zobrazí kontrolní náhled.</div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {preview.map(item => (
                  <div key={item.clientId} className="p-4">
                    <div className="grid grid-cols-1 xl:grid-cols-[1fr_220px_220px] gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.08em] text-zinc-400">{item.parsed.fileName}</p>
                        <p className="mt-1 text-sm font-black text-zinc-950">
                          {item.parsed.rok ?? 'Rok ?'} · {item.parsed.typVysledku === 'nedoplatek' ? 'Nedoplatek' : 'Přeplatek'} {formatMoney(item.parsed.castka)}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          Zálohy {formatMoney(item.parsed.predepsanaZaloha)} · náklad {formatMoney(item.parsed.nakladCelkem)} · vodoměr {item.parsed.vodomery[0]?.cisloMerice ?? 'nenalezen'}
                        </p>
                        {item.parsed.warnings.length > 0 && (
                          <p className="mt-2 text-xs font-semibold text-amber-700">{item.parsed.warnings.join(' ')}</p>
                        )}
                      </div>
                      <select
                        value={item.selectedOsobaId ?? ''}
                        onChange={event => updateSelection(item.clientId, 'selectedOsobaId', event.target.value)}
                        className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
                      >
                        <option value="">Vybrat osobu</option>
                        {item.osobaCandidates.map(person => (
                          <option key={person.id} value={person.id}>{formatPerson(person)} {person.score ? `(${person.score})` : ''}</option>
                        ))}
                      </select>
                      <select
                        value={item.selectedJednotkaId ?? ''}
                        onChange={event => updateSelection(item.clientId, 'selectedJednotkaId', event.target.value)}
                        className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
                      >
                        <option value="">Vybrat jednotku</option>
                        {item.jednotkaCandidates.map(unit => (
                          <option key={unit.id} value={unit.id}>Jednotka {unit.cislo_jednotky}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

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
              {sortedRows.length === 0 ? (
                <PageEmpty text="Zatím není uloženo žádné vyúčtování." />
              ) : sortedRows.map(row => {
                const settlementAlert = settlementWarning(row, sortedRows)
                const waterAlerts = row.odecty_vodomeru.map(reading => waterWarning(reading, row, sortedRows)).filter(Boolean)
                return (
                  <PageTr key={row.id} onClick={() => {}}>
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
    </PageShell>
  )
}
