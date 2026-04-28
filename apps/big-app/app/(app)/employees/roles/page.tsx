import { Suspense } from 'react'
import { TableSkeleton } from '@/components/ui/table-skeleton'
import { RolesContent } from './roles-content'

export default function EmployeesRolesPage() {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-semibold text-lg">Roles</h2>
      <Suspense fallback={<TableSkeleton columns={4} rows={6} showHeader={false} />}>
        <RolesContent />
      </Suspense>
    </div>
  )
}
