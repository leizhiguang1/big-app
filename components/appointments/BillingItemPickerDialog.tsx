"use client";

import { Check, Minus, Plus, Search, Trash2, Wallet, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { InventoryItemWithRefs } from "@/lib/services/inventory";
import type { ServiceWithCategory } from "@/lib/services/services";
import { cn } from "@/lib/utils";

export const CASH_WALLET_SKU = "CASH_WALLET";

export type BillingItemSelection =
	| { type: "service"; service: ServiceWithCategory }
	| { type: "product"; product: InventoryItemWithRefs }
	| { type: "wallet_topup"; product: InventoryItemWithRefs };

export type CartEntry = {
	selection: BillingItemSelection;
	quantity: number;
};

export type ExistingCartItem = {
	id: string;
	item_type: string;
	name: string;
	sku: string | null;
	quantity: number;
	unit_price: number;
};

type TabKey = "services" | "products" | "laboratory" | "vaccinations" | "other";

const TABS: { key: TabKey; label: string; enabled: boolean }[] = [
	{ key: "services", label: "Services", enabled: true },
	{ key: "products", label: "Products", enabled: true },
	{ key: "laboratory", label: "Laboratory", enabled: false },
	{ key: "vaccinations", label: "Vaccinations", enabled: false },
	{ key: "other", label: "Other Charges", enabled: false },
];

type CartMode = "empty" | "normal" | "wallet";

function inferCartMode(
	items: readonly { item_type: string }[] | null | undefined,
): CartMode {
	if (!items || items.length === 0) return "empty";
	return items.some((l) => l.item_type === "wallet_topup")
		? "wallet"
		: "normal";
}

function entryKey(selection: BillingItemSelection): string {
	if (selection.type === "service") return `service:${selection.service.id}`;
	if (selection.type === "wallet_topup")
		return `wallet_topup:${selection.product.id}`;
	return `product:${selection.product.id}`;
}

function entryItemType(selection: BillingItemSelection): string {
	return selection.type;
}

function entryName(selection: BillingItemSelection): string {
	if (selection.type === "service") return selection.service.name;
	return selection.product.name;
}

function entrySku(selection: BillingItemSelection): string {
	if (selection.type === "service") return selection.service.sku ?? "";
	return selection.product.sku ?? "";
}

function entryPriceLabel(selection: BillingItemSelection): string {
	if (selection.type === "service") {
		return `MYR ${Number(selection.service.price).toFixed(2)}`;
	}
	if (selection.type === "wallet_topup") return "set at billing";
	return `MYR ${Number(selection.product.selling_price ?? 0).toFixed(2)}`;
}

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	services: ServiceWithCategory[];
	products: InventoryItemWithRefs[];
	/** Items already on the host bill. Rendered in the cart panel alongside new picks. */
	currentCart?: readonly ExistingCartItem[] | null;
	/** Called when the user clicks × on an existing-cart row. Host decides how to remove. */
	onRemoveExisting?: (id: string) => void;
	onCommit: (batch: CartEntry[]) => void;
};

