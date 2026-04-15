"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { InventoryItemWithRefs } from "@/lib/services/inventory";
import type { ServiceWithCategory } from "@/lib/services/services";
import { cn } from "@/lib/utils";

export type BillingItemSelection =
	| { type: "service"; service: ServiceWithCategory }
	| { type: "product"; product: InventoryItemWithRefs };

type TabKey = "services" | "products" | "laboratory" | "vaccinations" | "other";

const TABS: { key: TabKey; label: string; enabled: boolean }[] = [
	{ key: "services", label: "Services", enabled: true },
	{ key: "products", label: "Products", enabled: true },
	{ key: "laboratory", label: "Laboratory", enabled: false },
	{ key: "vaccinations", label: "Vaccinations", enabled: false },
	{ key: "other", label: "Other Charges", enabled: false },
];

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	services: ServiceWithCategory[];
	products: InventoryItemWithRefs[];
	onSelect: (selection: BillingItemSelection) => void;
	selected?:
		| { type: "service"; id: string }
		| { type: "product"; id: string }
		| null;
};

export function BillingItemPickerDialog({
	open,
	onOpenChange,
	services,
	products,
	onSelect,
	selected,
}: Props) {
	const [tab, setTab] = useState<TabKey>(
		selected?.type === "product" ? "products" : "services",
	);
	const [query, setQuery] = useState("");

	const filteredServices = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return services;
		return services.filter((s) =>
			[s.name, s.sku, s.category?.name ?? "", s.type]
				.join(" ")
				.toLowerCase()
				.includes(q),
		);
	}, [services, query]);

	const filteredProducts = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return products;
		return products.filter((p) =>
			[p.name, p.sku, p.brand?.name ?? "", p.category?.name ?? ""]
				.join(" ")
				.toLowerCase()
				.includes(q),
		);
	}, [products, query]);

	const close = () => {
		onOpenChange(false);
		setQuery("");
	};

	const handlePickService = (s: ServiceWithCategory) => {
		onSelect({ type: "service", service: s });
		close();
	};

	const handlePickProduct = (p: InventoryItemWithRefs) => {
		onSelect({ type: "product", product: p });
		close();
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex max-h-[85vh] w-full max-w-3xl flex-col gap-0 p-0">
				<DialogHeader className="border-b px-5 pt-5 pb-0">
					<DialogTitle className="text-base">Add billing item</DialogTitle>
					<DialogDescription className="sr-only">
						Pick a service or product to add to this billing line.
					</DialogDescription>

					<div className="-mb-px mt-3 flex gap-1">
						{TABS.map((t) => {
							const isActive = tab === t.key;
							return (
								<button
									key={t.key}
									type="button"
									disabled={!t.enabled}
									onClick={() => t.enabled && setTab(t.key)}
									className={cn(
										"border-b-2 px-3 py-2 font-medium text-xs transition",
										isActive
											? "border-primary text-foreground"
											: "border-transparent text-muted-foreground hover:text-foreground",
										!t.enabled && "cursor-not-allowed opacity-40 hover:text-muted-foreground",
									)}
								>
									{t.label}
									{!t.enabled && (
										<span className="ml-1 text-[10px]">(soon)</span>
									)}
								</button>
							);
						})}
					</div>
				</DialogHeader>

				<div className="border-b px-5 py-3">
					<div className="relative">
						<Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							autoFocus
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder={
								tab === "products"
									? "Search products by name, SKU, brand…"
									: "Search by name, SKU, or category…"
							}
							className="h-10 pl-9"
						/>
					</div>
					<div className="mt-2 text-muted-foreground text-xs">
						{tab === "services" &&
							`${filteredServices.length} of ${services.length} services`}
						{tab === "products" &&
							`${filteredProducts.length} of ${products.length} products`}
					</div>
				</div>

				<div className="min-h-0 flex-1 overflow-y-auto">
					{tab === "services" && (
						<ServiceList
							services={filteredServices}
							selectedId={
								selected?.type === "service" ? selected.id : null
							}
							onPick={handlePickService}
							query={query}
						/>
					)}
					{tab === "products" && (
						<ProductList
							products={filteredProducts}
							selectedId={
								selected?.type === "product" ? selected.id : null
							}
							onPick={handlePickProduct}
							query={query}
						/>
					)}
					{tab !== "services" && tab !== "products" && (
						<div className="p-10 text-center text-muted-foreground text-sm">
							Not implemented yet.
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}

function ServiceList({
	services,
	selectedId,
	onPick,
	query,
}: {
	services: ServiceWithCategory[];
	selectedId: string | null;
	onPick: (s: ServiceWithCategory) => void;
	query: string;
}) {
	if (services.length === 0) {
		return (
			<div className="p-10 text-center text-muted-foreground text-sm">
				{query
					? `No services match “${query}”.`
					: "No active services available."}
			</div>
		);
	}
	return (
		<ul className="divide-y">
			{services.map((s) => {
				const isSelected = s.id === selectedId;
				return (
					<li key={s.id}>
						<button
							type="button"
							onClick={() => onPick(s)}
							className={cn(
								"flex w-full items-start justify-between gap-4 px-5 py-3 text-left transition hover:bg-muted/60",
								isSelected && "bg-primary/5",
							)}
						>
							<div className="flex min-w-0 flex-col gap-0.5">
								<div className="flex items-center gap-2">
									<span className="truncate font-semibold text-sm">
										{s.name}
									</span>
									<span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
										{s.sku}
									</span>
								</div>
								<div className="flex items-center gap-2 text-muted-foreground text-xs">
									{s.category?.name && (
										<span className="rounded bg-muted/60 px-1.5 py-0.5">
											{s.category.name}
										</span>
									)}
									<span>{s.duration_min} min</span>
									<span className="uppercase">{s.type}</span>
								</div>
							</div>
							<div className="shrink-0 text-right font-semibold text-sm tabular-nums">
								MYR {Number(s.price).toFixed(2)}
							</div>
						</button>
					</li>
				);
			})}
		</ul>
	);
}

function ProductList({
	products,
	selectedId,
	onPick,
	query,
}: {
	products: InventoryItemWithRefs[];
	selectedId: string | null;
	onPick: (p: InventoryItemWithRefs) => void;
	query: string;
}) {
	if (products.length === 0) {
		return (
			<div className="p-10 text-center text-muted-foreground text-sm">
				{query
					? `No products match “${query}”.`
					: "No sellable products available. Add one under Inventory."}
			</div>
		);
	}
	return (
		<ul className="divide-y">
			{products.map((p) => {
				const isSelected = p.id === selectedId;
				const price = Number(p.selling_price ?? 0);
				return (
					<li key={p.id}>
						<button
							type="button"
							onClick={() => onPick(p)}
							className={cn(
								"flex w-full items-start justify-between gap-4 px-5 py-3 text-left transition hover:bg-muted/60",
								isSelected && "bg-primary/5",
							)}
						>
							<div className="flex min-w-0 flex-col gap-0.5">
								<div className="flex items-center gap-2">
									<span className="truncate font-semibold text-sm">
										{p.name}
									</span>
									<span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
										{p.sku}
									</span>
								</div>
								<div className="flex items-center gap-2 text-muted-foreground text-xs">
									{p.brand?.name && (
										<span className="rounded bg-muted/60 px-1.5 py-0.5">
											{p.brand.name}
										</span>
									)}
									{p.category?.name && <span>{p.category.name}</span>}
									<span>Stock: {Number(p.stock ?? 0)}</span>
								</div>
							</div>
							<div className="shrink-0 text-right font-semibold text-sm tabular-nums">
								MYR {price.toFixed(2)}
							</div>
						</button>
					</li>
				);
			})}
		</ul>
	);
}
