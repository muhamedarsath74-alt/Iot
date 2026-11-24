import React, { useState } from "react";
import { Layers, ShieldAlert, CheckCircle, ArrowRight, BookOpen, AlertOctagon, RotateCcw } from "lucide-react";

const DFA_NODES = [
  { id: "S0_IDLE", label: "S0: IDLE", x: 90, y: 180, isAccept: true, isStart: true },
  { id: "S1_HANDSHAKE", label: "S1: SYN", x: 260, y: 90, isAccept: false },
  { id: "S2_AUTHENTICATING", label: "S2: AUTH", x: 440, y: 90, isAccept: false },
  { id: "S3_READY", label: "S3: READY", x: 620, y: 180, isAccept: true },
  { id: "S4_STREAMING", label: "S4: STREAM", x: 480, y: 310, isAccept: true },
  { id: "S5_PING_WAIT", label: "S5: PING", x: 740, y: 310, isAccept: false },
  { id: "S6_CRITICAL_ALERT", label: "S6: ALERT", x: 310, y: 310, isAccept: false },
  { id: "S_TRAP", label: "S_TRAP (SINK)", x: 260, y: 440, isTrap: true }
];

const TRANSITIONS_LIST = [
  { from: "S0_IDLE", to: "S1_HANDSHAKE", symbol: "SYN", curvature: -15 },
  { from: "S1_HANDSHAKE", to: "S2_AUTHENTICATING", symbol: "SYN_ACK", curvature: 0 },
  { from: "S2_AUTHENTICATING", to: "S3_READY", symbol: "AUTH", curvature: 15 },
  { from: "S1_HANDSHAKE", to: "S3_READY", symbol: "AUTH", curvature: -25 },
  { from: "S3_READY", to: "S4_STREAMING", symbol: "DATA", curvature: 20 },
  { from: "S4_STREAMING", to: "S3_READY", symbol: "ACK", curvature: 20 },
  { from: "S3_READY", to: "S5_PING_WAIT", symbol: "PING", curvature: -15 },
  { from: "S5_PING_WAIT", to: "S3_READY", symbol: "PONG", curvature: -15 },
  { from: "S4_STREAMING", to: "S6_CRITICAL_ALERT", symbol: "ALERT", curvature: 10 },
  { from: "S6_CRITICAL_ALERT", to: "S3_READY", symbol: "ACK", curvature: -20 },
  { from: "S3_READY", to: "S0_IDLE", symbol: "DISC", curvature: -40 },
  { from: "S4_STREAMING", to: "S0_IDLE", symbol: "DISC", curvature: 35 },
  { from: "S_TRAP", to: "S0_IDLE", symbol: "RST", curvature: 30 }
];

const ALPHABET = ["SYN", "SYN_ACK", "AUTH", "AUTH_ACK", "DATA", "PING", "PONG", "ACK", "ALERT", "DISC", "RST"];
const STATES_ALL = ["S0_IDLE", "S1_HANDSHAKE", "S2_AUTHENTICATING", "S3_READY", "S4_STREAMING", "S5_PING_WAIT", "S6_CRITICAL_ALERT", "S_TRAP"];

