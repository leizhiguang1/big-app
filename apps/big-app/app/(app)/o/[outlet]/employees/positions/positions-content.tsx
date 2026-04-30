import { NewPositionButton } from '@/components/employees/PositionForm'
import { PositionsTable } from '@/components/employees/PositionsTable'
import { getServerContext } from '@/lib/context/server'
import { listPositions } from '@/lib/services/positions'

export async function PositionsContent() {
  const ctx = await getServerContext()
  const positions = await listPositions(ctx)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {positions.length} position{positions.length === 1 ? '' : 's'}
        </p>
        <NewPositionButton />
      </div>
      <PositionsTable positions={positions} />
    </div>
  )
}
