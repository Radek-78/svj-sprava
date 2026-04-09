import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function OsobaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: osoba } = await supabase.from('osoby').select('*').eq('id', id).single()
  if (!osoba) notFound()

  const { data: jednotkyVlastnik } = await supabase
    .from('vlastnici')
    .select('*, jednotky(*)')
    .eq('osoba_id', id)
    .eq('je_aktivni', true)

  const { data: jednotkyNajemnik } = await supabase
    .from('najemnici')
    .select('*, jednotky(*)')
    .eq('osoba_id', id)
    .eq('je_aktivni', true)

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/osoby" className="text-sm text-gray-500 hover:text-gray-700">← Zpět</Link>
        <h2 className="text-2xl font-bold text-gray-900">{osoba.jmeno} {osoba.prijmeni}</h2>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Kontaktní údaje</h3>
          <Link href={`/dashboard/osoby/${id}/upravit`} className="text-sm text-blue-600 hover:text-blue-800 font-medium">Upravit</Link>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Jméno</dt>
            <dd className="mt-1 text-gray-900">{osoba.jmeno} {osoba.prijmeni}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">E-mail</dt>
            <dd className="mt-1 text-gray-900">{osoba.email || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Telefon</dt>
            <dd className="mt-1 text-gray-900">{osoba.telefon || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Adresa</dt>
            <dd className="mt-1 text-gray-900">
              {osoba.adresa_ulice ? (
                <>{osoba.adresa_ulice}<br />{osoba.adresa_psc} {osoba.adresa_mesto}</>
              ) : '—'}
            </dd>
          </div>
          {osoba.poznamka && (
            <div className="col-span-2">
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Poznámka</dt>
              <dd className="mt-1 text-gray-900">{osoba.poznamka}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Jednotky jako vlastník */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-5">
        <h3 className="font-semibold text-gray-900 mb-4">Vlastník jednotky</h3>
        {(!jednotkyVlastnik || jednotkyVlastnik.length === 0) ? (
          <p className="text-sm text-gray-400">Není vlastníkem žádné jednotky.</p>
        ) : (
          <ul className="space-y-2">
            {jednotkyVlastnik.map(v => (
              <li key={v.id} className="flex items-center justify-between">
                <span className="text-gray-900 font-medium">Jednotka {v.jednotky.cislo_jednotky}</span>
                <Link href={`/dashboard/jednotky/${v.jednotky.id}`} className="text-xs text-blue-600 hover:text-blue-800">Detail →</Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Jednotky jako nájemník */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Nájemník v jednotce</h3>
        {(!jednotkyNajemnik || jednotkyNajemnik.length === 0) ? (
          <p className="text-sm text-gray-400">Není nájemníkem žádné jednotky.</p>
        ) : (
          <ul className="space-y-2">
            {jednotkyNajemnik.map(n => (
              <li key={n.id} className="flex items-center justify-between">
                <span className="text-gray-900 font-medium">Jednotka {n.jednotky.cislo_jednotky}</span>
                <Link href={`/dashboard/jednotky/${n.jednotky.id}`} className="text-xs text-blue-600 hover:text-blue-800">Detail →</Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
