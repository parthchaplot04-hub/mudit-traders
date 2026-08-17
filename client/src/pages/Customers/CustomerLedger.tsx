import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, User, Phone, MapPin, Hash, Mail, FileText, Banknote, History } from "lucide-react";
import { api } from "../../lib/api";
import { formatPaise } from "../../utils/format";
import { format } from "date-fns";

export default function CustomerLedger() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  const { data: customerData, isLoading: isLoadingCustomer } = useQuery<{ customer: any }>({
    queryKey: ["customer", id],
    queryFn: async () => (await api.get(`/customers/${id}`)).data,
  });

  const { data: ledgerData, isLoading: isLoadingLedger } = useQuery<{ items: any[] }>({
    queryKey: ["customer-ledger", id],
    queryFn: async () => (await api.get(`/customers/${id}/ledger`)).data,
  });

  const paymentMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/customers/${id}/payments`, {
        amountRupees: parseFloat(paymentAmount),
        notes: paymentNotes || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      queryClient.invalidateQueries({ queryKey: ["customer-ledger", id] });
      setIsPaymentModalOpen(false);
      setPaymentAmount("");
      setPaymentNotes("");
    },
  });

  if (isLoadingCustomer) return <div className="p-8 text-center text-slate-500">Loading customer profile...</div>;
  if (!customerData?.customer) return <div className="p-8 text-center text-red-500">Customer not found</div>;

  const c = customerData.customer;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/customers" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft size={16} /> Back to Customers
        </Link>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <User size={28} className="text-emerald-600" />
              {c.name}
            </h1>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-600">
              {c.phone && <span className="flex items-center gap-1.5"><Phone size={14}/> {c.phone}</span>}
              {c.email && <span className="flex items-center gap-1.5"><Mail size={14}/> {c.email}</span>}
              {c.aadharNumber && <span className="flex items-center gap-1.5"><Hash size={14}/> {c.aadharNumber}</span>}
              {c.address && <span className="flex items-center gap-1.5"><MapPin size={14}/> {c.address}</span>}
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 text-right min-w-[200px]">
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Outstanding Balance</p>
            <p className={`text-3xl font-bold mt-1 ${c.outstandingPaise > 0 ? "text-red-600" : "text-emerald-600"}`}>
              {formatPaise(c.outstandingPaise)}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <History size={20} className="text-slate-500"/> Ledger History
          </h2>
          <button
            onClick={() => setIsPaymentModalOpen(true)}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-emerald-700 shadow-sm"
          >
            <Banknote size={18} /> Record Payment
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white text-slate-500 font-semibold text-xs uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Notes / Details</th>
                <th className="px-6 py-4 text-right">Debit (Credit Taken)</th>
                <th className="px-6 py-4 text-right">Credit (Payment)</th>
                <th className="px-6 py-4 text-right text-slate-800">Running Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoadingLedger ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400">Loading ledger...</td></tr>
              ) : ledgerData?.items.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400">No transactions yet.</td></tr>
              ) : (
                ledgerData?.items.map((entry) => (
                  <tr key={entry._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                      {format(new Date(entry.createdAt), "dd MMM yyyy, p")}
                    </td>
                    <td className="px-6 py-4">
                      {entry.type === "SALE_CREDIT" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700">
                          <FileText size={12} /> Credit Sale
                        </span>
                      ) : entry.type === "PAYMENT" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                          <Banknote size={12} /> Payment Received
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                          Adjustment
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600 max-w-xs truncate">
                      {entry.notes || "-"}
                    </td>
                    <td className="px-6 py-4 text-right text-red-600 font-medium">
                      {entry.amountPaise > 0 ? formatPaise(entry.amountPaise) : "-"}
                    </td>
                    <td className="px-6 py-4 text-right text-emerald-600 font-medium">
                      {entry.amountPaise < 0 ? formatPaise(Math.abs(entry.amountPaise)) : "-"}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900">
                      {formatPaise(entry.balanceAfterPaise)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-200 bg-slate-50">
              <h2 className="text-xl font-bold text-slate-900">Record Payment</h2>
              <p className="text-sm text-slate-500 mt-1">Receive payment from {c.name}</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-red-50 text-red-800 p-3 rounded-lg border border-red-100 flex justify-between items-center">
                <span className="text-sm font-medium">Current Outstanding:</span>
                <span className="text-lg font-bold">{formatPaise(c.outstandingPaise)}</span>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Amount (₹) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all text-lg font-semibold"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes / Reference (Optional)</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={e => setPaymentNotes(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 outline-none focus:border-emerald-500"
                  placeholder="e.g. Paid via Cash, Cheque #1234"
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex gap-3 bg-slate-50">
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="flex-1 py-2.5 rounded-lg font-bold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => paymentMutation.mutate()}
                disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || paymentMutation.isPending}
                className="flex-1 py-2.5 rounded-lg font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {paymentMutation.isPending ? "Saving..." : "Confirm Payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
