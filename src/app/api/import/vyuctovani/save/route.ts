import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ParsedVyuctovani } from '@/lib/vyuctovani/parser'

export const runtime = 'nodejs'

type SaveItem = {
  parsed: Omit<ParsedVyuctovani, 'rawText' | 'warnings'>
  osobaId: string
  jednotkaId: string
}

function requiredString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const items = Array.isArray(body?.items) ? body.items as SaveItem[] : []

  if (items.length === 0) {
    return NextResponse.json({ error: 'Chybí data k uložení.' }, { status: 400 })
  }

  const supabase = await createClient()
  const saved = []

  for (const item of items) {
    const parsed = item.parsed
    if (!requiredString(item.osobaId) || !requiredString(item.jednotkaId) || !parsed.rok || !parsed.obdobiOd || !parsed.obdobiDo) {
      return NextResponse.json({ error: `Neúplná data pro soubor ${parsed.fileName}.` }, { status: 400 })
    }

    const { data: vyuctovani, error: vyuctovaniError } = await supabase
      .from('vyuctovani_sluzeb')
      .upsert({
        osoba_id: item.osobaId,
        jednotka_id: item.jednotkaId,
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

    if (vyuctovaniError) {
      return NextResponse.json({ error: vyuctovaniError.message }, { status: 500 })
    }

    if (parsed.vodomery.length > 0) {
      const { error: odectyError } = await supabase
        .from('odecty_vodomeru')
        .upsert(parsed.vodomery.map(vodomer => ({
          vyuctovani_id: vyuctovani.id,
          jednotka_id: item.jednotkaId,
          cislo_merice: vodomer.cisloMerice,
          typ: vodomer.typ,
          datum_od: vodomer.datumOd,
          datum_do: vodomer.datumDo,
          pocatecni_stav: vodomer.pocatecniStav,
          koncovy_stav: vodomer.koncovyStav,
          spotreba: vodomer.spotreba,
        })), { onConflict: 'vyuctovani_id,cislo_merice,datum_od,datum_do' })

      if (odectyError) {
        return NextResponse.json({ error: odectyError.message }, { status: 500 })
      }
    }

    saved.push(vyuctovani.id)
  }

  return NextResponse.json({ saved })
}
