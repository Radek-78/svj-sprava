import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function OsobyPage() {
  const supabase = await createClient()
  const { data: osoby } = await supabase
    .from('osoby')
    .select('*')
    .order('prijmeni')

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Osoby</h2>
        <Link
          href="/dashboard/osoby/nova"
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          + Přidat osobu
        </Link>
      </div>

      {(!osoby || osoby.length === 0) ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-sm">Zatím nejsou evidovány žádné osoby.</p>
          <Link href="/dashboard/osoby/nova" className="inline-block mt-4 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Přidat první osobu
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Jméno</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">E-mail</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Telefon</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {osoby.map(o => (
                <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{o.prijmeni} {o.jmeno}</td>
                  <td className="px-4 py-3 text-gray-600">{o.email || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{o.telefon || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/dashboard/osoby/${o.id}`} className="text-blue-600 hover:text-blue-800 text-xs font-medium">
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
