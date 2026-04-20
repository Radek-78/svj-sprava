'use client'

import React from 'react'

export type EditForm = {
  jmeno: string
  prijmeni: string
  titul: string
  email: string
  telefon: string
  kontaktni_ulice: string
  kontaktni_mesto: string
  kontaktni_psc: string
  poznamka: string
}

export const EMPTY_FORM: EditForm = {
  jmeno: '', prijmeni: '', titul: '', email: '', telefon: '',
  kontaktni_ulice: 'Spojovací 557/', kontaktni_mesto: 'Milovice', kontaktni_psc: '289 24', poznamka: '',
}

export const INPUT = 'w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white'
export const LABEL = 'block text-xs font-medium text-zinc-500 mb-1'

type OsobaFormProps = {
  editForm: EditForm
  setEditForm: React.Dispatch<React.SetStateAction<EditForm>>
  onCancel: () => void
  ukladani: boolean
  chyba: string
  onSubmit: (e: React.FormEvent) => void
  submitLabel: string
}

export default function OsobaForm({ 
  editForm, 
  setEditForm, 
  onCancel, 
  ukladani, 
  chyba, 
  onSubmit, 
  submitLabel 
}: OsobaFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={LABEL}>Titul</label>
          <input className={INPUT} value={editForm.titul} onChange={e => setEditForm(f => ({ ...f, titul: e.target.value }))} placeholder="Ing., Mgr., …" />
        </div>
        <div>
          <label className={LABEL}>Jméno</label>
          <input className={INPUT} value={editForm.jmeno} onChange={e => setEditForm(f => ({ ...f, jmeno: e.target.value }))} placeholder="Jméno" />
        </div>
        <div>
          <label className={LABEL}>Příjmení *</label>
          <input className={INPUT} required value={editForm.prijmeni} onChange={e => setEditForm(f => ({ ...f, prijmeni: e.target.value }))} placeholder="Příjmení" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>E-mail</label>
          <input className={INPUT} type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
        </div>
        <div>
          <label className={LABEL}>Telefon</label>
          <input className={INPUT} value={editForm.telefon} onChange={e => setEditForm(f => ({ ...f, telefon: e.target.value }))} placeholder="+420 xxx xxx xxx" />
        </div>
      </div>

      <div className="border-t border-zinc-100 pt-4">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Kontaktní adresa</p>
        <div className="space-y-3">
          <div>
            <label className={LABEL}>Ulice a č.p.</label>
            <input className={INPUT} value={editForm.kontaktni_ulice} onChange={e => setEditForm(f => ({ ...f, kontaktni_ulice: e.target.value }))} placeholder="Ulice 123" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className={LABEL}>Město</label>
              <input className={INPUT} value={editForm.kontaktni_mesto} onChange={e => setEditForm(f => ({ ...f, kontaktni_mesto: e.target.value }))} placeholder="Praha" />
            </div>
            <div>
              <label className={LABEL}>PSČ</label>
              <input className={INPUT} value={editForm.kontaktni_psc} onChange={e => setEditForm(f => ({ ...f, kontaktni_psc: e.target.value }))} placeholder="110 00" />
            </div>
          </div>
        </div>
      </div>

      <div>
        <label className={LABEL}>Poznámka</label>
        <textarea className={INPUT} rows={2} value={editForm.poznamka} onChange={e => setEditForm(f => ({ ...f, poznamka: e.target.value }))} placeholder="Interní poznámka…" />
      </div>

      {chyba && <p className="text-sm text-red-600 font-medium bg-red-50 px-3 py-2 rounded-lg">{chyba}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 text-sm font-bold text-zinc-700 hover:bg-zinc-50 transition-all active:scale-[0.98]"
        >
          Zrušit
        </button>
        <button
          type="submit"
          disabled={ukladani}
          className="flex-1 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 disabled:opacity-50 transition-all shadow-md shadow-violet-100 active:scale-[0.98]"
        >
          {ukladani ? 'Ukládám…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
