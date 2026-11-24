import React, { useState } from "react";
import { Wifi, Sliders, Activity, Server, Radio, ShieldCheck, ArrowDownRight } from "lucide-react";

export function NetworkInspector({ linkMetrics, recentPackets }) {
  const [latency, setLatency] = useState(linkMetrics?.config?.baseLatencyMs || 25);
  const [jitter, setJitter] = useState(linkMetrics?.config?.jitterMs || 15);
  const [dropRate, setDropRate] = useState(Math.round((linkMetrics?.config?.dropRate || 0) * 100));

  const latestPacket = recentPackets?.[recentPackets.length - 1];

  const updateNetworkConfig = async (newConfig) => {
    try {
      await fetch("/api/network/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newConfig)
      });
    } catch (err) {
      console.error("Failed to update network link", err);
    }
  };

  const handleLatencyChange = (e) => {
    const val = parseInt(e.target.value, 10);
    setLatency(val);
    updateNetworkConfig({ baseLatencyMs: val });
  };

  const handleJitterChange = (e) => {
    const val = parseInt(e.target.value, 10);
    setJitter(val);
    updateNetworkConfig({ jitterMs: val });
  };

  const handleDropChange = (e) => {
    const val = parseInt(e.target.value, 10);
    setDropRate(val);
    updateNetworkConfig({ dropRate: val / 100 });
  };

  return (
    <div className="bg-[#0f172a]/90 backdrop-blur rounded-2xl border border-slate-800 p-4 lg:p-6 shadow-xl mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
            <Wifi className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">
                Computer Networks (CN) Protocol & Link Inspector
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-800 font-semibold">
                OSI Layers 4 & 7
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Dual TCP/UDP socket servers, packet bitfields, latency jitter, and drop emulation
            </p>
          </div>
        </div>

        {/* Server Status Badges */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-slate-300">TCP :8085</span>
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-slate-300">UDP :8086</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Network Link Quality Sliders */}
        <div className="lg:col-span-5 bg-[#0b1120] rounded-xl border border-slate-800 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-white font-mono flex items-center gap-2">
              <Sliders className="h-4 w-4 text-cyan-400" />
              <span>Link Impairment Emulator</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              Delivery: <span className="text-emerald-400 font-bold">{linkMetrics?.deliveryRatioPercent || 100}%</span>
            </span>
          </div>

          <div className="space-y-4">
            {/* Latency Slider */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-400">Base RTT Latency:</span>
                <span className="text-cyan-400 font-bold">{latency} ms</span>
              </div>
              <input
                type="range"
                min="0"
                max="400"
                step="5"
                value={latency}
                onChange={handleLatencyChange}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
                <span>0ms (LAN)</span>
                <span>200ms (Internet)</span>
                <span>400ms (Satellite)</span>
              </div>
            </div>

            {/* Jitter Slider */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-400">Network Jitter Variance:</span>
                <span className="text-amber-400 font-bold">±{jitter} ms</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="2"
                value={jitter}
                onChange={handleJitterChange}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            {/* Packet Loss Slider */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-400">Packet Drop Rate:</span>
                <span className="text-rose-400 font-bold">{dropRate}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                value={dropRate}
                onChange={handleDropChange}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-400"
              />
              <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
                <span>0% (Lossless)</span>
                <span>25% (Congested)</span>
                <span>50% (Lossy Radio)</span>
              </div>
            </div>
          </div>

          {/* Network Link Counters */}
          <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-slate-800 text-center font-mono">
            <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
              <div className="text-[10px] text-slate-500">TRANSMITTED</div>
              <div className="text-xs font-bold text-slate-200 mt-0.5">
                {linkMetrics?.totalTransmitted || 0}
              </div>
            </div>
            <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
              <div className="text-[10px] text-slate-500">DELIVERED</div>
              <div className="text-xs font-bold text-emerald-400 mt-0.5">
                {linkMetrics?.totalDelivered || 0}
              </div>
            </div>
            <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
              <div className="text-[10px] text-slate-500">DROPPED</div>
              <div className="text-xs font-bold text-rose-400 mt-0.5">
                {linkMetrics?.droppedCount || 0}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Wire Frame Hex / Bitfield Inspector */}
        <div className="lg:col-span-7 bg-[#0b1120] rounded-xl border border-slate-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-white font-mono flex items-center gap-2">
              <Activity className="h-4 w-4 text-violet-400" />
              <span>PDU Wire Frame Byte Inspector</span>
            </h3>
            {latestPacket && (
              <span className="text-[10px] font-mono text-cyan-400">
                Latest: {latestPacket.deviceId} ({latestPacket.packetType})
              </span>
            )}
          </div>

          {latestPacket ? (
            <div className="space-y-3">
              {/* Raw Frame String with Color Syntax */}
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 font-mono text-xs overflow-x-auto break-all">
                <span className="text-slate-500 mr-2">WIRE:</span>
                <span className="text-cyan-400">IOTPDU/v1</span>
                <span className="text-slate-600">|</span>
                <span className="text-blue-400">{latestPacket.transport}</span>
                <span className="text-slate-600">|</span>
                <span className="text-emerald-400">{latestPacket.deviceId}</span>
                <span className="text-slate-600">|</span>
                <span className="text-violet-400 font-bold">{latestPacket.packetType}</span>
                <span className="text-slate-600">|</span>
                <span className="text-amber-400">SEQ:{latestPacket.sequence}</span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-400">
                  PAYLOAD:{JSON.stringify(latestPacket.payload || "NONE")}
                </span>
                <span className="text-slate-600">|</span>
                <span className="text-rose-400">
                  CRC32:{latestPacket.regexValidation?.tokens?.declaredCrc || "---"}
                </span>
              </div>

              {/* Hex Dump Viewer */}
              <div>
                <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                  <span>Hexadecimal Byte Representation:</span>
                  <span>{latestPacket.pduInspection?.totalBytes || 0} bytes</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-900 font-mono text-[11px] text-slate-300 max-h-36 overflow-y-auto leading-relaxed select-all">
                  {latestPacket.pduInspection?.hexDump || "No hex dump available"}
                </div>
              </div>

              {/* Protocol Layer Breakdown */}
              <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
                <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                  <div className="text-slate-500">TRANSPORT (L4)</div>
                  <div className="text-blue-400 font-bold mt-0.5">
                    {latestPacket.transport} Socket
                  </div>
                  <div className="text-slate-500 text-[9px] mt-0.5">
                    Latency: {latestPacket.latency}ms
                  </div>
                </div>

                <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                  <div className="text-slate-500">INTEGRITY (L2/L7)</div>
                  <div className="text-emerald-400 font-bold mt-0.5">
                    CRC32: {latestPacket.regexValidation?.tokens?.declaredCrc || "N/A"}
                  </div>
                  <div className="text-slate-500 text-[9px] mt-0.5">
                    Hash Verified: {latestPacket.regexValidation?.isCrcValid ? "YES" : "NO"}
                  </div>
                </div>

                <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                  <div className="text-slate-500">STATE MACHINE</div>
                  <div className="text-violet-400 font-bold mt-0.5">
                    {latestPacket.dfaValidation?.toState || "EVALUATED"}
                  </div>
                  <div className="text-slate-500 text-[9px] mt-0.5">
                    Accept State: {latestPacket.dfaValidation?.isAcceptState ? "YES" : "NO"}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-slate-500 italic text-xs py-8 text-center">
              Awaiting network packet transmission...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
