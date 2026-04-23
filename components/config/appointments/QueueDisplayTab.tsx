"use client";

import { Upload } from "lucide-react";
import { PlaceholderBanner } from "@/components/config/PlaceholderBanner";
import { SettingToggleRow } from "@/components/config/SettingToggleRow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

const FONT_SIZES = ["16", "20", "24", "28", "32", "36", "40", "48"];

export function QueueDisplayTab() {
	return (
		<div className="space-y-4">
			<PlaceholderBanner />

			<Card className="max-w-2xl">
				<CardContent className="space-y-3 pt-6">
					<SettingToggleRow
						label="Automatically notify customers once appointment status has been changed to 'Started'"
						hint="Sends a notification (SMS/WhatsApp) to the customer when the appointment starts."
						defaultChecked
					/>
					<SettingToggleRow
						label="Hide customer names in queue display list"
						hint="Replaces names with appointment numbers on the public-facing queue screen."
					/>
				</CardContent>
			</Card>

			<Card className="max-w-2xl">
				<CardHeader className="pb-3">
					<CardTitle className="text-base">Overlay Settings</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-1.5">
							<Label>Selected Outlet</Label>
							<Select defaultValue="main">
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="main">Main Outlet</SelectItem>
									<SelectItem value="branch-a">Branch A</SelectItem>
									<SelectItem value="branch-b">Branch B</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1.5">
							<Label>Font Size (Pixels)</Label>
							<Select defaultValue="32">
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{FONT_SIZES.map((s) => (
										<SelectItem key={s} value={s}>
											{s}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					<SettingToggleRow label="Apply to all outlets" />

					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label>Queue Display Banner Image</Label>
							<div className="flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-muted-foreground/30 bg-muted/40 text-muted-foreground text-sm transition-colors hover:border-primary/50">
								<Upload className="size-5" />
								<span>No banner image uploaded for this outlet yet</span>
							</div>
						</div>
						<div className="space-y-2">
							<Label>Queue Display Video</Label>
							<div className="flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-muted-foreground/30 bg-muted/40 text-muted-foreground text-sm transition-colors hover:border-primary/50">
								<Upload className="size-5" />
								<span>No video uploaded for this outlet yet</span>
							</div>
							<Input placeholder="Video / Playlist link" />
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
