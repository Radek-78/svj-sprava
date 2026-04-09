import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import UpravitOsobuForm from './UpravitOsobuForm'

export default async function UpravitOsobuPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: osoba } = await supabase.from('osoby').select('*').eq('id', id).single()
  if (!osoba) notFound()

  return (
    <div className="p-8 max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/dashboard/osoby/${id}`} className="text-sm text-gray-500 hover:text-gray-700">← Zpět</Link>
        <h2 className="text-2xl font-bold text-gray-900">Upravit osobu</h2>
      </div>
      <UpravitOsobuForm osoba={osoba} />
    </div>
  )
}
