import { PDFParse } from 'pdf-parse'

export type VyuctovaniTypVysledku = 'preplatek' | 'nedoplatek' | 'nula'

export type ParsedVodomer = {
  typ: 'SV' | 'TV' | 'voda'
  cisloMerice: string
  datumOd: string | null
  datumDo: string | null
  pocatecniStav: number | null
  koncovyStav: number | null
  spotreba: number | null
}

export type ParsedVyuctovani = {
  fileName: string
  cisloDokladu: string | null
  variabilniSymbol: string | null
  cisloJednotky: string | null
  uzivatelText: string | null
  obdobiOd: string | null
  obdobiDo: string | null
  rok: number | null
  typVysledku: VyuctovaniTypVysledku
  castka: number | null
  zaplacenaZaloha: number | null
  predepsanaZaloha: number | null
  nakladCelkem: number | null
  celkovyPredpis: number | null
  nevyuctovatelnePredpis: number | null
  prispevekSpravaDomu: number | null
  vodomery: ParsedVodomer[]
  warnings: string[]
  rawText: string
}

const DATE_RE = /(\d{1,2})\.(\d{1,2})\.(\d{4})/

function normalizeText(text: string) {
  return text.replace(/\r/g, '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim()
}

function parseCzechNumber(value: string | undefined | null) {
  if (!value) return null
  const normalized = value.replace(/\s/g, '').replace(',', '.')
  const number = Number(normalized)
  return Number.isFinite(number) ? number : null
}

function parseCzechDate(value: string | undefined | null) {
  const match = value?.match(DATE_RE)
  if (!match) return null
  const [, day, month, year] = match
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

function firstMatch(text: string, pattern: RegExp) {
  return text.match(pattern)?.[1]?.trim() ?? null
}

function parsePeriod(text: string) {
  const match = text.match(/VY[ÚU]ČTOV[ÁA]N[ÍI]\s+ZA\s+OBDOB[ÍI]\s+(\d{1,2}\.\d{1,2}\.\d{4})\s*-\s*(\d{1,2}\.\d{1,2}\.\d{4})/i)
  const obdobiOd = parseCzechDate(match?.[1])
  const obdobiDo = parseCzechDate(match?.[2])
  return {
    obdobiOd,
    obdobiDo,
    rok: obdobiDo ? Number(obdobiDo.slice(0, 4)) : null,
  }
}

function parseResult(text: string) {
  const resultMatches = [...text.matchAll(/\b(PŘEPLATEK|NEDOPLATEK)\b[^\n]{0,80}?([+-]?\d[\d\s]*[,.]\d{2})\s*Kč/gi)]
  const last = resultMatches.at(-1)
  if (!last) return { typVysledku: 'nula' as const, castka: null }
  return {
    typVysledku: last[1].toUpperCase() === 'PŘEPLATEK' ? 'preplatek' as const : 'nedoplatek' as const,
    castka: parseCzechNumber(last[2]),
  }
}

function parseTotals(text: string) {
  const celkemLine = text.match(/Celkem\s+(?:Nedoplatek[^\n]*\s+)?([+-]?\d[\d\s]*[,.]\d{2})\s+([+-]?\d[\d\s]*[,.]\d{2})\s+([+-]?\d[\d\s]*[,.]\d{2})\s+([+-]?\d[\d\s]*[,.]\d{2})/i)
  const celkovyPredpis = firstMatch(text, /Celkov[áa]\s+v[ýy]še\s+p[řr]edpisu\s+činila:\s*([+-]?\d[\d\s]*[,.]\d{2})\s*Kč/i)
  const nevyuctovatelne = firstMatch(text, /Za\s+nevy[úu]čtovateln[ée]\s+položky\s+p[řr]edeps[áa]no:\s*([+-]?\d[\d\s]*[,.]\d{2})\s*Kč/i)
  const prispevek = firstMatch(text, /p[řr][íi]sp[ěe]v[eě]k\s+na\s+spr[áa]vu\s+domu\s+a\s+pozemku:\s*([+-]?\d[\d\s]*[,.]\d{2})\s*Kč/i)

  return {
    zaplacenaZaloha: parseCzechNumber(celkemLine?.[1]),
    predepsanaZaloha: parseCzechNumber(celkemLine?.[2]),
    nakladCelkem: parseCzechNumber(celkemLine?.[3]),
    celkovyPredpis: parseCzechNumber(celkovyPredpis),
    nevyuctovatelnePredpis: parseCzechNumber(nevyuctovatelne),
    prispevekSpravaDomu: parseCzechNumber(prispevek),
  }
}

function parseWaterMeters(text: string): ParsedVodomer[] {
  const meters: ParsedVodomer[] = []
  const lines = text.split('\n').map(line => line.replace(/\u00a0/g, ' ').trim()).filter(Boolean)

  for (const line of lines) {
    if (!/\b\d{6,}\b/.test(line)) continue
    if (!/\d{1,2}\.\d{1,2}\.\d{4}/.test(line)) continue
    const numbers = line.split(/\s+/).filter(part => /^[-+]?\d+,\d{1,3}$/.test(part))
    const dates = [...line.matchAll(/\d{1,2}\.\d{1,2}\.\d{4}/g)].map(match => match[0])
    const meter = line.match(/\b\d{6,}\b(?![,.])/g)?.at(-1)
    if (!meter || numbers.length < 3 || dates.length < 2) continue

    meters.push({
      typ: line.toUpperCase().includes('TEPL') ? 'TV' : 'SV',
      cisloMerice: meter,
      datumOd: parseCzechDate(dates[0]),
      datumDo: parseCzechDate(dates[1]),
      spotreba: parseCzechNumber(numbers[0]),
      pocatecniStav: parseCzechNumber(numbers.at(-2)),
      koncovyStav: parseCzechNumber(numbers.at(-1)),
    })
  }

  return meters
}

export async function parseVyuctovaniPdf(buffer: Buffer, fileName: string): Promise<ParsedVyuctovani> {
  const parser = new PDFParse({ data: buffer })
  const pdf = await parser.getText()
  const rawText = pdf.text
  const text = normalizeText(rawText)
  const originalLines = rawText.replace(/\r/g, '').split('\n')
  const warnings: string[] = []

  const period = parsePeriod(text)
  const result = parseResult(text)
  const totals = parseTotals(text)
  const cisloJednotky =
    firstMatch(text, /Č\.\s*prostoru\s+(\d+[A-Z]?)/i) ??
    firstMatch(text, /Č\.\s*jednotky\s+(\d+[A-Z]?)/i) ??
    firstMatch(text, /\bB(\d{2,4}[A-Z]?)S\b/i)

  const uzivatelText =
    originalLines.find(line => line.trim().startsWith('Uživatel:'))?.replace(/^Uživatel:\s*/i, '').trim() ??
    null

  const parsed: ParsedVyuctovani = {
    fileName,
    cisloDokladu: originalLines.find(line => /^\d{8,}$/.test(line.trim()))?.trim() ?? null,
    variabilniSymbol: text.match(/\b\d{8,}[A-Z]\d+[A-Z]\b/)?.[0] ?? null,
    cisloJednotky,
    uzivatelText,
    ...period,
    ...result,
    ...totals,
    vodomery: parseWaterMeters(rawText),
    warnings,
    rawText,
  }

  if (!parsed.cisloJednotky) warnings.push('Nepodařilo se spolehlivě určit číslo jednotky.')
  if (!parsed.uzivatelText) warnings.push('Nepodařilo se najít uživatele/vlastníka z PDF.')
  if (!parsed.obdobiOd || !parsed.obdobiDo) warnings.push('Nepodařilo se určit období vyúčtování.')
  if (parsed.castka === null) warnings.push('Nepodařilo se určit přeplatek nebo nedoplatek.')
  if (parsed.vodomery.length === 0) warnings.push('V PDF nebyl nalezen odečet vodoměru.')

  return parsed
}

export function normalizePersonName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}
