"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	createBrandAction,
	createCategoryAction,
	createSupplierAction,
	deleteBrandAction,
	deleteCategoryAction,
	deleteSupplierAction,
	updateBrandAction,
	updateCategoryAction,
	updateSupplierAction,
} from "@/lib/actions/inventory";
import {
	PAYMENT_TERM_UNITS,
	type PaymentTermUnit,
	type SupplierInput,
	supplierInputSchema,
} from "@/lib/schemas/inventory";
import type {
	InventoryBrand,
	InventoryCategory,
	Supplier,
} from "@/lib/services/inventory";

// Subset of countries — Phase 2 will swap in a full ISO list.
const COUNTRY_OPTIONS = [
	"Malaysia",
	"Singapore",
	"Thailand",
	"Indonesia",
	"Philippines",
	"Vietnam",
	"Brunei",
	"Myanmar",
	"Cambodia",
	"Laos",
	"China",
	"Taiwan",
	"Hong Kong",
	"Japan",
	"South Korea",
	"India",
	"Australia",
	"United Kingdom",
	"United States",
	"Other",
];

type Props = {
	brands: InventoryBrand[];
	categories: InventoryCategory[];
	suppliers: Supplier[];
	brandCounts: Record<string, number>;
	categoryCounts: Record<string, number>;
	supplierCounts: Record<string, number>;
};

export function InventoryOptionsPanel({
	brands,
	categories,
	suppliers,
	brandCounts,
	categoryCounts,
	supplierCounts,
}: Props) {
	return (
		<div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
			<BrandsPanel brands={brands} counts={brandCounts} />
			<CategoriesPanel categories={categories} counts={categoryCounts} />
			<SuppliersPanel suppliers={suppliers} counts={supplierCounts} />
		</div>
	);
}

// ---------- Brands ----------

function BrandsPanel({
	brands,
	counts,
}: {
	brands: InventoryBrand[];
	counts: Record<string, number>;
}) {
	const [editing, setEditing] = useState<InventoryBrand | "new" | null>(null);
	const [deleting, setDeleting] = useState<InventoryBrand | null>(null);
	const [deleteError, setDeleteError] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();

	return (
		<PanelCard
			title="Brands"
			onAdd={() => setEditing("new")}
			emptyMessage="No brands yet."
			rows={brands}
		>
			{brands.map((b) => (
				<Row
					key={b.id}
					left={b.name}
					right={`${counts[b.id] ?? 0} items`}
					onEdit={() => setEditing(b)}
					onDelete={() => {
						setDeleteError(null);
						setDeleting(b);
					}}
				/>
			))}
			{editing && (
				<SimpleNameDialog
					mode={editing === "new" ? "create" : "edit"}
					title={editing === "new" ? "New brand" : "Edit brand"}
					initial={editing === "new" ? { name: "" } : { name: editing.name }}
					onSubmit={async (data) => {
						if (editing === "new") {
							await createBrandAction(data);
						} else {
							await updateBrandAction(editing.id, data);
						}
						setEditing(null);
					}}
					onClose={() => setEditing(null)}
				/>
			)}
			<ConfirmDialog
				open={!!deleting}
				onOpenChange={(o) => {
					if (!o) setDeleting(null);
				}}
				title="Delete brand?"
				description={
					deleting
						? `"${deleting.name}" will be permanently removed.${deleteError ? ` — ${deleteError}` : ""}`
						: undefined
				}
				confirmLabel="Delete"
				pending={pending}
				onConfirm={() => {
					if (!deleting) return;
					const target = deleting;
					setDeleteError(null);
					startTransition(async () => {
						try {
							await deleteBrandAction(target.id);
							setDeleting(null);
						} catch (err) {
							setDeleteError(
								err instanceof Error ? err.message : "Failed to delete",
							);
						}
					});
				}}
			/>
		</PanelCard>
	);
}

// ---------- Categories ----------

