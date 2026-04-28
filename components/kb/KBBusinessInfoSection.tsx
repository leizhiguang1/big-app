"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { KBBusinessInfo } from "./kb-types";

type Props = {
	data: KBBusinessInfo;
	onChange: (next: KBBusinessInfo) => void;
};

const FIELDS: Array<{
	key: keyof Omit<KBBusinessInfo, "hours">;
	label: string;
	placeholder: string;
}> = [
	{ key: "name", label: "Business Name", placeholder: "e.g. Big Dental" },
	{ key: "phone", label: "Phone Number", placeholder: "+60 12-345 6789" },
	{ key: "email", label: "Email", placeholder: "hello@business.com" },
	{ key: "website", label: "Website", placeholder: "https://example.com" },
	{ key: "address", label: "Address", placeholder: "Full address" },
	{ key: "parking", label: "Parking", placeholder: "Free parking nearby" },
	{ key: "panels", label: "Insurance Panels", placeholder: "Great Eastern, AIA…" },
	{
		key: "paymentMethods",
		label: "Payment Methods",
		placeholder: "Cash, card, online transfer",
	},
];

export function KBBusinessInfoSection({ data, onChange }: Props) {
	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
			{FIELDS.map((f) => (
				<div key={f.key}>
					<Label htmlFor={`bi-${f.key}`}>{f.label}</Label>
					<Input
						id={`bi-${f.key}`}
						value={data[f.key] ?? ""}
						placeholder={f.placeholder}
						onChange={(e) => onChange({ ...data, [f.key]: e.target.value })}
						className="mt-1.5"
					/>
				</div>
			))}
			<div className="sm:col-span-2">
				<Label htmlFor="bi-hours">Operating Hours</Label>
				<Textarea
					id="bi-hours"
					rows={4}
					value={data.hours ?? ""}
					placeholder={"Mon–Fri: 9:00 AM – 6:00 PM\nSat: 9:00 AM – 2:00 PM\nSun: Closed"}
					onChange={(e) => onChange({ ...data, hours: e.target.value })}
					className="mt-1.5"
				/>
			</div>
		</div>
	);
}
