import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { SaleWithDetails } from "@workspace/api-client-react";

interface ReceiptDialogProps {
  sale: SaleWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReceiptDialog({ sale, open, onOpenChange }: ReceiptDialogProps) {
  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px] p-0 overflow-hidden bg-white print:shadow-none print:border-none">
        <div className="print:hidden p-4 border-b flex justify-between items-center bg-slate-50">
          <h2 className="font-bold flex items-center gap-2"><Printer className="w-4 h-4"/> Receipt</h2>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}><X className="w-4 h-4"/></Button>
        </div>

        <div id="receipt-content" className="p-8 font-mono text-sm text-slate-800">
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold uppercase tracking-widest">Aakash Enterprises</h1>
            <p className="text-xs text-slate-500">Retail & Wholesale Cold Drinks</p>
            <div className="mt-2 border-y border-dashed border-slate-300 py-2">
              <p>RECEIPT #{sale.id.toString().padStart(6, '0')}</p>
              <p>{new Date(sale.date).toLocaleString('en-IN')}</p>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-xs text-slate-500 uppercase font-bold mb-1">Customer</p>
            <p className="font-bold">{sale.customerName || "Walk-in Customer"}</p>
          </div>

          <table className="w-full mb-6">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="py-2">Item</th>
                <th className="py-2 text-center">Qty</th>
                <th className="py-2 text-right">Price</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sale.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-2 pr-2">
                    <p className="font-medium leading-tight">{item.productName}</p>
                  </td>
                  <td className="py-2 text-center">{item.quantity}</td>
                  <td className="py-2 text-right">{formatCurrency(item.price)}</td>
                  <td className="py-2 text-right font-bold">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-800">
                <td colSpan={3} className="pt-4 font-bold text-lg uppercase">Grand Total</td>
                <td className="pt-4 text-right font-bold text-lg">{formatCurrency(sale.total)}</td>
              </tr>
            </tfoot>
          </table>

          {sale.notes && (
            <div className="mb-6 p-2 bg-slate-50 border border-slate-200 rounded text-xs italic">
              <p className="font-bold not-italic mb-1">Notes:</p>
              {sale.notes}
            </div>
          )}

          <div className="text-center border-t border-dashed border-slate-300 pt-6">
            <p className="font-bold italic">Thank you for your business!</p>
            <p className="text-[10px] text-slate-400 mt-2 italic">Please visit again</p>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t print:hidden flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button className="flex-1 gap-2" onClick={handlePrint}>
            <Printer className="w-4 h-4" /> Print Bill
          </Button>
        </div>
      </DialogContent>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #receipt-content, #receipt-content * {
            visibility: visible;
          }
          #receipt-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}} />
    </Dialog>
  );
}
