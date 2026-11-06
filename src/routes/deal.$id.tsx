import { Link, createFileRoute } from "@tanstack/react-router";
import { DealWorkspace } from "@/components/deal-workspace";
import { useAppStore } from "@/lib/store";

export const Route = createFileRoute("/deal/$id")({ component: DealPage });

function DealPage() {
  const { id } = Route.useParams();
  const deal = useAppStore((s) => s.deals.find((d) => d.id === id));
  if (!deal) {
    return (
      <div className="grid gap-3">
        <h1 className="font-serif text-4xl">That deal isn’t on this desk</h1>
        <Link to="/" className="text-moss underline">Back to the pipeline</Link>
      </div>
    );
  }
  return <DealWorkspace deal={deal} />;
}
