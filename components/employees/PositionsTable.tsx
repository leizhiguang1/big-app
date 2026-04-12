'use client'

import { useState, useTransition } from 'react'
import { Pencil, Power } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deactivatePositionAction } from '@/lib/actions/positions'
import type { Position } from '@/lib/services/positions'
import { PositionFormSheet } from './PositionForm'

export function PositionsTable({ positions }: { positions: Position[] }) {
  const [editing, setEditing] = useState<Position | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <>
      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Name</th>
              <th className="px-3 py-2 text-left font-medium">Description</th>
              <th className="px-3 py-2 text-left font-medium">Status</th>
              <th className="px-3 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {positions.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                  No positions yet. Click “New position” to create one.
                </td>
              </tr>
            ) : (
              positions.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="px-3 py-2 font-medium">{p.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{p.description || '—'}</td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        p.is_active
                          ? 'rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-600 text-xs'
                          : 'rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs'
                      }
                    >
                      {p.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setEditing(p)}
                        aria-label="Edit"
                      >
                        <Pencil />
                      </Button>
                      {p.is_active && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={pending}
                          onClick={() => {
                            if (!confirm(`Deactivate position "${p.name}"?`)) return
                            startTransition(async () => {
                              await deactivatePositionAction(p.id)
                            })
                          }}
                          aria-label="Deactivate"
                        >
                          <Power />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <PositionFormSheet
        open={!!editing}
        position={editing}
        onClose={() => setEditing(null)}
      />
    </>
  )
}
