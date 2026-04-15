import { NewServiceButton } from '@/components/services/ServiceForm'
import { ServicesTable } from '@/components/services/ServicesTable'
import { getServerContext } from '@/lib/context/server'
import { listCategories, listServices } from '@/lib/services/services'
import { listTaxes } from '@/lib/services/taxes'

export async function ServicesContent() {
  const ctx = await getServerContext()
  const [services, categories, taxes] = await Promise.all([
    listServices(ctx),
    listCategories(ctx),
    listTaxes(ctx),
  ])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {services.length} service{services.length === 1 ? '' : 's'}
        </p>
        <NewServiceButton categories={categories} taxes={taxes} />
      </div>
      <ServicesTable services={services} categories={categories} taxes={taxes} />
    </div>
  )
}
