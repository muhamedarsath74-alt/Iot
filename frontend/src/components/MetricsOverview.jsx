import React from "react";
import { Cpu, Zap, CheckCircle2, AlertTriangle, ShieldAlert, Wifi } from "lucide-react";

export function MetricsOverview({ metrics, linkMetrics }) {
  const cards = [
    {
      title: "Connected IoT Fleet",
      value: `${metrics?.onlineDevices || 0} / ${metrics?.totalDevices || 0}`,
      subtext: `${metrics?.trapDevices || 0} trapped in S_TRAP`,
      icon: Cpu,
      color: "cyan",
      badge: `${metrics?.totalDevices || 0} Nodes`
    },
    {
      title: "Network Throughput",
      value: `${metrics?.packetsPerSecond || 0} pkt/s`,
      subtext: `${(metrics?.totalPackets || 0).toLocaleString()} total received`,
      icon: Zap,
      color: "violet",
      badge: "Real-Time"
    },
    {
      title: "Validation Pass Rate",
      value: `${metrics?.passRatePercent ?? 100}%`,
      subtext: `${(metrics?.validPackets || 0).toLocaleString()} conforming frames`,
      icon: CheckCircle2,
      color: "emerald",
      badge: "Grammar OK"
    },
    {
      title: "Regex Format Errors",
      value: metrics?.regexErrors || 0,
      subtext: "Lexical & CRC32 mismatches",
      icon: AlertTriangle,
      color: "amber",
      badge: "FLAT Lexical"
    },
    {
      title: "Automata Violations",
      value: metrics?.dfaViolations || 0,
      subtext: "Invalid state seq & replay traps",
      icon: ShieldAlert,
      color: "rose",
      badge: "FLAT Automata"
    },
    {
      title: "Link Latency & Loss",
      value: `${linkMetrics?.averageLatency || 25} ms`,
      subtext: `${linkMetrics?.droppedCount || 0} dropped (${(100 - (linkMetrics?.deliveryRatioPercent || 100)).toFixed(1)}% loss)`,
      icon: Wifi,
      color: "blue",
      badge: "CN Transport"
    }
  ];

  const colorStyles = {
    cyan: {
      border: "border-cyan-500/20 hover:border-cyan-500/40",
      bg: "bg-cyan-500/10",
      text: "text-cyan-400",
      badgeBg: "bg-cyan-950/60 text-cyan-400 border-cyan-800/40"
    },
    violet: {
      border: "border-violet-500/20 hover:border-violet-500/40",
      bg: "bg-violet-500/10",
      text: "text-violet-400",
      badgeBg: "bg-violet-950/60 text-violet-400 border-violet-800/40"
    },
    emerald: {
      border: "border-emerald-500/20 hover:border-emerald-500/40",
      bg: "bg-emerald-500/10",
      text: "text-emerald-400",
      badgeBg: "bg-emerald-950/60 text-emerald-400 border-emerald-800/40"
    },
    amber: {
      border: "border-amber-500/20 hover:border-amber-500/40",
      bg: "bg-amber-500/10",
      text: "text-amber-400",
      badgeBg: "bg-amber-950/60 text-amber-400 border-amber-800/40"
    },
    rose: {
      border: "border-rose-500/20 hover:border-rose-500/40",
      bg: "bg-rose-500/10",
      text: "text-rose-400",
      badgeBg: "bg-rose-950/60 text-rose-400 border-rose-800/40"
    },
    blue: {
      border: "border-blue-500/20 hover:border-blue-500/40",
      bg: "bg-blue-500/10",
      text: "text-blue-400",
      badgeBg: "bg-blue-950/60 text-blue-400 border-blue-800/40"
    }
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
      {cards.map((c, i) => {
        const Icon = c.icon;
        const style = colorStyles[c.color];
        return (
          <div
            key={i}
            className={`p-3.5 rounded-xl bg-[#0f172a]/90 backdrop-blur border transition-all shadow-md ${style.border}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`p-1.5 rounded-lg ${style.bg}`}>
                <Icon className={`h-4 w-4 ${style.text}`} />
              </span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded border font-semibold ${style.badgeBg}`}
              >
                {c.badge}
              </span>
            </div>
            <div className="text-xl font-bold font-mono tracking-tight text-white mb-0.5">
              {c.value}
            </div>
            <div className="text-xs font-medium text-slate-300 truncate">{c.title}</div>
            <div className="text-[11px] text-slate-500 truncate mt-0.5">{c.subtext}</div>
          </div>
        );
      })}
    </div>
  );
}
