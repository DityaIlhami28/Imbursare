'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getToken, parseToken } from '@/lib/auth'
import { api, type ExpenseSummary } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/badge'
import { Receipt, FileText, CheckCircle, Clock, Building2, Plus, ArrowRight } from 'lucide-react'

export default function DashboardPage() {
  const [expenses, setExpenses] = useState<ExpenseSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [hasCompany, setHasCompany] = useState(true)

  useEffect(() => {
    const token = getToken()
    if (!token) return

    const payload = parseToken(token)
    if (!payload?.companyId) {
      setHasCompany(false)
      setLoading(false)
      return
    }

    api.expense.getMyExpenses(token)
      .then(setExpenses)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (!hasCompany) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Building2 className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Welcome to Imbursare</h1>
          <p className="mt-2 text-muted-foreground max-w-sm">
            You&apos;re not part of a company yet. Create one to get started, or ask your admin to add you.
          </p>
        </div>
        <Button render={<Link href="/company/create" />}>
          Create a Company
        </Button>
      </div>
    )
  }

  const submitted = expenses.filter((e) => e.status === 'SUBMIT').length
  const approved = expenses.filter((e) => e.status === 'APPROVED').length
  const reimbursed = expenses.filter((e) => e.status === 'REIMBURSED').length
  const totalAmount = expenses.reduce((s, e) => s + e.amount, 0)
  const recent = expenses.slice(0, 5)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your expense activity</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Receipt className="h-4 w-4" /> Total Expenses
            </CardDescription>
            <CardTitle className="text-3xl">{expenses.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4" /> Pending Review
            </CardDescription>
            <CardTitle className="text-3xl">{submitted}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" /> Approved
            </CardDescription>
            <CardTitle className="text-3xl">{approved}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <FileText className="h-4 w-4" /> Reimbursed
            </CardDescription>
            <CardTitle className="text-3xl">{reimbursed}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent Expenses</CardTitle>
              <CardDescription>Your latest submissions</CardDescription>
            </div>
            <Button size="sm" render={<Link href="/expenses/new" />}>
              <Plus className="h-4 w-4 mr-1" /> New
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : recent.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No expenses yet.{' '}
                <Link href="/expenses/new" className="text-primary hover:underline">Submit one</Link>
              </div>
            ) : (
              <ul className="space-y-2">
                {recent.map((expense) => (
                  <li key={expense.id}>
                    <Link
                      href={`/expenses/${expense.id}`}
                      className="flex items-center justify-between rounded-lg p-2 hover:bg-accent transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{expense.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(expense.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <StatusBadge status={expense.status} />
                        <span className="text-sm font-medium">
                          {expense.amount.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {recent.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <Link
                  href="/expenses"
                  className="flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  View all expenses <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total Submitted</CardTitle>
            <CardDescription>Cumulative value of all your expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-foreground">
              {totalAmount.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
            </p>
            <div className="mt-4 space-y-2">
              {(['DRAFT', 'SUBMIT', 'APPROVED', 'REJECTED', 'REIMBURSED'] as const).map((status) => {
                const count = expenses.filter((e) => e.status === status).length
                if (count === 0) return null
                return (
                  <div key={status} className="flex items-center justify-between text-sm">
                    <StatusBadge status={status} />
                    <span className="text-muted-foreground">{count} expense{count !== 1 ? 's' : ''}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
