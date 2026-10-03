import { createClient } from '@/lib/supabase/server'
import KatastrClient from './KatastrClient'

export default async function KatastrPage() {
  const supabase = await createClient()

  const [{ data: jednotky }, { data: vypisy, error }] = await Promise.all([
    supabase
      .from('jednotky')
      .select(`
        id, cislo_jednotky, podil_citatel, podil_jmenovatel,
        jednotky_osoby(role, typ_vlastnictvi, je_aktivni, osoby(jmeno, prijmeni))
      `)
      .order('cislo_jednotky'),
    supabase
      .from('katastr_vypisy')
      .select('id, created_at, poznamka, pocet_zaznamu, zaznamy')
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <KatastrClient
        jednotky={(jednotky ?? []) as never}
        vypisy={(vypisy ?? []) as never}
        initialError={error?.message ?? null}
      />
    </div>
  )
}
