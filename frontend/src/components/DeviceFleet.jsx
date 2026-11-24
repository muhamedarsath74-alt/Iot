import React from "react";
import { Battery, Wifi, ShieldAlert, CheckCircle, Radio, Clock, ArrowUpRight } from "lucide-react";

export function DeviceFleet({ devices, selectedDeviceId, onSelectDevice }) {
  const getStateColor = (state) => {
    switch (state) {
      case "S0_IDLE":
        return "bg-slate-800 text-slate-300 border-slate-700";
      case "S1_HANDSHAKE":
      case "S2_AUTHENTICATING":
        return "bg-cyan-950/80 text-cyan-400 border-cyan-800";
      case "S3_READY":
        return "bg-emerald-950/80 text-emerald-400 border-emerald-800";
      case "S4_STREAMING":
        return "bg-violet-950/80 text-violet-300 border-violet-800 animate-pulse";
      case "S5_PING_WAIT":
        return "bg-amber-950/80 text-amber-400 border-amber-800";
      case "S6_CRITICAL_ALERT":
        return "bg-rose-950/90 text-rose-300 border-rose-700 font-bold";
      case "S_TRAP":
        return "bg-red-950 text-red-400 border-red-700 font-bold animate-bounce";
      default:
        return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  return (
    <div className="bg-[#0f172a]/90 backdrop-blur rounded-2xl border border-slate-800 p-4 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
            <Radio className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-semibold text-sm text-white">Active IoT Fleet</h2>
            <p className="text-xs text-slate-400">
              Live hardware telemetry and finite state automaton tracking
            </p>
          </div>
        </div>
        <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
          {devices.length} registered
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {devices.map((dev) => {
          const isSelected = selectedDeviceId === dev.deviceId;
          const isInTrap = dev.inTrap || dev.currentState === "S_TRAP";

          return (
            <div
              key={dev.deviceId}
              onClick={() => onSelectDevice(dev.deviceId)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
                isSelected
                  ? "bg-slate-800/80 border-cyan-500 shadow-lg shadow-cyan-500/10"
                  : "bg-[#131d31]/70 border-slate-800/80 hover:border-slate-700 hover:bg-[#131d31]"
              }`}
            >
              {/* Trap warning stripe */}
              {isInTrap && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-red-500 animate-pulse" />
              )}

              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        isInTrap
                          ? "bg-rose-500 animate-ping"
                          : dev.isOnline
                          ? "bg-emerald-400"
                          : "bg-slate-500"
                      }`}
                    />
                    <span className="font-mono font-semibold text-xs text-white group-hover:text-cyan-300 transition-colors">
                      {dev.deviceId}
                    </span>
                    <span
                      className={`text-[9px] font-mono uppercase px-1 rounded font-bold ${
                        dev.transport === "TCP"
                          ? "bg-blue-950 text-blue-400 border border-blue-800/60"
                          : "bg-purple-950 text-purple-400 border border-purple-800/60"
                      }`}
                    >
                      {dev.transport}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium truncate max-w-[170px] mt-0.5">
                    {dev.name}
                  </div>
                </div>

                {/* DFA State Pill */}
                <div
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-md border font-semibold ${getStateColor(
                    dev.currentState
                  )}`}
                >
                  {dev.currentState}
                </div>
              </div>

              {/* Socket & Network Metadata */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2.5 font-mono bg-slate-900/60 px-2 py-1 rounded-md border border-slate-800/60">
                <span className="flex items-center gap-1">
                  <Wifi className="h-3 w-3 text-slate-500" />
                  <span>
                    {dev.ip}:{dev.port}
                  </span>
                </span>
                <span className="text-slate-500">{dev.rssi || -65} dBm</span>
              </div>

              {/* Telemetry Sensor Gauges */}
              {dev.latestTelemetry && typeof dev.latestTelemetry === "object" ? (
                <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-mono bg-slate-900/40 p-1.5 rounded-lg border border-slate-800/40 mb-2">
                  <div className="bg-slate-950/60 p-1 rounded">
                    <div className="text-slate-500 text-[9px]">TEMP</div>
                    <div className="text-cyan-400 font-bold">
                      {dev.latestTelemetry.temp}°C
                    </div>
                  </div>
                  <div className="bg-slate-950/60 p-1 rounded">
                    <div className="text-slate-500 text-[9px]">HUM</div>
                    <div className="text-emerald-400 font-bold">
                      {dev.latestTelemetry.humidity}%
                    </div>
                  </div>
                  <div className="bg-slate-950/60 p-1 rounded">
                    <div className="text-slate-500 text-[9px]">BATTERY</div>
                    <div className="text-amber-400 font-bold flex items-center justify-center gap-0.5">
                      <Battery className="h-2.5 w-2.5" />
                      <span>{dev.latestTelemetry.battery}%</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-slate-500 italic mb-2 py-1 text-center">
                  Awaiting Telemetry Packet...
                </div>
              )}

              {/* Footer info */}
              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{dev.totalPacketsReceived || 0} pkts</span>
                </span>
                <span className="flex items-center gap-1 text-cyan-400 font-medium">
                  <span>Inspect Automata</span>
                  <ArrowUpRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
