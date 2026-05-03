import { createClient } from '@/lib/supabase/server'
import CipyClient from './CipyClient'

export default async function CipyPage() {
  const supabase = await createClient()

  const [{ data: cipy }, { data: jednotky }, { data: osoby }] = await Promise.all([
    supabase
      .from('jednotky_cipy')
      .select(`
        id, cislo_cipu, stav, poznamka, osoba_id, externi_prijemce, datum_predani, jednotka_id,
        osoby(id, jmeno, prijmeni),
        jednotky(id, cislo_jednotky, vchod, ulice_vchodu)
      `)
      .order('cislo_cipu'),
    supabase
      .from('jednotky')
      .select('id, cislo_jednotky, vchod, ulice_vchodu')
      .order('cislo_jednotky'),
    supabase
      .from('osoby')
      .select('id, jmeno, prijmeni')
      .order('prijmeni'),
  ])

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <CipyClient cipy={cipy ?? []} jednotky={jednotky ?? []} osoby={osoby ?? []} />
    </div>
  )
}
