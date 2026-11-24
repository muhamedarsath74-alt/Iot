import React, { useState } from "react";
import { Bug, Zap, RotateCcw } from "lucide-react";

export function AttackControlPanel({ selectedDeviceId, onActionExecuted }) {
  const [isInjecting, setIsInjecting] = useState(false);
  const [lastAction, setLastAction] = useState(null);

  const injectAttack = async (attackType, customTarget = null) => {
    setIsInjecting(true);
    const target = customTarget || selectedDeviceId || "DEV-TEMP-1001";

    try {
      const res = await fetch("/api/simulator/attack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attackType,
          targetId: target
        })
      });
      if (res.ok) {
        const data = await res.json();
        setLastAction({
          type: attackType,
          target: target,
          timestamp: new Date().toLocaleTimeString(),
          success: true
        });
        if (onActionExecuted) onActionExecuted(data);
      } else {
        throw new Error("Backend offline; using in-browser simulator");
      }
    } catch {
      // In-browser simulation dispatch for Vercel static hosting
      window.dispatchEvent(
        new CustomEvent("INJECT_ATTACK", {
          detail: { attackType, targetId: target }
        })
      );
      setLastAction({
        type: attackType,
        target: target,
        timestamp: new Date().toLocaleTimeString(),
        success: true
      });
    } finally {
      setIsInjecting(false);
    }
  };

  const attackButtons = [
    {
      type: "DATA_WITHOUT_HANDSHAKE",
      title: "Data Without Handshake",
      category: "FLAT Automata",
      color: "rose",
      desc: "Sends DATA in state S0_IDLE. Tests δ(S0, DATA) → S_TRAP transition."
    },
    {
      type: "SKIP_AUTH",
      title: "Skip Authentication",
      category: "FLAT Automata",
      color: "rose",
      desc: "Sends SYN then immediately DATA without AUTH. Forces S_TRAP."
    },
    {
      type: "REPLAY_ATTACK",
      title: "Sequence Replay Attack",
      category: "FLAT Sequence",
      color: "amber",
      desc: "Replays a previous sequence number to test monotonic order."
    },
    {
      type: "MALFORMED_FRAME",
      title: "Malformed Frame Syntax",
      category: "FLAT Regex",
      color: "cyan",
      desc: "Corrupts preamble and delimiters, violating R1_FRAME_FORMAT."
    },
    {
      type: "PAYLOAD_SCHEMA_FAIL",
      title: "Payload Schema Failure",
      category: "FLAT Regex",
      color: "cyan",
      desc: "Sends string temperature and negative humidity violating R3."
    },
    {
      type: "CORRUPT_CRC",
      title: "Corrupted CRC32 Checksum",
      category: "CN Integrity",
      color: "purple",
      desc: "Alters 32-bit CRC hash to test integrity verification failure."
    },
    {
      type: "NETWORK_SPIKE",
      title: "Network Jitter & Loss Spike",
      category: "CN Transport",
      color: "blue",
      desc: "Spikes link latency to 350ms with 40% packet drop for 10s."
    },
    {
      type: "RESET_RECOVERY",
      title: "Send Protocol Reset (RST)",
      category: "Recovery",
      color: "emerald",
      desc: "Sends RST symbol to recover a device from S_TRAP back to S0."
    }
  ];

  return (
    <div className="bg-[#0f172a]/90 backdrop-blur rounded-2xl border border-slate-800 p-4 shadow-xl mb-6">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
            <Bug className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-semibold text-sm text-white">
              Attack Injection & Anomaly Simulator
            </h2>
            <p className="text-xs text-slate-400">
              One-click security vector testing targeting active device:{" "}
              <span className="text-cyan-400 font-mono font-bold">
                {selectedDeviceId || "DEV-TEMP-1001"}
              </span>
            </p>
          </div>
        </div>

        {lastAction && (
          <div className="text-[11px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/60 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>
              Triggered: {lastAction.type} ({lastAction.timestamp})
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {attackButtons.map((btn) => {
          return (
            <button
              key={btn.type}
              onClick={() => injectAttack(btn.type)}
              disabled={isInjecting}
              className="text-left p-3 rounded-xl bg-[#131d31] hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded font-semibold bg-slate-900 text-slate-400 border border-slate-800">
                    {btn.category}
                  </span>
                  <Zap className="h-3.5 w-3.5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                </div>
                <div className="text-xs font-semibold text-white group-hover:text-cyan-300 transition-colors mb-1">
                  {btn.title}
                </div>
                <p className="text-[10px] text-slate-400 leading-snug line-clamp-2">
                  {btn.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
