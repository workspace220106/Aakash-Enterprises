import { useState } from "react";
import { 
  useGetSales, 
  useUpdateSalePayment,
  getGetSalesQueryKey, 
  getGetProductsQueryKey,
  getGetDashboardStatsQueryKey,
  getGetDailySalesQueryKey,
  getGetMonthlySalesQueryKey,
  getGetTopProductsQueryKey,
  getGetProfitMarginsQueryKey,
  type SaleWithDetails 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/utils";
import { Search, Coins, Calendar, FileText, X, AlertCircle, Users, ArrowUpRight, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { ReceiptDialog } from "@/components/ReceiptDialog";

export default function Credits() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedSaleForPayment, setSelectedSaleForPayment] = useState<SaleWithDetails | null>(null);
  const [paymentAmountStr, setPaymentAmountStr] = useState("");
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<SaleWithDetails | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  const { data: sales, isLoading, error } = useGetSales();

  const updatePaymentMutation = useUpdateSalePayment({
    mutation: {
      onSuccess: () => {
        // Invalidate all related query keys
        queryClient.invalidateQueries({ queryKey: getGetSalesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetProductsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDailySalesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMonthlySalesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetTopProductsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetProfitMarginsQueryKey() });
        
        toast({
          title: "Payment Recorded",
          description: "Customer credit balance updated successfully.",
        });
        setSelectedSaleForPayment(null);
        setPaymentAmountStr("");
      },
      onError: (err: any) => {
        toast({
          variant: "destructive",
          title: "Failed to record payment",
          description: err.message || "An unexpected error occurred.",
        });
      }
    }
  });

  // Calculate helpers
  const getSaleAmountPaid = (sale: SaleWithDetails) => {
    return sale.amountPaid !== null && sale.amountPaid !== undefined 
      ? Number(sale.amountPaid) 
      : sale.total;
  };

  const getSaleRemainingDue = (sale: SaleWithDetails) => {
    return sale.total - getSaleAmountPaid(sale);
  };

  // Filter out fully paid sales
  const creditSales = (sales || []).filter(sale => {
    return getSaleRemainingDue(sale) > 0;
  });

  // Filter based on search query
  const filteredCreditSales = creditSales.filter(sale => {
    if (!search) return true;
    const customerName = sale.customerName?.toLowerCase() || "";
    const customerPhone = sale.customerPhone?.toLowerCase() || "";
    const query = search.toLowerCase();
    return customerName.includes(query) || customerPhone.includes(query);
  });

  // Stats
  const totalOutstanding = creditSales.reduce((acc, sale) => acc + getSaleRemainingDue(sale), 0);
  const uniqueDebtors = new Set(creditSales.map(sale => sale.customerId).filter(Boolean)).size;
  const totalCreditSalesCount = creditSales.length;

  const handleOpenPaymentModal = (sale: SaleWithDetails) => {
    setSelectedSaleForPayment(sale);
    // Default to the full remaining due amount
    setPaymentAmountStr(getSaleRemainingDue(sale).toString());
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSaleForPayment) return;

    const amountToPay = parseFloat(paymentAmountStr);
    const remainingDue = getSaleRemainingDue(selectedSaleForPayment);

    if (isNaN(amountToPay) || amountToPay <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid amount",
        description: "Please enter a payment amount greater than 0.",
      });
      return;
    }

    if (amountToPay > remainingDue) {
      toast({
        variant: "destructive",
        title: "Amount exceeds balance",
        description: `Maximum payment amount is ${formatCurrency(remainingDue)}.`,
      });
      return;
    }

    const currentPaid = getSaleAmountPaid(selectedSaleForPayment);
    const newAmountPaid = currentPaid + amountToPay;

    updatePaymentMutation.mutate({
      id: selectedSaleForPayment.id,
      data: {
        amountPaid: newAmountPaid
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Credits & Dues</h1>
          <p className="text-muted-foreground text-lg">Track and manage outstanding credit balances.</p>
        </div>
        
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search customer by name or phone..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="glass-card p-6 bg-gradient-to-br from-red-500/10 to-rose-500/5 border-red-100 flex items-center justify-between"
        >
          <div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Outstanding</p>
            <h3 className="text-3xl font-display font-bold text-red-600">{formatCurrency(totalOutstanding)}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
            <Coins className="w-6 h-6" />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="glass-card p-6 bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-100 flex items-center justify-between"
        >
          <div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Active Debtors</p>
            <h3 className="text-3xl font-display font-bold text-amber-700">{uniqueDebtors} {uniqueDebtors === 1 ? 'Customer' : 'Customers'}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
            <Users className="w-6 h-6" />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="glass-card p-6 bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border-blue-100 flex items-center justify-between"
        >
          <div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Pending Invoices</p>
            <h3 className="text-3xl font-display font-bold text-blue-700">{totalCreditSalesCount} {totalCreditSalesCount === 1 ? 'Bill' : 'Bills'}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
            <FileText className="w-6 h-6" />
          </div>
        </motion.div>
      </div>

      {/* Main Credits Table */}
      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-500 text-sm uppercase tracking-wider">
                <th className="p-4 font-semibold">Customer</th>
                <th className="p-4 font-semibold">Date</th>
                <th className="p-4 font-semibold">Items Bought</th>
                <th className="p-4 font-semibold">Total Amount</th>
                <th className="p-4 font-semibold">Paid</th>
                <th className="p-4 font-semibold text-red-600">Balance Due</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400">Loading credit details...</td></tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-red-500">
                    <div className="flex items-center justify-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      <span>Failed to load sales.</span>
                    </div>
                  </td>
                </tr>
              ) : filteredCreditSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    {search ? "No matching credit transactions found." : "No outstanding credits found!"}
                  </td>
                </tr>
              ) : (
                filteredCreditSales.map((sale, i) => {
                  const paid = getSaleAmountPaid(sale);
                  const due = getSaleRemainingDue(sale);
                  
                  // Format items e.g., "2x Fanta, 1x Pepsi"
                  const itemsSummary = sale.items
                    .map(item => `${item.quantity}x ${item.productName}`)
                    .join(", ");

                  return (
                    <motion.tr 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      key={sale.id} 
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800">{sale.customerName || "Registered Customer"}</span>
                          {sale.customerPhone && <span className="text-xs text-slate-400">{sale.customerPhone}</span>}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-medium text-slate-600">
                            {new Date(sale.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-slate-600 max-w-xs truncate" title={itemsSummary}>
                        {itemsSummary}
                      </td>
                      <td className="p-4 font-semibold text-slate-800">{formatCurrency(sale.total)}</td>
                      <td className="p-4 text-slate-600">{formatCurrency(paid)}</td>
                      <td className="p-4 font-bold text-red-600 text-lg">{formatCurrency(due)}</td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end items-center gap-2">
                          <button 
                            onClick={() => { setSelectedSaleForReceipt(sale); setShowReceipt(true); }}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Receipt"
                          >
                            <FileText className="w-4 h-4"/>
                          </button>
                          
                          <button 
                            onClick={() => handleOpenPaymentModal(sale)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg font-semibold text-xs border border-emerald-200/50 transition-all"
                            title="Record Payment"
                          >
                            <Coins className="w-3.5 h-3.5" />
                            Pay
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Dialog */}
      <AnimatePresence>
        {selectedSaleForPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200"
            >
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-display font-bold text-xl flex items-center gap-2">
                  <Coins className="text-emerald-500 w-5 h-5" />
                  Record Payment
                </h3>
                <button 
                  onClick={() => setSelectedSaleForPayment(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-100">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Customer:</span>
                    <span className="font-semibold text-slate-800">{selectedSaleForPayment.customerName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Bill Date:</span>
                    <span className="text-slate-700">
                      {new Date(selectedSaleForPayment.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="border-t border-slate-200/50 my-2 pt-2"></div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Total Bill:</span>
                    <span className="font-semibold text-slate-800">{formatCurrency(selectedSaleForPayment.total)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Amount Paid So Far:</span>
                    <span className="font-semibold text-slate-800">{formatCurrency(getSaleAmountPaid(selectedSaleForPayment))}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-red-600">
                    <span>Remaining Balance:</span>
                    <span>{formatCurrency(getSaleRemainingDue(selectedSaleForPayment))}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-semibold text-slate-700">
                    Payment Amount to Record (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium font-display text-lg">₹</span>
                    <input 
                      required 
                      type="number" 
                      step="0.01"
                      min="0.01"
                      max={getSaleRemainingDue(selectedSaleForPayment)}
                      value={paymentAmountStr} 
                      onChange={e => setPaymentAmountStr(e.target.value)} 
                      className="w-full pl-8 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-lg font-semibold"
                    />
                  </div>
                  <p className="text-xs text-slate-400 italic">
                    Entering a payment updates the customer's total paid amount on this bill.
                  </p>
                </div>
                
                <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => setSelectedSaleForPayment(null)} 
                    className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={updatePaymentMutation.isPending}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {updatePaymentMutation.isPending ? "Recording..." : (
                      <>
                        <Check className="w-4 h-4" />
                        Record Payment
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Invoice/Receipt Viewer */}
      {selectedSaleForReceipt && (
        <ReceiptDialog 
          open={showReceipt} 
          onOpenChange={(openVal) => { 
            if (!openVal) {
              setSelectedSaleForReceipt(null); 
              setShowReceipt(false); 
            }
          }} 
          sale={selectedSaleForReceipt} 
        />
      )}
    </div>
  );
}
