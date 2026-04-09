import { createClient } from '@/lib/supabase/server'
import OsobyClient from './OsobyClient'

export default async function OsobyPage() {
  const supabase = await createClient()

  const { data: osoby } = await supabase
    .from('osoby')
    .select('*')
    .order('prijmeni')

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <OsobyClient osoby={osoby ?? []} />
    </div>
  )
}
