import React, { useState } from "react";
import { useSocket } from "./hooks/useSocket";
import { Navbar } from "./components/Navbar";
import { MetricsOverview } from "./components/MetricsOverview";
import { DeviceFleet } from "./components/DeviceFleet";
import { DfaVisualizer } from "./components/DfaVisualizer";
import { RegexEngineView } from "./components/RegexEngineView";
import { NetworkInspector } from "./components/NetworkInspector";
import { PacketStream } from "./components/PacketStream";
import { AlertCenter } from "./components/AlertCenter";
import { AttackControlPanel } from "./components/AttackControlPanel";

export default function App() {
  const { isConnected, devices, packets, alerts, metrics, linkMetrics } = useSocket();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedDeviceId, setSelectedDeviceId] = useState("DEV-TEMP-1001");

  // Keep selectedDeviceId synced if device fleet updates
  const currentSelectedDevice = devices.find((d) => d.deviceId === selectedDeviceId) || devices[0];

  const handleResetSystem = async () => {
    try {
      await fetch("/api/simulator/reset", { method: "POST" });
    } catch (err) {
      console.error("Reset failed", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <Navbar
        isConnected={isConnected}
        metrics={metrics}
        onReset={handleResetSystem}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Dashboard Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6">
        {/* Top KPI Metrics Bar */}
        <MetricsOverview metrics={metrics} linkMetrics={linkMetrics} />

        {/* Attack & Security Simulation Trigger Bar (Always available or on overview) */}
        <AttackControlPanel
          selectedDeviceId={currentSelectedDevice?.deviceId}
          onActionExecuted={() => {}}
        />

        {/* Tab 1: Fleet & Streams (Overview) */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <DeviceFleet
              devices={devices}
              selectedDeviceId={currentSelectedDevice?.deviceId}
              onSelectDevice={(id) => {
                setSelectedDeviceId(id);
                setActiveTab("dfa"); // jumping to DFA visualizer for deep dive
              }}
            />
            <PacketStream
              packets={packets}
              onSelectDevice={(id) => {
                setSelectedDeviceId(id);
                setActiveTab("dfa");
              }}
            />
          </div>
        )}

        {/* Tab 2: Automata & State Machine (FLAT) */}
        {activeTab === "dfa" && (
          <div className="space-y-6">
            <DfaVisualizer
              devices={devices}
              selectedDeviceId={currentSelectedDevice?.deviceId}
              onSelectDevice={(id) => setSelectedDeviceId(id)}
            />
            <DeviceFleet
              devices={devices}
              selectedDeviceId={currentSelectedDevice?.deviceId}
              onSelectDevice={(id) => setSelectedDeviceId(id)}
            />
          </div>
        )}

        {/* Tab 3: Regex Engine & Lexical Testing Lab */}
        {activeTab === "regex" && (
          <div className="space-y-6">
            <RegexEngineView />
            <PacketStream
              packets={packets}
              onSelectDevice={(id) => {
                setSelectedDeviceId(id);
                setActiveTab("dfa");
              }}
            />
          </div>
        )}

        {/* Tab 4: Computer Networks Inspector */}
        {activeTab === "network" && (
          <div className="space-y-6">
            <NetworkInspector linkMetrics={linkMetrics} recentPackets={packets} />
            <PacketStream
              packets={packets}
              onSelectDevice={(id) => {
                setSelectedDeviceId(id);
                setActiveTab("dfa");
              }}
            />
          </div>
        )}

        {/* Tab 5: Validation Alerts & Security Incidents */}
        {activeTab === "alerts" && (
          <div className="space-y-6">
            <AlertCenter
              alerts={alerts}
              onSelectDevice={(id) => {
                setSelectedDeviceId(id);
                setActiveTab("dfa");
              }}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#0b1120] py-4 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-2">
          <div>
            IoT Device Communication Monitoring and Validation System • Academic Project
          </div>
          <div className="flex items-center gap-3">
            <span className="text-cyan-400">CN: Socket Sockets & PDU</span>
            <span className="text-slate-700">•</span>
            <span className="text-emerald-400">FSWD: React, Node, WebSockets</span>
            <span className="text-slate-700">•</span>
            <span className="text-violet-400">FLAT: Regex Grammar & DFA</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
