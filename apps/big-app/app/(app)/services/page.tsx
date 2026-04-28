import { Suspense } from 'react'
import { TableSkeleton } from '@/components/ui/table-skeleton'
import { ServicesContent } from './services-content'

export default function ServicesPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="shrink-0">
        <h1 className="font-semibold text-2xl tracking-tight">Services</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Treatment catalog. Used as billing line items after a visit.
        </p>
      </div>
      <Suspense fallback={<TableSkeleton columns={8} rows={8} showHeader={false} />}>
        <ServicesContent />
      </Suspense>
    </div>
  )
}
