import { useState } from "react";
import { useGetCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer, useGetCustomerSales, getGetCustomersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Edit2, Trash2, History } from "lucide-react";
import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";

export default function Customers() {
  const [search, setSearch] = useState("");
  const { data: customers, isLoading } = useGetCustomers({ search });
  
  const queryClient = useQueryClient();
  const createMutation = useCreateCustomer({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetCustomersQueryKey() }) } });
  const updateMutation = useUpdateCustomer({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetCustomersQueryKey() }) } });
  const deleteMutation = useDeleteCustomer({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetCustomersQueryKey() }) } });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: "", phone: "", shopName: "", address: "", notes: "" });

  const [historyCustomerId, setHistoryCustomerId] = useState<number | null>(null);
const { data: salesHistory } = useGetCustomerSales(historyCustomerId || 0, { query: { enabled: !!historyCustomerId, queryKey: ["customerSales", historyCustomerId] } });

  const handleOpenForm = (customer?: any) => {
    if (customer) {
      setEditingId(customer.id);
      setFormData(customer);
    } else {
      setEditingId(null);
      setFormData({ name: "", phone: "", shopName: "", address: "", notes: "" });
    }
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData }, { onSuccess: () => setIsFormOpen(false) });
    } else {
      createMutation.mutate({ data: formData }, { onSuccess: () => setIsFormOpen(false) });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Customers</h1>
          <p className="text-muted-foreground text-lg">Manage your wholesale clients.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search customers..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            />
          </div>
          <button 
            onClick={() => handleOpenForm()}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-secondary to-blue-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Add Customer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full p-8 text-center text-slate-400">Loading customers...</div>
        ) : customers?.map((c, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            key={c.id} 
            className="glass-card p-6 flex flex-col"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-800">{c.name}</h3>
                <p className="text-primary font-medium">{c.shopName}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setHistoryCustomerId(c.id)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Purchase History"><History className="w-4 h-4"/></button>
                <button onClick={() => handleOpenForm(c)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4"/></button>
                <button onClick={() => { if(confirm('Delete?')) deleteMutation.mutate({ id: c.id }) }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button>
              </div>
            </div>
            
            <div className="space-y-2 text-sm text-slate-600 mt-auto">
              <p><span className="font-semibold text-slate-400 w-16 inline-block">Phone:</span> {c.phone}</p>
              <p className="line-clamp-2"><span className="font-semibold text-slate-400 w-16 inline-block">Address:</span> {c.address}</p>
              {c.notes && <p className="italic bg-slate-50 p-2 rounded mt-2 text-xs border border-slate-100">{c.notes}</p>}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add/Edit Dialog */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-display font-bold text-xl">{editingId ? 'Edit Customer' : 'Add Customer'}</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div><label className="block text-sm font-semibold text-slate-700 mb-1">Name</label><input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" /></div>
              <div><label className="block text-sm font-semibold text-slate-700 mb-1">Shop Name</label><input required type="text" value={formData.shopName} onChange={e => setFormData({...formData, shopName: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" /></div>
              <div><label className="block text-sm font-semibold text-slate-700 mb-1">Phone</label><input required type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" /></div>
              <div><label className="block text-sm font-semibold text-slate-700 mb-1">Address</label><textarea required value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" /></div>
              <div><label className="block text-sm font-semibold text-slate-700 mb-1">Notes (Optional)</label><input type="text" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" /></div>
              
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-secondary hover:bg-secondary/90 text-white font-medium rounded-lg shadow-md transition-all">{editingId ? 'Update' : 'Save'}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* History Dialog */}
      {historyCustomerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between">
              <h3 className="font-display font-bold text-xl flex items-center gap-2"><History className="text-emerald-500"/> Purchase History</h3>
              <button onClick={() => setHistoryCustomerId(null)} className="text-slate-400 hover:text-slate-600">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto">
              {!salesHistory ? <p>Loading...</p> : salesHistory.length === 0 ? <p className="text-center text-slate-500 py-4">No purchases found.</p> : (
                <div className="space-y-4">
                  {salesHistory.map(sale => (
                    <div key={sale.id} className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                      <div className="flex justify-between font-bold mb-2">
                        <span>{new Date(sale.date).toLocaleDateString()}</span>
                        <span className="text-primary">{formatCurrency(sale.total)}</span>
                      </div>
                      <div className="text-sm space-y-1">
                        {sale.items.map(item => (
                          <div key={item.id} className="flex justify-between text-slate-600">
                            <span>{item.quantity}x {item.productName}</span>
                            <span>{formatCurrency(item.total)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
