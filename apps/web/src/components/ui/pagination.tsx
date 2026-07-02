'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './button'

const PAGE_SIZES = [10, 25, 50, 100] as const

interface PaginationProps {
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

export function Pagination({ total, page, pageSize, onPageChange, onPageSizeChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  if (total === 0) return null

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-1 border-t border-border">
      <p className="text-xs text-muted-foreground">
        Showing {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-2">
        <select
          value={pageSize}
          onChange={(e) => {
            onPageSizeChange(Number(e.target.value))
            onPageChange(1)
          }}
          className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {PAGE_SIZES.map((s) => (
            <option key={s} value={s}>{s} / page</option>
          ))}
        </select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="h-7 w-7 p-0"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <span className="text-xs text-muted-foreground tabular-nums">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="h-7 w-7 p-0"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
