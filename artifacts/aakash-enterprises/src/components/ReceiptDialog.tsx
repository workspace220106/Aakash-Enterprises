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
      const { jsPDF } = await import("jspdf");

      // ── Native jsPDF vector drawing — 100% reliable, no html2canvas ──
      const pageW = 210; // A4 width in mm
      const pageH = 297; // A4 height in mm
      const receiptW = 120; // receipt card width
      const left = (pageW - receiptW) / 2; // left edge of receipt
      const right = left + receiptW;       // right edge
      const cx = pageW / 2;               // center X

      // Currency formatter for PDF (use Rs. since default fonts lack ₹)
      const fmtCur = (n: number) => {
        const formatted = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.abs(n));
        return `Rs.${formatted}`;
      };

      // ── Measure total height (must exactly match y += increments below) ──
      let totalH = 0;
      totalH += 7;    // shop name (y += 7)
      totalH += 4.5;  // tagline (y += 4.5)
      totalH += 5;    // GSTIN (y += 5)
      totalH += 5;    // dashed line + space (y += 5)
      totalH += 5;    // receipt # (y += 5)
      totalH += 4;    // date (y += 4)
      totalH += 6;    // dashed line + space (y += 6)
      totalH += 4;    // CUSTOMER label (y += 4)
      totalH += 7;    // customer name (y += 7)
      totalH += 2;    // table header text to line (y += 2)
      totalH += 4;    // after header line (y += 4)
      totalH += sale.items.length * 7; // item rows (y += 7 each)
      totalH += 4;    // thick separator + space (y += 4)
      const subtotal = sale.items.reduce((sum, item) => sum + item.total, 0);
      const hasDiscount = subtotal > sale.total + 0.01;
      if (hasDiscount) {
        totalH += 5;  // subtotal row (y += 5)
        totalH += 4;  // discount row (y += 4)
        totalH += 4;  // thin separator + space (y += 4)
      }
      totalH += 8;    // grand total row (y += 8)
      if (sale.notes) {
        totalH += 14;  // notes section (y += 14)
      }
      totalH += 2;    // gap before footer (y += 2)
      totalH += 6;    // footer dashed line + space (y += 6)
      totalH += 5;    // "Thank you" (y += 5)
      totalH += 3;    // "Please visit again" text height (final text, no y increment)

      const startY = Math.max(15, (pageH - totalH) / 2);

      // ── Second pass: draw ──
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      doc.setProperties({
        title: `Receipt #${sale.id.toString().padStart(6, '0')} - Aakash Enterprises`,
        subject: `GSTIN: wertyuio123456789`,
        creator: 'Aakash Enterprises'
      });

      let y = startY;

      // ─── HEADER: Shop Name ───
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("AAKASH ENTERPRISES", cx, y, { align: "center" });
      y += 7;

      // Tagline
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text("Retail & Wholesale Cold Drinks", cx, y, { align: "center" });
      y += 4.5;

      // GSTIN
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.text("GSTIN: wertyuio123456789", cx, y, { align: "center" });
      y += 5;

      // ─── Dashed separator ───
      doc.setDrawColor(180, 180, 180);
      doc.setLineDashPattern([1.5, 1], 0);
      doc.setLineWidth(0.3);
      doc.line(left, y, right, y);
      y += 5;

      // Receipt # and Date
      doc.setFont("courier", "normal");
      doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);
      doc.text(`RECEIPT #${sale.id.toString().padStart(6, '0')}`, cx, y, { align: "center" });
      y += 5;
      doc.setFontSize(9);
      doc.text(new Date(sale.date).toLocaleString('en-IN'), cx, y, { align: "center" });
      y += 4;

      // Dashed separator
      doc.line(left, y, right, y);
      doc.setLineDashPattern([], 0); // reset to solid
      y += 6;

      // ─── CUSTOMER ───
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text("CUSTOMER", left, y);
      y += 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);
      doc.text(sale.customerName || "Walk-in Customer", left, y);
      y += 7;

      // ─── TABLE HEADER ───
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      // Column positions
      const colItem = left;
      const colQty = left + receiptW * 0.45;
      const colPrice = left + receiptW * 0.65;
      const colTotal = right;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text("Item", colItem, y);
      doc.text("Qty", colQty, y, { align: "center" });
      doc.text("Price", colPrice, y, { align: "right" });
      doc.text("Total", colTotal, y, { align: "right" });
      y += 2;
      doc.line(left, y, right, y);
      y += 4;

      // ─── TABLE ROWS ───
      doc.setTextColor(30, 30, 30);
      for (const item of sale.items) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text(item.productName, colItem, y);
        doc.setFont("helvetica", "normal");
        doc.text(String(item.quantity), colQty, y, { align: "center" });
        doc.text(fmtCur(item.price), colPrice, y, { align: "right" });
        doc.setFont("helvetica", "bold");
        doc.text(fmtCur(item.total), colTotal, y, { align: "right" });
        y += 7;
      }

      // ─── TOTALS ───
      // Thick separator
      doc.setDrawColor(30, 30, 30);
      doc.setLineWidth(0.6);
      doc.line(left, y, right, y);
      y += 4;

      if (hasDiscount) {
        // Subtotal
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text("Subtotal", colItem, y);
        doc.text(fmtCur(subtotal), colTotal, y, { align: "right" });
        y += 5;

        // Discount
        const discountPercent = ((subtotal - sale.total) / subtotal) * 100;
        doc.text(`Discount (${discountPercent.toFixed(2)}%)`, colItem, y);
        doc.setTextColor(200, 50, 50);
        doc.setFont("helvetica", "bold");
        doc.text(`-${fmtCur(subtotal - sale.total)}`, colTotal, y, { align: "right" });
        y += 4;

        // Thin separator before grand total
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.2);
        doc.line(left, y, right, y);
        y += 4;
      }

      // Grand Total
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(30, 30, 30);
      doc.text("GRAND TOTAL", colItem, y);
      doc.text(fmtCur(sale.total), colTotal, y, { align: "right" });
      y += 8;

      // ─── NOTES ───
      if (sale.notes) {
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.roundedRect(left, y - 1, receiptW, 12, 1, 1, "FD");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(30, 30, 30);
        doc.text("Notes:", left + 2, y + 2);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7);
        doc.setTextColor(80, 80, 80);
        // Wrap notes text to fit within receipt width
        const noteLines = doc.splitTextToSize(sale.notes, receiptW - 6);
        doc.text(noteLines, left + 2, y + 6);
        y += 14;
      }

      // ─── FOOTER ───
      y += 2;
      doc.setDrawColor(180, 180, 180);
      doc.setLineDashPattern([1.5, 1], 0);
      doc.setLineWidth(0.3);
      doc.line(left, y, right, y);
      y += 6;

      doc.setFont("helvetica", "bolditalic");
      doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);
      doc.text("Thank you for your business!", cx, y, { align: "center" });
      y += 5;

      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      doc.setTextColor(160, 160, 160);
      doc.text("Please visit again", cx, y, { align: "center" });

      // ── Generate and upload ──
      const pdfBase64 = doc.output("datauristring").split(",")[1];

      const response = await fetch(`/api/sales/${sale.id}/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfBase64 }),
      });

      if (!response.ok) throw new Error("Failed to upload PDF");

      // Open WhatsApp link
      const pdfUrl = `${window.location.origin}/api/sales/${sale.id}/pdf`;
      const rawPhone = sale.customerPhone || "";
      const cleanPhone = rawPhone.replace(/\D/g, "");
      const messageText = encodeURIComponent(`*AAKASH ENTERPRISES*\nHello, here is your receipt #${sale.id.toString().padStart(6, '0')} for Rs.${sale.total.toFixed(0)} in PDF format:\n${pdfUrl}`);
      
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

          /* Force page & body to fill viewport for centering */
          html, body {
            overflow: visible !important;
            height: 100% !important;
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

          /* Use the portal as a full-page flex container to center the receipt */
          [data-radix-portal] {
            position: static !important;
            width: 100% !important;
            height: 100vh !important;
            min-height: 100vh !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
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
            margin: auto !important;
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
