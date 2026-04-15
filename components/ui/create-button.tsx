import { Plus } from "lucide-react";
import type * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = React.ComponentProps<"button"> & {
	size?: "sm" | "default";
	asChild?: boolean;
};

export function CreateButton({
	children,
	className,
	size = "default",
	...rest
}: Props) {
	return (
		<Button variant="success" size={size} className={cn(className)} {...rest}>
			<Plus />
			{children}
		</Button>
	);
}