function CategoriesPanel({
	categories,
	counts,
}: {
	categories: InventoryCategory[];
	counts: Record<string, number>;
}) {
	const [editing, setEditing] = useState<InventoryCategory | "new" | null>(
		null,
	);
	const [deleting, setDeleting] = useState<InventoryCategory | null>(null);
	const [deleteError, setDeleteError] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();

	return (
		<PanelCard
			title="Categories"
			onAdd={() => setEditing("new")}
			emptyMessage="No categories yet."
			rows={categories}
		>
			{categories.map((c) => (
				<Row
					key={c.id}
					left={c.name}
					right={`${counts[c.id] ?? 0} items`}
					sub={c.external_code ?? undefined}
					onEdit={() => setEditing(c)}
					onDelete={() => {
						setDeleteError(null);
						setDeleting(c);
					}}
				/>
			))}
			{editing && (
				<CategoryDialog
					mode={editing === "new" ? "create" : "edit"}
					initial={
						editing === "new"
							? { name: "", external_code: "" }
							: {
									name: editing.name,
									external_code: editing.external_code ?? "",
								}
					}
					onSubmit={async (data) => {
						if (editing === "new") {
							await createCategoryAction(data);
						} else {
							await updateCategoryAction(editing.id, data);
						}
						setEditing(null);
					}}
					onClose={() => setEditing(null)}
				/>
			)}
			<ConfirmDialog
				open={!!deleting}
				onOpenChange={(o) => {
					if (!o) setDeleting(null);
				}}
				title="Delete category?"
				description={
					deleting
						? `"${deleting.name}" will be permanently removed.${deleteError ? ` — ${deleteError}` : ""}`
						: undefined
				}
				confirmLabel="Delete"
				pending={pending}
				onConfirm={() => {
					if (!deleting) return;
					const target = deleting;
					setDeleteError(null);
					startTransition(async () => {
						try {
							await deleteCategoryAction(target.id);
							setDeleting(null);
						} catch (err) {
							setDeleteError(
								err instanceof Error ? err.message : "Failed to delete",
							);
						}
					});
				}}
			/>
		</PanelCard>
	);
}

// ---------- Suppliers ----------

function SuppliersPanel({
	suppliers,
	counts,
}: {
	suppliers: Supplier[];
	counts: Record<string, number>;
}) {
	const [editing, setEditing] = useState<Supplier | "new" | null>(null);
	const [deleting, setDeleting] = useState<Supplier | null>(null);
	const [deleteError, setDeleteError] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();

	return (
		<PanelCard
			title="Suppliers"
			onAdd={() => setEditing("new")}
			emptyMessage="No suppliers yet."
			rows={suppliers}
			className="xl:col-span-3"
		>
			{suppliers.map((s) => (
				<Row
					key={s.id}
					left={s.name}
					right={`${counts[s.id] ?? 0} items`}
					sub={s.mobile_number || s.email || s.address_1 || undefined}
					onEdit={() => setEditing(s)}
					onDelete={() => {
						setDeleteError(null);
						setDeleting(s);
					}}
				/>
			))}
			{editing && (
				<SupplierDialog
					mode={editing === "new" ? "create" : "edit"}
					initial={editing === "new" ? null : editing}
					onSubmit={async (data) => {
						if (editing === "new") {
							await createSupplierAction(data);
						} else {
							await updateSupplierAction(editing.id, data);
						}
						setEditing(null);
					}}
					onClose={() => setEditing(null)}
				/>
			)}
			<ConfirmDialog
				open={!!deleting}
				onOpenChange={(o) => {
					if (!o) setDeleting(null);
				}}
				title="Delete supplier?"
				description={
					deleting
						? `"${deleting.name}" will be permanently removed.${deleteError ? ` — ${deleteError}` : ""}`
						: undefined
				}
				confirmLabel="Delete"
				pending={pending}
				onConfirm={() => {
					if (!deleting) return;
					const target = deleting;
					setDeleteError(null);
					startTransition(async () => {
						try {
							await deleteSupplierAction(target.id);
							setDeleting(null);
						} catch (err) {
							setDeleteError(
								err instanceof Error ? err.message : "Failed to delete",
							);
						}
					});
				}}
			/>
		</PanelCard>
	);
}

