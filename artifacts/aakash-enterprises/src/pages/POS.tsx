import { useState, useEffect, useRef } from "react";
import { 
  useGetProducts, 
  useGetCustomers, 
  useCreateSale, 
  getGetProductsQueryKey, 
  getGetDashboardStatsQueryKey, 
  getGetDailySalesQueryKey,
  getGetMonthlySalesQueryKey,
  getGetTopProductsQueryKey,
  getGetSalesQueryKey,
  getGetProfitMarginsQueryKey,
  type SaleWithDetails 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency, cn } from "@/lib/utils";
import { Search, ShoppingBag, Trash2, Plus, Minus, UserCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ReceiptDialog } from "@/components/ReceiptDialog";

export default function POS() {
  const [search, setSearch] = useState("");
  const { data: products } = useGetProducts({ search });
  const { data: customers } = useGetCustomers();
  
  const queryClient = useQueryClient();
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState<SaleWithDetails | null>(null);
  const [activeTab, setActiveTab] = useState<"products" | "cart">("products");

  const createSaleMutation = useCreateSale({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getGetProductsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDailySalesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMonthlySalesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetTopProductsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetSalesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetProfitMarginsQueryKey() });
        setCart([]);
        setSelectedCustomer("");
        setLastSale(data);
        setShowReceipt(true);
      }
    }
  });

  const [cart, setCart] = useState<Array<{id: number, name: string, price: number, quantity: number}>>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");

  const addToCart = (product: any) => {
    if (product.stock <= 0) return alert("Out of stock!");
    
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) return alert("Not enough stock!");
      setCart(cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { id: product.id, name: product.name, price: product.sellingPrice, quantity: 1 }]);
    }
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQ = item.quantity + delta;
        return newQ > 0 ? { ...item, quantity: newQ } : item;
      }
      return item;
    }));
  };

  const updatePrice = (id: number, newPrice: number) => {
    setCart(cart.map(item => item.id === id ? { ...item, price: newPrice } : item));
  };

  const removeFromCart = (id: number) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const [customTotalStr, setCustomTotalStr] = useState<string>("");
  // Use a ref so handleGenerateBill always reads the CURRENT value, never stale
  const customTotalRef = useRef<string>("");

  // Sync ref whenever state changes
  useEffect(() => {
    customTotalRef.current = customTotalStr;
  });

  // Reset when cart is cleared
  useEffect(() => {
    if (cart.length === 0) {
      setCustomTotalStr("");
      customTotalRef.current = "";
    }
  }, [cart.length]);

  const handleGenerateBill = () => {
    if (cart.length === 0) return;
    // Read from ref to get truly current value (avoids stale closure)
    const typedStr = customTotalRef.current.trim();
    const parsed = parseFloat(typedStr);
    const finalTotal = typedStr !== "" && !isNaN(parsed) ? parsed : total;
    console.log("[POS] generating bill, typedStr:", typedStr, "finalTotal:", finalTotal, "calculatedTotal:", total);
    createSaleMutation.mutate({
      data: {
        customerId: selectedCustomer ? parseInt(selectedCustomer) : null,
        items: cart.map(c => ({ productId: c.id, quantity: c.quantity, price: c.price })),
        total: finalTotal
      }
    });
  };

  return (
    <div className="h-auto lg:h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-6 relative">
      
      {/* Mobile Tab Toggle */}
      <div className="lg:hidden flex p-1 bg-slate-100/80 backdrop-blur-sm rounded-xl w-full border border-slate-200 shrink-0 mb-2">
        <button 
          onClick={() => setActiveTab("products")}
          className={cn(
            "flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all cursor-pointer flex items-center justify-center gap-2", 
            activeTab === "products" 
              ? "bg-white text-slate-900 shadow-sm" 
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          Products ({products?.length || 0})
        </button>
        <button 
          onClick={() => setActiveTab("cart")}
          className={cn(
            "flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all cursor-pointer flex items-center justify-center gap-2", 
            activeTab === "cart" 
              ? "bg-white text-primary shadow-sm" 
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          Current Bill ({cart.reduce((sum, item) => sum + item.quantity, 0)})
        </button>
      </div>

      {/* Left Panel: Product Selection */}
      <div className={cn(
        "flex-1 flex flex-col gap-4 min-h-0",
        activeTab === "products" ? "flex" : "hidden lg:flex"
      )}>
        <div className="glass-panel p-4 flex gap-4 items-center shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search drinks to add..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white/50 focus:bg-white shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-lg transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 pb-4">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {products?.map((p) => (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                key={p.id}
                onClick={() => addToCart(p)}
                disabled={p.stock <= 0}
                className={cn(
                  "glass-card p-4 text-left flex flex-col h-full border-b-4",
                  p.stock > 0 ? "border-b-primary hover:border-b-secondary cursor-pointer" : "border-b-slate-300 opacity-60 cursor-not-allowed grayscale"
                )}
              >
                <h3 className="font-bold text-slate-800 line-clamp-1">{p.name}</h3>
                <p className="text-xs text-slate-500 mb-3">{p.brand} • {p.size}</p>
                
                <div className="mt-auto flex justify-between items-end">
                  <p className="text-lg font-display font-black text-primary">{formatCurrency(p.sellingPrice)}</p>
                  <p className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">{p.stock} left</p>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel: Current Bill */}
      <div className={cn(
        "w-full lg:w-[400px] shrink-0 flex flex-col h-[600px] lg:h-full glass-panel overflow-hidden border-t-8 border-t-primary shadow-2xl",
        activeTab === "cart" ? "flex" : "hidden lg:flex"
      )}>
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-display font-bold flex items-center gap-2 text-slate-800">
              <ShoppingBag className="text-primary" /> Current Bill
            </h2>
            <button 
              onClick={() => setActiveTab("products")}
              className="lg:hidden text-xs font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-all cursor-pointer"
            >
              + Add Items
            </button>
          </div>
          
          <div className="mt-4 flex items-center gap-2">
            <UserCircle className="w-5 h-5 text-slate-400" />
            <select 
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            >
              <option value="">Walk-in Customer</option>
              {customers?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <AnimatePresence>
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                <ShoppingBag className="w-16 h-16 mb-4 opacity-20" />
                <p>Cart is empty. Tap products to add.</p>
              </div>
            ) : (
              <div className="space-y-2 p-3">
                {cart.map(item => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20, scale: 0.9 }}
                    key={item.id} 
                    className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{item.name}</p>
                      <div className="flex items-center gap-1 mt-1 group">
                        <span className="text-xs font-semibold text-slate-400 group-focus-within:text-primary transition-colors">₹</span>
                        <input
                          type="number"
                          step="any"
                          value={item.price || ""}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            updatePrice(item.id, isNaN(val) ? 0 : val);
                          }}
                          className="w-20 text-sm font-bold text-primary bg-slate-50/50 hover:bg-slate-100/70 focus:bg-white border border-slate-200/50 focus:border-primary/50 rounded-md px-1.5 py-0.5 outline-none transition-all focus:ring-2 focus:ring-primary/10"
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-1 border border-slate-200">
                      <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-white rounded shadow-sm text-slate-600 cursor-pointer"><Minus className="w-3 h-3"/></button>
                      <span className="w-6 text-center font-bold text-sm">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-white rounded shadow-sm text-slate-600 cursor-pointer"><Plus className="w-3 h-3"/></button>
                    </div>
                    
                    <button onClick={() => removeFromCart(item.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-1 cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-5 bg-slate-50 border-t border-slate-200">
          <div className="flex justify-between items-center mb-4">
            <span className="text-slate-500 font-medium">Total Amount</span>
            <div className="flex items-center gap-1 border-b-2 border-dashed border-slate-300 focus-within:border-primary transition-colors">
              <span className="text-xl font-bold text-slate-400">₹</span>
              <input
                type="text"
                inputMode="decimal"
                value={customTotalStr}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.]/g, "");
                  setCustomTotalStr(val);
                  customTotalRef.current = val;
                }}
                placeholder={total > 0 ? String(total) : "0"}
                className="w-32 text-right text-3xl font-display font-black text-slate-800 bg-transparent outline-none border-none py-1"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => setCart([])}
              className="py-3 rounded-xl font-bold text-red-600 bg-red-100 hover:bg-red-200 transition-colors cursor-pointer"
            >
              Clear
            </button>
            <button 
              onClick={handleGenerateBill}
              disabled={cart.length === 0 || createSaleMutation.isPending}
              className="py-3 rounded-xl font-bold text-white bg-gradient-to-r from-primary to-primary/80 hover:shadow-lg hover:shadow-primary/30 disabled:opacity-50 disabled:shadow-none transition-all cursor-pointer"
            >
              {createSaleMutation.isPending ? "Processing..." : "Generate Bill"}
            </button>
          </div>
        </div>
      </div>

      {/* Floating Checkout Button on Mobile */}
      {activeTab === "products" && cart.length > 0 && (
        <div className="lg:hidden fixed bottom-6 right-6 z-30">
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab("cart")}
            className="flex items-center gap-2 px-5 py-4 bg-gradient-to-r from-primary to-primary/80 text-white rounded-full font-bold shadow-xl shadow-primary/35 border border-primary/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <ShoppingBag className="w-5 h-5" />
            <span>View Cart ({cart.reduce((sum, item) => sum + item.quantity, 0)}) • {formatCurrency(total)}</span>
          </motion.button>
        </div>
      )}
      
      <ReceiptDialog 
        open={showReceipt} 
        onOpenChange={setShowReceipt} 
        sale={lastSale}
      />
    </div>
  );
}
