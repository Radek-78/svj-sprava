import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [
    { count: pocetJednotek },
    { count: pocetOsob },
    { count: pocetSVlastnikem },
    { count: pocetSNajemnikem },
  ] = await Promise.all([
    supabase.from('jednotky').select('*', { count: 'exact', head: true }),
    supabase.from('osoby').select('*', { count: 'exact', head: true }),
    supabase.from('vlastnici').select('*', { count: 'exact', head: true }).eq('je_aktivni', true),
    supabase.from('najemnici').select('*', { count: 'exact', head: true }).eq('je_aktivni', true),
  ])

  const obsazenost = pocetJednotek ? Math.round(((pocetSVlastnikem ?? 0) / pocetJednotek) * 100) : 0

  const stats = [
    { label: 'Bytové jednotky', value: pocetJednotek ?? 0, href: '/dashboard/jednotky', color: 'violet', icon: '🏢' },
    { label: 'Evidované osoby', value: pocetOsob ?? 0, href: '/dashboard/osoby', color: 'blue', icon: '👥' },
    { label: 'Obsazeno vlastníky', value: pocetSVlastnikem ?? 0, href: '/dashboard/jednotky', color: 'emerald', icon: '✓' },
    { label: 'S nájemníkem', value: pocetSNajemnikem ?? 0, href: '/dashboard/jednotky', color: 'amber', icon: '⚿' },
  ]

  const colorMap: Record<string, { card: string; badge: string; bar: string; text: string }> = {
    violet:  { card: 'border-violet-200 bg-violet-50/50',  badge: 'bg-violet-100 text-violet-700',  bar: 'bg-violet-500', text: 'text-violet-700' },
    blue:    { card: 'border-blue-200 bg-blue-50/50',      badge: 'bg-blue-100 text-blue-700',      bar: 'bg-blue-500',   text: 'text-blue-700' },
    emerald: { card: 'border-emerald-200 bg-emerald-50/50',badge: 'bg-emerald-100 text-emerald-700',bar: 'bg-emerald-500',text: 'text-emerald-700' },
    amber:   { card: 'border-amber-200 bg-amber-50/50',    badge: 'bg-amber-100 text-amber-700',    bar: 'bg-amber-500',  text: 'text-amber-700' },
  }

  return (
    <div className="max-w-5xl mx-auto px-8 py-8">
      {/* Nadpis */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Přehled</h1>
        <p className="text-zinc-500 text-sm mt-1">Aktuální stav SVJ Spojovací 557</p>
      </div>

      {/* Stat karty */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(s => {
          const c = colorMap[s.color]
          return (
            <Link key={s.label} href={s.href}
              className={`group rounded-2xl border ${c.card} p-5 hover:shadow-md transition-all duration-200 cursor-pointer`}>
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${c.badge} text-xl mb-3`}>
                {s.icon}
              </div>
              <p className="text-3xl font-bold text-zinc-900 mb-1">{s.value}</p>
              <p className={`text-xs font-medium ${c.text}`}>{s.label}</p>
            </Link>
          )
        })}
      </div>

      {/* Obsazenost */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-semibold text-zinc-900">Obsazenost jednotek</h3>
            <p className="text-sm text-zinc-500 mt-0.5">Podíl bytů s přiřazeným vlastníkem</p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-bold text-zinc-900">{obsazenost}</span>
            <span className="text-zinc-400 text-lg font-light">%</span>
          </div>
        </div>
        <div className="h-3 bg-zinc-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-violet-600 to-violet-400 rounded-full transition-all"
            style={{ width: `${obsazenost}%` }} />
        </div>
        <div className="flex justify-between text-xs text-zinc-400 mt-2">
          <span>{pocetSVlastnikem} obsazeno</span>
          <span>{(pocetJednotek ?? 0) - (pocetSVlastnikem ?? 0)} bez vlastníka</span>
        </div>
      </div>

      {/* Rychlé akce */}
      <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest mb-3">Rychlé akce</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link href="/dashboard/jednotky/nova"
          className="flex items-center gap-4 bg-white rounded-2xl border border-zinc-200 p-4 hover:border-violet-300 hover:shadow-md transition-all group">
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center group-hover:bg-violet-100 transition-colors flex-shrink-0">
            <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-zinc-900 text-sm">Přidat jednotku</p>
            <p className="text-xs text-zinc-500">Zadat novou bytovou jednotku</p>
          </div>
        </Link>
        <Link href="/dashboard/osoby/nova"
          className="flex items-center gap-4 bg-white rounded-2xl border border-zinc-200 p-4 hover:border-blue-300 hover:shadow-md transition-all group">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors flex-shrink-0">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-zinc-900 text-sm">Přidat osobu</p>
            <p className="text-xs text-zinc-500">Zadat vlastníka nebo nájemníka</p>
          </div>
        </Link>
        <Link href="/dashboard/jednotky/import"
          className="flex items-center gap-4 bg-white rounded-2xl border border-zinc-200 p-4 hover:border-emerald-300 hover:shadow-md transition-all group">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors flex-shrink-0">
            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-zinc-900 text-sm">Import jednotek</p>
            <p className="text-xs text-zinc-500">Hromadný import z Excel souboru</p>
          </div>
        </Link>
        <Link href="/dashboard/osoby/import"
          className="flex items-center gap-4 bg-white rounded-2xl border border-zinc-200 p-4 hover:border-amber-300 hover:shadow-md transition-all group">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors flex-shrink-0">
            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-zinc-900 text-sm">Import osob</p>
            <p className="text-xs text-zinc-500">Hromadný import kontaktů z Excelu</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
