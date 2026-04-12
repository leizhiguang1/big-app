import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function EmployeesCommissionPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Commission</CardTitle>
        <CardDescription>
          Commission rules are configured in Phase 2. This tab is a placeholder.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-muted-foreground text-sm">
        Commission calculation lands alongside Sales reporting and payroll flows in Phase 2.
      </CardContent>
    </Card>
  )
}
