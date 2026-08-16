import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Printer, CheckSquare, ArrowLeft, Loader2, Play } from "lucide-react";
import toast from "react-hot-toast";

export default function OrderPicking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  async function fetchOrder() {
    try {
      const res = await axios.get(`/api/orders/${id}`, { withCredentials: true });
      setOrder(res.data);
      // Initialize items with pickedQuantity default to orderedQuantity if null
      setItems(res.data.items.map((i: any) => ({
        ...i,
        pickedQuantity: i.pickedQuantity ?? i.orderedQuantity
      })));
    } catch (err) {
      toast.error("Failed to load order");
    } finally {
      setLoading(false);
    }
  }

  const startPicking = async () => {
    try {
      await axios.put(`/api/orders/${id}/status`, { status: "PICKING" }, { withCredentials: true });
      toast.success("Started Picking");
      fetchOrder(); // refresh
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const submitPicking = async () => {
    setSubmitting(true);
    try {
      await axios.put(`/api/orders/${id}/pick`, { items }, { withCredentials: true });
      toast.success("Picking Completed! Ready for Check.");
      navigate("/orders");
    } catch (err) {
      toast.error("Failed to submit picking");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-emerald-600" size={32} /></div>;
  if (!order) return <div className="p-8 text-center text-red-500">Order not found</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Header (Hidden in Print) */}
      <div className="print:hidden flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/orders")} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Order {order.orderNumber}</h1>
            <p className="text-sm text-slate-500">Customer: {order.customerId?.name || "Walk-in"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.print()} 
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-md hover:bg-slate-200 transition"
          >
            <Printer size={18} /> Print List
          </button>
          {order.status === "PENDING" && (
            <button 
              onClick={startPicking} 
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition"
            >
              <Play size={18} /> Start Picking
            </button>
          )}
          {order.status === "PICKING" && (
            <button 
              onClick={submitPicking} 
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-medium rounded-md hover:bg-emerald-700 transition"
            >
              {submitting ? <Loader2 className="animate-spin" size={18} /> : <CheckSquare size={18} />}
              Complete Picking
            </button>
          )}
        </div>
      </div>

      {/* Print View Header */}
      <div className="hidden print:block mb-8">
        <h1 className="text-3xl font-bold uppercase">Picking List</h1>
        <div className="mt-4 flex justify-between border-b-2 border-black pb-2">
          <div>
            <p><strong>Order No:</strong> {order.orderNumber}</p>
            <p><strong>Customer:</strong> {order.customerId?.name || "Walk-in"}</p>
            {order.notes && <p><strong>Notes:</strong> {order.notes}</p>}
          </div>
          <div className="text-right">
            <p><strong>Date:</strong> {new Date(order.createdAt).toLocaleDateString()}</p>
            <p><strong>Staff:</strong> ___________________</p>
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 print:shadow-none print:border-none">
        <table className="w-full text-left">
          <thead className="bg-slate-50 print:bg-white text-slate-600 border-b border-slate-200 print:border-black">
            <tr>
              <th className="p-4 font-semibold print:text-black">Product</th>
              <th className="p-4 font-semibold print:text-black text-center">Ordered</th>
              <th className="p-4 font-semibold print:text-black text-center print:hidden">Actual Picked</th>
              <th className="hidden print:table-cell p-4 font-semibold text-center w-32 border-l border-black">Weighed / Picked</th>
              <th className="p-4 font-semibold print:text-black hidden md:table-cell">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 print:divide-black">
            {items.map((item, index) => (
              <tr key={index} className="hover:bg-slate-50 print:hover:bg-white">
                <td className="p-4">
                  <div className="font-medium text-slate-800 print:text-black text-lg">{item.productName}</div>
                </td>
                <td className="p-4 text-center">
                  <span className="font-bold text-lg">{item.orderedQuantity}</span> <span className="text-slate-500">{item.salesUnit}</span>
                </td>
                
                {/* Interactive Input for staff (Hidden in Print) */}
                <td className="p-4 text-center print:hidden">
                  <div className="flex items-center justify-center gap-2">
                    <input 
                      type="number"
                      step="any"
                      disabled={order.status !== "PICKING"}
                      value={item.pickedQuantity}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setItems(prev => prev.map((i, idx) => idx === index ? { ...i, pickedQuantity: isNaN(val) ? 0 : val } : i));
                      }}
                      className="w-24 text-center border-2 border-slate-300 rounded py-2 text-lg focus:outline-none focus:border-emerald-500 font-bold disabled:bg-slate-100 disabled:text-slate-500"
                    />
                    <span className="text-slate-500 font-medium">{item.salesUnit}</span>
                  </div>
                </td>
                
                {/* Blank space for writing actual weight (Only in Print) */}
                <td className="hidden print:table-cell p-4 border-l border-black text-center">
                  <div className="w-full h-8 border-b border-dashed border-gray-400"></div>
                </td>

                <td className="p-4 hidden md:table-cell text-slate-600 print:text-black italic">
                  {item.notes || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
