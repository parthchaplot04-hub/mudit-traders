import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { format } from "date-fns";
import { ClipboardList, Plus, Search, Eye, Filter } from "lucide-react";

type OrderStatus = "PENDING" | "PICKING" | "READY_FOR_CHECK" | "CHECKED" | "READY_TO_BILL" | "BILLED" | "COMPLETED" | "CANCELLED";

const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: "bg-slate-100 text-slate-800",
  PICKING: "bg-blue-100 text-blue-800",
  READY_FOR_CHECK: "bg-purple-100 text-purple-800",
  CHECKED: "bg-indigo-100 text-indigo-800",
  READY_TO_BILL: "bg-fuchsia-100 text-fuchsia-800",
  BILLED: "bg-emerald-100 text-emerald-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export default function OrdersList() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");
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
    if (order.status === "PENDING" || order.status === "PICKING") {
      navigate(`/orders/${order._id}/pick`);
    } else if (order.status === "READY_FOR_CHECK" || order.status === "CHECKED" || order.status === "READY_TO_BILL") {
      navigate(`/orders/${order._id}/checkout`);
    } else {
      // Just view
      navigate(`/orders/${order._id}/pick`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-slate-600" />
            Large Orders
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage picking and fulfillment for big customer orders.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/orders/create"
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition"
          >
            <Plus size={18} />
            Create Order
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center gap-4 bg-slate-50">
          <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
            <Filter size={16} /> Filter by Status:
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
            <option value="PENDING">Pending (Needs Picking)</option>
            <option value="PICKING">Currently Picking</option>
            <option value="READY_FOR_CHECK">Ready For Check</option>
            <option value="CHECKED">Checked</option>
            <option value="READY_TO_BILL">Ready to Bill</option>
            <option value="BILLED">Billed</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Order No</th>
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
                    <td className="px-6 py-4 font-mono font-medium text-slate-800">{order.orderNumber}</td>
                    <td className="px-6 py-4">{format(new Date(order.createdAt), "dd MMM yyyy, p")}</td>
                    <td className="px-6 py-4 font-medium text-slate-700">{order.customerId?.name || "Walk-in Customer"}</td>
                    <td className="px-6 py-4 text-center">{order.items.length}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[order.status as OrderStatus]}`}>
                        {order.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {order.pickedBy ? order.pickedBy.name : (order.status === "PENDING" ? "Unassigned" : "-")}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="px-3 py-1 bg-slate-800 text-white rounded text-xs font-medium hover:bg-slate-700 transition">
                        {(order.status === "PENDING" || order.status === "PICKING") ? "Start Picking" : 
                         (order.status === "READY_FOR_CHECK" || order.status === "CHECKED" || order.status === "READY_TO_BILL") ? "Review & Bill" : 
                         "View"}
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
