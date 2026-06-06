import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X, Send } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { SaleWithDetails } from "@workspace/api-client-react";
import { useState, useEffect } from "react";

interface ReceiptDialogProps {
  sale: SaleWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReceiptDialog({ sale, open, onOpenChange }: ReceiptDialogProps) {
  if (!sale) return null;

  const [isSharingPDF, setIsSharingPDF] = useState(false);

  useEffect(() => {
    if (!open || !sale) return;
    const originalTitle = document.title;
    document.title = `Aakash Enterprises - GSTIN wertyuio123456789 - Receipt #${sale.id.toString().padStart(6, '0')}`;
    return () => {
      document.title = originalTitle;
    };
  }, [open, sale]);

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
      const { default: html2canvas } = await import("html2canvas");

      const element = document.getElementById("receipt-content");
      if (!element) throw new Error("Receipt content element not found");

      // ── Clone the receipt into an off-screen container ──
      // This completely bypasses any scroll, overflow, or Radix portal issues
      // by rendering a fresh, unconstrained copy of the receipt element.
      const offscreen = document.createElement("div");
      offscreen.style.cssText = `
        position: fixed;
        left: -9999px;
        top: 0;
        width: ${element.scrollWidth}px;
        overflow: visible;
        height: auto;
        max-height: none;
        background: white;
        z-index: -1;
        pointer-events: none;
      `;
      const clone = element.cloneNode(true) as HTMLElement;
      clone.removeAttribute("id"); // avoid duplicate IDs
      clone.style.overflow = "visible";
      clone.style.height = "auto";
      clone.style.maxHeight = "none";
      clone.style.flex = "none";
      offscreen.appendChild(clone);
      document.body.appendChild(offscreen);

      // Small delay to let the browser paint the off-screen clone
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(clone, {
        scale: 2, // 2x scale for crisp quality
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: clone.scrollWidth,
        height: clone.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0
      });

      // Remove the off-screen container
      document.body.removeChild(offscreen);

      const imgData = canvas.toDataURL("image/jpeg", 0.95);

      // Create a standard A4 PDF document (210mm x 297mm)
      const pdfWidth = 210;
      const pdfHeight = 297;
      
      // Calculate receipt dimensions to fit nicely centered on A4
      const receiptWidth = 120; // 120mm wide receipt card
      const receiptHeight = (canvas.height * receiptWidth) / canvas.width;
      
      const xOffset = (pdfWidth - receiptWidth) / 2;
      const yOffset = Math.max(15, (pdfHeight - receiptHeight) / 2); // Center vertically, min 15mm top margin

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      doc.setProperties({
        title: `Receipt #${sale.id.toString().padStart(6, '0')} - Aakash Enterprises`,
        subject: `GSTIN: wertyuio123456789`,
        creator: 'Aakash Enterprises'
      });

      doc.addImage(imgData, "JPEG", xOffset, yOffset, receiptWidth, receiptHeight);

      const pdfBase64 = doc.output("datauristring").split(",")[1];

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
      <DialogContent className="max-w-[400px] max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white print:shadow-none print:border-none">
        <div className="print:hidden p-4 border-b flex justify-between items-center bg-slate-50 shrink-0">
          <h2 className="font-bold flex items-center gap-2"><Printer className="w-4 h-4"/> Receipt</h2>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}><X className="w-4 h-4"/></Button>
        </div>

        <div id="receipt-content" className="p-8 font-mono text-sm text-slate-800 overflow-y-auto flex-1 bg-white">
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold uppercase tracking-widest">Aakash Enterprises</h1>
            <p className="text-xs text-slate-500">Retail & Wholesale Cold Drinks</p>
            <p className="text-xs font-semibold text-slate-600 mt-1">GSTIN: wertyuio123456789</p>
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

        <div className="p-4 bg-slate-50 border-t print:hidden flex flex-col gap-2 shrink-0">
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
          /* Reset page margins */
          @page {
            size: auto;
            margin: 0;
          }

          /* Force page & body to allow overflow and height scaling */
          html, body {
            overflow: visible !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          /* Hide the entire main React application and overlays */
          #root,
          .print\\:hidden,
          [data-radix-portal] > div:first-child {
            display: none !important;
          }

          /* Reset portal container */
          [data-radix-portal] {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            display: block !important;
          }

          /* Force the dialog content to print as a centered card of exact width */
          [role="dialog"] {
            display: block !important;
            position: relative !important;
            left: auto !important;
            top: auto !important;
            transform: none !important;
            width: 400px !important;
            max-width: 100% !important;
            margin: 40px auto !important;
            height: auto !important;
            max-height: none !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            background: white !important;
            overflow: visible !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          /* Hide any close buttons or action buttons */
          [role="dialog"] button {
            display: none !important;
          }

          /* Ensure receipt content behaves as a simple block with padding */
          #receipt-content {
            display: block !important;
            width: 100% !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            padding: 24px !important;
            margin: 0 !important;
            background: white !important;
            flex: none !important;
          }

          /* Prevent any element inside the receipt from splitting across pages */
          #receipt-content,
          #receipt-content * {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}} />
    </Dialog>
  );
}
