"use client";

import { Globe, Link2, MapPin, ShoppingBag } from "lucide-react";
import { PlaceholderBanner } from "@/components/config/PlaceholderBanner";
import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";

const SOCIAL_PLATFORMS = [
	{ id: "facebook", label: "Facebook", icon: Link2, prefix: null, placeholder: "facebook.com/yourpage" },
	{ id: "instagram", label: "Instagram", icon: Link2, prefix: null, placeholder: "instagram.com/yourhandle" },
	{ id: "linkedin", label: "LinkedIn", icon: Link2, prefix: null, placeholder: "linkedin.com/company/yourco" },
	{ id: "pinterest", label: "Pinterest", icon: Link2, prefix: null, placeholder: "pinterest.com/yourboard" },
	{ id: "twitter", label: "Twitter / X", icon: Link2, prefix: null, placeholder: "twitter.com/yourhandle" },
	{ id: "website", label: "Website", icon: Globe, prefix: "http://", placeholder: "yourdomain.com" },
	{ id: "tripadvisor", label: "TripAdvisor", icon: MapPin, prefix: "tripadvisor.com/", placeholder: "restaurant/your-listing" },
	{ id: "lazada", label: "Lazada", icon: ShoppingBag, prefix: null, placeholder: "lazada.com.my/shop/yourshop" },
	{ id: "shopee", label: "Shopee", icon: ShoppingBag, prefix: null, placeholder: "shopee.com.my/yourshop" },
] as const;

const CURRENCIES = [
	{ value: "MYR", label: "Malaysian Ringgit (MYR)" },
	{ value: "SGD", label: "Singapore Dollar (SGD)" },
	{ value: "USD", label: "US Dollar (USD)" },
	{ value: "PHP", label: "Philippine Peso (PHP)" },
];

export function GeneralTab() {
	return (
		<div className="space-y-4">
			<PlaceholderBanner />

			<div className="grid gap-4 lg:grid-cols-2">
				{/* Business Details */}
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-base">Business Details</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						{/* QR Placeholder */}
						<div className="flex flex-col items-center gap-1 pb-2">
							<div className="flex size-24 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted text-muted-foreground text-xs">
								QR Code
							</div>
							<p className="text-muted-foreground text-xs">
								Scan the QR with your mobile app
							</p>
						</div>

						<div className="grid gap-3 sm:grid-cols-2">
							<div className="space-y-1.5">
								<Label htmlFor="biz-name">
									Business Name <span className="text-destructive">*</span>
								</Label>
								<Input id="biz-name" defaultValue="My Business" />
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="biz-nickname">
									Nickname <span className="text-destructive">*</span>
								</Label>
								<Input id="biz-nickname" defaultValue="MB" />
							</div>
						</div>

						<div className="grid gap-3 sm:grid-cols-2">
							<div className="space-y-1.5">
								<Label htmlFor="biz-contact">
									Business Contact <span className="text-destructive">*</span>
								</Label>
								<Input id="biz-contact" defaultValue="+601234567890" />
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="biz-subdomain">Business Sub-Domain</Label>
								<div className="flex">
									<Input
										id="biz-subdomain"
										defaultValue="mybusiness"
										className="rounded-r-none"
									/>
									<span className="inline-flex items-center rounded-r-md border border-l-0 bg-muted px-3 text-muted-foreground text-sm">
										.app.com
									</span>
								</div>
							</div>
						</div>

						<div className="space-y-1.5">
							<Label htmlFor="currency">
								Currency <span className="text-destructive">*</span>
							</Label>
							<Select defaultValue="MYR">
								<SelectTrigger id="currency" className="w-[240px]">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{CURRENCIES.map((c) => (
										<SelectItem key={c.value} value={c.value}>
											{c.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="flex justify-end pt-2">
							<Button size="sm">Save</Button>
						</div>
					</CardContent>
				</Card>

				{/* Social Media */}
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-base">Social Media</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						{SOCIAL_PLATFORMS.map((p) => {
							const Icon = p.icon;
							return (
								<div key={p.id} className="flex items-center gap-2">
									<Icon className="size-5 shrink-0 text-muted-foreground" />
									{p.prefix ? (
										<div className="flex flex-1">
											<span className="inline-flex items-center rounded-l-md border border-r-0 bg-muted px-2 text-muted-foreground text-xs">
												{p.prefix}
											</span>
											<Input
												className="rounded-l-none"
												placeholder={p.placeholder}
											/>
										</div>
									) : (
										<Input className="flex-1" placeholder={p.placeholder} />
									)}
									<Switch defaultChecked />
								</div>
							);
						})}
						<div className="flex justify-end pt-2">
							<Button size="sm">Save</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
