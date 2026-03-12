import { useState } from "react";
import { Calculator, X, Delete } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export function CalculatorWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [display, setDisplay] = useState("0");
  const [equation, setEquation] = useState("");

  const handleNum = (num: string) => {
    if (display === "0" || display === "Error") setDisplay(num);
    else setDisplay(display + num);
  };

  const handleOp = (op: string) => {
    setEquation(display + " " + op + " ");
    setDisplay("0");
  };

  const calculate = () => {
    try {
      // Basic safe eval equivalent for simple calculator
      const fullEq = equation + display;
      const sanitized = fullEq.replace(/[^-()\d/*+.]/g, '');
      const result = new Function('return ' + sanitized)();
      setDisplay(String(Number(result.toFixed(4))));
      setEquation("");
    } catch (e) {
      setDisplay("Error");
      setEquation("");
    }
  };

  const clear = () => {
    setDisplay("0");
    setEquation("");
  };

  const backspace = () => {
    if (display.length > 1) setDisplay(display.slice(0, -1));
    else setDisplay("0");
  };

  const btnClass = "h-12 rounded-xl font-display font-semibold text-lg hover:bg-slate-100 active:scale-95 transition-all bg-white border border-slate-200 shadow-sm text-slate-700";
  const opClass = "h-12 rounded-xl font-display font-semibold text-lg bg-primary/10 text-primary hover:bg-primary/20 active:scale-95 transition-all border border-primary/20 shadow-sm";

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="mb-4 w-72 glass-panel p-5 shadow-2xl shadow-primary/10 border-white/60"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display font-bold text-slate-700 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-primary" /> Calculator
              </h3>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 text-right overflow-hidden shadow-inner">
              <div className="text-xs text-slate-400 h-4 mb-1 font-mono tracking-wider">{equation}</div>
              <div className="text-3xl font-display font-bold text-slate-800 truncate">{display}</div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <button onClick={clear} className={cn(btnClass, "col-span-2 text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 border-red-100")}>AC</button>
              <button onClick={backspace} className={cn(btnClass, "flex justify-center items-center")}><Delete className="w-5 h-5"/></button>
              <button onClick={() => handleOp("/")} className={opClass}>÷</button>

              <button onClick={() => handleNum("7")} className={btnClass}>7</button>
              <button onClick={() => handleNum("8")} className={btnClass}>8</button>
              <button onClick={() => handleNum("9")} className={btnClass}>9</button>
              <button onClick={() => handleOp("*")} className={opClass}>×</button>

              <button onClick={() => handleNum("4")} className={btnClass}>4</button>
              <button onClick={() => handleNum("5")} className={btnClass}>5</button>
              <button onClick={() => handleNum("6")} className={btnClass}>6</button>
              <button onClick={() => handleOp("-")} className={opClass}>-</button>

              <button onClick={() => handleNum("1")} className={btnClass}>1</button>
              <button onClick={() => handleNum("2")} className={btnClass}>2</button>
              <button onClick={() => handleNum("3")} className={btnClass}>3</button>
              <button onClick={() => handleOp("+")} className={opClass}>+</button>

              <button onClick={() => handleNum("0")} className={cn(btnClass, "col-span-2")}>0</button>
              <button onClick={() => handleNum(".")} className={btnClass}>.</button>
              <button onClick={calculate} className="h-12 rounded-xl font-display font-bold text-xl bg-gradient-to-r from-primary to-primary/80 text-white hover:shadow-lg hover:shadow-primary/30 active:scale-95 transition-all shadow-md">=</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-full flex items-center justify-center shadow-xl shadow-primary/20 transition-all duration-300 hover:scale-110 active:scale-95",
          isOpen ? "bg-white text-slate-700 border border-slate-200" : "bg-gradient-to-br from-primary to-primary/80 text-white"
        )}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Calculator className="w-6 h-6" />}
      </button>
    </div>
  );
}
