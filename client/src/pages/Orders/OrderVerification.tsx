import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { CheckCircle2, ArrowLeft, Loader2, DollarSign, Printer, Download, Receipt } from "lucide-react";
import toast from "react-hot-toast";
import OrderProgressBar, { WorkflowStage } from "./OrderProgressBar";

export default function OrderVerification() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [discountType, setDiscountType] = useState<"AMOUNT" | "PERCENT">("AMOUNT");
  const [discountValue, setDiscountValue] = useState(0);
  
  const [payments, setPayments] = useState<{ method: string, amount: number }[]>([]);
  const [currentPaymentMode, setCurrentPaymentMode] = useState("CASH");
  const [currentPaymentAmount, setCurrentPaymentAmount] = useState<number | "">("");
  const [paymentDone, setPaymentDone] = useState(false);
  const [handoverDone, setHandoverDone] = useState(false);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  async function fetchOrder() {
    try {
      const res = await axios.get(`/api/orders/${id}`, { withCredentials: true });
      setOrder(res.data);
      if (res.data.paymentStatus === "COMPLETED") {
        setPaymentDone(true);
      }
      if (res.data.handoverStatus === "COMPLETED") setHandoverDone(true);
    } catch (err) {
      toast.error("Failed to load order");
    } finally {
      setLoading(false);
    }
  }

  const handleVerifyItem = async (itemId: string) => {
    try {
      await axios.put(`/api/orders/${id}/items/${itemId}/verify`, {}, { withCredentials: true });
      fetchOrder();
    } catch (err) {
      toast.error("Failed to verify item");
    }
  };

  const handleBill = async () => {
    setSubmitting(true);
    try {
      await axios.post(`/api/orders/${id}/bill`, { 
        discountPaise: appliedDiscountPaise
      }, { withCredentials: true });
      toast.success("Bill Generated");
      fetchOrder();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to bill order");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentWithAmount = async (paymentArr: {method: string, amount: number}[]) => {
    if (paymentArr.length === 0) {
      toast.error("Add at least one payment method");
      return;
    }
    setSubmitting(true);
    try {
      const formattedPayments = paymentArr.map(p => ({
        method: p.method,
        amountPaise: Math.round(p.amount * 100)
      }));
      await axios.put(`/api/orders/${id}/payment`, { payments: formattedPayments }, { withCredentials: true });
      toast.success("Payments Recorded");
      fetchOrder();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save payment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleHandover = async () => {
    setSubmitting(true);
    try {
      await axios.put(`/api/orders/${id}/handover`, {}, { withCredentials: true });
      toast.success("Handover Complete! Order Finished.");
      navigate("/orders");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to complete handover");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-emerald-600" size={32} /></div>;
  if (!order) return <div className="p-8 text-center text-red-500">Order not found</div>;

  let subtotal = 0;
  let totalGst = 0;
  order.items.forEach((item: any) => {
    const qty = item.pickedQuantity ?? item.orderedQuantity;
    const price = item.unitPricePaise;
    const taxable = qty * price;
    const gst = taxable * (item.gstRate / 100);
    subtotal += taxable;
    totalGst += gst;
  });

  let appliedDiscountPaise = 0;
  if (discountType === "AMOUNT") {
    appliedDiscountPaise = discountValue * 100;
  } else {
    appliedDiscountPaise = (subtotal + totalGst) * (discountValue / 100);
  }
  const finalTotal = subtotal + totalGst - appliedDiscountPaise;
  const allVerified = order.items.every((i: any) => i.isVerified);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200 print:hidden">
        <button onClick={() => navigate("/orders")} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Verification & Fulfillment: {order.orderNumber}</h1>
          <p className="text-sm text-slate-500">Customer: {order.customerId?.name || "Walk-in"} | Phone: {order.customerId?.phone || "N/A"}</p>
        </div>
      </div>

      <OrderProgressBar currentStatus={order.status as WorkflowStage} />

      <div className="flex gap-6 flex-col md:flex-row print:flex-col">
        
        {/* LEFT: Checklist & Invoice View */}
        <div className="w-full md:w-2/3 space-y-6 print:w-full">
          
          {(order.status === "WAITING_FOR_OWNER_CHECK" || order.status === "OWNER_CHECKING" || order.status === "READY_FOR_BILLING") && (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden print:hidden">
              <div className="p-4 bg-purple-50 border-b border-purple-200">
                <h2 className="font-bold text-purple-900">Step 1: Owner Final Verification</h2>
                <p className="text-sm text-purple-700">You must physically verify every item in the order before billing.</p>
              </div>
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
                  <tr>
                    <th className="p-4 font-semibold">Product</th>
                    <th className="p-4 font-semibold text-center">Weighed Qty</th>
                    <th className="p-4 font-semibold text-right">Confirm</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items.map((item: any) => {
                    const isVerified = item.isVerified;
                    return (
                      <tr key={item._id} className={isVerified ? 'bg-emerald-50/30' : 'hover:bg-slate-50'}>
                        <td className="p-4">
                          <div className="font-medium text-slate-800">{item.productName}</div>
                          {item.pickedQuantity !== item.orderedQuantity && (
                            <div className="text-xs text-orange-600 font-bold">Requested: {item.orderedQuantity}</div>
                          )}
                        </td>
                        <td className="p-4 text-center font-bold text-lg text-emerald-700">
                          {item.pickedQuantity ?? item.orderedQuantity} {item.salesUnit}
                        </td>
                        <td className="p-4 text-right">
                          {isVerified ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-bold"><CheckCircle2 size={18}/> Verified</span>
                          ) : (
                            <button 
                              onClick={() => handleVerifyItem(item._id)}
                              className="px-4 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition"
                            >
                              Confirm
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!allVerified && (
                <div className="p-4 bg-orange-50 text-orange-800 font-bold text-center border-t border-orange-200">
                  Order Pending — Please verify all items to unlock billing.
                </div>
              )}
            </div>
          )}

          {(order.status === "BILL_CREATED" || order.status === "PAYMENT_PENDING" || order.status === "READY_FOR_HANDOVER" || order.status === "COMPLETED") && (
            <div className="bg-white p-8 rounded-lg shadow-sm border border-slate-200 print:shadow-none print:border-none print:p-0">
              <div className="flex justify-between items-start border-b pb-6 mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Mudit Traders</h1>
                  <p className="text-slate-500">GSTIN: 23ABCDE1234F1Z5</p>
                  <p className="text-slate-500">123 Market Road, City, State</p>
                </div>
                <div className="text-right">
                  <h2 className="text-xl font-bold text-emerald-700">INVOICE</h2>
                  <p className="text-slate-600 font-medium">{order.invoiceId?.billNumber || "N/A"}</p>
                  <p className="text-slate-500">Order: {order.orderNumber}</p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-bold text-slate-800">Bill To:</h3>
                <p>{order.customerId?.name || "Walk-in Customer"}</p>
                {order.customerId?.phone && <p>Phone: {order.customerId.phone}</p>}
                {order.customerId?.address && <p>{order.customerId.address}</p>}
              </div>

              <table className="w-full text-left mb-6">
                <thead className="bg-slate-100 text-slate-800 text-sm">
                  <tr>
                    <th className="p-2 font-bold rounded-tl-lg">Item</th>
                    <th className="p-2 font-bold text-center">Qty</th>
                    <th className="p-2 font-bold text-right">Rate</th>
                    <th className="p-2 font-bold text-right rounded-tr-lg">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {order.items.map((item: any) => (
                    <tr key={item._id}>
                      <td className="p-2 font-medium">{item.productName}</td>
                      <td className="p-2 text-center">{item.pickedQuantity ?? item.orderedQuantity} {item.salesUnit}</td>
                      <td className="p-2 text-right">₹{(item.unitPricePaise / 100).toFixed(2)}</td>
                      <td className="p-2 text-right font-bold">
                        ₹{(((item.pickedQuantity ?? item.orderedQuantity) * item.unitPricePaise) / 100).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="w-64 ml-auto space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>₹{(subtotal / 100).toFixed(2)}</span>
                </div>
                {order.invoiceId?.totalGstPaise > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Tax:</span>
                    <span>₹{(order.invoiceId.totalGstPaise / 100).toFixed(2)}</span>
                  </div>
                )}
                {order.invoiceId?.discountPaise > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount:</span>
                    <span>-₹{(order.invoiceId.discountPaise / 100).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold text-slate-900 border-t pt-2 mt-2">
                  <span>Grand Total:</span>
                  <span>₹{(order.invoiceId?.totalPaise / 100).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Actions Pane */}
        <div className="w-full md:w-1/3 print:hidden">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 sticky top-6 space-y-6">
            
            {/* STAGE: BILLING */}
            {order.status === "READY_FOR_BILLING" && (
              <div>
                <h3 className="font-bold text-slate-800 border-b pb-2 mb-4">Generate Bill</h3>
                
                <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
                  <button 
                    onClick={() => setDiscountType("AMOUNT")} 
                    className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${discountType === "AMOUNT" ? "bg-white shadow-sm text-slate-800 border border-slate-200" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    Discount (₹)
                  </button>
                  <button 
                    onClick={() => setDiscountType("PERCENT")} 
                    className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${discountType === "PERCENT" ? "bg-white shadow-sm text-slate-800 border border-slate-200" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    Discount (%)
                  </button>
                </div>
                
                <input 
                  type="number" 
                  placeholder={discountType === "AMOUNT" ? "Enter ₹ amount" : "Enter %"}
                  className="w-full border border-slate-300 rounded-lg px-4 py-3 mb-4 focus:ring-2 focus:ring-orange-500 outline-none transition-shadow text-lg font-medium"
                  value={discountValue || ''}
                  onChange={(e) => setDiscountValue(Math.max(0, parseFloat(e.target.value || '0')))}
                />

                <div className="flex justify-between items-center text-xl font-bold text-slate-900 mb-4 bg-orange-50 border border-orange-100 p-4 rounded-lg">
                  <span>Total:</span>
                  <span className="text-orange-700">₹{(finalTotal / 100).toFixed(2)}</span>
                </div>

                <button
                  onClick={handleBill}
                  disabled={submitting}
                  className="w-full py-4 bg-orange-500 text-white font-bold rounded-xl shadow-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 text-lg"
                >
                  <Receipt size={24} /> Generate Invoice
                </button>
                <p className="text-xs text-center text-slate-400 mt-2">Deducts inventory & generates Invoice ID.</p>
              </div>
            )}

            {/* STAGE: PAYMENT */}
            {(order.status === "PAYMENT_PENDING" || order.status === "READY_FOR_HANDOVER" || order.status === "COMPLETED") && (
              <div>
                <h3 className="font-bold text-slate-800 border-b pb-2 mb-4">Payment</h3>
                
                {!paymentDone ? (
                  <div className="space-y-4">
                    
                    {payments.length > 0 && (
                      <div className="space-y-2 mb-4">
                        {payments.map((p, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-200 text-sm">
                            <span className="font-bold text-slate-700">{p.method}</span>
                            <span className="font-bold text-slate-900">₹{p.amount.toFixed(2)}</span>
                            <button onClick={() => setPayments(prev => prev.filter((_, i) => i !== idx))} className="text-red-500 font-bold hover:text-red-700">X</button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-bold text-slate-700">Amount Paid (₹)</label>
                        <span className="text-xs font-bold text-red-600">
                          Remaining: ₹{Math.max(0, (order.invoiceId?.totalPaise - payments.reduce((acc, p) => acc + p.amount * 100, 0)) / 100).toFixed(2)}
                        </span>
                      </div>
                      <input 
                        type="number"
                        className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold mb-4"
                        placeholder="Amount"
                        value={currentPaymentAmount}
                        onChange={(e) => setCurrentPaymentAmount(e.target.value === "" ? "" : parseFloat(e.target.value))}
                      />

                      <label className="block text-sm font-bold text-slate-700 mb-2">Method</label>
                      <div className="grid grid-cols-4 gap-2 mb-4">
                        {['CASH', 'UPI', 'CREDIT', 'CHEQUE'].map((method) => (
                          <button
                            key={method}
                            onClick={() => setCurrentPaymentMode(method)}
                            className={`py-2 px-1 text-[11px] sm:text-xs font-bold rounded-lg border-2 transition-all ${currentPaymentMode === method ? 'bg-emerald-100 border-emerald-500 text-emerald-800 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-slate-50'}`}
                          >
                            {method}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={() => {
                          if (currentPaymentAmount && typeof currentPaymentAmount === "number" && currentPaymentAmount > 0) {
                            setPayments(prev => [...prev, { method: currentPaymentMode, amount: currentPaymentAmount }]);
                            setCurrentPaymentAmount("");
                          }
                        }}
                        disabled={!currentPaymentAmount}
                        className="w-full py-3 bg-slate-800 text-white font-bold rounded-lg shadow-sm hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm flex items-center justify-center gap-2"
                      >
                        + Add Payment
                      </button>
                    </div>

                    <button
                      onClick={() => handlePaymentWithAmount(payments)}
                      disabled={submitting || payments.length === 0}
                      className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl shadow-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 text-lg"
                    >
                      <CheckCircle2 size={24} /> Record Payments
                    </button>
                  </div>
                ) : (
                  <div className="bg-emerald-50 text-emerald-800 p-4 rounded-lg flex flex-col gap-2">
                    <div className="flex items-center gap-2 font-bold"><CheckCircle2 /> Payment Completed</div>
                    {order.payments && order.payments.map((p: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm font-medium">
                        <span>{p.method}</span>
                        <span>₹{(p.amountPaise / 100).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* STAGE: HANDOVER */}
            {(order.status === "READY_FOR_HANDOVER" || order.status === "COMPLETED") && (
              <div className="pt-4 border-t border-slate-200">
                <h3 className="font-bold text-slate-800 mb-4">Handover</h3>
                {!handoverDone ? (
                  <div className="space-y-4">
                    <button
                      onClick={handleHandover}
                      disabled={submitting}
                      className="w-full py-4 bg-teal-600 text-white font-bold text-lg rounded-xl shadow-lg hover:bg-teal-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={24} /> Complete Handover & Finish Order
                    </button>
                  </div>
                ) : (
                  <div className="bg-teal-50 text-teal-800 font-bold p-4 rounded-lg flex items-center gap-2">
                    <CheckCircle2 /> Handover Complete
                  </div>
                )}
              </div>
            )}

            {/* PRINT UTILITIES */}
            {(order.status === "PAYMENT_PENDING" || order.status === "READY_FOR_HANDOVER" || order.status === "COMPLETED") && (
              <div className="pt-6 border-t border-slate-200 flex gap-2">
                <button onClick={() => window.print()} className="flex-1 flex items-center justify-center gap-2 py-2 border border-slate-300 rounded text-slate-700 font-bold hover:bg-slate-50 transition">
                  <Printer size={16}/> Print
                </button>
                <button onClick={() => window.print()} className="flex-1 flex items-center justify-center gap-2 py-2 border border-slate-300 rounded text-slate-700 font-bold hover:bg-slate-50 transition">
                  <Download size={16}/> Save PDF
                </button>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
