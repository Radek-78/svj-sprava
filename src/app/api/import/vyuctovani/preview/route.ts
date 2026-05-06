import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { normalizePersonName, parseVyuctovaniPdf } from '@/lib/vyuctovani/parser'

export const runtime = 'nodejs'

type OsobaRow = {
  id: string
  jmeno: string | null
  prijmeni: string
  email: string | null
}

function personScore(person: OsobaRow, sourceName: string | null) {
  if (!sourceName) return 0
  const source = normalizePersonName(sourceName)
  const full = normalizePersonName([person.jmeno, person.prijmeni].filter(Boolean).join(' '))
  const reversed = normalizePersonName([person.prijmeni, person.jmeno].filter(Boolean).join(' '))
  if (source === full || source === reversed) return 100
  if (source.includes(full) || source.includes(reversed)) return 85
  if (full.includes(source) || reversed.includes(source)) return 70
  const parts = source.split(' ').filter(part => part.length > 2)
  return parts.reduce((score, part) => score + (full.includes(part) || reversed.includes(part) ? 12 : 0), 0)
}

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const files = formData.getAll('files').filter((item): item is File => item instanceof File)

  if (files.length === 0) {
    return NextResponse.json({ error: 'Nebyl nahrán žádný PDF soubor.' }, { status: 400 })
  }

  const supabase = await createClient()
  const [{ data: osoby }, { data: jednotky }] = await Promise.all([
    supabase.from('osoby').select('id, jmeno, prijmeni, email'),
    supabase.from('jednotky').select('id, cislo_jednotky, vchod, ulice_vchodu').order('cislo_jednotky'),
  ])

  const results = []
  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer())
    const parsed = await parseVyuctovaniPdf(buffer, file.name)
    const jednotkaCandidates = (jednotky ?? []).filter(j => j.cislo_jednotky === parsed.cisloJednotky)
    const osobaCandidates = (osoby ?? [])
      .map(osoba => ({ ...osoba, score: personScore(osoba, parsed.uzivatelText) }))
      .filter(osoba => osoba.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)

    results.push({
      clientId: crypto.randomUUID(),
      parsed: {
        ...parsed,
        rawText: undefined,
      },
      jednotkaCandidates,
      osobaCandidates,
      selectedJednotkaId: jednotkaCandidates.length === 1 ? jednotkaCandidates[0].id : null,
      selectedOsobaId: osobaCandidates[0]?.score >= 70 ? osobaCandidates[0].id : null,
    })
  }

  return NextResponse.json({ results })
}
