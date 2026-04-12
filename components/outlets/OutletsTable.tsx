"use client";

import { Pencil, Power } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deactivateOutletAction } from "@/lib/actions/outlets";
import type { OutletWithRoomCount } from "@/lib/services/outlets";
import { OutletFormSheet } from "./OutletForm";

export function OutletsTable({ outlets }: { outlets: OutletWithRoomCount[] }) {
	const [editing, setEditing] = useState<OutletWithRoomCount | null>(null);
	const [pending, startTransition] = useTransition();

	return (
		<>
			<div className="rounded-lg border">
				<table className="w-full text-sm">
					<thead className="border-b bg-muted/40 text-muted-foreground">
						<tr>
							<th className="px-3 py-2 text-left font-medium">Code</th>
							<th className="px-3 py-2 text-left font-medium">Name</th>
							<th className="px-3 py-2 text-left font-medium">City</th>
							<th className="px-3 py-2 text-left font-medium">State</th>
							<th className="px-3 py-2 text-left font-medium">Rooms</th>
							<th className="px-3 py-2 text-left font-medium">Status</th>
							<th className="px-3 py-2 text-right font-medium">Actions</th>
						</tr>
					</thead>
					<tbody>
						{outlets.length === 0 ? (
							<tr>
								<td
									colSpan={7}
									className="px-3 py-8 text-center text-muted-foreground"
								>
									No outlets yet. Click “New outlet” to create one.
								</td>
							</tr>
						) : (
							outlets.map((o) => (
								<tr key={o.id} className="border-b last:border-0">
									<td className="px-3 py-2 font-mono text-xs">{o.code}</td>
									<td className="px-3 py-2 font-medium">{o.name}</td>
									<td className="px-3 py-2 text-muted-foreground">
										{o.city || "—"}
									</td>
									<td className="px-3 py-2 text-muted-foreground">
										{o.state || "—"}
									</td>
									<td className="px-3 py-2 text-muted-foreground">
										{o.room_count}
									</td>
									<td className="px-3 py-2">
										<span
											className={
												o.is_active
													? "rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-600 text-xs"
													: "rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs"
											}
										>
											{o.is_active ? "Active" : "Inactive"}
										</span>
									</td>
									<td className="px-3 py-2 text-right">
										<div className="inline-flex gap-1">
											<Button
												variant="ghost"
												size="icon-sm"
												onClick={() => setEditing(o)}
												aria-label="Edit"
											>
												<Pencil />
											</Button>
											{o.is_active && (
												<Button
													variant="ghost"
													size="icon-sm"
													disabled={pending}
													onClick={() => {
														if (!confirm(`Deactivate outlet "${o.name}"?`))
															return;
														startTransition(async () => {
															await deactivateOutletAction(o.id);
														});
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
			<OutletFormSheet
				open={!!editing}
				outlet={editing}
				onClose={() => setEditing(null)}
			/>
		</>
	);
}
