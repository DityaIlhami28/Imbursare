'use client'

import { useEffect, useState } from 'react'
import { getToken } from '@/lib/auth'
import { api, type AmountPolicy } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Shield, Plus, X } from 'lucide-react'

const LEVELS = ['staff', 'supervisor', 'manager', 'director', 'vp', 'c-level'] as const
type Level = (typeof LEVELS)[number]

const levelLabel: Record<number, string> = {
  1: 'Staff', 2: 'Supervisor', 3: 'Manager', 4: 'Director', 5: 'VP', 6: 'C-Level',
}

const inputCls = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-shadow disabled:opacity-50'
const labelCls = 'text-xs font-medium text-muted-foreground uppercase tracking-wide'

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<AmountPolicy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ maxAmount: '', positionLevel: 'staff' as Level, totalTransactions: '' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    const token = getToken()
    if (!token) return
    api.policies.getAll(token)
      .then(setPolicies)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const maxAmount = parseFloat(form.maxAmount)
    const totalTransactions = parseInt(form.totalTransactions)
    if (isNaN(maxAmount) || maxAmount <= 0 || isNaN(totalTransactions) || totalTransactions <= 0) {
      setFormError('Please enter valid amounts')
      return
    }
    setFormError('')
    setSaving(true)
    try {
      const token = getToken()!
      const created = await api.policies.create(token, {
        maxAmount,
        positionLevel: form.positionLevel,
        totalTransactions,
      })
      setPolicies((prev) => [...prev, created])
      setForm({ maxAmount: '', positionLevel: 'staff', totalTransactions: '' })
      setShowForm(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create policy')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Spending Policies</h1>
          <p className="text-sm text-muted-foreground">
            Set maximum expense amounts and transaction limits per position level
          </p>
        </div>
        <Button onClick={() => { setShowForm(!showForm); setFormError('') }}>
          {showForm ? <><X className="h-4 w-4 mr-1.5" /> Cancel</> : <><Plus className="h-4 w-4 mr-1.5" /> New Policy</>}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create Spending Policy</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Position Level</label>
                <select
                  value={form.positionLevel}
                  onChange={(e) => setForm({ ...form, positionLevel: e.target.value as Level })}
                  className={inputCls}
                >
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Max Amount (IDR)</label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 5000000"
                  value={form.maxAmount}
                  onChange={(e) => setForm({ ...form, maxAmount: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelCls}>Max Active Transactions</label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 3"
                  value={form.totalTransactions}
                  onChange={(e) => setForm({ ...form, totalTransactions: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="sm:col-span-3">
                {formError && <p className="text-sm text-destructive mb-2">{formError}</p>}
                <Button type="submit" disabled={saving}>
                  {saving ? 'Creating…' : 'Create Policy'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" /> Active Policies ({policies.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : policies.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                No spending policies yet. Create one to enforce limits on expense submissions.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {policies
                .sort((a, b) => a.level - b.level)
                .map((policy) => (
                  <div key={policy.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {levelLabel[policy.level]} (Level {policy.level})
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Up to {policy.totalTransactions} active transaction{policy.totalTransactions !== 1 ? 's' : ''} at a time
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">
                        {policy.maxAmount.toLocaleString('id-ID', {
                          style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">max per expense</p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-muted">
        <CardContent className="pt-4 text-xs text-muted-foreground">
          <strong className="text-foreground">How policies work:</strong> When an employee submits an expense,
          the system checks their position level against these policies. If their amount exceeds the max, or
          they have too many active (SUBMIT/APPROVED) transactions, the submission is blocked.
        </CardContent>
      </Card>
    </div>
  )
}
