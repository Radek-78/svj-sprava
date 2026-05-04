'use client'

// ─── Typy ────────────────────────────────────────────────────────────────────

type StatPill = {
  label: string
  value: number | string
  dot?: 'emerald' | 'amber' | 'sky' | 'zinc'
  color?: 'emerald' | 'amber' | 'sky' | 'zinc'
  active?: boolean
  onClick?: () => void
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
  zinc:    'bg-zinc-400',
}

const PILL_COLORS = {
  emerald: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  amber:   'bg-amber-50 text-amber-800 ring-amber-200',
  sky:     'bg-sky-50 text-sky-800 ring-sky-200',
  zinc:    'bg-zinc-100 text-zinc-700 ring-zinc-200',
}

// ─── Komponenta ───────────────────────────────────────────────────────────────

export default function PageShell({ title, stats, actions, children }: PageShellProps) {
  return (
    <div className="h-full flex flex-col overflow-hidden bg-zinc-50">

      {/* Hlavička — pevná výška 56px, identická u všech záložek */}
      <div className="bg-white/[0.92] border-b border-zinc-200/80 px-6 flex-shrink-0 shadow-[0_1px_0_rgba(255,255,255,0.9),0_12px_28px_rgba(15,23,42,0.05)]" style={{ height: 64 }}>
        <div className="h-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="h-8 w-1 rounded-full bg-emerald-500" />
              <h1 className="text-base font-black text-zinc-950 whitespace-nowrap tracking-tight">{title}</h1>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto py-2">
              {stats.map((s, i) => {
                const content = (
                  <>
                    {s.dot && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${DOT_COLORS[s.dot]}`} />}
                    <span className="font-semibold">{s.value}</span>
                    {s.label}
                  </>
                )
                const className = `inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ring-1 ${
                  s.active ? 'ring-2 ring-emerald-500 ring-offset-1 shadow-sm' : ''
                } ${PILL_COLORS[s.color ?? 'zinc']}`
                return s.onClick ? (
                  <button key={i} type="button" onClick={s.onClick} className={`${className} hover:-translate-y-0.5 hover:shadow-sm hover:ring-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1`}>
                    {content}
                  </button>
                ) : (
                  <span key={i} className={className}>
                    {content}
                  </span>
                )
              })}
            </div>
          </div>
          {actions && (
            <div className="flex items-center gap-3 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      </div>

      {/* Obsah */}
      <div className="flex-1 overflow-auto bg-white">
        {children}
      </div>

    </div>
  )
}

// ─── Sub-komponenty pro tabulku ───────────────────────────────────────────────

export function PageTable({ children }: { children: React.ReactNode }) {
  return (
    <table className="w-full text-sm border-separate border-spacing-0">
      {children}
    </table>
  )
}

export function PageThead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="sticky top-0 bg-zinc-100/95 border-b border-zinc-200 z-10 shadow-[0_1px_0_rgba(212,212,216,0.9)]">
      <tr>{children}</tr>
    </thead>
  )
}

export function PageTh({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <th className={`${center ? 'text-center' : 'text-left'} px-4 py-3 text-[11px] font-black text-zinc-500 uppercase tracking-[0.08em] first:pl-6`}>
      {children}
    </th>
  )
}

export function PageTbody({ children }: { children: React.ReactNode }) {
  return (
    <tbody>
      {children}
    </tbody>
  )
}

export function PageTr({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <tr
      onClick={onClick}
      className="odd:bg-white even:bg-zinc-50/70 hover:bg-emerald-50/70 cursor-pointer transition-colors group border-b border-zinc-100 last:border-0"
    >
      {children}
    </tr>
  )
}

export function PageTd({ children, center, className }: { children: React.ReactNode; center?: boolean; className?: string }) {
  return (
    <td className={`px-4 py-3.5 text-zinc-600 first:pl-6 border-b border-zinc-100/80 ${center ? 'text-center' : ''} ${className ?? ''}`}>
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
      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-950 text-white text-sm font-bold hover:bg-zinc-800 transition-all shadow-sm hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
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
        className="pl-8 pr-3 py-2 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white w-56 shadow-sm placeholder:text-zinc-400"
      />
    </div>
  )
}
