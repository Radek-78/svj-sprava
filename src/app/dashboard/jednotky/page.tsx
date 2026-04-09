import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function JednotkyPage() {
  const supabase = await createClient()
  const { data: jednotky } = await supabase
    .from('jednotky')
    .select('*')
    .order('cislo_jednotky')

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Bytové jednotky</h2>
        <Link
          href="/dashboard/jednotky/nova"
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Přidat jednotku
        </Link>
      </div>

      {(!jednotky || jednotky.length === 0) ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-sm">Zatím nejsou přidány žádné jednotky.</p>
          <Link
            href="/dashboard/jednotky/nova"
            className="inline-block mt-4 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Přidat první jednotku
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Číslo</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Patro</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Výměra</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Podíl</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {jednotky.map(j => (
                <tr key={j.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{j.cislo_jednotky}</td>
                  <td className="px-4 py-3 text-gray-600">{j.patro ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{j.vymera_m2} m²</td>
                  <td className="px-4 py-3 text-gray-600">{j.podil_citatel}/{j.podil_jmenovatel}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/dashboard/jednotky/${j.id}`} className="text-blue-600 hover:text-blue-800 text-xs">
                      Detail →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
