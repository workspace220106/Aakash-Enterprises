import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X, Send } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { SaleWithDetails } from "@workspace/api-client-react";
import { useState } from "react";

interface ReceiptDialogProps {
  sale: SaleWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReceiptDialog({ sale, open, onOpenChange }: ReceiptDialogProps) {
  if (!sale) return null;

  const [isSharingPDF, setIsSharingPDF] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppPDFShare = async () => {
    if (!sale) return;
    setIsSharingPDF(true);

    const newTab = window.open("", "_blank");
    if (newTab) {
      newTab.document.write("<p style='font-family: sans-serif; text-align: center; margin-top: 50px;'>Generating receipt PDF and preparing WhatsApp link... Please wait.</p>");
    }

    try {
      // Dynamically import jspdf and html2canvas
      const { jsPDF } = await import("jspdf");
      const html2canvas = (await import("html2canvas")).default;

      const receiptElement = document.getElementById("receipt-content");
      if (!receiptElement) {
        throw new Error("Receipt element not found");
      }

      const canvas = await html2canvas(receiptElement, {
        scale: 2, // High resolution
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

      const pdfBase64 = pdf.output("datauristring").split(",")[1];

      // 2. Upload PDF to backend
      const response = await fetch(`/api/sales/${sale.id}/pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pdfBase64 }),
      });

      if (!response.ok) {
        throw new Error("Failed to upload PDF");
      }

      // 3. Open WhatsApp link in the pre-opened tab
      const pdfUrl = `${window.location.origin}/api/sales/${sale.id}/pdf`;
      const rawPhone = sale.customerPhone || "";
      const cleanPhone = rawPhone.replace(/\D/g, "");
      const messageText = encodeURIComponent(`*AAKASH ENTERPRISES*\nHello, here is your receipt #${sale.id.toString().padStart(6, '0')} for ₹${sale.total.toFixed(2)} in PDF format:\n${pdfUrl}`);
      
      const whatsappUrl = cleanPhone 
        ? `https://wa.me/${cleanPhone}?text=${messageText}`
        : `https://wa.me/?text=${messageText}`;
        
      if (newTab) {
        newTab.location.href = whatsappUrl;
      }
    } catch (error) {
      console.error("Error generating/sharing PDF: ", error);
      if (newTab) {
        newTab.close();
      }
      alert("Failed to share PDF receipt. Please try again.");
    } finally {
      setIsSharingPDF(false);
    }
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
            <p className="text-xs text-slate-500 mt-1">GSTIN: qwertyuio123456789</p>
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
              {(() => {
                const subtotal = sale.items.reduce((sum, item) => sum + item.total, 0);
                const hasDiscount = subtotal > sale.total + 0.01;
                if (!hasDiscount) {
                  return (
                    <tr className="border-t-2 border-slate-800">
                      <td colSpan={3} className="pt-4 font-bold text-lg uppercase">Grand Total</td>
                      <td className="pt-4 text-right font-bold text-lg">{formatCurrency(sale.total)}</td>
                    </tr>
                  );
                }
                const discountPercent = ((subtotal - sale.total) / subtotal) * 100;
                return (
                  <>
                    <tr className="border-t-2 border-slate-800">
                      <td colSpan={3} className="pt-2 text-slate-500 text-xs">Subtotal</td>
                      <td className="pt-2 text-right text-slate-500 text-xs">{formatCurrency(subtotal)}</td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="py-1 text-slate-500 text-xs">Discount ({discountPercent.toFixed(2)}%)</td>
                      <td className="py-1 text-right text-red-600 text-xs font-semibold">-{formatCurrency(subtotal - sale.total)}</td>
                    </tr>
                    <tr className="border-t border-slate-200">
                      <td colSpan={3} className="pt-2 font-bold text-lg uppercase">Grand Total</td>
                      <td className="pt-2 text-right font-bold text-lg">{formatCurrency(sale.total)}</td>
                    </tr>
                  </>
                );
              })()}
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

        <div className="p-4 bg-slate-50 border-t print:hidden flex flex-col gap-2">
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button variant="secondary" className="flex-1 gap-2 border border-slate-200" onClick={handlePrint}>
              <Printer className="w-4 h-4" /> Print
            </Button>
          </div>
          <Button 
            disabled={isSharingPDF}
            className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center py-5 rounded-xl shadow-lg hover:shadow-emerald-600/20 transition-all disabled:bg-emerald-800 disabled:opacity-70" 
            onClick={handleWhatsAppPDFShare}
          >
            <Send className="w-4 h-4" /> {isSharingPDF ? "Generating & Hosting PDF..." : "Send PDF via WhatsApp"}
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