export function BillingItemPickerDialog({
	open,
	onOpenChange,
	services,
	products,
	currentCart,
	onRemoveExisting,
	onCommit,
}: Props) {
	const [tab, setTab] = useState<TabKey>("services");
	const [query, setQuery] = useState("");
	const [draft, setDraft] = useState<Map<string, CartEntry>>(() => new Map());

	// Reset on every open (false → true) so each session starts fresh.
	useEffect(() => {
		if (open) {
			setDraft(new Map());
			setQuery("");
			setTab("services");
		}
	}, [open]);

	const draftArray = useMemo(() => Array.from(draft.values()), [draft]);

	const draftAsItems = useMemo(
		() => draftArray.map((e) => ({ item_type: entryItemType(e.selection) })),
		[draftArray],
	);

	// Combine host cart and in-progress draft so wallet-alone applies to both.
	const existingAsItems = useMemo(
		() => (currentCart ?? []).map((i) => ({ item_type: i.item_type })),
		[currentCart],
	);
	const cartMode = inferCartMode([...existingAsItems, ...draftAsItems]);

	const existingArray = currentCart ?? [];
	const totalCartCount = existingArray.length + draftArray.length;

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

	const sortedProducts = useMemo(() => {
		// Pin Cash Wallet to the top; stable-sort the rest by name.
		return [...products].sort((a, b) => {
			const aWallet = a.sku === CASH_WALLET_SKU ? 0 : 1;
			const bWallet = b.sku === CASH_WALLET_SKU ? 0 : 1;
			if (aWallet !== bWallet) return aWallet - bWallet;
			return a.name.localeCompare(b.name);
		});
	}, [products]);

	const filteredProducts = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return sortedProducts;
		return sortedProducts.filter((p) =>
			[p.name, p.sku, p.brand?.name ?? "", p.category?.name ?? ""]
				.join(" ")
				.toLowerCase()
				.includes(q),
		);
	}, [sortedProducts, query]);

	const draftQtyFor = (selection: BillingItemSelection): number =>
		draft.get(entryKey(selection))?.quantity ?? 0;

	const addToDraft = (selection: BillingItemSelection) => {
		setDraft((prev) => {
			const key = entryKey(selection);
			const next = new Map(prev);
			const existing = next.get(key);
			// Wallet top-ups are always qty=1.
			if (selection.type === "wallet_topup") {
				next.set(key, { selection, quantity: 1 });
				return next;
			}
			next.set(key, {
				selection,
				quantity: (existing?.quantity ?? 0) + 1,
			});
			return next;
		});
	};

	const changeQty = (key: string, delta: number) => {
		setDraft((prev) => {
			const next = new Map(prev);
			const entry = next.get(key);
			if (!entry) return prev;
			const q = entry.quantity + delta;
			if (q <= 0) next.delete(key);
			else next.set(key, { ...entry, quantity: q });
			return next;
		});
	};

	const removeFromDraft = (key: string) => {
		setDraft((prev) => {
			const next = new Map(prev);
			next.delete(key);
			return next;
		});
	};

	const clearAll = () => setDraft(new Map());

	const handleCommit = () => {
		if (draftArray.length === 0) return;
		onCommit(draftArray);
		onOpenChange(false);
	};

	const handlePickService = (s: ServiceWithCategory) =>
		addToDraft({ type: "service", service: s });

	const handlePickProduct = (p: InventoryItemWithRefs) => {
		if (p.sku === CASH_WALLET_SKU) {
			addToDraft({ type: "wallet_topup", product: p });
		} else {
			addToDraft({ type: "product", product: p });
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex max-h-[90vh] w-full max-w-5xl flex-col gap-0 overflow-hidden p-0">
				<DialogHeader className="border-b px-5 pt-5 pb-0">
					<DialogTitle className="text-base">Add billing items</DialogTitle>
					<DialogDescription className="sr-only">
						Build a cart of services and products, then add them to the bill.
					</DialogDescription>

					{cartMode === "wallet" && (
						<div className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-amber-800 text-xs">
							Cart has a Cash Wallet line. Remove it before adding other items —
							Cash Wallet must be the only item in a sale.
						</div>
					)}

					<div className="-mb-px mt-3 flex gap-1">
						{TABS.map((t) => {
							const isActive = tab === t.key;
							const tabDisabled =
								!t.enabled || (cartMode === "wallet" && t.key !== "products");
							return (
								<button
									key={t.key}
									type="button"
									disabled={tabDisabled}
									onClick={() => !tabDisabled && setTab(t.key)}
									className={cn(
										"border-b-2 px-3 py-2 font-medium text-xs transition",
										isActive
											? "border-primary text-foreground"
											: "border-transparent text-muted-foreground hover:text-foreground",
										tabDisabled &&
											"cursor-not-allowed opacity-40 hover:text-muted-foreground",
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

				<div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden md:grid-cols-[1fr_320px]">
					{/* LEFT: catalog */}
					<div className="flex min-h-0 flex-col border-b md:border-r md:border-b-0">
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
									onPick={handlePickService}
									draftQtyFor={(s) =>
										draftQtyFor({ type: "service", service: s })
									}
									query={query}
									cartMode={cartMode}
								/>
							)}
							{tab === "products" && (
								<ProductList
									products={filteredProducts}
									onPick={handlePickProduct}
									draftQtyFor={(p) =>
										draftQtyFor(
											p.sku === CASH_WALLET_SKU
												? { type: "wallet_topup", product: p }
												: { type: "product", product: p },
										)
									}
									query={query}
									cartMode={cartMode}
								/>
							)}
							{tab !== "services" && tab !== "products" && (
								<div className="p-10 text-center text-muted-foreground text-sm">
									Not implemented yet.
								</div>
							)}
						</div>
					</div>

					{/* RIGHT: draft cart */}
					<aside
						aria-label="Draft cart"
						className="flex min-h-0 flex-col bg-muted/20"
					>
						<div className="flex items-center justify-between border-b px-4 py-3">
							<div className="flex flex-col">
								<span className="font-semibold text-sm">Cart Summary</span>
								<span className="text-[11px] text-muted-foreground">
									{totalCartCount} {totalCartCount === 1 ? "item" : "items"}
									{existingArray.length > 0 && draftArray.length > 0 && (
										<span className="ml-1 text-muted-foreground/70">
											({existingArray.length} on bill, {draftArray.length} new)
										</span>
									)}
								</span>
							</div>
							{draftArray.length > 0 && (
								<button
									type="button"
									onClick={clearAll}
									className="flex items-center gap-1 text-[11px] text-destructive hover:underline"
								>
									<Trash2 className="size-3" />
									Clear new
								</button>
							)}
						</div>

						<div className="min-h-0 flex-1 overflow-y-auto">
							{totalCartCount === 0 ? (
								<div className="flex h-full flex-col items-center justify-center gap-1 px-4 py-10 text-center text-muted-foreground text-xs">
									<span>Cart is empty.</span>
									<span className="text-[10px]">
										Click an item on the left to add it.
									</span>
								</div>
							) : (
								<ul className="divide-y">
									{existingArray.map((item) => {
										const isWallet = item.item_type === "wallet_topup";
										return (
											<li
												key={`existing:${item.id}`}
												className="flex items-start justify-between gap-2 bg-muted/40 px-3 py-3"
											>
												<div className="flex min-w-0 flex-col gap-0.5">
													<div className="flex items-center gap-1.5">
														{isWallet && (
															<Wallet className="size-3 shrink-0 text-teal-600" />
														)}
														<span className="truncate font-medium text-xs">
															{item.name}
														</span>
														<span className="shrink-0 rounded bg-primary/10 px-1 py-0.5 text-[9px] font-semibold text-primary uppercase">
															On bill
														</span>
													</div>
													{item.sku && (
														<span className="font-mono text-[10px] text-muted-foreground">
															{item.sku}
														</span>
													)}
													<span className="text-[10px] text-muted-foreground tabular-nums">
														Qty {item.quantity} · MYR{" "}
														{Number(item.unit_price).toFixed(2)}
													</span>
												</div>
												{onRemoveExisting && (
													<button
														type="button"
														onClick={() => onRemoveExisting(item.id)}
														className="flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
														aria-label={`Remove ${item.name} from bill`}
													>
														<X className="size-3" />
													</button>
												)}
											</li>
										);
									})}
									{draftArray.map((entry) => {
										const key = entryKey(entry.selection);
										const isWallet = entry.selection.type === "wallet_topup";
										return (
											<li
												key={key}
												className="flex items-start justify-between gap-2 px-3 py-3"
											>
												<div className="flex min-w-0 flex-col gap-0.5">
													<div className="flex items-center gap-1.5">
														{isWallet && (
															<Wallet className="size-3 shrink-0 text-teal-600" />
														)}
														<span className="truncate font-medium text-xs">
															{entryName(entry.selection)}
														</span>
														<span className="shrink-0 rounded bg-emerald-500/15 px-1 py-0.5 text-[9px] font-semibold text-emerald-700 uppercase dark:text-emerald-400">
															New
														</span>
													</div>
													<span className="font-mono text-[10px] text-muted-foreground">
														{entrySku(entry.selection)}
													</span>
													<span className="text-[10px] text-muted-foreground">
														{entryPriceLabel(entry.selection)}
													</span>
													{!isWallet && (
														<div className="mt-1 flex items-center gap-1">
															<button
																type="button"
																onClick={() => changeQty(key, -1)}
																className="flex size-5 items-center justify-center rounded border text-muted-foreground transition hover:bg-background hover:text-foreground"
																aria-label={`Decrease quantity of ${entryName(entry.selection)}`}
															>
																<Minus className="size-3" />
															</button>
															<span className="min-w-6 text-center text-xs tabular-nums">
																{entry.quantity}
															</span>
															<button
																type="button"
																onClick={() => changeQty(key, 1)}
																className="flex size-5 items-center justify-center rounded border text-muted-foreground transition hover:bg-background hover:text-foreground"
																aria-label={`Increase quantity of ${entryName(entry.selection)}`}
															>
																<Plus className="size-3" />
															</button>
														</div>
													)}
												</div>
												<button
													type="button"
													onClick={() => removeFromDraft(key)}
													className="flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
													aria-label={`Remove ${entryName(entry.selection)} from cart`}
												>
													<X className="size-3" />
												</button>
											</li>
										);
									})}
								</ul>
							)}
						</div>

						<div className="border-t bg-background px-4 py-3">
							<Button
								type="button"
								onClick={handleCommit}
								disabled={draftArray.length === 0}
								className="w-full gap-1.5 bg-emerald-600 text-white hover:bg-emerald-600/90 dark:bg-emerald-500 dark:hover:bg-emerald-500/90"
							>
								<Check className="size-4" />
								Add {draftArray.length > 0 ? `${draftArray.length} ` : ""}to
								bill
							</Button>
						</div>
					</aside>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function ServiceList({
	services,
	onPick,
	draftQtyFor,
	query,
	cartMode,
}: {
	services: ServiceWithCategory[];
	onPick: (s: ServiceWithCategory) => void;
	draftQtyFor: (s: ServiceWithCategory) => number;
	query: string;
	cartMode: CartMode;
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
	const disabled = cartMode === "wallet";
	return (
		<ul className="divide-y">
			{services.map((s) => {
				const inCart = draftQtyFor(s);
				return (
					<li key={s.id}>
						<DisabledWrapper
							disabled={disabled}
							reason="Cash Wallet is in the cart. Remove it to add services."
						>
							<button
								type="button"
								onClick={() => !disabled && onPick(s)}
								disabled={disabled}
								className={cn(
									"flex w-full items-start justify-between gap-4 px-5 py-3 text-left transition hover:bg-muted/60",
									inCart > 0 && "bg-primary/5",
									disabled &&
										"cursor-not-allowed opacity-40 hover:bg-transparent",
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
										{inCart > 0 && (
											<span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
												in cart: {inCart}
											</span>
										)}
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
						</DisabledWrapper>
					</li>
				);
			})}
		</ul>
	);
}

function ProductList({
	products,
	onPick,
	draftQtyFor,
	query,
	cartMode,
}: {
	products: InventoryItemWithRefs[];
	onPick: (p: InventoryItemWithRefs) => void;
	draftQtyFor: (p: InventoryItemWithRefs) => number;
	query: string;
	cartMode: CartMode;
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
				const inCart = draftQtyFor(p);
				const isWallet = p.sku === CASH_WALLET_SKU;
				const price = Number(p.selling_price ?? 0);
				// Wallet can't be added while cart has normal items.
				// Non-wallet products can't be added while cart has a wallet line.
				const disabled =
					(isWallet && cartMode === "normal") ||
					(!isWallet && cartMode === "wallet");
				const reason = isWallet
					? "Cash Wallet can only be the only item in a sale. Remove other items first."
					: "Cash Wallet is in the cart. Remove it to add products.";
				return (
					<li key={p.id}>
						<DisabledWrapper disabled={disabled} reason={reason}>
							<button
								type="button"
								onClick={() => !disabled && onPick(p)}
								disabled={disabled}
								className={cn(
									"flex w-full items-start justify-between gap-4 px-5 py-3 text-left transition hover:bg-muted/60",
									inCart > 0 && "bg-primary/5",
									isWallet &&
										"bg-gradient-to-r from-teal-50 to-transparent ring-1 ring-teal-200",
									disabled &&
										"cursor-not-allowed opacity-40 hover:bg-transparent",
								)}
							>
								<div className="flex min-w-0 flex-col gap-0.5">
									<div className="flex items-center gap-2">
										{isWallet && (
											<Wallet className="size-3.5 shrink-0 text-teal-600" />
										)}
										<span className="truncate font-semibold text-sm">
											{p.name}
										</span>
										<span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
											{p.sku}
										</span>
										{isWallet && (
											<span className="shrink-0 rounded-full bg-teal-100 px-1.5 py-0.5 text-[10px] font-semibold text-teal-700">
												Built-in
											</span>
										)}
										{inCart > 0 && (
											<span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
												in cart: {inCart}
											</span>
										)}
									</div>
									<div className="flex items-center gap-2 text-muted-foreground text-xs">
										{isWallet ? (
											<span>Sold alone. Amount you enter = credit added.</span>
										) : (
											<>
												{p.brand?.name && (
													<span className="rounded bg-muted/60 px-1.5 py-0.5">
														{p.brand.name}
													</span>
												)}
												{p.category?.name && <span>{p.category.name}</span>}
												<span>Stock: {Number(p.stock ?? 0)}</span>
											</>
										)}
									</div>
								</div>
								<div className="shrink-0 text-right font-semibold text-sm tabular-nums">
									{isWallet ? "set at billing" : `MYR ${price.toFixed(2)}`}
								</div>
							</button>
						</DisabledWrapper>
					</li>
				);
			})}
		</ul>
	);
}

function DisabledWrapper({
	disabled,
	reason,
	children,
}: {
	disabled: boolean;
	reason: string;
	children: React.ReactNode;
}) {
	if (!disabled) return <>{children}</>;
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<div>{children}</div>
			</TooltipTrigger>
			<TooltipContent side="top">{reason}</TooltipContent>
		</Tooltip>
	);
}
