import { TableSkeleton } from "@/components/ui/table-skeleton";

export default function Loading() {
	return <TableSkeleton columns={5} rows={8} />;
}
