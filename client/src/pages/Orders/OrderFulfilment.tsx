import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, Check, CheckCircle2, Package as PackageIcon, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import OrderProgressBar from "./OrderProgressBar";

export default function OrderFulfilment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Local state to hold temporary inputs for weighed items
  const [weighedValues, setWeighedValues] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchOrder();
  }, [id]);

  async function fetchOrder() {
    try {
      const res = await axios.get(`/api/orders/${id}`, { withCredentials: true });
      setOrder(res.data);
      
      const newWeighed: Record<string, number> = {};
      res.data.items.forEach((i: any) => {
        newWeighed[i._id] = i.pickedQuantity ?? i.orderedQuantity;
      });
      setWeighedValues(newWeighed);
    } catch (err) {
      toast.error("Failed to load order");
    } finally {
      setLoading(false);
    }
  }

  const handleCollect = async (itemId: string) => {
    try {
      await axios.put(`/api/orders/${id}/items/${itemId}/collect`, {
        pickedQuantity: weighedValues[itemId]
      }, { withCredentials: true });
      toast.success("Item Collected");
      fetchOrder();
    } catch (err) {
      toast.error("Failed to collect item");
    }
  };

  const handlePack = async (itemId: string) => {
    try {
      await axios.put(`/api/orders/${id}/items/${itemId}/pack`, {}, { withCredentials: true });
      toast.success("Item Packed");
      fetchOrder();
    } catch (err) {
      toast.error("Failed to pack item");
    }
  };

  const submitToOwner = async () => {
    setSubmitting(true);
    try {
      await axios.put(`/api/orders/${id}/submit`, {}, { withCredentials: true });
      toast.success("Order Sent to Owner!");
      navigate("/orders");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-emerald-600" size={32} /></div>;
  if (!order) return <div className="p-8 text-center text-red-500">Order not found</div>;

  const allCollected = order.items.every((i: any) => i.isCollected);
  const allPacked = order.items.every((i: any) => i.isPacked);

  // We operate in Phase 1 (Collection) until all are collected. Then Phase 2 (Packing).
  const isPackingPhase = allCollected;

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-20">
      
      <div className="flex items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200 sticky top-0 z-20">
        <button onClick={() => navigate("/orders")} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">{order.orderNumber}</h1>
          <p className="text-sm text-slate-500">{order.customerId?.name || "Walk-in"}</p>
        </div>
      </div>

      <OrderProgressBar currentStatus={order.status} />

      <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg font-bold text-center text-lg">
        {!isPackingPhase ? "PHASE 1: Collect Items" : "PHASE 2: Pack Items"}
      </div>

      <div className="space-y-4">
        {order.items.map((item: any) => {
          
          if (!isPackingPhase) {
            // COLLECTION VIEW
            const isCollected = item.isCollected;
            return (
              <div key={item._id} className={`p-4 rounded-xl border-2 transition ${isCollected ? 'bg-slate-50 border-emerald-200 opacity-60' : 'bg-white border-blue-200 shadow-md'}`}>
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-lg text-slate-800">{item.productName}</h3>
                  <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-sm font-bold">
                    Req: {item.orderedQuantity} {item.salesUnit}
                  </span>
                </div>
                
                {item.notes && <p className="text-sm text-orange-600 mb-3 bg-orange-50 p-2 rounded">Note: {item.notes}</p>}

                {!isCollected ? (
                  <div className="space-y-4 mt-4">
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-bold text-slate-600 whitespace-nowrap">Actual Weight:</label>
                      <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden flex-1">
                        <input 
                          type="number"
                          className="w-full p-3 text-lg font-bold outline-none"
                          value={weighedValues[item._id] || ""}
                          onChange={e => setWeighedValues({...weighedValues, [item._id]: parseFloat(e.target.value) || 0})}
                        />
                        <span className="px-4 py-3 bg-slate-100 border-l border-slate-300 text-slate-600 font-bold">{item.salesUnit}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleCollect(item._id)}
                      className="w-full py-4 bg-blue-600 text-white font-bold text-lg rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-95 transition"
                    >
                      <CheckCircle2 size={24} /> Mark Collected
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 flex items-center gap-2 text-emerald-600 font-bold text-lg">
                    <Check size={24} /> Collected {item.pickedQuantity} {item.salesUnit}
                  </div>
                )}
              </div>
            );
          } else {
            // PACKING VIEW
            const isPacked = item.isPacked;
            return (
              <div key={item._id} className={`p-4 rounded-xl border-2 flex items-center justify-between transition ${isPacked ? 'bg-slate-50 border-emerald-200 opacity-60' : 'bg-white border-indigo-200 shadow-md'}`}>
                <div>
                  <h3 className="font-bold text-lg text-slate-800">{item.productName}</h3>
                  <p className="text-slate-500 font-medium">Quantity: {item.pickedQuantity} {item.salesUnit}</p>
                </div>
                
                {!isPacked ? (
                  <button 
                    onClick={() => handlePack(item._id)}
                    className="py-3 px-6 bg-indigo-600 text-white font-bold text-lg rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-700 active:scale-95 transition"
                  >
                    <PackageIcon size={20} /> Pack
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-emerald-600 font-bold text-lg pr-4">
                    <Check size={24} /> Packed
                  </div>
                )}
              </div>
            );
          }
        })}
      </div>

      {allCollected && allPacked && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-30">
          <div className="max-w-3xl mx-auto">
            <button
              onClick={() => {
                if(confirm("All ordered items have been collected and packed. Send this order to the owner for final verification?")) {
                  submitToOwner();
                }
              }}
              disabled={submitting || order.status === "WAITING_FOR_OWNER_CHECK"}
              className="w-full py-4 bg-emerald-600 text-white font-bold text-lg rounded-xl shadow-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="animate-spin" size={24} /> : <CheckCircle2 size={24} />}
              Send to Owner for Check
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
