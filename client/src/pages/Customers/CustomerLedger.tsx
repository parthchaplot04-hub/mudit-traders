import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, User, Phone, MapPin, Hash, Mail, FileText, Banknote, History, Edit, X, ExternalLink } from "lucide-react";
import { api } from "../../lib/api";
import { formatPaise } from "../../utils/format";
import { format } from "date-fns";
import { Invoice } from "../../components/Invoice";

export default function CustomerLedger() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", phone: "", email: "", aadharNumber: "", address: "", notes: "" });

  const [viewSaleId, setViewSaleId] = useState<string | null>(null);

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

  const updateMutation = useMutation({
    mutationFn: async () => {
      await api.put(`/customers/${id}`, editForm);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      setIsEditDrawerOpen(false);
    },
  });

  const { data: saleData } = useQuery<{ sale: any }>({
    queryKey: ["sale", viewSaleId],
    queryFn: async () => (await api.get(`/sales/${viewSaleId}`)).data,
    enabled: !!viewSaleId,
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
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                <User size={28} className="text-emerald-600" />
                {c.name}
              </h1>
              <button 
                onClick={() => {
                  setEditForm({ name: c.name, phone: c.phone || "", email: c.email || "", aadharNumber: c.aadharNumber || "", address: c.address || "", notes: c.notes || "" });
                  setIsEditDrawerOpen(true);
                }}
                className="text-slate-400 hover:text-emerald-600 p-1 rounded-full hover:bg-emerald-50 transition-colors"
              >
                <Edit size={16} />
              </button>
            </div>
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
                        <button 
                          onClick={() => setViewSaleId(entry.referenceId)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 transition-colors cursor-pointer"
                        >
                          <FileText size={12} /> Credit Sale <ExternalLink size={10} className="ml-0.5 opacity-50" />
                        </button>
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

      {isEditDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setIsEditDrawerOpen(false)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Edit Customer</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full border rounded-lg px-3 py-2 outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Number</label>
                <input value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="w-full border rounded-lg px-3 py-2 outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} className="w-full border rounded-lg px-3 py-2 outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Aadhar Number</label>
                <input value={editForm.aadharNumber} onChange={e => setEditForm({...editForm, aadharNumber: e.target.value})} className="w-full border rounded-lg px-3 py-2 outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <textarea value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} className="w-full border rounded-lg px-3 py-2 outline-none focus:border-emerald-500 h-20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})} className="w-full border rounded-lg px-3 py-2 outline-none focus:border-emerald-500 h-20" />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button onClick={() => setIsEditDrawerOpen(false)} className="flex-1 py-2 rounded-lg font-medium text-slate-600 bg-slate-100 hover:bg-slate-200">Cancel</button>
              <button onClick={() => updateMutation.mutate()} disabled={!editForm.name || updateMutation.isPending} className="flex-1 py-2 rounded-lg font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {viewSaleId && saleData?.sale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-slate-900">Credit Sale Details</h2>
              <button onClick={() => setViewSaleId(null)} className="p-1 hover:bg-slate-200 rounded-full"><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto bg-slate-100 p-4">
              <Invoice sale={saleData.sale} customerName={c.name} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
