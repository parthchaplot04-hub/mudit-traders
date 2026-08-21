import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Search, X, Check, ShoppingBag, Plus, Minus, User as UserIcon } from "lucide-react";
import toast from "react-hot-toast";

type Product = {
  _id: string;
  productCode: string;
  productName: string;
  hindiName?: string;
  sellingPricePaise: number;
  currentStock: number;
  salesUnit: string;
  gstRate: number;
};

type OrderItem = {
  productId: string;
  productName: string;
  salesUnit: string;
  orderedQuantity: number;
  orderedQuantityRaw?: string;
  unitPricePaise: number;
  targetPriceRaw?: string;
  gstRate: number;
  notes: string;
};

export default function CreateOrder() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  
  const [items, setItems] = useState<OrderItem[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length > 1) {
        searchProducts(query);
      } else {
        setProducts([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  async function fetchCustomers() {
    try {
      const res = await axios.get("/api/customers", { withCredentials: true });
      setCustomers(res.data.items || res.data);
    } catch (e) {
      console.error(e);
    }
  }

  async function searchProducts(q: string) {
    setSearching(true);
    try {
      const res = await axios.get("/api/products", { params: { q, active: "true", limit: 15 }, withCredentials: true });
      setProducts(res.data.items || res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  }

  const addItem = (product: Product) => {
    setItems(prev => {
      const existing = prev.find(i => i.productId === product._id);
      if (existing) {
        return prev.map(i => i.productId === product._id ? { ...i, orderedQuantity: i.orderedQuantity + 1 } : i);
      }
      return [...prev, {
        productId: product._id,
        productName: product.productName,
        salesUnit: product.salesUnit,
        orderedQuantity: 1,
        unitPricePaise: product.sellingPricePaise,
        gstRate: product.gstRate,
        notes: ""
      }];
    });
    setQuery("");
    setProducts([]);
  };

  const updateQuantity = (id: string, delta: number) => {
    setItems(prev => prev.map(i => {
      if (i.productId === id) {
        const newQ = i.orderedQuantity + delta;
        return { ...i, orderedQuantity: newQ > 0 ? newQ : 0, orderedQuantityRaw: undefined, targetPriceRaw: undefined };
      }
      return i;
    }));
  };

  const updateNotes = (id: string, notes: string) => {
    setItems(prev => prev.map(i => i.productId === id ? { ...i, notes } : i));
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.productId !== id));
  };

  const handleCreateOrder = async () => {
    if (items.length === 0) {
      toast.error("Add at least one item to the order.");
      return;
    }

    if (!selectedCustomerId && !customerName.trim()) {
      toast.error("Customer Name is mandatory for Walk-in Orders.");
      return;
    }

    setSubmitting(true);
    try {
      await axios.post("/api/orders", {
        customerId: selectedCustomerId || undefined,
        customerName,
        customerPhone,
        customerAddress,
        items,
        notes
      }, { withCredentials: true });
      
      toast.success("Order Created Successfully! Sent to picking queue.");
      navigate("/orders");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-8rem)] lg:h-[calc(100vh-4rem)] max-w-7xl mx-auto p-0 sm:p-4 gap-6">
      
      {/* LEFT: Order Entry */}
      <div className="w-full lg:w-2/3 flex flex-col gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <ShoppingBag size={20} className="text-emerald-600"/> Create Large Order
          </h2>
          
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search products to add..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 text-lg transition-colors shadow-sm"
              autoFocus
            />
            {searching && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />}
          </div>

          {/* Search Results Dropdown */}
          {products.length > 0 && (
            <div className="absolute z-10 w-[calc(100%-2rem)] lg:w-[calc(66%-2rem)] max-w-3xl bg-white border border-slate-200 rounded-lg shadow-xl max-h-96 overflow-y-auto mt-1">
              {products.map((p, idx) => (
                <div 
                  key={p._id}
                  onClick={() => addItem(p)}
                  className={`p-3 border-b border-slate-100 cursor-pointer flex justify-between items-center hover:bg-emerald-50 transition-colors ${idx === 0 ? 'bg-slate-50' : ''}`}
                >
                  <div>
                    <div className="font-bold text-slate-800 text-lg">{p.productName}</div>
                    <div className="text-xs text-slate-500">{p.hindiName} • {p.productCode} • Stock: {p.currentStock} {p.salesUnit}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-emerald-600">₹{(p.sellingPricePaise / 100).toFixed(2)}</div>
                    <div className="text-xs text-slate-400">per {p.salesUnit}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Order Items Table */}
        <div className="flex-1 bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="overflow-y-auto overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100 text-slate-600 text-sm sticky top-0 shadow-sm z-0">
                <tr>
                  <th className="p-3 font-semibold w-1/3">Product</th>
                  <th className="p-3 font-semibold text-center w-auto">Order Qty</th>
                  <th className="p-3 font-semibold text-center w-24">Target ₹</th>
                  <th className="p-3 font-semibold w-1/4">Picking Notes</th>
                  <th className="p-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-400">
                      <ShoppingBag className="mx-auto h-12 w-12 text-slate-200 mb-2" />
                      <p>Search and select products to build the order.</p>
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.productId} className="hover:bg-slate-50">
                      <td className="p-3">
                        <div className="font-medium text-slate-800">{item.productName}</div>
                        <div className="text-xs text-slate-400">₹{(item.unitPricePaise / 100).toFixed(2)} / {item.salesUnit}</div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => updateQuantity(item.productId, -1)} className="p-1 bg-slate-100 rounded hover:bg-slate-200 text-slate-600"><Minus size={16}/></button>
                          <input 
                            type="number" step="any" min="0"
                            value={item.orderedQuantityRaw !== undefined ? item.orderedQuantityRaw : (item.orderedQuantity === 0 ? '' : item.orderedQuantity)}
                            onChange={(e) => {
                              const rawVal = e.target.value;
                              const val = parseFloat(rawVal);
                              setItems(prev => prev.map(i => i.productId === item.productId ? { 
                                ...i, 
                                orderedQuantity: isNaN(val) ? 0 : val, 
                                orderedQuantityRaw: rawVal, 
                                targetPriceRaw: undefined 
                              } : i));
                            }}
                            className="w-16 text-center border border-slate-200 rounded py-1 focus:outline-none focus:border-emerald-500 font-medium"
                          />
                          <span className="text-xs text-slate-500 w-6 text-left">{item.salesUnit}</span>
                          <button onClick={() => updateQuantity(item.productId, 1)} className="p-1 bg-slate-100 rounded hover:bg-slate-200 text-slate-600"><Plus size={16}/></button>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="number" step="any" min="0" placeholder="₹"
                          value={item.targetPriceRaw !== undefined ? item.targetPriceRaw : (item.orderedQuantity === 0 ? '' : +(item.orderedQuantity * item.unitPricePaise / 100).toFixed(2))}
                          onChange={(e) => {
                            const rawVal = e.target.value;
                            const targetRs = parseFloat(rawVal);
                            if (!isNaN(targetRs) && targetRs >= 0) {
                              const calculatedQty = parseFloat((targetRs / (item.unitPricePaise / 100)).toFixed(3));
                              setItems(prev => prev.map(i => i.productId === item.productId ? { 
                                ...i, 
                                orderedQuantity: calculatedQty, 
                                targetPriceRaw: rawVal, 
                                orderedQuantityRaw: undefined 
                              } : i));
                            } else {
                              setItems(prev => prev.map(i => i.productId === item.productId ? { 
                                ...i, 
                                orderedQuantity: 0, 
                                targetPriceRaw: rawVal, 
                                orderedQuantityRaw: undefined 
                              } : i));
                            }
                          }}
                          className="w-20 text-center border border-slate-200 rounded py-1 focus:outline-none focus:border-emerald-500 font-medium text-emerald-700 bg-emerald-50"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          placeholder="e.g. 500g packets"
                          value={item.notes}
                          onChange={(e) => updateNotes(item.productId, e.target.value)}
                          className="w-full text-sm border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-emerald-500"
                        />
                      </td>
                      <td className="p-3 text-right">
                        <button onClick={() => removeItem(item.productId)} className="p-1.5 text-red-500 hover:bg-red-50 rounded">
                          <X size={18} />
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

      {/* RIGHT: Order Settings & Submission */}
      <div className="w-full lg:w-1/3 bg-white rounded-lg shadow-sm border border-slate-200 p-6 flex flex-col">
        <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Order Details</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
            <UserIcon size={16}/> Customer
          </label>
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="w-full border border-slate-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-3"
          >
            <option value="">Walk-in / New Customer</option>
            {customers.map(c => (
              <option key={c._id} value={c._id}>{c.name} ({c.phone})</option>
            ))}
          </select>
          
          {selectedCustomerId === "" && (
            <div className="space-y-3 p-3 bg-slate-50 border border-slate-200 rounded-md">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">New Customer Details</p>
              <input 
                type="text" 
                placeholder="Customer Name *" 
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-md py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500" 
              />
              <input 
                type="text" 
                placeholder="Mobile Number *" 
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-md py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500" 
              />
              <input 
                type="text" 
                placeholder="Address (Optional)" 
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-md py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500" 
              />
              <p className="text-xs text-slate-400">If filled, a new customer will be automatically created on submit.</p>
            </div>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">Order Notes (For Staff)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border border-slate-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 h-24 resize-none"
            placeholder="Special instructions for picking..."
          />
        </div>

        <div className="mt-auto">
          <div className="bg-slate-50 p-4 rounded-md mb-4 border border-slate-100">
            <div className="flex justify-between text-sm text-slate-600 mb-1">
              <span>Total Items</span>
              <span className="font-medium text-slate-800">{items.length}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600">
              <span>Estimated Value</span>
              <span className="font-bold text-emerald-600">
                ₹{(items.reduce((sum, item) => sum + (item.orderedQuantity * item.unitPricePaise), 0) / 100).toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2 text-center">Final price will be calculated at billing based on exact weighed quantities.</p>
          </div>

          <button
            onClick={handleCreateOrder}
            disabled={submitting || items.length === 0}
            className="w-full py-3 bg-emerald-600 text-white font-bold rounded-lg shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Check size={20} /> Submit Order
              </>
            )}
          </button>
          
          <button
            onClick={() => navigate("/orders")}
            className="w-full py-2 mt-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
