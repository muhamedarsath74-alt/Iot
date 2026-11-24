import React, { useState } from "react";
import { ShieldCheck, Code, CheckCircle, XCircle, Play, Sparkles, Terminal } from "lucide-react";

const REGEX_RULES = [
  {
    id: "R1_FRAME_FORMAT",
    name: "PDU Wire Frame Serialization Syntax",
    pattern: "^IOTPDU\\/v[1-2]\\|(TCP|UDP)\\|DEV-[A-Z]{3,4}-\\d{4}\\|(SYN|SYN_ACK|AUTH|AUTH_ACK|DATA|PING|PONG|ACK|ALERT|DISC|RST)\\|SEQ:\\d{1,10}\\|ACK:\\d{1,10}\\|TS:\\d{13}\\|LEN:\\d{1,4}\\|PAYLOAD:(?:\\{[\\s\\S]*\\}|\\[[\\s\\S]*\\]|NONE)\\|CRC32:[0-9A-Fa-f]{8}$",
    description: "Validates protocol preamble, pipe-delimited segment positions, and structural tags."
  },
  {
    id: "R2_DEVICE_ID",
    name: "Device Hardware Identifier",
    pattern: "^DEV-(TEMP|ENV|PWR|FLOW|IND|SEC)-\\d{4}$",
    description: "Enforces IoT device identifier format: category code and 4-digit hardware number."
  },
  {
    id: "R3_TELEMETRY_PAYLOAD",
    name: "Sensor Telemetry JSON Structure",
    pattern: '^\\{"temp":-?\\d{1,3}(?:\\.\\d+)?,"humidity":\\d{1,3}(?:\\.\\d+)?,"voltage":\\d{1,2}(?:\\.\\d+)?,"battery":\\d{1,3},"status":"(NORMAL|WARNING|CRITICAL)"\\}$',
    description: "Validates JSON structure, numeric bounds for temp, humidity, voltage, and battery."
  },
  {
    id: "R4_CHECKSUM_CRC32",
    name: "CRC32 Checksum Validation",
    pattern: "^[0-9A-Fa-f]{8}$",
    description: "Ensures exactly 8 hexadecimal digits representing the 32-bit CRC hash."
  },
  {
    id: "R5_SOCKET_ADDR",
    name: "IPv4 Socket Address",
    pattern: "^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?):\\d{1,5}$",
    description: "Validates dotted-decimal IPv4 format with 1-65535 port range."
  }
];

const PRESETS = {
  validPdu: "IOTPDU/v1|TCP|DEV-TEMP-1001|DATA|SEQ:12|ACK:11|TS:1732435000000|LEN:98|PAYLOAD:{\"temp\":22.5,\"humidity\":51.2,\"voltage\":3.3,\"battery\":95,\"status\":\"NORMAL\"}|CRC32:3D82A7C1",
  badSyntax: "BADPDU/vX#DEV-TEMP-1001#DATA#SEQ:12#CRC32:INVALID",
  badDevId: "DEV-UNKNOWN_SENSOR-999",
  badPayload: '{"temp":"VERY_HOT","humidity":-50,"voltage":"5V","battery":"FULL","status":"EXPLODING"}',
  badCrc: "12345XYZ"
};

