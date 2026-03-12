import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  History, 
  BarChart3,
  Droplets
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pos", label: "Quick Billing", icon: ShoppingCart },
  { href: "/products", label: "Inventory & Profits", icon: Package },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/sales", label: "Sales History", icon: History },
  { href: "/reports", label: "Reports & Analytics", icon: BarChart3 },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-72 hidden lg:flex flex-col h-screen fixed top-0 left-0 p-6 z-20">
      <div className="glass-panel w-full h-full flex flex-col pt-8 pb-6 px-4">
        
        {/* Logo Area */}
        <div className="flex items-center gap-3 px-4 mb-10">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20 text-white">
            <Droplets className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-display font-black leading-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
              Aakash
            </h1>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Enterprises</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            
            return (
              <Link key={item.href} href={item.href} className="block relative">
                <div className={cn(
                  "flex items-center gap-4 px-4 py-3.5 rounded-xl font-medium transition-all duration-200 group z-10 relative",
                  isActive 
                    ? "text-primary" 
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/50"
                )}>
                  {isActive && (
                    <motion.div 
                      layoutId="sidebar-active"
                      className="absolute inset-0 bg-primary/10 rounded-xl z-0"
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <item.icon className={cn(
                    "w-5 h-5 z-10 transition-colors", 
                    isActive ? "text-primary" : "text-slate-400 group-hover:text-slate-600"
                  )} />
                  <span className="z-10">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Status */}
        <div className="mt-auto px-4">
          <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100/50 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-slate-600">System Online</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
