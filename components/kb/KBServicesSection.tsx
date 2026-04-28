"use client";

import { Check, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { type KBService, uid } from "./kb-types";

type DBService = {
	id: string;
	name: string;
	sku?: string | null;
	price?: number | null;
	duration?: number | null;
};

type Props = {
	services: KBService[];
	onChange: (next: KBService[]) => void;
	dbServices?: DBService[];
};

export function KBServicesSection({ services, onChange, dbServices = [] }: Props) {
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editRow, setEditRow] = useState<KBService | null>(null);

	const importFromDB = () => {
		const imported = dbServices.map<KBService>((s) => ({
			id: s.id,
			name: s.name,
			code: s.sku ?? "",
			price: s.price != null ? `RM ${s.price}` : "",
			duration: s.duration ? `${s.duration} min` : "",
			fromDB: true,
		}));
		onChange(imported);
	};

	const addRow = () => {
		const row: KBService = {
			id: uid(),
			name: "",
			code: "",
			price: "",
			duration: "",
		};
		onChange([...services, row]);
		setEditingId(row.id);
		setEditRow(row);
	};

	const commit = () => {
		if (!editRow || !editingId) return;
		onChange(services.map((s) => (s.id === editingId ? editRow : s)));
		setEditingId(null);
		setEditRow(null);
	};

	const remove = (id: string) => {
		onChange(services.filter((s) => s.id !== id));
		if (editingId === id) {
			setEditingId(null);
			setEditRow(null);
		}
	};

	return (
		<div className="flex flex-col gap-3">
			{dbServices.length > 0 && (
				<div className="flex flex-wrap items-center gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sky-900 text-xs">
					<strong>{dbServices.length} services</strong> in your BIG services
					list.
					<Button
						size="sm"
						variant="outline"
						onClick={importFromDB}
						className="ml-auto"
					>
						<RefreshCw className="size-3.5" /> Import from BIG
					</Button>
				</div>
			)}

			<div className="overflow-hidden rounded-md border">
				<table className="w-full text-sm">
					<thead className="bg-muted/40 text-xs uppercase tracking-wide">
						<tr>
							<th className="px-3 py-2 text-left font-medium">Service</th>
							<th className="px-3 py-2 text-left font-medium">Code</th>
							<th className="px-3 py-2 text-left font-medium">Price</th>
							<th className="px-3 py-2 text-left font-medium">Duration</th>
							<th className="px-3 py-2 text-right font-medium" />
						</tr>
					</thead>
					<tbody className="divide-y">
						{services.length === 0 && (
							<tr>
								<td
									colSpan={5}
									className="px-3 py-6 text-center text-muted-foreground text-xs"
								>
									No services yet. Add one or import from BIG.
								</td>
							</tr>
						)}
						{services.map((s) => {
							if (editingId === s.id && editRow) {
								return (
									<tr key={s.id} className="bg-muted/20">
										<td className="px-3 py-2">
											<Input
												value={editRow.name}
												onChange={(e) =>
													setEditRow({ ...editRow, name: e.target.value })
												}
												placeholder="Service name"
												autoFocus
												className="h-8"
											/>
										</td>
										<td className="px-3 py-2">
											<Input
												value={editRow.code}
												onChange={(e) =>
													setEditRow({ ...editRow, code: e.target.value })
												}
												placeholder="DC-001"
												className="h-8 max-w-[110px]"
											/>
										</td>
										<td className="px-3 py-2">
											<Input
												value={editRow.price}
												onChange={(e) =>
													setEditRow({ ...editRow, price: e.target.value })
												}
												placeholder="RM 80–120"
												className="h-8"
											/>
										</td>
										<td className="px-3 py-2">
											<Input
												value={editRow.duration}
												onChange={(e) =>
													setEditRow({ ...editRow, duration: e.target.value })
												}
												placeholder="30 min"
												className="h-8 max-w-[120px]"
											/>
										</td>
										<td className="px-3 py-2 text-right">
											<Button size="sm" onClick={commit}>
												<Check className="size-4" /> Save
											</Button>
										</td>
									</tr>
								);
							}
							return (
								<tr key={s.id} className="hover:bg-muted/30">
									<td className="px-3 py-2">
										<div className="flex items-center gap-1.5">
											{s.fromDB && (
												<Badge variant="info" className="text-[10px]">
													DB
												</Badge>
											)}
											<span>{s.name || "—"}</span>
										</div>
									</td>
									<td className="px-3 py-2 font-mono text-xs">{s.code || "—"}</td>
									<td className="px-3 py-2">{s.price || "—"}</td>
									<td className="px-3 py-2">{s.duration || "—"}</td>
									<td className="px-3 py-2 text-right">
										<Tooltip>
											<TooltipTrigger asChild>
												<Button
													size="icon"
													variant="ghost"
													onClick={() => {
														setEditingId(s.id);
														setEditRow(s);
													}}
													aria-label="Edit"
												>
													<Pencil className="size-4" />
												</Button>
											</TooltipTrigger>
											<TooltipContent>Edit</TooltipContent>
										</Tooltip>
										<Tooltip>
											<TooltipTrigger asChild>
												<Button
													size="icon"
													variant="ghost"
													onClick={() => remove(s.id)}
													aria-label="Delete"
												>
													<Trash2 className="size-4 text-destructive" />
												</Button>
											</TooltipTrigger>
											<TooltipContent>Delete</TooltipContent>
										</Tooltip>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>

			<div>
				<Button variant="outline" size="sm" onClick={addRow}>
					<Plus className="size-4" /> Add Service
				</Button>
			</div>
		</div>
	);
}
