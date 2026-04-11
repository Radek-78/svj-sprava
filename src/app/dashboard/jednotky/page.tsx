import { createClient } from '@/lib/supabase/server'
import JednotkyClient from './JednotkyClient'

export default async function JednotkyPage({ searchParams }: { searchParams: Promise<{ open?: string }> }) {
  const supabase = await createClient()
  const { open } = await searchParams

  const { data: jednotky } = await supabase
    .from('jednotky')
    .select(`
      *,
      jednotky_osoby(
        id, role, typ_vlastnictvi, podil_citatel, podil_jmenovatel, datum_od, datum_do, je_aktivni,
        osoby(id, jmeno, prijmeni, email, telefon)
      ),
      jednotky_cipy(
        id, cislo_cipu, poznamka, osoba_id, externi_prijemce, datum_predani,
        osoby(id, jmeno, prijmeni)
      )
    `)
    .order('cislo_jednotky')

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <JednotkyClient jednotky={jednotky ?? []} openId={open} />
    </div>
  )
}
