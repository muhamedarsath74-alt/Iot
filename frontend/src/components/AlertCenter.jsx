import React, { useState } from "react";
import { AlertTriangle, ShieldAlert, Info, Bell, Trash2, ArrowUpRight } from "lucide-react";

export function AlertCenter({ alerts, onSelectDevice }) {
  const [filterSeverity, setFilterSeverity] = useState("ALL");

  const filteredAlerts = alerts.filter((a) => {
    if (filterSeverity === "ALL") return true;
    return a.severity === filterSeverity;
  });

  return (
    <div className="bg-[#0f172a]/90 backdrop-blur rounded-2xl border border-slate-800 p-4 lg:p-6 shadow-xl mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">
                Validation & Security Incident Log
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-950 text-rose-400 border border-rose-800 font-semibold">
                {filteredAlerts.length} Active Events
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Real-time audit log of regex syntax rejections and automata sequence traps
            </p>
          </div>
        </div>

        {/* Severity Filters */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs font-mono">
          {["ALL", "CRITICAL", "WARNING", "INFO"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterSeverity(s)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-colors ${
                filterSeverity === s
                  ? s === "CRITICAL"
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                    : s === "WARNING"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
        {filteredAlerts.length > 0 ? (
          filteredAlerts.map((alert) => {
            const isCritical = alert.severity === "CRITICAL";
            const isWarning = alert.severity === "WARNING";

            return (
              <div
                key={alert.id}
                className={`p-4 rounded-xl border font-mono text-xs transition-all ${
                  isCritical
                    ? "bg-rose-950/20 border-rose-800/60 hover:bg-rose-950/30"
                    : isWarning
                    ? "bg-amber-950/20 border-amber-800/60 hover:bg-amber-950/30"
                    : "bg-blue-950/20 border-blue-800/60 hover:bg-blue-950/30"
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    {isCritical ? (
                      <ShieldAlert className="h-4 w-4 text-rose-400 flex-shrink-0" />
                    ) : isWarning ? (
                      <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" />
                    ) : (
                      <Info className="h-4 w-4 text-blue-400 flex-shrink-0" />
                    )}
                    <span className="font-bold text-white text-xs">{alert.title}</span>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                        isCritical
                          ? "bg-rose-900/60 text-rose-300 border border-rose-700"
                          : isWarning
                          ? "bg-amber-900/60 text-amber-300 border border-amber-700"
                          : "bg-blue-900/60 text-blue-300 border border-blue-700"
                      }`}
                    >
                      {alert.severity}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                <div className="text-slate-300 text-xs mb-2.5 font-sans">
                  {alert.description}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-[11px] text-slate-400">
                  <div className="flex items-center gap-3">
                    <span>
                      Device:{" "}
                      <button
                        onClick={() => onSelectDevice(alert.deviceId)}
                        className="text-cyan-400 font-bold hover:underline"
                      >
                        {alert.deviceId}
                      </button>
                    </span>
                    {alert.packetType && (
                      <span>
                        Packet: <span className="text-violet-400">{alert.packetType}</span>
                      </span>
                    )}
                    {alert.sequence && (
                      <span>
                        Seq: <span className="text-amber-400">{alert.sequence}</span>
                      </span>
                    )}
                  </div>

                  {alert.formalGrammarRef && (
                    <div className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-400 text-[10px]">
                      Rule Ref:{" "}
                      <span className="text-slate-200 font-bold">
                        {alert.formalGrammarRef}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 text-slate-500 font-mono text-xs">
            No active validation alerts. All incoming packets are conforming.
          </div>
        )}
      </div>
    </div>
  );
}
