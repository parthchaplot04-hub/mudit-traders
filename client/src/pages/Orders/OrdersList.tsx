import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { format } from "date-fns";
import { ClipboardList, Plus, Search, Eye, Filter } from "lucide-react";
import { WorkflowStage } from "./OrderProgressBar";

const STATUS_COLORS: Record<WorkflowStage, string> = {
  WAITING_FOR_STAFF: "bg-slate-100 text-slate-800",
  COLLECTING_ITEMS: "bg-blue-100 text-blue-800",
  PACKING: "bg-indigo-100 text-indigo-800",
  WAITING_FOR_OWNER_CHECK: "bg-purple-100 text-purple-800",
  OWNER_CHECKING: "bg-fuchsia-100 text-fuchsia-800",
  READY_FOR_BILLING: "bg-orange-100 text-orange-800",
  BILL_CREATED: "bg-emerald-100 text-emerald-800",
  PAYMENT_PENDING: "bg-red-100 text-red-800",
  READY_FOR_HANDOVER: "bg-teal-100 text-teal-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-50 text-red-600",
};

export default function OrdersList() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<WorkflowStage | "">("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const navigate = useNavigate();

  const limit = 20;

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter]);

  async function fetchOrders() {
    setLoading(true);
    try {
      const res = await axios.get("/api/orders", {
        params: { page, limit, status: statusFilter || undefined },
        withCredentials: true
      });
      setOrders(res.data.data);
      setTotal(res.data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleAction = (order: any) => {
    if (["WAITING_FOR_STAFF", "COLLECTING_ITEMS", "PACKING"].includes(order.status)) {
      navigate(`/orders/${order._id}/pick`);
    } else {
      navigate(`/orders/${order._id}/checkout`);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
            <ClipboardList className="h-6 w-6 text-emerald-600" />
            Customer Orders
          </h1>
          <p className="text-slate-500 text-sm mt-1">Strict fulfilment workflow from Creation to Handover.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/orders/create"
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition"
          >
            <Plus size={18} />
            New Order
          </Link>
        </div>
      </div>

      {/* Summary Counters could go here */}

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center gap-4 bg-slate-50">
          <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
            <Filter size={16} /> Filter:
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setPage(1);
            }}
            className="px-3 py-1.5 border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
          >
            <option value="">All Orders</option>
            <option value="WAITING_FOR_STAFF">Waiting For Staff (New)</option>
            <option value="COLLECTING_ITEMS">With Staff (Collecting)</option>
            <option value="PACKING">With Staff (Packing)</option>
            <option value="WAITING_FOR_OWNER_CHECK">Awaiting Owner Check</option>
            <option value="OWNER_CHECKING">Owner Checking</option>
            <option value="READY_FOR_BILLING">Ready for Billing</option>
            <option value="PAYMENT_PENDING">Awaiting Payment</option>
            <option value="READY_FOR_HANDOVER">Ready for Handover</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Order ID</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3 text-center">Items</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Staff</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center animate-pulse">Loading orders...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">No orders found.</td></tr>
              ) : (
                orders.map(order => (
                  <tr key={order._id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => handleAction(order)}>
                    <td className="px-6 py-4 font-mono font-bold text-slate-800">{order.orderNumber}</td>
                    <td className="px-6 py-4">{format(new Date(order.createdAt), "dd MMM, p")}</td>
                    <td className="px-6 py-4 font-medium text-slate-700">
                      {order.customerId?.name || "Walk-in Customer"}
                    </td>
                    <td className="px-6 py-4 text-center font-medium">{order.items.length}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_COLORS[order.status as WorkflowStage] || "bg-slate-100 text-slate-800"}`}>
                        {order.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {order.pickedBy ? order.pickedBy.name : "-"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="px-4 py-1.5 bg-slate-800 text-white rounded text-xs font-bold hover:bg-slate-700 transition">
                        {["WAITING_FOR_STAFF", "COLLECTING_ITEMS", "PACKING"].includes(order.status) ? "Fulfil" : "Manage"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
