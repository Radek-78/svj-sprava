import { createClient } from '@/lib/supabase/server'
import VyuctovaniClient from './VyuctovaniClient'

export default async function VyuctovaniPage({ searchParams }: { searchParams: Promise<{ open?: string }> }) {
  const supabase = await createClient()
  const { open } = await searchParams

  const [{ data, error }, { data: jednotky }] = await Promise.all([
    supabase
      .from('vyuctovani_sluzeb')
      .select(`
        *,
        osoby(id, jmeno, prijmeni, email),
        jednotky(id, cislo_jednotky, vchod, ulice_vchodu),
        odecty_vodomeru(*)
      `)
      .order('obdobi_od', { ascending: true }),
    supabase
      .from('jednotky')
      .select('id, cislo_jednotky')
      .order('cislo_jednotky'),
  ])

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <VyuctovaniClient initialVyuctovani={data ?? []} jednotky={jednotky ?? []} initialError={error?.message ?? null} openId={open} />
    </div>
  )
}
