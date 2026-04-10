'use client'

// ─── Typy ────────────────────────────────────────────────────────────────────

type StatPill = {
  label: string
  value: number | string
  dot?: 'emerald' | 'amber' | 'sky' | 'zinc'
  color?: 'emerald' | 'amber' | 'sky' | 'zinc'
}

type PageShellProps = {
  title: string
  stats: StatPill[]
  actions?: React.ReactNode
  children: React.ReactNode
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DOT_COLORS = {
  emerald: 'bg-emerald-400',
  amber:   'bg-amber-400',
  sky:     'bg-sky-400',
  zinc:    'bg-zinc-300',
}

const PILL_COLORS = {
  emerald: 'bg-emerald-50 text-emerald-700',
  amber:   'bg-amber-50 text-amber-700',
  sky:     'bg-sky-50 text-sky-700',
  zinc:    'bg-zinc-100 text-zinc-600',
}

// ─── Komponenta ───────────────────────────────────────────────────────────────

export default function PageShell({ title, stats, actions, children }: PageShellProps) {
  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* Hlavička */}
      <div className="bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-base font-semibold text-zinc-900">{title}</h1>
          <div className="flex items-center gap-2">
            {stats.map((s, i) => (
              <span
                key={i}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${PILL_COLORS[s.color ?? 'zinc']}`}
              >
                {s.dot && <span className={`w-1.5 h-1.5 rounded-full ${DOT_COLORS[s.dot]}`} />}
                <span className="font-semibold">{s.value}</span>
                {s.label}
              </span>
            ))}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-3">
            {actions}
          </div>
        )}
      </div>

      {/* Obsah */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>

    </div>
  )
}

// ─── Sub-komponenty pro tabulku ───────────────────────────────────────────────

export function PageTable({ children }: { children: React.ReactNode }) {
  return (
    <table className="w-full text-sm">
      {children}
    </table>
  )
}

export function PageThead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="sticky top-0 bg-zinc-50 border-b border-zinc-200 z-10">
      <tr>{children}</tr>
    </thead>
  )
}

export function PageTh({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <th className={`${center ? 'text-center' : 'text-left'} px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide first:pl-6`}>
      {children}
    </th>
  )
}

export function PageTbody({ children }: { children: React.ReactNode }) {
  return (
    <tbody className="divide-y divide-zinc-100">
      {children}
    </tbody>
  )
}

export function PageTr({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <tr
      onClick={onClick}
      className="hover:bg-violet-50/50 cursor-pointer transition-colors group"
    >
      {children}
    </tr>
  )
}

export function PageTd({ children, center, className }: { children: React.ReactNode; center?: boolean; className?: string }) {
  return (
    <td className={`px-4 py-3.5 text-zinc-600 first:pl-6 ${center ? 'text-center' : ''} ${className ?? ''}`}>
      {children}
    </td>
  )
}

export function PageEmpty({ text }: { text: string }) {
  return (
    <tr>
      <td colSpan={99} className="text-center py-16 text-zinc-400 text-sm">
        {text}
      </td>
    </tr>
  )
}

// ─── Tlačítko Přidat ─────────────────────────────────────────────────────────

export function AddButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
      {children}
    </button>
  )
}

// ─── Vyhledávací pole ─────────────────────────────────────────────────────────

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-8 pr-3 py-1.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white w-52"
      />
    </div>
  )
}
