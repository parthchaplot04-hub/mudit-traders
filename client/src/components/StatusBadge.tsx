const STYLES: Record<string, string> = {
  OK: "bg-emerald-100 text-emerald-700",
  LOW: "bg-amber-100 text-amber-700",
  ORDER_REQUIRED: "bg-orange-100 text-orange-700",
  OUT_OF_STOCK: "bg-red-100 text-red-700",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${STYLES[status] || "bg-slate-100 text-slate-700"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
