import { createClient } from '@supabase/supabase-js'
import { PDFParse } from 'pdf-parse'
import fs from 'node:fs'
import path from 'node:path'

const DEFAULT_IMPORT_PATH = 'D:\\07. Aplikace\\SVJ Spojovací 557\\vyúčtování'

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const index = trimmed.indexOf('=')
    if (index === -1) continue
    const key = trimmed.slice(0, index).trim()
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, '')
    process.env[key] ??= value
  }
}

function configurePdfWorker() {
  const workerPath = path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.min.mjs')
  const workerSource = fs.readFileSync(workerPath, 'utf8')
  PDFParse.setWorker(`data:text/javascript;base64,${Buffer.from(workerSource).toString('base64')}`)
}

const DATE_RE = /(\d{1,2})\.(\d{1,2})\.(\d{4})/

function normalizeText(text) {
  return text.replace(/\r/g, '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim()
}

function compactText(text) {
  return normalizeText(text).replace(/\s+/g, ' ')
}

function parseCzechNumber(value) {
  if (!value) return null
  const normalized = value.replace(/\s/g, '').replace(',', '.')
  const number = Number(normalized)
  return Number.isFinite(number) ? number : null
}

function parseCzechDate(value) {
  const match = value?.match(DATE_RE)
  if (!match) return null
  const [, day, month, year] = match
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

function firstMatch(text, pattern) {
  return text.match(pattern)?.[1]?.trim() ?? null
}

function cleanupExtractedName(value) {
  return (value ?? '')
    .replace(/\s+/g, ' ')
    .replace(/([A-Za-zÁ-ž])\s+([áéíóúůýčďěňřšťžÁÉÍÓÚŮÝČĎĚŇŘŠŤŽ])/g, '$1$2')
    .trim()
}

function normalizePersonName(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function personScore(person, sourceName) {
  if (!sourceName) return 0
  const source = normalizePersonName(sourceName)
  const full = normalizePersonName([person.jmeno, person.prijmeni].filter(Boolean).join(' '))
  const reversed = normalizePersonName([person.prijmeni, person.jmeno].filter(Boolean).join(' '))
  if (source === full || source === reversed) return 100
  if (source.includes(full) || source.includes(reversed)) return 85
  if (full.includes(source) || reversed.includes(source)) return 70
  return source.split(' ').filter(part => part.length > 2).reduce((score, part) => (
    score + (full.includes(part) || reversed.includes(part) ? 12 : 0)
  ), 0)
}

function splitPersonName(sourceName) {
  const titleRe = /^(ing\.?|bc\.?|mgr\.?|mudr\.?|judr\.?|phdr\.?|mga\.?|dis\.?)$/i
  const parts = (sourceName ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(part => part && !titleRe.test(part))
  if (parts.length === 0) return { jmeno: null, prijmeni: sourceName?.trim() || 'Neznámá osoba' }
  if (parts.length === 1) return { jmeno: null, prijmeni: parts[0] }
  const prijmeni = parts.at(-1)
  const jmeno = parts.slice(0, -1).join(' ')
  return {
    jmeno: jmeno || null,
    prijmeni,
  }
}

function parsePeriod(text) {
  const match = text.match(/VY[ÚU]ČTOV[ÁA]N[ÍI](?:\s+SLUŽEB)?\s+ZA(?:\s+OBDOB[ÍI])?\s+(\d{1,2}\.\d{1,2}\.\d{4})\s*-\s*(\d{1,2}\.\d{1,2}\.\d{4})/i)
  const obdobiOd = parseCzechDate(match?.[1])
  const obdobiDo = parseCzechDate(match?.[2])
  return { obdobiOd, obdobiDo, rok: obdobiDo ? Number(obdobiDo.slice(0, 4)) : null }
}

function parseResult(text) {
  const resultMatches = [...text.matchAll(/\b(PŘEPLATEK|NEDOPLATEK)\b[^\n]{0,80}?([+-]?\d[\d\s]*[,.]\d{2})\s*Kč/gi)]
  const last = resultMatches.at(-1)
  if (!last) return { typVysledku: 'nula', castka: null }
  return {
    typVysledku: last[1].toUpperCase() === 'PŘEPLATEK' ? 'preplatek' : 'nedoplatek',
    castka: parseCzechNumber(last[2]),
  }
}

function parseTotals(text) {
  const celkemBlock = text.match(/Celkem[\s\S]{0,260}?([+-]?\d[\d\s]*[,.]\d{2})\s+([+-]?\d[\d\s]*[,.]\d{2})\s+([+-]?\d[\d\s]*[,.]\d{2})\s+([+-]?\d[\d\s]*[,.]\d{2})/i)
  return {
    zaplacenaZaloha: parseCzechNumber(celkemBlock?.[1]),
    predepsanaZaloha: parseCzechNumber(celkemBlock?.[2]),
    nakladCelkem: parseCzechNumber(celkemBlock?.[3]),
    celkovyPredpis: parseCzechNumber(firstMatch(text, /Celkov[áa]\s+v[ýy]še\s+p[řr]edpisu\s+činila:\s*([+-]?\d[\d\s]*[,.]\d{2})\s*Kč/i)),
    nevyuctovatelnePredpis: parseCzechNumber(firstMatch(text, /Za\s+nevy[úu]čtovateln[ée]\s+položky\s+p[řr]edeps[áa]no:\s*([+-]?\d[\d\s]*[,.]\d{2})\s*Kč/i)),
    prispevekSpravaDomu: parseCzechNumber(firstMatch(text, /p[řr][íi]sp[ěe]v[eě]k\s+na\s+spr[áa]vu\s+domu\s+a\s+pozemku:\s*([+-]?\d[\d\s]*[,.]\d{2})\s*Kč/i)),
  }
}

function parseWaterMeters(rawText) {
  const meters = []
  const lines = rawText.split('\n').map(line => line.replace(/\u00a0/g, ' ').trim()).filter(Boolean)
  for (const line of lines) {
    if (!/\b\d{6,}\b/.test(line) || !/\d{1,2}\.\d{1,2}\.\d{4}/.test(line)) continue
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

function parseSoupisResult(block) {
  const text = compactText(block)
  const result = text.match(/CELKEM\s+(P\s*Ř\s*EPLATEK|PŘEPLATEK|PREPLATEK|NEDOPLATEK)\s+([+-]?\d[\d\s]*[,.]\d{2})/i)
  if (!result) return { typVysledku: 'nula', castka: null }
  return {
    typVysledku: result[1].replace(/\s/g, '').toUpperCase().includes('NEDOPLATEK') ? 'nedoplatek' : 'preplatek',
    castka: Math.abs(parseCzechNumber(result[2]) ?? 0),
  }
}

function parseSoupisTotals(block) {
  const text = compactText(block)
  const total = text.match(/Za\s+obdob[íi]\s+celkem\s+([+-]?\d[\d\s]*[,.]\d{2})\s+([+-]?\d[\d\s]*[,.]\d{2})\s+([+-]?\d[\d\s]*[,.]\d{2})/i)
  return {
    zaplacenaZaloha: parseCzechNumber(total?.[2]),
    predepsanaZaloha: parseCzechNumber(total?.[2]),
    nakladCelkem: parseCzechNumber(total?.[1]),
    celkovyPredpis: null,
    nevyuctovatelnePredpis: null,
    prispevekSpravaDomu: null,
  }
}

function parseSoupisWater(block, period) {
  const text = compactText(block)
  const water = text.match(/Studen[áa]\s+voda[\s\S]{0,180}?\bSV\s+([+-]?\d[\d\s]*[,.]\d{1,3})\s*m3/i)
  const spotreba = parseCzechNumber(water?.[1])
  if (spotreba === null) return []
  return [{
    typ: 'SV',
    cisloMerice: null,
    datumOd: period.obdobiOd,
    datumDo: period.obdobiDo,
    spotreba,
    pocatecniStav: null,
    koncovyStav: null,
  }]
}

function parseSoupisPdfItems(filePath, rawText) {
  const text = rawText.replace(/\r/g, '').replace(/\u00a0/g, ' ')
  const period = parsePeriod(compactText(text))
  const userPattern = /Uživatel:\s*(\d{8,})\s+([^\n]+?)\s+Byt\s*č\.\s*(\d+[A-Z]?)/gi
  const users = [...text.matchAll(userPattern)].map(match => ({
    index: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
    cisloDokladu: match[1],
    uzivatelText: cleanupExtractedName(match[2]),
    cisloJednotky: match[3],
  }))

  if (users.length < 2) return null

  return users.map((user, index) => {
    const preUserStart = index === 0 ? 0 : users[index - 1].end
    const postUserEnd = users[index + 1]?.index ?? text.length
    const preUserBlock = text.slice(preUserStart, user.index)
    const postUserBlock = text.slice(user.end, postUserEnd)
    return {
      fileName: `${path.basename(filePath)}#${user.cisloJednotky}`,
      cisloDokladu: user.cisloDokladu,
      variabilniSymbol: user.cisloDokladu,
      cisloJednotky: user.cisloJednotky,
      uzivatelText: user.uzivatelText,
      ...period,
      ...parseSoupisResult(postUserBlock),
      ...parseSoupisTotals(preUserBlock),
      vodomery: parseSoupisWater(preUserBlock, period),
    }
  })
}

async function parsePdf(filePath) {
  const buffer = fs.readFileSync(filePath)
  const parser = new PDFParse({ data: buffer })
  const pdf = await parser.getText()
  await parser.destroy()
  const rawText = pdf.text
  const soupisItems = parseSoupisPdfItems(filePath, rawText)
  if (soupisItems) return soupisItems

  const text = normalizeText(rawText)
  const originalLines = rawText.replace(/\r/g, '').split('\n')
  return [{
    fileName: path.basename(filePath),
    cisloDokladu: originalLines.find(line => /^\d{8,}$/.test(line.trim()))?.trim() ?? null,
    variabilniSymbol: text.match(/\b\d{8,}[A-Z]\d+[A-Z]\b/)?.[0] ?? null,
    cisloJednotky: firstMatch(text, /Č\.\s*prostoru\s+(\d+[A-Z]?)/i) ?? firstMatch(text, /Č\.\s*jednotky\s+(\d+[A-Z]?)/i) ?? firstMatch(text, /\bB(\d{2,4}[A-Z]?)S\b/i),
    uzivatelText: cleanupExtractedName(originalLines.find(line => line.trim().startsWith('Uživatel:'))?.replace(/^Uživatel:\s*/i, '').trim() ?? null),
    ...parsePeriod(text),
    ...parseResult(text),
    ...parseTotals(text),
    vodomery: parseWaterMeters(rawText),
  }]
}

function collectPdfFiles(targetPath) {
  const resolved = path.resolve(targetPath)
  const stat = fs.statSync(resolved)
  if (stat.isFile()) return [resolved]
  return fs.readdirSync(resolved)
    .filter(name => name.toLowerCase().endsWith('.pdf'))
    .map(name => path.join(resolved, name))
    .sort((a, b) => a.localeCompare(b, 'cs'))
}

async function saveImport(supabase, item) {
  const { parsed, osoba, jednotka } = item
  let existingQuery = supabase
    .from('vyuctovani_sluzeb')
    .select('id')
    .eq('osoba_id', osoba.id)
    .eq('jednotka_id', jednotka.id)
    .eq('rok', parsed.rok)
    .limit(1)

  existingQuery = parsed.cisloDokladu
    ? existingQuery.eq('cislo_dokladu', parsed.cisloDokladu)
    : existingQuery.is('cislo_dokladu', null)

  const { data: existing, error: existingError } = await existingQuery.maybeSingle()
  if (existingError) throw existingError
  if (existing) return 'skipped-existing'

  const { data: vyuctovani, error } = await supabase
    .from('vyuctovani_sluzeb')
    .upsert({
      osoba_id: osoba.id,
      jednotka_id: jednotka.id,
      rok: parsed.rok,
      obdobi_od: parsed.obdobiOd,
      obdobi_do: parsed.obdobiDo,
      cislo_dokladu: parsed.cisloDokladu,
      variabilni_symbol: parsed.variabilniSymbol,
      uzivatel_text: parsed.uzivatelText,
      typ_vysledku: parsed.typVysledku,
      castka: parsed.castka,
      zaplacena_zaloha: parsed.zaplacenaZaloha,
      predepsana_zaloha: parsed.predepsanaZaloha,
      naklad_celkem: parsed.nakladCelkem,
      celkovy_predpis: parsed.celkovyPredpis,
      nevyuctovatelne_predpis: parsed.nevyuctovatelnePredpis,
      prispevek_sprava_domu: parsed.prispevekSpravaDomu,
      zdroj_soubor: parsed.fileName,
    }, { onConflict: 'osoba_id,jednotka_id,rok,cislo_dokladu' })
    .select('id')
    .single()
  if (error) throw error

  if (parsed.vodomery.length > 0) {
    const { error: metersError } = await supabase
      .from('odecty_vodomeru')
      .upsert(parsed.vodomery.map(vodomer => ({
        vyuctovani_id: vyuctovani.id,
        jednotka_id: jednotka.id,
        cislo_merice: vodomer.cisloMerice,
        typ: vodomer.typ,
        datum_od: vodomer.datumOd,
        datum_do: vodomer.datumDo,
        pocatecni_stav: vodomer.pocatecniStav,
        koncovy_stav: vodomer.koncovyStav,
        spotreba: vodomer.spotreba,
      })), { onConflict: 'vyuctovani_id,cislo_merice,datum_od,datum_do' })
    if (metersError) throw metersError
  }
  return 'saved'
}

function buildLatestMeterMap(odecty) {
  const map = new Map()
  for (const odect of odecty ?? []) {
    if (!odect.jednotka_id || !odect.cislo_merice || odect.typ !== 'SV') continue
    const current = map.get(odect.jednotka_id)
    const currentDate = current?.datum_do ?? ''
    const nextDate = odect.datum_do ?? ''
    if (!current || nextDate >= currentDate) map.set(odect.jednotka_id, odect.cislo_merice)
  }
  return map
}

function fillMissingMeterNumbers(parsed, jednotka, latestMeters) {
  if (!jednotka) return []
  const warnings = []
  for (const vodomer of parsed.vodomery) {
    if (vodomer.cisloMerice) continue
    const latest = latestMeters.get(jednotka.id)
    vodomer.cisloMerice = latest ?? `SV-${jednotka.cislo_jednotky}`
    if (!latest) warnings.push(`V soupisu chybí číslo vodoměru, použito náhradní ${vodomer.cisloMerice}.`)
  }
  return warnings
}

async function createHistoricalOwner(supabase, parsed, jednotka) {
  const name = splitPersonName(parsed.uzivatelText)
  const { data: osoba, error: osobaError } = await supabase
    .from('osoby')
    .insert({
      jmeno: name.jmeno,
      prijmeni: name.prijmeni,
      poznamka: `Založeno automaticky z vyúčtování ${parsed.rok}.`,
    })
    .select('id, jmeno, prijmeni, email')
    .single()
  if (osobaError) throw osobaError

  const { error: vazbaError } = await supabase
    .from('jednotky_osoby')
    .insert({
      jednotka_id: jednotka.id,
      osoba_id: osoba.id,
      role: 'vlastnik',
      typ_vlastnictvi: 'individualni',
      datum_od: parsed.obdobiOd,
      datum_do: parsed.obdobiDo,
      je_aktivni: false,
    })
  if (vazbaError) throw vazbaError

  return osoba
}

function printItem(item) {
  const { parsed, osoba, jednotka, warnings } = item
  console.log(`\n${parsed.fileName}`)
  console.log(`  jednotka: ${parsed.cisloJednotky ?? '?'} ${jednotka ? `-> ${jednotka.cislo_jednotky}` : '-> NENALEZENA'}`)
  console.log(`  osoba: ${parsed.uzivatelText ?? '?'} ${osoba ? `-> ${[osoba.prijmeni, osoba.jmeno].filter(Boolean).join(' ')}` : '-> NENALEZENA'}`)
  console.log(`  období: ${parsed.obdobiOd ?? '?'} až ${parsed.obdobiDo ?? '?'}`)
  console.log(`  výsledek: ${parsed.typVysledku} ${parsed.castka ?? '?'} Kč`)
  console.log(`  zálohy/náklad: ${parsed.predepsanaZaloha ?? '?'} / ${parsed.nakladCelkem ?? '?'} Kč`)
  for (const vodomer of parsed.vodomery) {
    console.log(`  vodoměr ${vodomer.typ}: ${vodomer.cisloMerice}, ${vodomer.pocatecniStav} -> ${vodomer.koncovyStav}, spotřeba ${vodomer.spotreba} m3`)
  }
  for (const warning of warnings) console.log(`  ! ${warning}`)
}

async function main() {
  loadEnv(path.join(process.cwd(), '.env.local'))
  configurePdfWorker()

  const args = process.argv.slice(2)
  const target = args.find(arg => !arg.startsWith('--')) ?? DEFAULT_IMPORT_PATH
  const save = args.includes('--save')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) throw new Error('Chybí NEXT_PUBLIC_SUPABASE_URL nebo SUPABASE_SERVICE_ROLE_KEY v .env.local.')

  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const [{ data: osoby, error: osobyError }, { data: jednotky, error: jednotkyError }, { data: odecty, error: odectyError }] = await Promise.all([
    supabase.from('osoby').select('id, jmeno, prijmeni, email'),
    supabase.from('jednotky').select('id, cislo_jednotky, vchod, ulice_vchodu').order('cislo_jednotky'),
    supabase.from('odecty_vodomeru').select('jednotka_id, cislo_merice, typ, datum_do').order('datum_do', { ascending: false }),
  ])
  if (osobyError) throw osobyError
  if (jednotkyError) throw jednotkyError
  if (odectyError) throw odectyError
  const latestMeters = buildLatestMeterMap(odecty)

  const files = collectPdfFiles(target)
  console.log(`${save ? 'UKLÁDÁM' : 'NÁHLED'}: nalezeno ${files.length} PDF`)

  let saved = 0
  let skipped = 0
  let parsedCount = 0
  for (const file of files) {
    const parsedItems = await parsePdf(file)
    parsedCount += parsedItems.length
    if (parsedItems.length > 1) console.log(`\n${path.basename(file)}: rozpoznán soupis, položek ${parsedItems.length}`)
    for (const parsed of parsedItems) {
    const jednotka = jednotky.find(j => j.cislo_jednotky === parsed.cisloJednotky) ?? null
    const meterWarnings = fillMissingMeterNumbers(parsed, jednotka, latestMeters)
    let osoba = osoby
      .map(o => ({ ...o, score: personScore(o, parsed.uzivatelText) }))
      .filter(o => o.score >= 70)
      .sort((a, b) => b.score - a.score)[0] ?? null

    if (save && !osoba && jednotka && parsed.uzivatelText && parsed.obdobiOd && parsed.obdobiDo) {
      osoba = await createHistoricalOwner(supabase, parsed, jednotka)
      osoby.push(osoba)
      console.log(`\n${parsed.fileName}`)
      console.log(`  založena historická osoba: ${[osoba.prijmeni, osoba.jmeno].filter(Boolean).join(' ')}`)
      console.log(`  vytvořena historická vazba vlastníka k jednotce ${jednotka.cislo_jednotky} pro období ${parsed.obdobiOd} až ${parsed.obdobiDo}`)
    }

    const warnings = []
    if (!jednotka) warnings.push('Jednotka nebyla nalezena v DB.')
    if (!osoba) warnings.push('Osoba nebyla spolehlivě nalezena v DB.')
    if (!parsed.rok || !parsed.obdobiOd || !parsed.obdobiDo) warnings.push('Chybí období vyúčtování.')
    if (parsed.vodomery.length === 0) warnings.push('Nenalezen žádný vodoměr.')
    warnings.push(...meterWarnings)
    const hasBlockingWarnings = !jednotka || !osoba || !parsed.rok || !parsed.obdobiOd || !parsed.obdobiDo
    const item = { parsed, jednotka, osoba, warnings }
    printItem(item)

    if (save) {
      if (hasBlockingWarnings) {
        skipped++
        console.log('  přeskočeno: nejdřív oprav mapování nebo data')
      } else {
        const result = await saveImport(supabase, item)
        if (result === 'skipped-existing') {
          skipped++
          console.log('  přeskočeno: stejné vyúčtování už v DB existuje')
        } else {
          saved++
          console.log('  uloženo')
        }
      }
    }
    }
  }

  console.log(`\nHotovo. Načteno položek: ${parsedCount}. Uloženo: ${saved}, přeskočeno: ${skipped}, režim: ${save ? 'save' : 'dry-run'}.`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
