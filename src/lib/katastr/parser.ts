// Parser textu zkopírovaného z výpisu "Vlastníci, jiné oprávnění" (nahlížení do KN).
// Každý záznam má dva řádky: "Vlastník, adresa" a "Jednotka: 557/312<TAB>59/2500".

export type TypVlastnictvi = 'individualni' | 'podilove' | 'sjm' | 'mcp'

export type KatastrZaznam = {
  jednotka: string // číslo jednotky bez čísla popisného, např. "312"
  jednotkaPlne: string // jak je uvedeno ve výpisu, např. "557/312"
  typ: TypVlastnictvi
  vlastnici: string[] // jména osob tak, jak jsou ve výpisu (bez SJ/MCP)
  adresa: string
  podilCitatel: number | null
  podilJmenovatel: number | null
  text: string // původní řádek s vlastníkem
}

export type ParseVysledek = { zaznamy: KatastrZaznam[]; varovani: string[] }

const HLAVICKY = [/^vlastníci,?\s+jin[áé] oprávnění/i, /^vlastnické právo(\s+podíl)?$/i, /^podíl$/i]

export function normalizujJednotku(cislo: string): string {
  return (cislo.split('/').pop() ?? cislo).trim()
}

export function rozdelVlastniky(text: string): string[] {
  return text
    .split(/\s+a\s+/i)
    .map(s => s.trim())
    .filter(Boolean)
}

export function parseKatastr(vstup: string): ParseVysledek {
  const zaznamy: KatastrZaznam[] = []
  const varovani: string[] = []
  const radky = vstup.split(/\r?\n/).map(r => r.trim()).filter(Boolean)

  let vlastnikRadek: string | null = null

  for (const radek of radky) {
    if (HLAVICKY.some(h => h.test(radek))) continue

    const jednotka = radek.match(/^Jednotka:\s*(\S+)\s*(.*)$/i)
    if (jednotka) {
      if (!vlastnikRadek) {
        varovani.push(`Jednotka ${jednotka[1]} nemá před sebou řádek s vlastníkem.`)
        continue
      }
      const podil = jednotka[2].match(/(\d+)\s*\/\s*(\d+)/)
      zaznamy.push(vytvorZaznam(vlastnikRadek, jednotka[1], podil))
      vlastnikRadek = null
      continue
    }

    const samotnyPodil = radek.match(/^(\d+)\s*\/\s*(\d+)$/)
    if (samotnyPodil && zaznamy.length > 0 && zaznamy[zaznamy.length - 1].podilCitatel === null) {
      const posledni = zaznamy[zaznamy.length - 1]
      posledni.podilCitatel = parseInt(samotnyPodil[1], 10)
      posledni.podilJmenovatel = parseInt(samotnyPodil[2], 10)
      continue
    }

    if (vlastnikRadek) varovani.push(`Vlastník bez jednotky byl přeskočen: ${vlastnikRadek}`)
    vlastnikRadek = radek
  }

  if (vlastnikRadek) varovani.push(`Vlastník bez jednotky byl přeskočen: ${vlastnikRadek}`)

  // Více vlastníků jedné jednotky bez SJ/MCP = podílové vlastnictví.
  const pocty = new Map<string, number>()
  for (const z of zaznamy) pocty.set(z.jednotka, (pocty.get(z.jednotka) ?? 0) + 1)
  for (const z of zaznamy) {
    if (z.typ === 'individualni' && (pocty.get(z.jednotka) ?? 0) > 1) z.typ = 'podilove'
  }

  return { zaznamy, varovani }
}

function vytvorZaznam(vlastnikRadek: string, jednotkaPlne: string, podil: RegExpMatchArray | null): KatastrZaznam {
  let text = vlastnikRadek
  let typ: TypVlastnictvi = 'individualni'

  const prefix = text.match(/^(SJ|MCP)\s+/)
  if (prefix) {
    typ = prefix[1] === 'SJ' ? 'sjm' : 'mcp'
    text = text.slice(prefix[0].length)
  }

  const carka = text.indexOf(',')
  const jmena = carka === -1 ? text : text.slice(0, carka)
  const adresa = carka === -1 ? '' : text.slice(carka + 1).trim()

  return {
    jednotka: normalizujJednotku(jednotkaPlne),
    jednotkaPlne,
    typ,
    vlastnici: rozdelVlastniky(jmena),
    adresa,
    podilCitatel: podil ? parseInt(podil[1], 10) : null,
    podilJmenovatel: podil ? parseInt(podil[2], 10) : null,
    text: vlastnikRadek,
  }
}
