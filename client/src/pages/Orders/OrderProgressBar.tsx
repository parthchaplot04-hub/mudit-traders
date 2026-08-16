import { Check } from "lucide-react";

export type WorkflowStage =
  | "WAITING_FOR_STAFF"
  | "COLLECTING_ITEMS"
  | "PACKING"
  | "WAITING_FOR_OWNER_CHECK"
  | "OWNER_CHECKING"
  | "READY_FOR_BILLING"
  | "BILL_CREATED"
  | "PAYMENT_PENDING"
  | "READY_FOR_HANDOVER"
  | "COMPLETED"
  | "CANCELLED";

const STAGES = [
  { key: "CREATE", label: "Created", matches: [] },
  { key: "COLLECT", label: "Collection", matches: ["WAITING_FOR_STAFF", "COLLECTING_ITEMS"] },
  { key: "PACK", label: "Packing", matches: ["PACKING"] },
  { key: "VERIFY", label: "Verification", matches: ["WAITING_FOR_OWNER_CHECK", "OWNER_CHECKING"] },
  { key: "BILL", label: "Billing", matches: ["READY_FOR_BILLING"] },
  { key: "PAY", label: "Payment", matches: ["BILL_CREATED", "PAYMENT_PENDING"] },
  { key: "HANDOVER", label: "Handover", matches: ["READY_FOR_HANDOVER"] },
  { key: "DONE", label: "Completed", matches: ["COMPLETED"] },
];

export default function OrderProgressBar({ currentStatus }: { currentStatus: WorkflowStage }) {
  if (currentStatus === "CANCELLED") {
    return (
      <div className="bg-red-50 text-red-600 font-bold p-4 rounded-lg text-center">
        Order Cancelled
      </div>
    );
  }

  // Find the index of the current stage
  let currentIndex = STAGES.findIndex((s) => s.matches.includes(currentStatus));
  if (currentIndex === -1) currentIndex = 0; // Default to Created if mapping is weird
  if (currentStatus === "COMPLETED") currentIndex = STAGES.length - 1;

  return (
    <div className="w-full py-6 print-hidden">
      <div className="flex items-start justify-between w-full">
        {STAGES.map((stage, idx) => {
          const isCompleted = idx < currentIndex || currentStatus === "COMPLETED";
          const isCurrent = idx === currentIndex && currentStatus !== "COMPLETED";

          return (
            <div key={stage.key} className="flex items-center flex-1 last:flex-none relative">
              
              <div className="relative flex flex-col items-center group w-full">
                <div
                  className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-[10px] md:text-sm font-bold z-10 shrink-0
                    ${isCompleted ? "bg-emerald-600 text-white" : isCurrent ? "bg-blue-600 text-white ring-4 ring-blue-100" : "bg-slate-200 text-slate-400"}`}
                >
                  {isCompleted ? <Check size={14} /> : idx + 1}
                </div>
                <div className={`absolute top-8 md:top-10 text-[10px] md:text-xs font-semibold text-center w-16 md:w-20 leading-tight ${isCurrent ? 'text-blue-700' : isCompleted ? 'text-slate-700' : 'text-slate-400'}`}>
                  {stage.label}
                </div>
              </div>

              {idx < STAGES.length - 1 && (
                <div className={`absolute top-3 md:top-4 left-1/2 w-full h-1 -z-10 ${isCompleted ? 'bg-emerald-500' : 'bg-slate-200'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
