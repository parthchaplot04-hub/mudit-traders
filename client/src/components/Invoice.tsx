import { formatPaise } from "../utils/format";

export function Invoice({ sale, customerName }: { sale: any; customerName?: string }) {
  if (!sale) return null;

  const date = new Date(sale.createdAt).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="print-only bg-white text-black p-8 font-sans max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-6">
        <div className="flex items-center gap-4">
          <img src="/logo.jpg" alt="Mudit Traders Logo" className="w-16 h-16 rounded-full border border-slate-700" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight uppercase text-slate-900">
              Mudit Traders
            </h1>
          <p className="text-sm text-slate-600 mt-1">
            Fatehnagar Akola Road, Akola<br />
            Dist Chittorgarh, Rajasthan<br />
            Phone: +91 99999 99999
          </p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-semibold text-slate-800 uppercase tracking-widest">
            TAX INVOICE
          </h2>
          <div className="mt-2 text-sm text-slate-600">
            <p><span className="font-semibold">Bill No:</span> {sale.billNumber}</p>
            <p><span className="font-semibold">Date:</span> {date}</p>
            <p><span className="font-semibold">Payment:</span> {sale.paymentType}</p>
          </div>
        </div>
      </div>

      {/* Bill To */}
      {customerName && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Billed To
          </h3>
          <p className="text-base font-medium text-slate-900">{customerName}</p>
        </div>
      )}

      {/* Table */}
      <table className="w-full text-left text-sm mb-6 border-collapse">
        <thead>
          <tr className="border-b-2 border-slate-800 text-slate-700">
            <th className="py-3 px-2 font-semibold">Description</th>
            <th className="py-3 px-2 font-semibold text-right">Qty</th>
            <th className="py-3 px-2 font-semibold text-right">Rate (₹)</th>
            <th className="py-3 px-2 font-semibold text-right">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((item: any, idx: number) => (
            <tr key={idx} className="border-b border-slate-200">
              <td className="py-3 px-2 text-slate-800">{item.productName}</td>
              <td className="py-3 px-2 text-right text-slate-600">
                {item.quantity} {item.salesUnit}
              </td>
              <td className="py-3 px-2 text-right text-slate-600">
                {formatPaise(item.unitPricePaise).replace("₹", "")}
              </td>
              <td className="py-3 px-2 text-right font-medium text-slate-800">
                {formatPaise(item.taxableValuePaise).replace("₹", "")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Summary */}
      <div className="flex justify-end">
        <div className="w-1/2 min-w-[300px]">
          <div className="flex justify-between py-2 text-sm text-slate-600">
            <span>Subtotal</span>
            <span>{formatPaise(sale.subtotalPaise)}</span>
          </div>
          {sale.totalGstPaise > 0 && (
            <div className="flex justify-between py-2 text-sm text-slate-600">
              <span>GST</span>
              <span>{formatPaise(sale.totalGstPaise)}</span>
            </div>
          )}
          {sale.discountPaise > 0 && (
            <div className="flex justify-between py-2 text-sm text-emerald-600">
              <span>Discount</span>
              <span>-{formatPaise(sale.discountPaise)}</span>
            </div>
          )}
          <div className="flex justify-between py-3 border-t-2 border-slate-800 text-lg font-bold text-slate-900 mt-2">
            <span>Grand Total</span>
            <span>{formatPaise(sale.totalPaise)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-16 pt-6 border-t border-slate-200 text-xs text-slate-500 text-center">
        <p>Thank you for your business!</p>
        <p className="mt-1">Goods once sold will not be taken back. Subject to Chittorgarh jurisdiction.</p>
      </div>
    </div>
  );
}
