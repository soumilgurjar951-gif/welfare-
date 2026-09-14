import { Badge } from "@/components/ui/badge";

const variantFor: Record<string, "warning" | "success" | "destructive" | "secondary"> = {
  Pending: "warning",
  Approved: "success",
  Rejected: "destructive",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={variantFor[status] ?? "secondary"}>{status}</Badge>;
}
