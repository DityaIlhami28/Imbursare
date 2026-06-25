'use client'

import { useEffect, useState } from 'react'
import { use } from 'react'
import Link from 'next/link'
import { getToken } from '@/lib/auth'
import { api, type ExpenseDetail, type ExpenseLog } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/badge'
import { ArrowLeft, Paperclip, Clock, FileText, Download } from 'lucide-react'

function formatSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(0)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [expense, setExpense] = useState<ExpenseDetail | null>(null)
  const [logs, setLogs] = useState<ExpenseLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = getToken()
    if (!token) return

    Promise.all([
      api.expense.getDetails(token, id),
      api.expense.getLogs(token, id),
    ])
      .then(([detail, logData]) => {
        setExpense(detail)
        setLogs(logData)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  if (error || !expense) {
    return (
      <div className="text-center py-24">
        <p className="text-destructive">{error || 'Expense not found'}</p>
        <Link href="/expenses" className="mt-3 inline-block text-sm text-primary hover:underline">
          Back to expenses
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href="/expenses"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to expenses
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-xl">{expense.title}</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Submitted {new Date(expense.createdAt).toLocaleDateString('en-GB', {
                  day: '2-digit', month: 'long', year: 'numeric',
                })}
              </p>
            </div>
            <StatusBadge status={expense.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Amount</p>
              <p className="text-2xl font-bold text-foreground mt-0.5">
                {expense.amount.toLocaleString('id-ID', {
                  style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
                })}
              </p>
            </div>
            {expense.category && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Category</p>
                <p className="text-sm font-medium text-foreground mt-0.5">{expense.category.name}</p>
              </div>
            )}
          </div>

          {expense.description && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Description</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{expense.description}</p>
            </div>
          )}

          {expense.attachments.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5" /> Attachments ({expense.attachments.length})
              </p>
              <ul className="space-y-2">
                {expense.attachments.map((att) => (
                  <li key={att.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{att.fileName}</p>
                        <p className="text-xs text-muted-foreground">{formatSize(att.size)}</p>
                      </div>
                    </div>
                    <a
                      href={att.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 shrink-0 text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" /> Activity Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="relative border-l border-border space-y-4 ml-2">
              {logs.map((log) => (
                <li key={log.id} className="ml-4">
                  <div className="absolute -left-1.5 h-3 w-3 rounded-full border-2 border-background bg-primary" />
                  <p className="text-sm font-medium text-foreground">{log.message}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(log.createdAt).toLocaleString('en-GB', {
                      day: '2-digit', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
