import { createClient } from '@/lib/supabase/server'
import JednotkyClient from './JednotkyClient'

export default async function JednotkyPage() {
  const supabase = await createClient()

  const { data: jednotky } = await supabase
    .from('jednotky')
    .select(`*, vlastnici!left(je_aktivni, osoby(id, jmeno, prijmeni)), najemnici!left(je_aktivni)`)
    .order('cislo_jednotky')

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <JednotkyClient jednotky={jednotky ?? []} />
    </div>
  )
}
