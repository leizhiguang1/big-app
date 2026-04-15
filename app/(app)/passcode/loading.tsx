import { TableSkeleton } from "@/components/ui/table-skeleton";

export default function Loading() {
	return <TableSkeleton columns={4} rows={8} />;
}
