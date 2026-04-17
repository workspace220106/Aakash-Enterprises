import { useState } from "react";
import { useGetSales, useDeleteSale, getGetSalesQueryKey, type SaleWithDetails } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/utils";
import { Calendar, Trash2, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { ReceiptDialog } from "@/components/ReceiptDialog";

export default function Sales() {
  const { data: sales, isLoading } = useGetSales();
  const queryClient = useQueryClient();
  const deleteMutation = useDeleteSale({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetSalesQueryKey() }) } });

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<SaleWithDetails | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Sales History</h1>
        <p className="text-muted-foreground text-lg">View and manage all past transactions.</p>
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-500 text-sm uppercase tracking-wider">
                <th className="p-4 font-semibold">Date & Time</th>
                <th className="p-4 font-semibold">Customer</th>
                <th className="p-4 font-semibold">Items</th>
                <th className="p-4 font-semibold">Total Amount</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400">Loading sales...</td></tr>
              ) : sales?.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400">No sales recorded yet.</td></tr>
              ) : (
                sales?.map((sale, i) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    key={sale.id} 
                    className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                    onClick={() => setExpandedId(expandedId === sale.id ? null : sale.id)}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="font-medium text-slate-700">
                          {new Date(sale.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      {sale.customerName ? (
                        <span className="font-semibold text-primary">{sale.customerName}</span>
                      ) : (
                        <span className="text-slate-400 italic">Walk-in Customer</span>
                      )}
                    </td>
                    <td className="p-4 text-slate-600">
                      <div className="flex flex-col">
                        <span>{sale.items.reduce((acc, curr) => acc + curr.quantity, 0)} items</span>
                        {expandedId === sale.id && (
                          <div className="mt-2 text-sm bg-white p-3 rounded-lg border border-slate-100 shadow-sm space-y-1 w-max">
                            {sale.items.map(item => (
                              <div key={item.id} className="flex gap-4">
                                <span className="text-slate-500 w-6">{item.quantity}x</span>
                                <span className="font-medium text-slate-800">{item.productName}</span>
                                <span className="text-slate-400 ml-auto">{formatCurrency(item.total)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4 font-bold text-slate-800 text-lg">{formatCurrency(sale.total)}</td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                        <button 
                          onClick={() => { setSelectedSaleForReceipt(sale); setShowReceipt(true); }}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <FileText className="w-4 h-4"/>
                        </button>
                        <button 
                          onClick={() => { if(confirm('Are you sure you want to delete this sale record?')) deleteMutation.mutate({ id: sale.id }) }} 
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4"/>
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ReceiptDialog 
        open={showReceipt} 
        onOpenChange={setShowReceipt} 
        sale={selectedSaleForReceipt}
      />
    </div>
  );
}