export function DfaVisualizer({ devices, selectedDeviceId, onSelectDevice }) {
  const [showMatrix, setShowMatrix] = useState(false);
  const selectedDevice = devices.find((d) => d.deviceId === selectedDeviceId) || devices[0];
  const currentState = selectedDevice?.currentState || "S0_IDLE";
  const isInTrap = currentState === "S_TRAP" || selectedDevice?.inTrap;

  // Trigger Protocol Reset via API
  const handleResetDevice = async () => {
    if (!selectedDevice) return;
    try {
      await fetch("/api/simulator/attack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attackType: "RESET_RECOVERY",
          targetId: selectedDevice.deviceId
        })
      });
    } catch (err) {
      console.error("Reset error", err);
    }
  };

  return (
    <div className="bg-[#0f172a]/90 backdrop-blur rounded-2xl border border-slate-800 p-4 lg:p-6 shadow-xl mb-6">
      {/* Header & Device Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">
                FLAT Deterministic Finite Automaton (DFA) Visualizer
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-950 text-violet-400 border border-violet-800 font-semibold">
                M = (Q, Σ, δ, q0, F)
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Validates protocol lifecycle and enforces strictly legal state progression
            </p>
          </div>
        </div>

        {/* Selected Device & State Pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400 font-medium">Tracking Device:</label>
            <select
              value={selectedDevice?.deviceId || ""}
              onChange={(e) => onSelectDevice(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
            >
              {devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.deviceId} ({d.currentState})
                </option>
              ))}
            </select>
          </div>

          {isInTrap && (
            <button
              onClick={handleResetDevice}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-500/20 text-red-300 border border-red-500/40 text-xs font-semibold hover:bg-red-500/30 transition-all animate-pulse"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Send RST Symbol</span>
            </button>
          )}

          <button
            onClick={() => setShowMatrix(!showMatrix)}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 font-medium transition-colors"
          >
            {showMatrix ? "Hide Matrix δ" : "View Matrix δ"}
          </button>
        </div>
      </div>

      {/* Trap Banner if device is trapped */}
      {isInTrap && (
        <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800 flex items-center justify-between text-xs text-red-200">
          <div className="flex items-center gap-2">
            <AlertOctagon className="h-4 w-4 text-red-400 flex-shrink-0 animate-bounce" />
            <div>
              <span className="font-bold text-red-400">SECURITY TRAP ENGAGED: </span>
              Device has performed an illegal state transition or sequence replay and was transitioned to absorbing trap state <span className="font-mono font-bold">S_TRAP</span>.
            </div>
          </div>
          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-red-900/60 border border-red-700">
            δ(q_curr, σ) → S_TRAP
          </span>
        </div>
      )}

      {/* Interactive SVG Diagram */}
      <div className="bg-[#0b1120] rounded-xl border border-slate-800 p-4 relative overflow-x-auto">
        <svg
          viewBox="0 0 880 500"
          className="w-full min-w-[750px] h-[380px] select-none"
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="7"
              markerHeight="7"
              refX="6"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 7 3.5, 0 7" fill="#64748b" />
            </marker>
            <marker
              id="arrowhead-active"
              markerWidth="7"
              markerHeight="7"
              refX="6"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 7 3.5, 0 7" fill="#06b6d4" />
            </marker>
            <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-red" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Start Arrow pointing to S0 */}
          <g>
            <path
              d="M 20 180 L 52 180"
              stroke="#06b6d4"
              strokeWidth="2.5"
              markerEnd="url(#arrowhead-active)"
            />
            <text x="22" y="172" fill="#06b6d4" fontSize="10" fontFamily="monospace" fontWeight="bold">
              START
            </text>
          </g>

          {/* Transition Paths */}
          {TRANSITIONS_LIST.map((t, idx) => {
            const fromNode = DFA_NODES.find((n) => n.id === t.from);
            const toNode = DFA_NODES.find((n) => n.id === t.to);
            if (!fromNode || !toNode) return null;

            // Calculate bezier control points
            const midX = (fromNode.x + toNode.x) / 2;
            const midY = (fromNode.y + toNode.y) / 2 + (t.curvature || 0);

            const isRecentlyTraversed =
              selectedDevice?.history?.length > 0 &&
              selectedDevice.history[selectedDevice.history.length - 1].fromState === t.from &&
              selectedDevice.history[selectedDevice.history.length - 1].toState === t.to;

            return (
              <g key={idx}>
                <path
                  d={`M ${fromNode.x} ${fromNode.y} Q ${midX} ${midY} ${toNode.x} ${toNode.y}`}
                  fill="none"
                  stroke={isRecentlyTraversed ? "#06b6d4" : "#334155"}
                  strokeWidth={isRecentlyTraversed ? "2.5" : "1.5"}
                  strokeDasharray={t.to === "S_TRAP" ? "4 4" : "none"}
                  markerEnd={isRecentlyTraversed ? "url(#arrowhead-active)" : "url(#arrowhead)"}
                  className="transition-colors duration-300"
                />
                {/* Symbol label */}
                <rect
                  x={midX - 18}
                  y={midY - 8}
                  width="36"
                  height="16"
                  rx="4"
                  fill="#090d16"
                  stroke={isRecentlyTraversed ? "#06b6d4" : "#1e293b"}
                  strokeWidth="1"
                />
                <text
                  x={midX}
                  y={midY + 4}
                  fill={isRecentlyTraversed ? "#06b6d4" : "#94a3b8"}
                  fontSize="9"
                  fontFamily="monospace"
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  {t.symbol}
                </text>
              </g>
            );
          })}

          {/* Self loop for S4_STREAMING (DATA) */}
          <g>
            <path
              d="M 460 335 C 440 375, 520 375, 500 335"
              fill="none"
              stroke="#334155"
              strokeWidth="1.5"
              markerEnd="url(#arrowhead)"
            />
            <rect x="462" y="370" width="36" height="15" rx="3" fill="#090d16" stroke="#1e293b" />
            <text x="480" y="381" fill="#94a3b8" fontSize="9" fontFamily="monospace" textAnchor="middle">
              DATA
            </text>
          </g>

          {/* State Nodes */}
          {DFA_NODES.map((node) => {
            const isActive = currentState === node.id;
            const isTrap = node.isTrap;

            let fillColor = "#0f172a";
            let strokeColor = "#334155";
            let textColor = "#94a3b8";

            if (isActive) {
              if (isTrap) {
                fillColor = "#450a0a";
                strokeColor = "#f43f5e";
                textColor = "#fecdd3";
              } else {
                fillColor = "#083344";
                strokeColor = "#06b6d4";
                textColor = "#a5f3fc";
              }
            } else if (isTrap) {
              strokeColor = "#7f1d1d";
              textColor = "#f87171";
            }

            return (
              <g
                key={node.id}
                className="cursor-pointer"
                filter={isActive ? (isTrap ? "url(#glow-red)" : "url(#glow-cyan)") : undefined}
              >
                {/* Outer accept ring if accept state */}
                {node.isAccept && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="37"
                    fill="none"
                    stroke={isActive ? strokeColor : "#475569"}
                    strokeWidth="1.5"
                  />
                )}

                {/* Main State Circle */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="32"
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={isActive ? "2.5" : "1.5"}
                />

                {/* State Label */}
                <text
                  x={node.x}
                  y={node.y + 4}
                  fill={textColor}
                  fontSize="11"
                  fontFamily="monospace"
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  {node.label}
                </text>

                {/* Active Indicator Pulse Ring */}
                {isActive && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="43"
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="1"
                    className={isTrap ? "animate-glow-red" : "animate-glow-cyan"}
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 mt-2 pt-2 border-t border-slate-800/80 px-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full border border-cyan-400 bg-cyan-950 inline-block" />
              <span>Active State ({currentState})</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full border-2 border-slate-400 inline-block" />
              <span>Accept States (F = S0, S3, S4)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full border border-red-500 bg-red-950 inline-block" />
              <span>Absorbing Trap State (S_TRAP)</span>
            </span>
          </div>
          <span className="text-slate-500">
            Click nodes to trace transitions • Live reactive execution
          </span>
        </div>
      </div>

      {/* State Transition Table Matrix (Toggleable) */}
      {showMatrix && (
        <div className="mt-4 p-4 rounded-xl bg-slate-900 border border-slate-800 overflow-x-auto">
          <h3 className="text-xs font-bold text-white mb-2 font-mono flex items-center gap-2">
            <span>Formal State Transition Matrix δ(Q, Σ)</span>
            <span className="text-slate-500 font-normal">| 8 States × 11 Alphabet Symbols</span>
          </h3>
          <table className="w-full text-left font-mono text-[11px] border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <th className="p-2 border-r border-slate-800">State Q \ Symbol Σ</th>
                {ALPHABET.map((sym) => (
                  <th key={sym} className="p-2 text-center text-cyan-400">
                    {sym}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {STATES_ALL.map((st) => (
                <tr
                  key={st}
                  className={`border-b border-slate-800/60 ${
                    st === currentState ? "bg-cyan-950/20" : ""
                  }`}
                >
                  <td className="p-2 font-semibold text-slate-300 border-r border-slate-800 whitespace-nowrap">
                    {st}
                  </td>
                  {ALPHABET.map((sym) => {
                    const trans = TRANSITIONS_LIST.find((t) => t.from === st && t.symbol === sym);
                    const target = trans ? trans.to : "S_TRAP";
                    const isTrap = target === "S_TRAP";
                    return (
                      <td
                        key={sym}
                        className={`p-1.5 text-center ${
                          isTrap
                            ? "text-red-400/50 bg-red-950/10"
                            : "text-emerald-400 font-semibold bg-emerald-950/10"
                        }`}
                      >
                        {target}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recent Automata Transitions Log for Selected Device */}
      <div className="mt-4 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-300 font-mono">
            Automata Execution Audit Log for {selectedDevice?.deviceId}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            Total Steps: {selectedDevice?.stepCount || selectedDevice?.history?.length || 0}
          </span>
        </div>
        <div className="space-y-1.5 max-h-36 overflow-y-auto font-mono text-[11px]">
          {selectedDevice?.history?.length > 0 ? (
            selectedDevice.history
              .slice(-6)
              .reverse()
              .map((h, i) => (
                <div
                  key={i}
                  className={`p-2 rounded-lg border flex items-center justify-between ${
                    h.isValidTransition
                      ? "bg-slate-950/80 border-slate-800 text-slate-300"
                      : "bg-red-950/40 border-red-900 text-red-300 font-semibold"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-[10px]">#{h.step}</span>
                    <span className="text-cyan-400">{h.fromState}</span>
                    <span className="text-slate-500">──({h.symbol})──▶</span>
                    <span
                      className={
                        h.toState === "S_TRAP" ? "text-red-400 font-bold" : "text-emerald-400"
                      }
                    >
                      {h.toState}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 max-w-sm truncate">
                    {h.formalExplanation}
                  </span>
                </div>
              ))
          ) : (
            <div className="text-slate-500 italic text-xs py-2 text-center">
              Awaiting first state transition...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
