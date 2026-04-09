import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function JednotkyPage() {
  const supabase = await createClient()

  const { data: jednotky } = await supabase
    .from('jednotky')
    .select(`
      *,
      vlastnici!left(osoba_id, je_aktivni, osoby(jmeno, prijmeni)),
      najemnici!left(je_aktivni)
    `)
    .order('cislo_jednotky')

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Bytové jednotky</h2>
        <div className="flex gap-2">
          <Link href="/dashboard/jednotky/import" className="border border-gray-300 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors font-medium">
            Import z Excelu
          </Link>
          <Link href="/dashboard/jednotky/nova" className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
            + Přidat jednotku
          </Link>
        </div>
      </div>

      {(!jednotky || jednotky.length === 0) ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-sm">Zatím nejsou přidány žádné jednotky.</p>
          <Link href="/dashboard/jednotky/nova" className="inline-block mt-4 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Přidat první jednotku
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 160px)' }}>
          <div className="overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Číslo</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-16">Patro</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Výměra</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Podíl</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Vlastník</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Obsazení</th>
                  <th className="px-4 py-2.5 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {jednotky.map(j => {
                  const aktivniVlastnici = (j.vlastnici ?? []).filter((v: {je_aktivni: boolean}) => v.je_aktivni)
                  const maNajemnika = (j.najemnici ?? []).some((n: {je_aktivni: boolean}) => n.je_aktivni)

                  return (
                    <tr key={j.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-4 py-2 font-semibold text-gray-900">{j.cislo_jednotky}</td>
                      <td className="px-4 py-2 text-gray-500">{j.patro ?? '—'}</td>
                      <td className="px-4 py-2 text-gray-600">{j.vymera_m2} m²</td>
                      <td className="px-4 py-2 text-gray-500 tabular-nums">{j.podil_citatel}/{j.podil_jmenovatel}</td>
                      <td className="px-4 py-2">
                        {aktivniVlastnici.length === 0 ? (
                          <span className="text-gray-400 text-xs italic">Neuvedeno</span>
                        ) : (
                          <span className="text-gray-900">
                            {aktivniVlastnici.map((v: {osoba_id: string, osoby: {jmeno: string, prijmeni: string}}, i: number) => (
                              <span key={i}>{i > 0 && ', '}{v.osoby.prijmeni} {v.osoby.jmeno}</span>
                            ))}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {maNajemnika ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>Nájemník
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>Vlastník
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Link href={`/dashboard/jednotky/${j.id}`} className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                          Detail →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">
            Celkem {jednotky.length} jednotek
          </div>
        </div>
      )}
    </div>
  )
}
