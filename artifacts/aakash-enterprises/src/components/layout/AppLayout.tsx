import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { CalculatorWidget } from "../CalculatorWidget";
import { motion } from "framer-motion";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background relative flex">
      {/* Abstract Background Decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <img 
          src={`${import.meta.env.BASE_URL}images/bg-blobs.png`} 
          alt="" 
          className="absolute -top-[20%] -right-[10%] w-[80%] opacity-30 object-cover mix-blend-multiply blur-3xl animate-pulse duration-[10000ms]"
        />
        <div className="absolute -bottom-[20%] -left-[10%] w-[60%] h-[60%] bg-accent/20 rounded-full blur-[120px] mix-blend-multiply" />
      </div>

      <Sidebar />
      
      <main className="flex-1 lg:ml-72 min-h-screen p-4 sm:p-6 lg:p-8 pt-8 relative z-10">
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
