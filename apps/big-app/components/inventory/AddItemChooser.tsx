"use client";

import { Package, Pill, Syringe } from "lucide-react";
import { useState } from "react";
import { CreateButton } from "@/components/ui/create-button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import type { InventoryKind } from "@/lib/schemas/inventory";
import type {
	InventoryBrand,
	InventoryCategory,
	InventoryUom,
	Supplier,
} from "@/lib/services/inventory";
import type { Tax } from "@/lib/services/taxes";
import { ItemFormDialog } from "./ItemForm";

type Props = {
	uoms: InventoryUom[];
	brands: InventoryBrand[];
	categories: InventoryCategory[];
	suppliers: Supplier[];
	taxes: Tax[];
};

const CARDS: Array<{
	kind: InventoryKind;
	title: string;
	description: string;
	icon: typeof Package;
}> = [
	{
		kind: "product",
		title: "Product",
		description: "Inventory items that you sell exclusively off-the-shelf.",
		icon: Package,
	},
	{
		kind: "consumable",
		title: "Consumable",
		description:
			"Inventory items associated with a service, but they can also be sold off-the-shelf. Examples: gloves, syringes, gauze, ampoules.",
		icon: Syringe,
	},
	{
		kind: "medication",
		title: "Medication",
		description:
			"Drugs that must be prescribed to customers. Cannot be used as consumables but can be sold off-the-shelf or as part of a service.",
		icon: Pill,
	},
];

export function AddItemButton(props: Props) {
	const [chooserOpen, setChooserOpen] = useState(false);
	const [pickedKind, setPickedKind] = useState<InventoryKind | null>(null);

	return (
		<>
			<CreateButton onClick={() => setChooserOpen(true)}>Add item</CreateButton>
			<Dialog
				open={chooserOpen}
				onOpenChange={(o) => {
					if (!o) setChooserOpen(false);
				}}
			>
				<DialogContent className="sm:max-w-2xl">
					<DialogHeader>
						<DialogTitle>Add inventory item</DialogTitle>
					</DialogHeader>
					<div className="grid gap-3 sm:grid-cols-3">
						{CARDS.map((card) => {
							const Icon = card.icon;
							return (
								<button
									key={card.kind}
									type="button"
									onClick={() => {
										setPickedKind(card.kind);
										setChooserOpen(false);
									}}
									className="flex flex-col items-start gap-2 rounded-lg border bg-card p-4 text-left transition-colors hover:border-primary hover:bg-accent"
								>
									<Icon className="size-6 text-primary" />
									<div className="font-semibold text-sm">{card.title}</div>
									<div className="text-muted-foreground text-xs leading-snug">
										{card.description}
									</div>
								</button>
							);
						})}
					</div>
				</DialogContent>
			</Dialog>
			{pickedKind && (
				<ItemFormDialog
					open={!!pickedKind}
					mode="create"
					kind={pickedKind}
					item={null}
					uoms={props.uoms}
					brands={props.brands}
					categories={props.categories}
					suppliers={props.suppliers}
					taxes={props.taxes}
					onClose={() => setPickedKind(null)}
				/>
			)}
		</>
	);
}
