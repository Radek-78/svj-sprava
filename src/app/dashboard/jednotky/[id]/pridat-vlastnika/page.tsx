import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import PridatVlastnikaForm from './PridatVlastnikaForm'

export default async function PridatVlastnikaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: jednotka } = await supabase.from('jednotky').select('*').eq('id', id).single()
  if (!jednotka) notFound()

  const { data: osoby } = await supabase.from('osoby').select('id, jmeno, prijmeni').order('prijmeni')

  return (
    <div className="p-8 max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/dashboard/jednotky/${id}`} className="text-sm text-gray-500 hover:text-gray-700">← Zpět</Link>
        <h2 className="text-2xl font-bold text-gray-900">Přiřadit vlastníka</h2>
      </div>
      <p className="text-sm text-gray-500 mb-6">Jednotka <strong>{jednotka.cislo_jednotky}</strong></p>
      <PridatVlastnikaForm jednotkaId={id} osoby={osoby ?? []} />
    </div>
  )
}
