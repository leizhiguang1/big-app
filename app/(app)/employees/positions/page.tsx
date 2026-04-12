import { Suspense } from 'react'
import { TableSkeleton } from '@/components/ui/table-skeleton'
import { PositionsContent } from './positions-content'

export default function EmployeesPositionsPage() {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-semibold text-lg">Positions</h2>
      <Suspense fallback={<TableSkeleton columns={4} rows={6} showHeader={false} />}>
        <PositionsContent />
      </Suspense>
    </div>
  )
}