// ---------- Shared shells ----------

function PanelCard({
	title,
	onAdd,
	emptyMessage,
	rows,
	children,
	className,
}: {
	title: string;
	onAdd: () => void;
	emptyMessage: string;
	rows: unknown[];
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div
			className={`flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm ${className ?? ""}`}
		>
			<div className="flex items-center justify-between">
				<h2 className="font-semibold text-sm">{title}</h2>
				<Button size="sm" variant="outline" onClick={onAdd}>
					<Plus className="size-3.5" /> Add
				</Button>
			</div>
			{rows.length === 0 ? (
				<p className="py-6 text-center text-muted-foreground text-sm">
					{emptyMessage}
				</p>
			) : (
				<ul className="flex flex-col divide-y">{children}</ul>
			)}
		</div>
	);
}

function Row({
	left,
	right,
	sub,
	onEdit,
	onDelete,
}: {
	left: string;
	right: string;
	sub?: string;
	onEdit: () => void;
	onDelete: () => void;
}) {
	return (
		<li className="flex items-center justify-between gap-3 py-2">
			<div className="min-w-0 flex-1">
				<div className="truncate font-medium text-sm">{left}</div>
				{sub && (
					<div className="truncate text-muted-foreground text-xs">{sub}</div>
				)}
			</div>
			<div className="text-muted-foreground text-xs">{right}</div>
			<div className="flex gap-1">
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={onEdit}
					aria-label="Edit"
				>
					<Pencil />
				</Button>
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={onDelete}
					aria-label="Delete"
				>
					<Trash2 />
				</Button>
			</div>
		</li>
	);
}

// ---------- Dialogs ----------