export function RegexEngineView() {
  const [selectedRule, setSelectedRule] = useState(REGEX_RULES[0].id);
  const [testString, setTestString] = useState(PRESETS.validPdu);
  const [testResult, setTestResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const runTest = async (overrideString = null, overrideRule = null) => {
    const stringToTest = overrideString !== null ? overrideString : testString;
    const ruleToTest = overrideRule !== null ? overrideRule : selectedRule;
    setIsLoading(true);

    try {
      const res = await fetch("/api/flat/regex/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testString: stringToTest,
          ruleKey: ruleToTest.replace(/^R\d+_/, "")
        })
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err) {
      console.error("Test error", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPreset = (key, ruleId) => {
    const val = PRESETS[key];
    setTestString(val);
    setSelectedRule(ruleId);
    runTest(val, ruleId);
  };

  return (
    <div className="bg-[#0f172a]/90 backdrop-blur rounded-2xl border border-slate-800 p-4 lg:p-6 shadow-xl mb-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
        <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white">
              FLAT Regular Expression Lexical Engine
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 font-semibold">
              Lexical Grammar Σ*
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Enforces strict lexical tokens, PDU framing syntax, and schema verification
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Formal Regex Catalog */}
        <div className="lg:col-span-5 space-y-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
            <Code className="h-3.5 w-3.5 text-cyan-400" />
            <span>Formal Grammar Regular Expressions</span>
          </h3>

          <div className="space-y-2">
            {REGEX_RULES.map((rule) => {
              const isSelected = selectedRule === rule.id;
              return (
                <div
                  key={rule.id}
                  onClick={() => setSelectedRule(rule.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-slate-800/90 border-cyan-500 shadow-md shadow-cyan-500/10"
                      : "bg-[#131d31]/60 border-slate-800/80 hover:border-slate-700 hover:bg-[#131d31]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-white font-mono">
                      {rule.name}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                      {rule.id}
                    </span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-lg font-mono text-[11px] text-cyan-400 break-all border border-slate-900 mb-1.5">
                    {rule.pattern}
                  </div>
                  <p className="text-[11px] text-slate-400">{rule.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Interactive Tester Playground */}
        <div className="lg:col-span-7 bg-[#0b1120] rounded-xl border border-slate-800 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-white font-mono flex items-center gap-2">
                <Terminal className="h-4 w-4 text-emerald-400" />
                <span>Interactive Regex Testing Lab</span>
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">
                Testing against: <span className="text-cyan-400 font-bold">{selectedRule}</span>
              </span>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              <span className="text-[11px] text-slate-500 mr-1">Sample Inputs:</span>
              <button
                onClick={() => loadPreset("validPdu", "R1_FRAME_FORMAT")}
                className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 hover:bg-emerald-900/60"
              >
                ✓ Valid PDU
              </button>
              <button
                onClick={() => loadPreset("badSyntax", "R1_FRAME_FORMAT")}
                className="px-2 py-0.5 rounded text-[10px] font-mono bg-red-950/60 text-red-400 border border-red-800/60 hover:bg-red-900/60"
              >
                ✗ Bad Syntax
              </button>
              <button
                onClick={() => loadPreset("badPayload", "R3_TELEMETRY_PAYLOAD")}
                className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950/60 text-amber-400 border border-amber-800/60 hover:bg-amber-900/60"
              >
                ✗ Bad Payload
              </button>
              <button
                onClick={() => loadPreset("badCrc", "R4_CHECKSUM_CRC32")}
                className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-950/60 text-purple-400 border border-purple-800/60 hover:bg-purple-900/60"
              >
                ✗ Bad CRC
              </button>
            </div>

            {/* Input Textarea */}
            <div className="relative mb-3">
              <textarea
                value={testString}
                onChange={(e) => setTestString(e.target.value)}
                rows={4}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500 selection:bg-cyan-500 selection:text-black resize-none"
                placeholder="Enter raw frame string or token to validate..."
              />
            </div>

            {/* Test Execution Button */}
            <div className="flex items-center justify-end mb-4">
              <button
                onClick={() => runTest()}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-xs shadow-lg shadow-cyan-500/20 hover:opacity-90 transition-opacity"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>{isLoading ? "Validating..." : "Execute Lexical Verification"}</span>
              </button>
            </div>

            {/* Test Result Display */}
            {testResult && (
              <div
                className={`p-4 rounded-xl border font-mono transition-all ${
                  testResult.isValid !== false && testResult.passed !== false
                    ? "bg-emerald-950/20 border-emerald-800/60"
                    : "bg-red-950/20 border-red-800/60"
                }`}
              >
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    {testResult.isValid !== false && testResult.passed !== false ? (
                      <CheckCircle className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-400" />
                    )}
                    <span className="text-xs font-bold text-white">
                      {testResult.isValid !== false && testResult.passed !== false
                        ? "LEXICAL VALIDATION PASSED"
                        : "LEXICAL VALIDATION FAILED"}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Timestamp: {new Date().toLocaleTimeString()}
                  </span>
                </div>

                {/* Explanation */}
                <div className="text-xs text-slate-300 mb-2">
                  {testResult.explanation || (testResult.errors && testResult.errors.join("; ")) || "All grammatical rules matched."}
                </div>

                {/* Tokens Decomposed */}
                {testResult.tokens && (
                  <div className="mt-3 pt-2 border-t border-slate-800/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Decomposed Token Map:
                    </span>
                    <div className="grid grid-cols-2 gap-2 mt-1.5 text-[10px]">
                      <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
                        <span className="text-slate-500">Device ID:</span>{" "}
                        <span className="text-cyan-400">{testResult.tokens.deviceId}</span>
                      </div>
                      <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
                        <span className="text-slate-500">Packet Type:</span>{" "}
                        <span className="text-violet-400 font-bold">{testResult.tokens.packetType}</span>
                      </div>
                      <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
                        <span className="text-slate-500">Sequence #:</span>{" "}
                        <span className="text-amber-400">{testResult.tokens.sequence}</span>
                      </div>
                      <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
                        <span className="text-slate-500">CRC32 Hash:</span>{" "}
                        <span className="text-emerald-400">{testResult.tokens.declaredCrc}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
