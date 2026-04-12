import { NewOutletButton } from '@/components/outlets/OutletForm'
import { OutletsTable } from '@/components/outlets/OutletsTable'
import { getServerContext } from '@/lib/context/server'
import { listOutlets } from '@/lib/services/outlets'

export default async function OutletsPage() {
  const ctx = await getServerContext()
  const outlets = await listOutlets(ctx)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Outlets</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Branches and treatment rooms. Used by appointments, customers, and sales.
        </p>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {outlets.length} outlet{outlets.length === 1 ? '' : 's'}
        </p>
        <NewOutletButton />
      </div>
      <OutletsTable outlets={outlets} />
    </div>
  )
}