function SimpleNameDialog({
	mode,
	title,
	initial,
	onSubmit,
	onClose,
}: {
	mode: "create" | "edit";
	title: string;
	initial: { name: string };
	onSubmit: (data: { name: string }) => Promise<void>;
	onClose: () => void;
}) {
	const [name, setName] = useState(initial.name);
	const [pending, startTransition] = useTransition();
	const [error, setError] = useState<string | null>(null);

	useEffect(() => setName(initial.name), [initial.name]);

	return (
		<Dialog open onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
				</DialogHeader>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						setError(null);
						startTransition(async () => {
							try {
								await onSubmit({ name: name.trim() });
							} catch (err) {
								setError(err instanceof Error ? err.message : "Failed");
							}
						});
					}}
					className="flex flex-col gap-3"
				>
					<Input
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="Name"
						autoFocus
					/>
					{error && <p className="text-destructive text-xs">{error}</p>}
					<DialogFooter>
						<Button type="button" variant="outline" onClick={onClose}>
							Cancel
						</Button>
						<Button type="submit" disabled={pending || name.trim() === ""}>
							{pending ? "Saving…" : mode === "create" ? "Create" : "Save"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function CategoryDialog({
	mode,
	initial,
	onSubmit,
	onClose,
}: {
	mode: "create" | "edit";
	initial: { name: string; external_code: string };
	onSubmit: (data: {
		name: string;
		external_code: string | null;
	}) => Promise<void>;
	onClose: () => void;
}) {
	const [name, setName] = useState(initial.name);
	const [externalCode, setExternalCode] = useState(initial.external_code);
	const [pending, startTransition] = useTransition();
	const [error, setError] = useState<string | null>(null);

	return (
		<Dialog open onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>
						{mode === "create" ? "New category" : "Edit category"}
					</DialogTitle>
				</DialogHeader>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						setError(null);
						startTransition(async () => {
							try {
								await onSubmit({
									name: name.trim(),
									external_code:
										externalCode.trim() === "" ? null : externalCode.trim(),
								});
							} catch (err) {
								setError(err instanceof Error ? err.message : "Failed");
							}
						});
					}}
					className="flex flex-col gap-3"
				>
					<div className="flex flex-col gap-1.5">
						<label className="font-medium text-sm">Name</label>
						<Input
							value={name}
							onChange={(e) => setName(e.target.value)}
							autoFocus
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<label className="font-medium text-sm">External code</label>
						<Input
							value={externalCode}
							onChange={(e) => setExternalCode(e.target.value)}
							placeholder="optional"
						/>
					</div>
					{error && <p className="text-destructive text-xs">{error}</p>}
					<DialogFooter>
						<Button type="button" variant="outline" onClick={onClose}>
							Cancel
						</Button>
						<Button type="submit" disabled={pending || name.trim() === ""}>
							{pending ? "Saving…" : mode === "create" ? "Create" : "Save"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

type SupplierFormState = {
	// Supplier Details
	name: string;
	description: string;
	account_number: string;
	payment_terms_value: string;
	payment_terms_unit: PaymentTermUnit;
	// Contact Information
	first_name: string;
	last_name: string;
	mobile_number: string;
	email: string;
	office_phone: string;
	website: string;
	// Address
	address_1: string;
	address_2: string;
	postcode: string;
	country: string;
	state: string;
	city: string;
};

function emptySupplierState(): SupplierFormState {
	return {
		name: "",
		description: "",
		account_number: "",
		payment_terms_value: "",
		payment_terms_unit: "days",
		first_name: "",
		last_name: "",
		mobile_number: "",
		email: "",
		office_phone: "",
		website: "",
		address_1: "",
		address_2: "",
		postcode: "",
		country: "",
		state: "",
		city: "",
	};
}

function fromSupplier(s: Supplier): SupplierFormState {
	return {
		name: s.name,
		description: s.description ?? "",
		account_number: s.account_number ?? "",
		payment_terms_value:
			s.payment_terms_value != null ? String(s.payment_terms_value) : "",
		payment_terms_unit: (s.payment_terms_unit as PaymentTermUnit) ?? "days",
		first_name: s.first_name ?? "",
		last_name: s.last_name ?? "",
		mobile_number: s.mobile_number ?? "",
		email: s.email ?? "",
		office_phone: s.office_phone ?? "",
		website: s.website ?? "",
		address_1: s.address_1 ?? "",
		address_2: s.address_2 ?? "",
		postcode: s.postcode ?? "",
		country: s.country ?? "",
		state: s.state ?? "",
		city: s.city ?? "",
	};
}

function SupplierDialog({
	mode,
	initial,
	onSubmit,
	onClose,
}: {
	mode: "create" | "edit";
	initial: Supplier | null;
	onSubmit: (data: SupplierInput) => Promise<void>;
	onClose: () => void;
}) {
	const [state, setState] = useState<SupplierFormState>(() =>
		initial ? fromSupplier(initial) : emptySupplierState(),
	);
	const [pending, startTransition] = useTransition();
	const [serverError, setServerError] = useState<string | null>(null);
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

	const set = <K extends keyof SupplierFormState>(
		key: K,
		value: SupplierFormState[K],
	) => setState((s) => ({ ...s, [key]: value }));

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setServerError(null);
		setFieldErrors({});

		const payload = {
			name: state.name.trim(),
			description: state.description.trim() === "" ? null : state.description.trim(),
			account_number:
				state.account_number.trim() === "" ? null : state.account_number.trim(),
			payment_terms_value:
				state.payment_terms_value.trim() === ""
					? null
					: Number(state.payment_terms_value),
			payment_terms_unit:
				state.payment_terms_value.trim() === "" ? null : state.payment_terms_unit,
			first_name: state.first_name.trim(),
			last_name: state.last_name.trim() === "" ? null : state.last_name.trim(),
			mobile_number:
				state.mobile_number.trim() === "" ? null : state.mobile_number.trim(),
			email: state.email.trim() === "" ? null : state.email.trim(),
			office_phone:
				state.office_phone.trim() === "" ? null : state.office_phone.trim(),
			website: state.website.trim() === "" ? null : state.website.trim(),
			address_1: state.address_1.trim(),
			address_2: state.address_2.trim() === "" ? null : state.address_2.trim(),
			postcode: state.postcode.trim() === "" ? null : state.postcode.trim(),
			country: state.country.trim(),
			state: state.state.trim() === "" ? null : state.state.trim(),
			city: state.city.trim() === "" ? null : state.city.trim(),
		};

		const result = supplierInputSchema.safeParse(payload);
		if (!result.success) {
			const errs: Record<string, string> = {};
			for (const issue of result.error.issues) {
				errs[issue.path.join(".")] = issue.message;
			}
			setFieldErrors(errs);
			return;
		}

		startTransition(async () => {
			try {
				await onSubmit(result.data);
			} catch (err) {
				setServerError(err instanceof Error ? err.message : "Failed");
			}
		});
	};

	return (
		<Dialog open onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="flex max-h-[90vh] w-full flex-col gap-0 p-0 sm:max-w-3xl">
				<DialogHeader>
					<DialogTitle>
						{mode === "create" ? "Add Supplier" : "Edit Supplier"}
					</DialogTitle>
				</DialogHeader>
				<form
					onSubmit={handleSubmit}
					className="flex min-h-0 flex-1 flex-col"
				>
					<div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
						<div className="grid gap-5 lg:grid-cols-2">
							{/* Left column: Supplier Details + Contact Information */}
							<div className="flex flex-col gap-5">
								<SupplierSection title="Supplier Details">
									<SField
										label="Supplier Name"
										required
										error={fieldErrors.name}
									>
										<Input
											value={state.name}
											onChange={(e) => set("name", e.target.value)}
											placeholder="EG: THE BODY SHOP"
										/>
									</SField>
									<SField
										label="Supplier Description"
										error={fieldErrors.description}
									>
										<Input
											value={state.description}
											onChange={(e) => set("description", e.target.value)}
											placeholder="EG: SUPPLY LOTION"
										/>
									</SField>
									<SField label="Account Number" error={fieldErrors.account_number}>
										<Input
											value={state.account_number}
											onChange={(e) => set("account_number", e.target.value)}
											placeholder="EG: 9999999999 (DASK)"
										/>
									</SField>
									<SField
										label="Payment Terms"
										error={
											fieldErrors.payment_terms_value ??
											fieldErrors.payment_terms_unit
										}
									>
										<div className="flex gap-2">
											<Input
												type="number"
												min={0}
												step={1}
												className="w-24"
												value={state.payment_terms_value}
												onChange={(e) =>
													set("payment_terms_value", e.target.value)
												}
												placeholder="30"
											/>
											<select
												value={state.payment_terms_unit}
												onChange={(e) =>
													set(
														"payment_terms_unit",
														e.target.value as PaymentTermUnit,
													)
												}
												className="h-9 rounded-md border bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
											>
												{PAYMENT_TERM_UNITS.map((u) => (
													<option key={u} value={u}>
														{u === "days" ? "Days" : "Months"}
													</option>
												))}
											</select>
										</div>
									</SField>
								</SupplierSection>

								<SupplierSection title="Contact Information">
									<div className="grid grid-cols-2 gap-3">
										<SField
											label="First Name"
											required
											error={fieldErrors.first_name}
										>
											<Input
												value={state.first_name}
												onChange={(e) => set("first_name", e.target.value)}
												placeholder="EG: JONATHAN"
											/>
										</SField>
										<SField label="Last Name" error={fieldErrors.last_name}>
											<Input
												value={state.last_name}
												onChange={(e) => set("last_name", e.target.value)}
												placeholder="EG: MORRISON"
											/>
										</SField>
									</div>
									<div className="grid grid-cols-2 gap-3">
										<SField
											label="Mobile Number"
											error={fieldErrors.mobile_number}
										>
											<Input
												type="tel"
												value={state.mobile_number}
												onChange={(e) => set("mobile_number", e.target.value)}
												placeholder="+60 12 345 6789"
											/>
										</SField>
										<SField label="E-Mail" error={fieldErrors.email}>
											<Input
												type="email"
												value={state.email}
												onChange={(e) => set("email", e.target.value)}
												placeholder="EG: WILSON.LAY@EXAMPLE.COM"
											/>
										</SField>
									</div>
									<div className="grid grid-cols-2 gap-3">
										<SField label="Office Phone" error={fieldErrors.office_phone}>
											<Input
												type="tel"
												value={state.office_phone}
												onChange={(e) => set("office_phone", e.target.value)}
												placeholder="+60 12 345 6789"
											/>
										</SField>
										<SField label="Website" error={fieldErrors.website}>
											<Input
												value={state.website}
												onChange={(e) => set("website", e.target.value)}
												placeholder="EG: WWW.EXAMPLE.COM"
											/>
										</SField>
									</div>
								</SupplierSection>
							</div>

							{/* Right column: Address */}
							<div className="flex flex-col gap-5">
								<SupplierSection title="Address">
									<SField label="Address 1" required error={fieldErrors.address_1}>
										<Input
											value={state.address_1}
											onChange={(e) => set("address_1", e.target.value)}
											placeholder="EG: CENTRUM @ OASIS CORPORATE PARK"
										/>
									</SField>
									<SField label="Address 2" error={fieldErrors.address_2}>
										<Input
											value={state.address_2}
											onChange={(e) => set("address_2", e.target.value)}
											placeholder="EG: JALAN PJU 1A/3"
										/>
									</SField>
									<SField label="Postcode" error={fieldErrors.postcode}>
										<Input
											value={state.postcode}
											onChange={(e) => set("postcode", e.target.value)}
											placeholder="EG: 47301"
										/>
									</SField>
									<SField label="Country" required error={fieldErrors.country}>
										<select
											value={state.country}
											onChange={(e) => set("country", e.target.value)}
											className="h-9 rounded-md border bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
										>
											<option value="">SELECT COUNTRY</option>
											{COUNTRY_OPTIONS.map((c) => (
												<option key={c} value={c}>
													{c}
												</option>
											))}
										</select>
									</SField>
									<SField label="State" error={fieldErrors.state}>
										<Input
											value={state.state}
											onChange={(e) => set("state", e.target.value)}
										/>
									</SField>
									<SField label="City" error={fieldErrors.city}>
										<Input
											value={state.city}
											onChange={(e) => set("city", e.target.value)}
											placeholder="EG: PETALING JAYA"
										/>
									</SField>
								</SupplierSection>
							</div>
						</div>

						{serverError && (
							<p className="text-destructive text-sm">{serverError}</p>
						)}
					</div>
					<DialogFooter className="border-t">
						<Button type="button" variant="outline" onClick={onClose}>
							Cancel
						</Button>
						<Button type="submit" disabled={pending}>
							{pending ? "Saving…" : mode === "create" ? "Create" : "Save"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function SupplierSection({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<fieldset className="flex flex-col gap-3 rounded-lg border p-3">
			<legend className="px-1 font-semibold text-primary text-xs uppercase tracking-wide">
				{title}
			</legend>
			{children}
		</fieldset>
	);
}

function SField({
	label,
	required,
	error,
	children,
}: {
	label: string;
	required?: boolean;
	error?: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-1.5">
			<label className="font-medium text-sm">
				{label}
				{required && <span className="ml-0.5 text-destructive">*</span>}
			</label>
			{children}
			{error && <p className="text-destructive text-xs">{error}</p>}
		</div>
	);
}
