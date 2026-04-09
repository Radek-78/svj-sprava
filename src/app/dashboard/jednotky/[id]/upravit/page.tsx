import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import UpravitJednotkuForm from './UpravitJednotkuForm'
import Link from 'next/link'

export default async function UpravitJednotkuPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: jednotka } = await supabase
    .from('jednotky')
    .select('*')
    .eq('id', id)
    .single()

  if (!jednotka) notFound()

  return (
    <div className="p-8 max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/dashboard/jednotky/${id}`} className="text-sm text-gray-500 hover:text-gray-700">
          ← Zpět
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">Upravit jednotku {jednotka.cislo_jednotky}</h2>
      </div>
      <UpravitJednotkuForm jednotka={jednotka} />
    </div>
  )
}
