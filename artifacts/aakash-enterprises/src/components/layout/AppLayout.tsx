import { ReactNode, useState } from "react";
import { Sidebar, SidebarContent } from "./Sidebar";
import { CalculatorWidget } from "../CalculatorWidget";
import { motion } from "framer-motion";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Droplets } from "lucide-react";

export function AppLayout({ children }: { children: ReactNode }) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background relative flex flex-col lg:flex-row">
      {/* Abstract Background Decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <img 
          src={`${import.meta.env.BASE_URL}images/bg-blobs.png`} 
          alt="" 
          className="absolute -top-[20%] -right-[10%] w-[80%] opacity-30 object-cover mix-blend-multiply blur-3xl animate-pulse duration-[10000ms]"
        />
        <div className="absolute -bottom-[20%] -left-[10%] w-[60%] h-[60%] bg-accent/20 rounded-full blur-[120px] mix-blend-multiply" />
      </div>

      {/* Mobile Sticky Header */}
      <header className="lg:hidden flex items-center justify-between p-4 border-b border-slate-100 bg-white/85 backdrop-blur-md sticky top-0 z-30 w-full shrink-0 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white shadow-md">
            <Droplets className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-md font-display font-black leading-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
              Aakash
            </h1>
            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Enterprises</p>
          </div>
        </div>

        <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
          <SheetTrigger asChild>
            <button className="p-2 hover:bg-slate-50 active:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer">
              <Menu className="w-6 h-6" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 bg-white border-r-0 shadow-2xl">
            <SidebarContent onItemClick={() => setIsMobileNavOpen(false)} />
          </SheetContent>
        </Sheet>
      </header>

      {/* Desktop Sidebar (hidden on mobile) */}
      <Sidebar />
      
      {/* Main Content Area */}
      <main className="flex-1 lg:ml-72 min-h-screen p-4 sm:p-6 lg:p-8 pt-6 lg:pt-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="max-w-7xl mx-auto w-full pb-24"
        >
          {children}
        </motion.div>
      </main>

      <CalculatorWidget />
    </div>
  );
}
