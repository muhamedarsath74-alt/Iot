import React from "react";
import { Activity, ShieldCheck, Cpu, Wifi, RefreshCw, Play, Square, Layers } from "lucide-react";

export function Navbar({ isConnected, metrics, onReset, activeTab, setActiveTab }) {
  const [isSimRunning, setIsSimRunning] = React.useState(true);

  const toggleSimulation = async () => {
    const action = isSimRunning ? "STOP" : "START";
    try {
      await fetch("/api/simulator/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      setIsSimRunning(!isSimRunning);
    } catch (err) {
      console.error("Simulation toggle error", err);
    }
  };

  const navTabs = [
    { id: "overview", label: "Fleet & Streams", icon: Cpu },
    { id: "dfa", label: "Automata (FLAT)", icon: Layers },
    { id: "regex", label: "Regex Engine", icon: ShieldCheck },
    { id: "network", label: "CN Inspector", icon: Wifi },
    { id: "alerts", label: `Alerts (${metrics?.regexErrors + metrics?.dfaViolations || 0})`, icon: Activity }
  ];

  return (
    <header className="bg-[#0b1120]/90 backdrop-blur border-b border-slate-800 sticky top-0 z-50 px-4 lg:px-6 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand & Academic Badges */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Cpu className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg tracking-tight text-white">IoT Sentinel</h1>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 font-semibold">
                v2.1
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <span>Communication Monitoring & Validation System</span>
              <span className="text-slate-600">•</span>
              <span className="text-cyan-400 font-medium">CN</span>
              <span className="text-slate-600">/</span>
              <span className="text-emerald-400 font-medium">FSWD</span>
              <span className="text-slate-600">/</span>
              <span className="text-violet-400 font-medium">FLAT</span>
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex items-center gap-1 bg-[#131d31] p-1 rounded-xl border border-slate-800 text-sm overflow-x-auto max-w-full">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-all text-xs whitespace-nowrap ${
                  isActive
                    ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? "text-cyan-400" : "text-slate-400"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Controls & Connection Status */}
        <div className="flex items-center gap-2">
          {/* Live WS Status */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            <span
              className={`h-2 w-2 rounded-full ${
                isConnected ? "bg-emerald-400 animate-ping" : "bg-rose-500"
              }`}
            />
            <span className="text-slate-300 font-mono">
              {isConnected ? "SOCKET LIVE" : "DISCONNECTED"}
            </span>
          </div>

          {/* Simulator Toggle */}
          <button
            onClick={toggleSimulation}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              isSimRunning
                ? "bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20"
                : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
            }`}
          >
            {isSimRunning ? (
              <>
                <Square className="h-3.5 w-3.5 fill-current" />
                <span>Pause Fleet</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Resume Fleet</span>
              </>
            )}
          </button>

          {/* Reset Button */}
          <button
            onClick={onReset}
            title="Reset Automata and Memory"
            className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
