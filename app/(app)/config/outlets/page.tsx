import { Suspense } from 'react'
import { TableSkeleton } from '@/components/ui/table-skeleton'
import { OutletsContent } from './outlets-content'

export default function OutletsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Outlets</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Branches and treatment rooms. Used by appointments, customers, and sales.
        </p>
      </div> 
      <Suspense fallback={<TableSkeleton columns={5} rows={6} showHeader={false} />}>
        <OutletsContent />
      </Suspense>
    </div>
  )
}
