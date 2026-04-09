import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [{ count: pocetJednotek }, { count: pocetOsob }, { count: pocetSVlastnikem }, { count: pocetSNajemnikem }] = await Promise.all([
    supabase.from('jednotky').select('*', { count: 'exact', head: true }),
    supabase.from('osoby').select('*', { count: 'exact', head: true }),
    supabase.from('vlastnici').select('*', { count: 'exact', head: true }).eq('je_aktivni', true),
    supabase.from('najemnici').select('*', { count: 'exact', head: true }).eq('je_aktivni', true),
  ])

  const obsazenostProcent = pocetJednotek ? Math.round(((pocetSVlastnikem ?? 0) / pocetJednotek) * 100) : 0

  return (
    <div className="p-8">
      {/* Hlavička */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Přehled</h1>
        <p className="text-zinc-500 text-sm mt-1">SVJ Spojovací 557 — aktuální stav správy</p>
      </div>

      {/* Statistiky */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatKarta
          label="Bytové jednotky"
          hodnota={pocetJednotek ?? 0}
          barva="violet"
          ikona={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />
        <StatKarta
          label="Evidované osoby"
          hodnota={pocetOsob ?? 0}
          barva="blue"
          ikona={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <StatKarta
          label="Obsazeno vlastníky"
          hodnota={pocetSVlastnikem ?? 0}
          barva="emerald"
          ikona={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatKarta
          label="S nájemníkem"
          hodnota={pocetSNajemnikem ?? 0}
          barva="amber"
          ikona={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          }
        />
      </div>

      {/* Obsazenost */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-zinc-900">Obsazenost jednotek</h3>
            <p className="text-sm text-zinc-500 mt-0.5">Podíl jednotek s přiřazeným vlastníkem</p>
          </div>
          <span className="text-2xl font-bold text-zinc-900">{obsazenostProcent}%</span>
        </div>
        <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-violet-400 rounded-full transition-all duration-700"
            style={{ width: `${obsazenostProcent}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-zinc-400 mt-2">
          <span>{pocetSVlastnikem} obsazeno</span>
          <span>{(pocetJednotek ?? 0) - (pocetSVlastnikem ?? 0)} bez vlastníka</span>
        </div>
      </div>

      {/* Rychlé akce */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/dashboard/jednotky" className="group bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm hover:border-violet-300 hover:shadow-md transition-all duration-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center group-hover:bg-violet-100 transition-colors">
              <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <span className="font-semibold text-zinc-900">Správa jednotek</span>
          </div>
          <p className="text-sm text-zinc-500">Zobrazit a spravovat všechny bytové jednotky</p>
        </Link>

        <Link href="/dashboard/osoby" className="group bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm hover:border-blue-300 hover:shadow-md transition-all duration-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="font-semibold text-zinc-900">Evidence osob</span>
          </div>
          <p className="text-sm text-zinc-500">Vlastníci, nájemníci a jejich kontakty</p>
        </Link>
      </div>
    </div>
  )
}

function StatKarta({ label, hodnota, barva, ikona }: {
  label: string
  hodnota: number
  barva: 'violet' | 'blue' | 'emerald' | 'amber'
  ikona: React.ReactNode
}) {
  const barvy = {
    violet: { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-t-violet-500' },
    blue:   { bg: 'bg-blue-50',   text: 'text-blue-600',   border: 'border-t-blue-500' },
    emerald:{ bg: 'bg-emerald-50',text: 'text-emerald-600',border: 'border-t-emerald-500' },
    amber:  { bg: 'bg-amber-50',  text: 'text-amber-600',  border: 'border-t-amber-500' },
  }
  const b = barvy[barva]

  return (
    <div className={`bg-white rounded-2xl border border-zinc-200 border-t-2 ${b.border} p-5 shadow-sm`}>
      <div className={`w-9 h-9 rounded-xl ${b.bg} flex items-center justify-center mb-3`}>
        <span className={b.text}>{ikona}</span>
      </div>
      <p className="text-3xl font-bold text-zinc-900 mb-1">{hodnota}</p>
      <p className="text-xs text-zinc-500 font-medium">{label}</p>
    </div>
  )
}
