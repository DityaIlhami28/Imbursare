'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getToken } from '@/lib/auth'
import { api, type ExpenseSummary, type ExpenseStatus } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/badge'
import { CreditCard } from 'lucide-react'

const STATUS_FILTERS = ['ALL', 'DRAFT', 'SUBMIT', 'APPROVED', 'REJECTED', 'REIMBURSED'] as const
type Filter = (typeof STATUS_FILTERS)[number]

type AdminExpense = ExpenseSummary & { userId: string; companyId: string }

export default function AdminExpensesPage() {
  const [expenses, setExpenses] = useState<AdminExpense[]>([])
  const [filter, setFilter] = useState<Filter>('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = getToken()
    if (!token) return
    api.expense.getAdminExpenses(token)
      .then(setExpenses)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'ALL' ? expenses : expenses.filter((e) => e.status === filter)

  const totalByStatus = STATUS_FILTERS.slice(1).reduce((acc, s) => {
    acc[s] = expenses.filter((e) => e.status === s).length
    return acc
  }, {} as Record<ExpenseStatus, number>)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">All Company Expenses</h1>
        <p className="text-sm text-muted-foreground">Review and track all expense submissions across your company</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {(STATUS_FILTERS.slice(1) as ExpenseStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-xl border p-3 text-left transition-all ${
              filter === s ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
            }`}
          >
            <p className="text-lg font-bold text-foreground">{totalByStatus[s] ?? 0}</p>
            <StatusBadge status={s} />
          </button>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === s
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            {s === 'ALL' ? `All (${expenses.length})` : `${s.charAt(0) + s.slice(1).toLowerCase()} (${totalByStatus[s as ExpenseStatus] ?? 0})`}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> {filtered.length} expense{filtered.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No expenses found for this filter.</p>
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
