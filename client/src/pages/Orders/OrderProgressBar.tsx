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

  let currentIndex = STAGES.findIndex((s) => s.matches.includes(currentStatus));
  if (currentIndex === -1) currentIndex = 0; 
  if (currentStatus === "COMPLETED") currentIndex = STAGES.length - 1;

  return (
    <div className="w-full py-8 print-hidden relative overflow-hidden">
      <div className="flex items-center justify-between w-full relative">
        
        {/* Background Track Line */}
        <div className="absolute top-4 left-0 right-0 h-1 bg-slate-200 z-0"></div>

        {STAGES.map((stage, idx) => {
          const isCompleted = idx < currentIndex || currentStatus === "COMPLETED";
          const isCurrent = idx === currentIndex && currentStatus !== "COMPLETED";

          return (
            <div key={stage.key} className="flex-1 relative flex flex-col items-center group">
              
              {/* Active/Completed Line Fill */}
              {idx < STAGES.length - 1 && isCompleted && (
                <div className="absolute top-4 left-1/2 right-[-50%] h-1 bg-emerald-500 z-0"></div>
              )}

              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold z-10 shrink-0 border-4 border-white
                  ${isCompleted ? "bg-emerald-600 text-white" : isCurrent ? "bg-blue-600 text-white ring-2 ring-blue-500" : "bg-slate-200 text-slate-500"}`}
              >
                {isCompleted ? <Check size={16} /> : idx + 1}
              </div>
              <div className={`mt-3 text-[10px] md:text-sm font-semibold text-center leading-tight ${isCurrent ? 'text-blue-700' : isCompleted ? 'text-slate-800' : 'text-slate-400'}`}>
                {stage.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
