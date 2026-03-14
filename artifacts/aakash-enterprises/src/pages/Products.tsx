import { useState } from "react";
import { 
  useGetProducts, 
  useGetProfitMargins, 
  useCreateProduct, 
  useUpdateProduct, 
  useDeleteProduct,
  getGetProductsQueryKey,
  getGetProfitMarginsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency, cn } from "@/lib/utils";
import { Plus, Search, Edit2, Trash2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { motion } from "framer-motion";

export default function Products() {
  const [activeTab, setActiveTab] = useState<'inventory' | 'margins'>('inventory');
  const [search, setSearch] = useState("");
  const { data: products, isLoading: productsLoading } = useGetProducts({ search });
  const { data: margins, isLoading: marginsLoading } = useGetProfitMargins();
  
  const queryClient = useQueryClient();
  const createMutation = useCreateProduct({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetProductsQueryKey() }) } });
  const deleteMutation = useDeleteProduct({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetProductsQueryKey() }) } });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: "", brand: "", size: "", purchasePrice: 0, sellingPrice: 0, stock: 0, supplier: ""
  });

  const handleOpenDialog = (product?: any) => {
    if (product) {
      setEditingId(product.id);
      setFormData(product);
    } else {
      setEditingId(null);
      setFormData({ name: "", brand: "", size: "", purchasePrice: 0, sellingPrice: 0, stock: 0, supplier: "" });
    }
    setIsDialogOpen(true);
  };

  const updateMutation = useUpdateProduct({ 
    mutation: { 
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetProductsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetProfitMarginsQueryKey() });
        setIsDialogOpen(false);
      } 
    } 
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate({ data: formData }, {
        onSuccess: () => setIsDialogOpen(false)
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Products & Inventory</h1>
          <p className="text-muted-foreground text-lg">Manage your drinks and analyze profitability.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search products..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            />
          </div>
          <button 
            onClick={() => handleOpenDialog()}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-primary/80 text-white rounded-xl font-medium shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      {/* Custom Tabs */}
      <div className="flex p-1 bg-slate-100 rounded-xl w-max">
        <button 
          onClick={() => setActiveTab('inventory')}
          className={cn("px-6 py-2 rounded-lg font-medium transition-all", activeTab === 'inventory' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}
        >
          Inventory List
        </button>
        <button 
          onClick={() => setActiveTab('margins')}
          className={cn("px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2", activeTab === 'margins' ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700")}
        >
          Profit Margins
        </button>
      </div>

      {activeTab === 'inventory' && (
        <div className="glass-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-500 text-sm uppercase tracking-wider">
                  <th className="p-4 font-semibold">Product</th>
                  <th className="p-4 font-semibold">Brand & Size</th>
                  <th className="p-4 font-semibold">Purchase</th>
                  <th className="p-4 font-semibold">Selling</th>
                  <th className="p-4 font-semibold">Stock</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {productsLoading ? (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-400">Loading products...</td></tr>
                ) : products?.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-400">No products found.</td></tr>
                ) : (
                  products?.map((p, i) => (
                    <motion.tr 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      key={p.id} 
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="p-4 font-semibold text-slate-800">{p.name}</td>
                      <td className="p-4 text-slate-600">{p.brand} • {p.size}</td>
                      <td className="p-4 text-slate-600">{formatCurrency(p.purchasePrice)}</td>
                      <td className="p-4 font-medium text-slate-800">{formatCurrency(p.sellingPrice)}</td>
                      <td className="p-4">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-sm font-bold",
                          p.stock < 20 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                        )}>
                          {p.stock}
                        </span>
                      </td>
                      <td className="p-4 flex justify-end gap-2">
                        <button onClick={() => handleOpenDialog(p)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4"/></button>
                        <button 
                          onClick={() => { if(confirm('Delete product?')) deleteMutation.mutate({ id: p.id }) }} 
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4"/>
                        </button>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'margins' && (
        <div className="glass-panel overflow-hidden border-t-4 border-t-primary">
          <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-primary/5 to-transparent">
            <h2 className="text-xl font-display font-bold text-slate-800">Profitability Analysis</h2>
            <p className="text-slate-500 text-sm mt-1">Detailed breakdown of margins per product to help you optimize pricing.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-500 text-sm uppercase tracking-wider">
                  <th className="p-4 font-semibold">Product</th>
                  <th className="p-4 font-semibold">Prices (Pur/Sell)</th>
                  <th className="p-4 font-semibold">Profit/Unit</th>
                  <th className="p-4 font-semibold">Margin %</th>
                  <th className="p-4 font-semibold">Total Revenue</th>
                  <th className="p-4 font-semibold text-right">Total Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {marginsLoading ? (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-400">Calculating margins...</td></tr>
                ) : margins?.map((m, i) => {
                  const isHigh = m.profitMarginPercent >= 25;
                  const isMed = m.profitMarginPercent >= 10 && m.profitMarginPercent < 25;
                  
                  return (
                    <motion.tr 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      key={m.id} 
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="p-4">
                        <p className="font-semibold text-slate-800">{m.name}</p>
                        <p className="text-xs text-slate-500">{m.brand} • {m.size}</p>
                      </td>
                      <td className="p-4 text-sm text-slate-600">
                        {formatCurrency(m.purchasePrice)} / {formatCurrency(m.sellingPrice)}
                      </td>
                      <td className="p-4 font-medium text-emerald-600">{formatCurrency(m.profitPerUnit)}</td>
                      <td className="p-4">
                        <div className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold border",
                          isHigh ? "bg-emerald-50 text-emerald-700 border-emerald-200" : 
                          isMed ? "bg-amber-50 text-amber-700 border-amber-200" : 
                          "bg-red-50 text-red-700 border-red-200"
                        )}>
                          {isHigh ? <TrendingUp className="w-3.5 h-3.5"/> : isMed ? <Minus className="w-3.5 h-3.5"/> : <TrendingDown className="w-3.5 h-3.5"/>}
                          {m.profitMarginPercent.toFixed(1)}%
                        </div>
                      </td>
                      <td className="p-4 text-slate-600">{formatCurrency(m.totalRevenue)}</td>
                      <td className="p-4 font-bold text-slate-800 text-right">{formatCurrency(m.totalProfit)}</td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dialog for Add/Edit Form */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200"
          >
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-display font-bold text-xl">{editingId ? 'Edit Product' : 'Add New Product'}</h3>
              <button onClick={() => setIsDialogOpen(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Product Name</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Brand</label>
                  <input required type="text" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Size (e.g. 500ml)</label>
                  <input required type="text" value={formData.size} onChange={e => setFormData({...formData, size: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Purchase Price (₹)</label>
                  <input required type="number" step="0.01" value={formData.purchasePrice} onChange={e => setFormData({...formData, purchasePrice: parseFloat(e.target.value)})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Selling Price (₹)</label>
                  <input required type="number" step="0.01" value={formData.sellingPrice} onChange={e => setFormData({...formData, sellingPrice: parseFloat(e.target.value)})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Initial Stock</label>
                  <input required type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: parseInt(e.target.value)})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Supplier</label>
                  <input required type="text" value={formData.supplier} onChange={e => setFormData({...formData, supplier: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" />
                </div>
              </div>
              
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
                <button type="button" onClick={() => setIsDialogOpen(false)} className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="px-6 py-2 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg shadow-md shadow-primary/20 transition-all disabled:opacity-50">
                  {editingId ? 'Update' : 'Save Product'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
