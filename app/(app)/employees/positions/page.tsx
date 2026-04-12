import { getServerContext } from '@/lib/context/server'
import { listPositions } from '@/lib/services/positions'
import { NewPositionButton } from '@/components/employees/PositionForm'
import { PositionsTable } from '@/components/employees/PositionsTable'

export default async function EmployeesPositionsPage() {
  const ctx = await getServerContext()
  const positions = await listPositions(ctx)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-lg">Positions</h2>
          <p className="text-muted-foreground text-sm">
            {positions.length} position{positions.length === 1 ? '' : 's'}
          </p>
        </div>
        <NewPositionButton />
      </div>
      <PositionsTable positions={positions} />
    </div>
  )
}
