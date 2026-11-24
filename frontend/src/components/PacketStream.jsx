import React, { useState } from "react";
import { ListFilter, Search, CheckCircle, AlertTriangle, ShieldAlert, X, Eye, FileText } from "lucide-react";

export function PacketStream({ packets, onSelectDevice }) {
  const [filterType, setFilterType] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [inspectedPacket, setInspectedPacket] = useState(null);

  const filteredPackets = packets.filter((p) => {
    // Search match
    const matchesSearch =
      !searchTerm ||
      p.deviceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.packetType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.raw && p.raw.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    // Category filter
    if (filterType === "VALID") return p.isValid;
    if (filterType === "REGEX_FAIL") return p.regexValidation && !p.regexValidation.isValid;
    if (filterType === "DFA_FAIL") return p.dfaValidation && !p.dfaValidation.isValidTransition;

    return true;
  });

  return (
    <div className="bg-[#0f172a]/90 backdrop-blur rounded-2xl border border-slate-800 p-4 shadow-xl">
      {/* Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
        <div>
          <h2 className="font-semibold text-sm text-white flex items-center gap-2">
            <span>Real-Time Packet Stream & Message History</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
              {filteredPackets.length} frames
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            Live wire stream with inline regex syntax and automata validation auditing
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search Bar */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by device or payload..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono w-48"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs font-mono">
            {["ALL", "VALID", "REGEX_FAIL", "DFA_FAIL"].map((f) => (
              <button
                key={f}
                onClick={() => setFilterType(f)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors ${
                  filterType === f
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Packet Table */}
      <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
        <table className="w-full text-left font-mono text-xs border-collapse">
          <thead className="sticky top-0 bg-[#0b1120] text-slate-400 border-b border-slate-800 z-10">
            <tr>
              <th className="p-2.5">Time</th>
              <th className="p-2.5">Device ID</th>
              <th className="p-2.5">Transport</th>
              <th className="p-2.5">Type</th>
              <th className="p-2.5">Seq #</th>
              <th className="p-2.5">Payload Preview</th>
              <th className="p-2.5">Validation Audit</th>
              <th className="p-2.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredPackets.slice(-60).reverse().map((pkt) => {
              const isRegexFail = pkt.regexValidation && !pkt.regexValidation.isValid;
              const isDfaFail = pkt.dfaValidation && !pkt.dfaValidation.isValidTransition;

              return (
                <tr
                  key={pkt.id}
                  className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                  onClick={() => setInspectedPacket(pkt)}
                >
                  <td className="p-2.5 text-slate-500 text-[11px] whitespace-nowrap">
                    {new Date(pkt.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="p-2.5 font-semibold text-white whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectDevice(pkt.deviceId);
                      }}
                      className="hover:text-cyan-400 underline decoration-dotted"
                    >
                      {pkt.deviceId}
                    </button>
                  </td>
                  <td className="p-2.5">
                    <span
                      className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold ${
                        pkt.transport === "TCP"
                          ? "bg-blue-950 text-blue-400 border border-blue-800/60"
                          : "bg-purple-950 text-purple-400 border border-purple-800/60"
                      }`}
                    >
                      {pkt.transport}
                    </span>
                  </td>
                  <td className="p-2.5 font-bold text-violet-300">{pkt.packetType}</td>
                  <td className="p-2.5 text-amber-400">{pkt.sequence ?? "-"}</td>
                  <td className="p-2.5 text-slate-400 truncate max-w-xs text-[11px]">
                    {typeof pkt.payload === "object"
                      ? JSON.stringify(pkt.payload)
                      : String(pkt.payload || "NONE")}
                  </td>
                  <td className="p-2.5 whitespace-nowrap">
                    {isRegexFail ? (
                      <span className="flex items-center gap-1 text-amber-400 font-semibold text-[11px]">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Regex Syntax Fail</span>
                      </span>
                    ) : isDfaFail ? (
                      <span className="flex items-center gap-1 text-rose-400 font-semibold text-[11px]">
                        <ShieldAlert className="h-3 w-3" />
                        <span>DFA Trap Sequence</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                        <CheckCircle className="h-3 w-3" />
                        <span>Conforming Frame</span>
                      </span>
                    )}
                  </td>
                  <td className="p-2.5 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setInspectedPacket(pkt);
                      }}
                      className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white"
                      title="Inspect Frame"
                    >
                      <Eye className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Detailed Packet Inspection Modal */}
      {inspectedPacket && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] rounded-2xl border border-slate-700 max-w-2xl w-full p-5 shadow-2xl overflow-hidden font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-cyan-400" />
                <h3 className="font-bold text-sm text-white">
                  PDU Frame Deep Audit • {inspectedPacket.id}
                </h3>
              </div>
              <button
                onClick={() => setInspectedPacket(null)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              {/* Raw Wire Frame */}
              <div>
                <label className="text-slate-400 font-semibold block mb-1 text-[11px]">
                  Raw Wire Serialization:
                </label>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-cyan-300 break-all select-all">
                  {inspectedPacket.raw}
                </div>
              </div>

              {/* Status Banner */}
              <div
                className={`p-3 rounded-xl border flex items-center gap-3 ${
                  inspectedPacket.isValid
                    ? "bg-emerald-950/30 border-emerald-800 text-emerald-300"
                    : "bg-red-950/30 border-red-800 text-red-300"
                }`}
              >
                {inspectedPacket.isValid ? (
                  <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                ) : (
                  <ShieldAlert className="h-5 w-5 text-red-400 flex-shrink-0" />
                )}
                <div>
                  <div className="font-bold">
                    {inspectedPacket.isValid
                      ? "Packet Passed Both Regex & Automata Validation"
                      : "Packet Validation Failed"}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {inspectedPacket.dfaValidation?.formalExplanation ||
                      (inspectedPacket.regexValidation?.errors &&
                        inspectedPacket.regexValidation.errors.join("; ")) ||
                      "Valid protocol transmission."}
                  </div>
                </div>
              </div>

              {/* Lexical / Regex Breakdown */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="font-bold text-slate-300 mb-2 text-[11px] flex items-center justify-between">
                  <span>FLAT Lexical & Regex Verification</span>
                  <span
                    className={
                      inspectedPacket.regexValidation?.isValid
                        ? "text-emerald-400"
                        : "text-red-400 font-bold"
                    }
                  >
                    {inspectedPacket.regexValidation?.isValid ? "PASSED" : "FAILED"}
                  </span>
                </div>
                {inspectedPacket.regexValidation?.rulesChecked && (
                  <div className="space-y-1">
                    {inspectedPacket.regexValidation.rulesChecked.map((r, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-[11px] bg-slate-950/60 p-1.5 rounded"
                      >
                        <span className="text-slate-400">{r.name}</span>
                        <span
                          className={`font-semibold ${
                            r.passed ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {r.passed ? "✓ MATCH" : "✗ MISMATCH"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* DFA Automata Transition */}
              {inspectedPacket.dfaValidation && (
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="font-bold text-slate-300 mb-2 text-[11px] flex items-center justify-between">
                    <span>FLAT Finite Automaton Transition</span>
                    <span
                      className={
                        inspectedPacket.dfaValidation.isValidTransition
                          ? "text-emerald-400"
                          : "text-red-400 font-bold"
                      }
                    >
                      {inspectedPacket.dfaValidation.isValidTransition
                        ? "VALID STATE SHIFT"
                        : "TRAP STATE VIOLATION"}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-950 text-slate-300 flex items-center justify-between">
                    <span className="text-cyan-400 font-bold">
                      {inspectedPacket.dfaValidation.fromState}
                    </span>
                    <span className="text-slate-500">
                      ──({inspectedPacket.packetType})──▶
                    </span>
                    <span
                      className={`font-bold ${
                        inspectedPacket.dfaValidation.toState === "S_TRAP"
                          ? "text-red-400"
                          : "text-emerald-400"
                      }`}
                    >
                      {inspectedPacket.dfaValidation.toState}
                    </span>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-400">
                    {inspectedPacket.dfaValidation.formalExplanation}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
