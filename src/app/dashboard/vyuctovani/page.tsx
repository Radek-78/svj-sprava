import { createClient } from '@/lib/supabase/server'
import VyuctovaniClient from './VyuctovaniClient'

export default async function VyuctovaniPage() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('vyuctovani_sluzeb')
    .select(`
      *,
      osoby(id, jmeno, prijmeni, email),
      jednotky(id, cislo_jednotky, vchod, ulice_vchodu),
      odecty_vodomeru(*)
    `)
    .order('obdobi_od', { ascending: true })

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <VyuctovaniClient initialVyuctovani={data ?? []} initialError={error?.message ?? null} />
    </div>
  )
}
