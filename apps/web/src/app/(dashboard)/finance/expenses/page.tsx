'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getToken } from '@/lib/auth'
import { api, type ExpenseSummary } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/badge'
import { CreditCard, CheckCircle } from 'lucide-react'

type Filter = 'ALL' | 'APPROVED' | 'REIMBURSED'

export default function FinanceExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseSummary[]>([])
  const [filter, setFilter] = useState<Filter>('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = getToken()
    if (!token) return
    api.expense.getFinanceExpenses(token)
      .then(setExpenses)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'ALL' ? expenses : expenses.filter((e) => e.status === filter)
  const approved = expenses.filter((e) => e.status === 'APPROVED').length
  const reimbursed = expenses.filter((e) => e.status === 'REIMBURSED').length
  const pendingTotal = expenses
    .filter((e) => e.status === 'APPROVED')
    .reduce((s, e) => s + e.amount, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Unit Expenses</h1>
        <p className="text-sm text-muted-foreground">
          Approved and reimbursed expenses for your unit
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CheckCircle className="h-4 w-4" />
              <span className="text-xs font-medium">Approved</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{approved}</p>
            <p className="text-xs text-muted-foreground mt-0.5">awaiting reimbursement</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CreditCard className="h-4 w-4" />
              <span className="text-xs font-medium">Reimbursed</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{reimbursed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <span className="text-xs font-medium">Pending Payout</span>
            </div>
            <p className="text-xl font-bold text-foreground">
              {pendingTotal.toLocaleString('id-ID', {
                style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
              })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-1.5">
        {(['ALL', 'APPROVED', 'REIMBURSED'] as Filter[]).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === s
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            {s === 'ALL' ? `All (${expenses.length})` : `${s.charAt(0) + s.slice(1).toLowerCase()} (${s === 'APPROVED' ? approved : reimbursed})`}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {filtered.length} expense{filtered.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No expenses in this view.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((expense) => (
                <Link
                  key={expense.id}
                  href={`/expenses/${expense.id}`}
                  className="flex items-center justify-between py-3 px-2 -mx-2 first:pt-0 last:pb-0 hover:bg-accent/50 rounded-lg transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{expense.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(expense.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <StatusBadge status={expense.status} />
                    <span className="text-sm font-semibold text-foreground">
                      {expense.amount.toLocaleString('id-ID', {
                        style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
