import { createClient } from '@/lib/supabase/server'
import OsobyClient from './OsobyClient'

export default async function OsobyPage() {
  const supabase = await createClient()

  const { data: osoby } = await supabase
    .from('osoby')
    .select(`
      *,
      jednotky_osoby(
        id, role, typ_vlastnictvi, podil_citatel, podil_jmenovatel, datum_od, datum_do, je_aktivni,
        jednotky(id, cislo_jednotky, ulice_vchodu)
      )
    `)
    .order('prijmeni')

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <OsobyClient osoby={osoby ?? []} />
    </div>
  )
}
