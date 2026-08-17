import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, ExternalLink, Mail, Phone, MapPin, Hash } from "lucide-react";
import { api } from "../../lib/api";
import { formatPaise } from "../../utils/format";
import { Link } from "react-router-dom";

export default function CustomersList() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // New Customer Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [aadharNumber, setAadharNumber] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const { data: customers, isLoading } = useQuery<{ items: any[] }>({
    queryKey: ["customers"],
    queryFn: async () => (await api.get("/customers")).data,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        phone: phone || undefined,
        email: email || undefined,
        aadharNumber: aadharNumber || undefined,
        address: address || undefined,
        notes: notes || undefined,
      };
      await api.post("/customers", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setIsDrawerOpen(false);
      setName("");
      setPhone("");
      setEmail("");
      setAadharNumber("");
      setAddress("");
      setNotes("");
    },
  });

  const filtered = customers?.items.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone && c.phone.includes(search))
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customers (Credit)</h1>
          <p className="text-slate-500 text-sm mt-1">Manage customer profiles and credit ledgers</p>
        </div>
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-emerald-700"
        >
          <Plus size={18} /> New Customer
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 font-medium">
              <tr>
                <th className="px-6 py-4">Customer Name</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4 text-right">Outstanding Balance</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr><td colSpan={4} className="text-center py-8 text-slate-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-slate-400">No customers found.</td></tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{c.name}</div>
                      {c.aadharNumber && <div className="text-xs text-slate-400 mt-1 flex items-center gap-1"><Hash size={12}/> Aadhar: {c.aadharNumber}</div>}
                    </td>
                    <td className="px-6 py-4 space-y-1">
                      {c.phone ? <div className="flex items-center gap-2 text-slate-600"><Phone size={14}/> {c.phone}</div> : <div className="text-slate-400 text-xs italic">No phone</div>}
                      {c.email && <div className="flex items-center gap-2 text-slate-600"><Mail size={14}/> {c.email}</div>}
                      {c.address && <div className="flex items-center gap-2 text-slate-600"><MapPin size={14}/> {c.address}</div>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-bold ${c.outstandingPaise > 0 ? "text-red-600" : "text-emerald-600"}`}>
                        {formatPaise(c.outstandingPaise)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        to={`/customers/${c._id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded hover:bg-emerald-100"
                      >
                        View Ledger <ExternalLink size={14} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setIsDrawerOpen(false)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Add New Customer</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input value={name} onChange={e => setName(e.target.value)} className="w-full border rounded-lg px-3 py-2 outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Number</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full border rounded-lg px-3 py-2 outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email (Optional)</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border rounded-lg px-3 py-2 outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Aadhar Number (Optional)</label>
                <input value={aadharNumber} onChange={e => setAadharNumber(e.target.value)} className="w-full border rounded-lg px-3 py-2 outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address (Optional)</label>
                <textarea value={address} onChange={e => setAddress(e.target.value)} className="w-full border rounded-lg px-3 py-2 outline-none focus:border-emerald-500 h-20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes (Optional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full border rounded-lg px-3 py-2 outline-none focus:border-emerald-500 h-20" />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button onClick={() => setIsDrawerOpen(false)} className="flex-1 py-2 rounded-lg font-medium text-slate-600 bg-slate-100 hover:bg-slate-200">Cancel</button>
              <button onClick={() => createMutation.mutate()} disabled={!name || createMutation.isPending} className="flex-1 py-2 rounded-lg font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50">Save Customer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
