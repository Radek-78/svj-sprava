import type { KatastrZaznam, TypVlastnictvi } from './parser'
import { normalizujJednotku } from './parser'

// Stav, se kterým se výpis porovnává (evidence v aplikaci nebo dříve uložený výpis).
export type EvidenceJednotka = {
  jednotka: string
  vlastnici: string[] // zobrazovaná jména
  typ: TypVlastnictvi | null
  podilCitatel: number | null
  podilJmenovatel: number | null
}

export type TypRozdilu =
  | 'nova_jednotka'
  | 'chybi_ve_vypisu'
  | 'zmena_vlastniku'
  | 'zmena_typu'
  | 'zmena_podilu'

export type Rozdil = {
  jednotka: string
  typ: TypRozdilu
  popis: string
  puvodne: string
  nove: string
}

const TITULY = /^(bc|mgr|ing|mudr|judr|phdr|rndr|mvdr|doc|prof|csc|dis|mba|dr|thdr|paeddr|arch)$/i

function bezDiakritiky(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// Klíč osoby nezávislý na pořadí jméno/příjmení, diakritice a titulech.
export function klicOsoby(jmeno: string): string {
  return bezDiakritiky(jmeno)
    .toLowerCase()
    .split(/\s+/)
    .map(t => t.replace(/[.,]+$/, ''))
    .filter(t => t && !TITULY.test(t) && !t.includes('.'))
    .sort()
    .join(' ')
}

function mnozinaKlicu(jmena: string[]) {
  return new Set(jmena.map(klicOsoby).filter(Boolean))
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

function formatPodil(c: number | null, j: number | null) {
  if (!c || !j) return null
  const g = gcd(c, j)
  return `${c / g}/${j / g}`
}

const TYP_NAZEV: Record<TypVlastnictvi, string> = {
  individualni: 'individuální',
  podilove: 'podílové',
  sjm: 'SJM',
  mcp: 'Manželé cizího práva',
}

// Sloučí záznamy výpisu po jednotkách (podíloví vlastníci jedné jednotky mají více záznamů).
export function zaznamyNaEvidenci(zaznamy: KatastrZaznam[]): EvidenceJednotka[] {
  const mapa = new Map<string, EvidenceJednotka>()
  for (const z of zaznamy) {
    const existujici = mapa.get(z.jednotka)
    if (existujici) {
      existujici.vlastnici.push(...z.vlastnici)
      continue
    }
    mapa.set(z.jednotka, {
      jednotka: z.jednotka,
      vlastnici: [...z.vlastnici],
      typ: z.typ,
      podilCitatel: z.podilCitatel,
      podilJmenovatel: z.podilJmenovatel,
    })
  }
  return [...mapa.values()]
}

export function porovnej(zaznamy: KatastrZaznam[], evidence: EvidenceJednotka[]): { rozdily: Rozdil[]; shodnych: number } {
  const vypis = new Map(zaznamyNaEvidenci(zaznamy).map(j => [j.jednotka, j]))
  const stav = new Map(evidence.map(j => [normalizujJednotku(j.jednotka), j]))
  const rozdily: Rozdil[] = []
  let shodnych = 0

  for (const [cislo, v] of vypis) {
    const e = stav.get(cislo)
    if (!e || e.vlastnici.length === 0) {
      rozdily.push({
        jednotka: cislo, typ: 'nova_jednotka',
        popis: 'Jednotka ve výpisu je, ale v evidenci nemá vlastníka',
        puvodne: '—', nove: v.vlastnici.join(', '),
      })
      continue
    }

    let maRozdil = false

    const kV = mnozinaKlicu(v.vlastnici)
    const kE = mnozinaKlicu(e.vlastnici)
    if (kV.size !== kE.size || [...kV].some(k => !kE.has(k))) {
      maRozdil = true
      rozdily.push({
        jednotka: cislo, typ: 'zmena_vlastniku', popis: 'Liší se vlastníci',
        puvodne: e.vlastnici.join(', '), nove: v.vlastnici.join(', '),
      })
    }

    if (v.typ && e.typ && v.typ !== e.typ) {
      maRozdil = true
      rozdily.push({
        jednotka: cislo, typ: 'zmena_typu', popis: 'Liší se typ vlastnictví',
        puvodne: TYP_NAZEV[e.typ], nove: TYP_NAZEV[v.typ],
      })
    }

    // U podílového vlastnictví se podíl ve výpisu týká jednotlivých vlastníků, ne jednotky.
    if (v.typ !== 'podilove') {
      const pV = formatPodil(v.podilCitatel, v.podilJmenovatel)
      const pE = formatPodil(e.podilCitatel, e.podilJmenovatel)
      if (pV && pE && pV !== pE) {
        maRozdil = true
        rozdily.push({
          jednotka: cislo, typ: 'zmena_podilu', popis: 'Liší se podíl',
          puvodne: pE, nove: pV,
        })
      }
    }

    if (!maRozdil) shodnych++
  }

  for (const [cislo, e] of stav) {
    if (!vypis.has(cislo) && e.vlastnici.length > 0) {
      rozdily.push({
        jednotka: cislo, typ: 'chybi_ve_vypisu',
        popis: 'Jednotka je v evidenci, ale ve výpisu chybí',
        puvodne: e.vlastnici.join(', '), nove: '—',
      })
    }
  }

  rozdily.sort((a, b) => a.jednotka.localeCompare(b.jednotka, 'cs', { numeric: true }))
  return { rozdily, shodnych }
}
