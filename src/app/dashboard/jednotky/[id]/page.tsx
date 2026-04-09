import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import DeleteJednotkaButton from './DeleteJednotkaButton'

export default async function JednotkaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: jednotka } = await supabase
    .from('jednotky')
    .select('*')
    .eq('id', id)
    .single()

  if (!jednotka) notFound()

  // Načtení vlastníků a nájemníků
  const { data: vlastnici } = await supabase
    .from('vlastnici')
    .select('*, osoby(*)')
    .eq('jednotka_id', id)
    .eq('je_aktivni', true)

  const { data: najemnici } = await supabase
    .from('najemnici')
    .select('*, osoby(*)')
    .eq('jednotka_id', id)
    .eq('je_aktivni', true)

  return (
    <div className="p-8 max-w-2xl">
      {/* Hlavička */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/jednotky" className="text-sm text-gray-500 hover:text-gray-700">
          ← Zpět
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">
          Jednotka {jednotka.cislo_jednotky}
        </h2>
      </div>

      {/* Základní info */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Základní informace</h3>
          <Link
            href={`/dashboard/jednotky/${id}/upravit`}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Upravit
          </Link>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Číslo jednotky</dt>
            <dd className="mt-1 text-gray-900 font-medium">{jednotka.cislo_jednotky}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Patro</dt>
            <dd className="mt-1 text-gray-900">{jednotka.patro ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Výměra</dt>
            <dd className="mt-1 text-gray-900">{jednotka.vymera_m2} m²</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Vlastnický podíl</dt>
            <dd className="mt-1 text-gray-900">{jednotka.podil_citatel}/{jednotka.podil_jmenovatel}</dd>
          </div>
          {jednotka.poznamka && (
            <div className="col-span-2">
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Poznámka</dt>
              <dd className="mt-1 text-gray-900">{jednotka.poznamka}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Vlastníci */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Vlastník</h3>
          <Link
            href={`/dashboard/jednotky/${id}/pridat-vlastnika`}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            + Přiřadit vlastníka
          </Link>
        </div>
        {(!vlastnici || vlastnici.length === 0) ? (
          <p className="text-sm text-gray-400">Žádný vlastník není přiřazen.</p>
        ) : (
          <ul className="space-y-3">
            {vlastnici.map(v => (
              <li key={v.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{v.osoby.jmeno} {v.osoby.prijmeni}</p>
                  <p className="text-sm text-gray-500">
                    {v.osoby.email && <span className="mr-3">{v.osoby.email}</span>}
                    {v.osoby.telefon && <span>{v.osoby.telefon}</span>}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Vlastník od {v.datum_od}</p>
                </div>
                <Link href={`/dashboard/osoby/${v.osoby.id}`} className="text-xs text-blue-600 hover:text-blue-800">
                  Detail osoby →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Nájemníci */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Nájemník</h3>
          <Link
            href={`/dashboard/jednotky/${id}/pridat-najemnika`}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            + Přiřadit nájemníka
          </Link>
        </div>
        {(!najemnici || najemnici.length === 0) ? (
          <p className="text-sm text-gray-400">Žádný nájemník není přiřazen.</p>
        ) : (
          <ul className="space-y-3">
            {najemnici.map(n => (
              <li key={n.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{n.osoby.jmeno} {n.osoby.prijmeni}</p>
                  <p className="text-sm text-gray-500">
                    {n.osoby.email && <span className="mr-3">{n.osoby.email}</span>}
                    {n.osoby.telefon && <span>{n.osoby.telefon}</span>}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Nájemník od {n.datum_od}</p>
                </div>
                <Link href={`/dashboard/osoby/${n.osoby.id}`} className="text-xs text-blue-600 hover:text-blue-800">
                  Detail osoby →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Smazání */}
      <div className="bg-white rounded-xl border border-red-100 shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-1">Nebezpečná zóna</h3>
        <p className="text-sm text-gray-500 mb-4">Smazání jednotky je nevratné.</p>
        <DeleteJednotkaButton id={id} cislo={jednotka.cislo_jednotky} />
      </div>
    </div>
  )
}
