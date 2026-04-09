import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [{ count: pocetJednotek }, { count: pocetOsob }] = await Promise.all([
    supabase.from('jednotky').select('*', { count: 'exact', head: true }),
    supabase.from('osoby').select('*', { count: 'exact', head: true }),
  ])

  return (
    <div className="p-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Přehled</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Bytové jednotky</p>
          <p className="text-3xl font-semibold text-gray-900 mt-1">{pocetJednotek ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Evidované osoby</p>
          <p className="text-3xl font-semibold text-gray-900 mt-1">{pocetOsob ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Fond oprav</p>
          <p className="text-3xl font-semibold text-gray-900 mt-1">—</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-sm text-blue-800">
        Vítejte v systému správy SVJ. Začněte přidáním bytových jednotek v sekci <strong>Jednotky</strong>.
      </div>
    </div>
  )
}
