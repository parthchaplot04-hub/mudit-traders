import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { CheckCircle2, ArrowLeft, Loader2, DollarSign } from "lucide-react";
import toast from "react-hot-toast";

export default function OrderCheckout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [paymentType, setPaymentType] = useState("CASH");
  const [discountPaise, setDiscountPaise] = useState(0);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  async function fetchOrder() {
    try {
      const res = await axios.get(`/api/orders/${id}`, { withCredentials: true });
      setOrder(res.data);
    } catch (err) {
      toast.error("Failed to load order");
    } finally {
      setLoading(false);
    }
  }

  const markChecked = async () => {
    try {
      await axios.put(`/api/orders/${id}/status`, { status: "CHECKED" }, { withCredentials: true });
      toast.success("Order Checked");
      fetchOrder();
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const billOrder = async () => {
    setSubmitting(true);
    try {
      await axios.post(`/api/orders/${id}/bill`, { 
        paymentType, 
        discountPaise,
        // We submit the items with their picked quantities.
        items: order.items.map((i: any) => ({
          productId: i.productId,
          quantity: i.pickedQuantity,
          unitPricePaise: i.unitPricePaise
        }))
      }, { withCredentials: true });
      toast.success("Order Billed Successfully! Inventory updated.");
      navigate("/orders");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to bill order");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-emerald-600" size={32} /></div>;
  if (!order) return <div className="p-8 text-center text-red-500">Order not found</div>;

  let subtotal = 0;
  let totalGst = 0;
  order.items.forEach((item: any) => {
    const qty = item.pickedQuantity;
    const price = item.unitPricePaise;
    const taxable = qty * price;
    const gst = taxable * (item.gstRate / 100);
    subtotal += taxable;
    totalGst += gst;
  });

  const finalTotal = subtotal + totalGst - discountPaise;

  return (
    <div className="max-w-5xl mx-auto flex gap-6">
      
      {/* LEFT: Verification Table */}
      <div className="w-2/3 space-y-6">
        <div className="flex items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <button onClick={() => navigate("/orders")} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Final Verification: {order.orderNumber}</h1>
            <p className="text-sm text-slate-500">Picked By: {order.pickedBy?.name || "Unknown"}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
              <tr>
                <th className="p-4 font-semibold">Product</th>
                <th className="p-4 font-semibold text-center text-slate-400">Ordered</th>
                <th className="p-4 font-semibold text-center text-emerald-700 bg-emerald-50">Picked</th>
                <th className="p-4 font-semibold text-right">Price</th>
                <th className="p-4 font-semibold text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {order.items.map((item: any, index: number) => {
                const isDifferent = item.pickedQuantity !== item.orderedQuantity;
                return (
                  <tr key={index} className="hover:bg-slate-50">
                    <td className="p-4">
                      <div className="font-medium text-slate-800">{item.productName}</div>
                      {item.gstRate > 0 && <div className="text-xs text-slate-400">GST: {item.gstRate}%</div>}
                    </td>
                    <td className={`p-4 text-center font-medium text-slate-400 ${isDifferent ? 'line-through' : ''}`}>
                      {item.orderedQuantity} {item.salesUnit}
                    </td>
                    <td className={`p-4 text-center font-bold text-lg bg-emerald-50/30 ${isDifferent ? 'text-orange-600' : 'text-emerald-700'}`}>
                      {item.pickedQuantity} {item.salesUnit}
                    </td>
                    <td className="p-4 text-right text-slate-600">
                      ₹{(item.unitPricePaise / 100).toFixed(2)}
                    </td>
                    <td className="p-4 text-right font-bold text-slate-800">
                      ₹{(((item.pickedQuantity * item.unitPricePaise) + (item.pickedQuantity * item.unitPricePaise * (item.gstRate/100))) / 100).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* RIGHT: Billing Pane */}
      <div className="w-1/3">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 sticky top-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
            <DollarSign size={20} className="text-emerald-600"/> Billing Summary
          </h3>
          
          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Subtotal</span>
              <span>₹{(subtotal / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600">
              <span>GST Total</span>
              <span>₹{(totalGst / 100).toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between items-center text-sm text-slate-600 pt-2 border-t border-slate-100">
              <span>Discount (₹)</span>
              <input 
                type="number" 
                className="w-24 border border-slate-300 rounded px-2 py-1 text-right focus:outline-none focus:border-emerald-500"
                value={discountPaise / 100 || ''}
                onChange={(e) => setDiscountPaise(Math.max(0, parseFloat(e.target.value || '0') * 100))}
              />
            </div>

            <div className="flex justify-between items-center text-lg font-bold text-slate-900 pt-2 border-t border-slate-200 mt-2">
              <span>Final Total</span>
              <span className="text-2xl text-emerald-600">₹{(finalTotal / 100).toFixed(2)}</span>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Payment Method</label>
            <div className="grid grid-cols-2 gap-2">
              {['CASH', 'UPI', 'CREDIT', 'CHEQUE'].map((method) => (
                <button
                  key={method}
                  onClick={() => setPaymentType(method)}
                  className={`py-2 text-sm font-medium rounded border ${paymentType === method ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          {order.status === "READY_FOR_CHECK" && (
            <button
              onClick={markChecked}
              className="w-full py-3 mb-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition"
            >
              Verify Quantities
            </button>
          )}

          <button
            onClick={billOrder}
            disabled={submitting || (order.status !== "CHECKED" && order.status !== "READY_TO_BILL" && order.status !== "READY_FOR_CHECK")}
            className="w-full py-3 bg-emerald-600 text-white font-bold rounded-lg shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
            Generate Bill
          </button>
          <p className="text-xs text-center text-slate-400 mt-3">Generates Sale & Deducts Inventory</p>
        </div>
      </div>

    </div>
  );
}
