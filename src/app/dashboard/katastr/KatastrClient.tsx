'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PageShell, { PageEmpty, PageTable, PageTbody, PageTd, PageTh, PageThead } from '@/components/PageShell'
import { parseKatastr, type KatastrZaznam, type TypVlastnictvi } from '@/lib/katastr/parser'
import { porovnej, zaznamyNaEvidenci, type EvidenceJednotka, type Rozdil, type TypRozdilu } from '@/lib/katastr/porovnani'

// ─── Typy ────────────────────────────────────────────────────────────────────

type JednotkaDb = {
  id: string
  cislo_jednotky: string
  podil_citatel: number | null
  podil_jmenovatel: number | null
  jednotky_osoby: {
    role: string
    typ_vlastnictvi: TypVlastnictvi | null
    je_aktivni: boolean
    osoby: { jmeno: string | null; prijmeni: string } | null
  }[]
}

type VypisDb = {
  id: string
  created_at: string
  poznamka: string | null
  pocet_zaznamu: number
  zaznamy: KatastrZaznam[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ROZDIL_BARVY: Record<TypRozdilu, string> = {
  zmena_vlastniku: 'bg-red-50 text-red-700 ring-red-200',
  nova_jednotka: 'bg-amber-50 text-amber-800 ring-amber-200',
  chybi_ve_vypisu: 'bg-amber-50 text-amber-800 ring-amber-200',
  zmena_typu: 'bg-violet-50 text-violet-700 ring-violet-200',
  zmena_podilu: 'bg-sky-50 text-sky-800 ring-sky-200',
}

const dateFormatter = new Intl.DateTimeFormat('cs-CZ', { dateStyle: 'medium', timeStyle: 'short' })

function evidenceZDb(jednotky: JednotkaDb[]): EvidenceJednotka[] {
  return jednotky.map(j => {
    const vlastnici = j.jednotky_osoby.filter(v => v.role === 'vlastnik' && v.je_aktivni && v.osoby)
    return {
      jednotka: j.cislo_jednotky,
      vlastnici: vlastnici.map(v => [v.osoby!.prijmeni, v.osoby!.jmeno].filter(Boolean).join(' ')),
      typ: vlastnici[0]?.typ_vlastnictvi ?? (vlastnici.length ? 'individualni' : null),
      podilCitatel: j.podil_citatel,
      podilJmenovatel: j.podil_jmenovatel,
    }
  })
}

function RozdilyTabulka({ rozdily, prazdnyText, puvodneLabel }: { rozdily: Rozdil[]; prazdnyText: string; puvodneLabel: string }) {
  return (
    <PageTable>
      <PageThead>
        <PageTh>Jednotka</PageTh>
        <PageTh>Změna</PageTh>
        <PageTh>{puvodneLabel}</PageTh>
        <PageTh>Ve výpisu</PageTh>
      </PageThead>
      <PageTbody>
        {rozdily.length === 0 && <PageEmpty text={prazdnyText} />}
        {rozdily.map((r, i) => (
          <tr key={`${r.jednotka}-${r.typ}-${i}`} className="border-b border-zinc-100">
            <PageTd className="font-semibold text-zinc-900">{r.jednotka}</PageTd>
            <PageTd>
              <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ring-1 ${ROZDIL_BARVY[r.typ]}`}>{r.popis}</span>
            </PageTd>
            <PageTd>{r.puvodne}</PageTd>
            <PageTd>{r.nove}</PageTd>
          </tr>
        ))}
      </PageTbody>
    </PageTable>
  )
}

// ─── Komponenta ───────────────────────────────────────────────────────────────

export default function KatastrClient({ jednotky, vypisy, initialError }: {
  jednotky: JednotkaDb[]
  vypisy: VypisDb[]
  initialError: string | null
}) {
  const router = useRouter()
  const supabase = createClient()

  const [text, setText] = useState('')
  const [poznamka, setPoznamka] = useState('')
  const [ukladam, setUkladam] = useState(false)
  const [zprava, setZprava] = useState<string | null>(initialError ? `Výpisy se nepodařilo načíst: ${initialError}` : null)

  const parsed = useMemo(() => (text.trim() ? parseKatastr(text) : null), [text])
  const evidence = useMemo(() => evidenceZDb(jednotky), [jednotky])
  const posledniVypis = vypisy[0] ?? null

  const proti_evidenci = useMemo(() => (parsed ? porovnej(parsed.zaznamy, evidence) : null), [parsed, evidence])
  const proti_poslednimu = useMemo(
    () => (parsed && posledniVypis ? porovnej(parsed.zaznamy, zaznamyNaEvidenci(posledniVypis.zaznamy)) : null),
    [parsed, posledniVypis],
  )

  async function ulozVypis() {
    if (!parsed || parsed.zaznamy.length === 0) return
    setUkladam(true)
    setZprava(null)
    const { error } = await supabase.from('katastr_vypisy').insert({
      poznamka: poznamka.trim() || null,
      raw_text: text,
      zaznamy: parsed.zaznamy,
      pocet_zaznamu: parsed.zaznamy.length,
    })
    setUkladam(false)
    if (error) {
      setZprava(`Uložení se nepodařilo: ${error.message}`)
      return
    }
    setText('')
    setPoznamka('')
    setZprava('Výpis byl uložen.')
    router.refresh()
  }

  return (
    <PageShell
      title="Kontrola katastru"
      stats={[
        { label: 'záznamů ve výpisu', value: parsed?.zaznamy.length ?? 0, color: 'sky' },
        { label: 'shodných s evidencí', value: proti_evidenci?.shodnych ?? 0, dot: 'emerald', color: 'emerald' },
        { label: 'rozdílů', value: proti_evidenci?.rozdily.length ?? 0, dot: 'amber', color: (proti_evidenci?.rozdily.length ?? 0) > 0 ? 'amber' : 'zinc' },
      ]}
    >
      <div className="p-6 space-y-8 max-w-6xl">

        <section className="space-y-3">
          <h2 className="text-sm font-black text-zinc-900">1. Vložte výpis z katastru</h2>
          <p className="text-xs text-zinc-500">
            Na webu nahlížení do KN označte tabulku „Vlastníci, jiné oprávnění“, zkopírujte ji a vložte sem.
          </p>
          <textarea
            value={text}
            onChange={e => { setText(e.target.value); setZprava(null) }}
            rows={8}
            placeholder={'SJ Novák Jan a Nováková Jana, Spojovací 557, Mladá, 28924 Milovice\nJednotka: 557/312\t59/2500'}
            className="w-full rounded-xl border border-zinc-200 p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {parsed && parsed.varovani.length > 0 && (
            <ul className="text-xs text-amber-700 bg-amber-50 ring-1 ring-amber-200 rounded-lg p-3 space-y-1">
              {parsed.varovani.map((v, i) => <li key={i}>{v}</li>)}
            </ul>
          )}
          {parsed && parsed.zaznamy.length === 0 && (
            <p className="text-xs text-red-600">Ve vloženém textu jsem nenašel žádný záznam.</p>
          )}
        </section>

        {proti_evidenci && (
          <section className="space-y-3">
            <h2 className="text-sm font-black text-zinc-900">2. Porovnání s evidencí v aplikaci</h2>
            <div className="rounded-xl border border-zinc-200 overflow-hidden">
              <RozdilyTabulka rozdily={proti_evidenci.rozdily} prazdnyText="Výpis souhlasí s evidencí." puvodneLabel="V evidenci" />
            </div>
          </section>
        )}

        {parsed && parsed.zaznamy.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-black text-zinc-900">3. Změny oproti poslednímu uloženému výpisu</h2>
            {posledniVypis && proti_poslednimu ? (
              <>
                <p className="text-xs text-zinc-500">Poslední výpis ze dne {dateFormatter.format(new Date(posledniVypis.created_at))}.</p>
                <div className="rounded-xl border border-zinc-200 overflow-hidden">
                  <RozdilyTabulka rozdily={proti_poslednimu.rozdily} prazdnyText="Beze změny oproti poslednímu výpisu." puvodneLabel="V minulém výpisu" />
                </div>
              </>
            ) : (
              <p className="text-xs text-zinc-500">Zatím není uložen žádný výpis, není s čím porovnávat.</p>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <input
                value={poznamka}
                onChange={e => setPoznamka(e.target.value)}
                placeholder="Poznámka (volitelné)"
                className="px-3 py-2 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 w-64"
              />
              <button
                type="button"
                onClick={ulozVypis}
                disabled={ukladam}
                className="px-3.5 py-2 rounded-xl bg-zinc-950 text-white text-sm font-bold hover:bg-zinc-800 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              >
                {ukladam ? 'Ukládám…' : 'Uložit tento výpis'}
              </button>
            </div>
          </section>
        )}

        {zprava && <p className="text-sm text-zinc-700">{zprava}</p>}

        <section className="space-y-3">
          <h2 className="text-sm font-black text-zinc-900">Uložené výpisy</h2>
          <div className="rounded-xl border border-zinc-200 overflow-hidden">
            <PageTable>
              <PageThead>
                <PageTh>Datum</PageTh>
                <PageTh>Záznamů</PageTh>
                <PageTh>Poznámka</PageTh>
              </PageThead>
              <PageTbody>
                {vypisy.length === 0 && <PageEmpty text="Zatím nebyl uložen žádný výpis." />}
                {vypisy.map(v => (
                  <tr key={v.id} className="border-b border-zinc-100">
                    <PageTd>{dateFormatter.format(new Date(v.created_at))}</PageTd>
                    <PageTd>{v.pocet_zaznamu}</PageTd>
                    <PageTd>{v.poznamka ?? '—'}</PageTd>
                  </tr>
                ))}
              </PageTbody>
            </PageTable>
          </div>
        </section>

      </div>
    </PageShell>
  )
}
