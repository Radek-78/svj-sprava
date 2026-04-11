import { createClient } from '@/lib/supabase/server'
import OsobyClient from './OsobyClient'

export default async function OsobyPage({ searchParams }: { searchParams: Promise<{ open?: string }> }) {
  const supabase = await createClient()
  const { open } = await searchParams

  const { data: osoby } = await supabase
    .from('osoby')
    .select(`
      *,
      jednotky_osoby(
        id, role, typ_vlastnictvi, podil_citatel, podil_jmenovatel, datum_od, datum_do, je_aktivni,
        jednotky(id, cislo_jednotky, ulice_vchodu, vchod)
      )
    `)
    .order('prijmeni')

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <OsobyClient osoby={osoby ?? []} openId={open} />
    </div>
  )
}
