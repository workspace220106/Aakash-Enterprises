import { useGetDashboardStats, useGetDailySales } from "@workspace/api-client-react";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Banknote, PackageOpen, TrendingUp, AlertTriangle, Star } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { motion } from "framer-motion";
import { Link } from "wouter";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: dailySales, isLoading: salesLoading } = useGetDailySales();

  if (statsLoading || salesLoading) {
    return <div className="flex h-64 items-center justify-center"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  const statCards = [
    { title: "Today's Revenue", value: formatCurrency(stats?.todaySales || 0), icon: Banknote, color: "from-emerald-400 to-emerald-500", shadow: "shadow-emerald-500/20" },
    { title: "Drinks Sold Today", value: formatNumber(stats?.todayDrinksSold || 0), icon: PackageOpen, color: "from-blue-400 to-blue-500", shadow: "shadow-blue-500/20" },
    { title: "Monthly Revenue", value: formatCurrency(stats?.monthlySales || 0), icon: TrendingUp, color: "from-violet-400 to-violet-500", shadow: "shadow-violet-500/20" },
    { title: "Total Stock Remaining", value: formatNumber(stats?.stockRemaining || 0), icon: PackageOpen, color: "from-amber-400 to-amber-500", shadow: "shadow-amber-500/20" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold">Overview</h1>
        <p className="text-muted-foreground mt-1 text-lg">Welcome back to Aakash Enterprises.</p>
      </div>

      {/* Top Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-6 relative overflow-hidden"
          >
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${card.color} opacity-10 rounded-bl-[100px] -z-10`} />
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${card.color} text-white flex items-center justify-center shadow-lg ${card.shadow}`}>
                <card.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">{card.title}</p>
                <h3 className="text-2xl font-display font-bold text-slate-800 mt-0.5">{card.value}</h3>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 glass-panel p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-display font-bold">Revenue Trend (30 Days)</h2>
          </div>
          <div className="h-[300px] w-full">
            {dailySales && dailySales.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailySales} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(val) => `₹${val/1000}k`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                    formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">No sales data yet</div>
            )}
          </div>
        </div>

        {/* Side Panel: Alerts & Star Product */}
        <div className="space-y-6">
          {/* Star Product */}
          {stats?.starProduct && (
            <div className="glass-panel p-6 relative overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
              {/* Star product background styling */}
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-400 rounded-full blur-2xl opacity-20"></div>
              
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
                <h3 className="text-lg font-display font-bold text-amber-900">Star Product</h3>
              </div>
              
              <div className="flex items-start gap-4">
                <img 
                  src={`${import.meta.env.BASE_URL}images/star-badge.png`} 
                  alt="Star Badge" 
                  className="w-16 h-16 drop-shadow-md"
                />
                <div>
                  <h4 className="font-bold text-xl text-slate-800">{stats.starProduct.name}</h4>
                  <p className="text-slate-500 text-sm">{stats.starProduct.brand}</p>
                  <div className="mt-3 bg-white/80 rounded-lg p-3 border border-amber-100 shadow-sm">
                    <p className="text-xs text-slate-500 uppercase font-semibold">Monthly Revenue</p>
                    <p className="text-lg font-bold text-amber-600">{formatCurrency(stats.starProduct.revenue)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Low Stock Alerts */}
          <div className="glass-panel p-6 flex-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-display font-bold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Low Stock Alerts
              </h3>
              <Link href="/products" className="text-sm font-medium text-primary hover:underline">View All</Link>
            </div>
            
            <div className="space-y-3">
              {stats?.lowStockProducts && stats.lowStockProducts.length > 0 ? (
                stats.lowStockProducts.slice(0, 4).map((p) => (
                  <div key={p.id} className="flex justify-between items-center p-3 rounded-xl bg-red-50/50 border border-red-100 hover:bg-red-50 transition-colors">
                    <div>
                      <p className="font-semibold text-slate-800">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.brand}</p>
                    </div>
                    <div className="px-3 py-1 bg-red-100 text-red-700 rounded-full font-bold text-sm">
                      {p.stock} left
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-xl border border-slate-100">
                  Stock levels are healthy!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
