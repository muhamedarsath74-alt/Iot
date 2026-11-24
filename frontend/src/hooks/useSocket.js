import { useState, useEffect, useRef, useCallback } from "react";
import { InBrowserDFA, InBrowserValidator, calculateCRC32 } from "../flatEngine";

const INITIAL_DEVICES = [
  { deviceId: "DEV-TEMP-1001", name: "HVAC Temperature Sensor A1", transport: "TCP", type: "Temperature / Humidity Sensor", ip: "192.168.1.101", port: 38291, battery: 96, rssi: -58 },
  { deviceId: "DEV-ENV-2042", name: "Greenhouse Climate Station", transport: "UDP", type: "Ambient Environmental Monitor", ip: "192.168.1.102", port: 41203, battery: 89, rssi: -65 },
  { deviceId: "DEV-PWR-3099", name: "Main Distribution Power Meter", transport: "TCP", type: "Smart Power Meter", ip: "192.168.1.103", port: 49182, battery: 100, rssi: -52 },
  { deviceId: "DEV-IND-4015", name: "Turbine Hydraulic Pressure Node", transport: "TCP", type: "Industrial Actuator Node", ip: "192.168.1.104", port: 51229, battery: 92, rssi: -71 },
  { deviceId: "DEV-FLOW-5021", name: "Coolant Flow Rate Sensor", transport: "UDP", type: "Fluid Flow Telemetry Node", ip: "192.168.1.105", port: 34182, battery: 84, rssi: -62 },
  { deviceId: "DEV-SEC-6003", name: "Server Room Perimeter Sensor", transport: "TCP", type: "Facility Access Controller", ip: "192.168.1.106", port: 45012, battery: 98, rssi: -49 }
];

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [devices, setDevices] = useState([]);
  const [packets, setPackets] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [metrics, setMetrics] = useState({
    totalPackets: 0,
    validPackets: 0,
    regexErrors: 0,
    dfaViolations: 0,
    passRatePercent: 100,
    packetsPerSecond: 0,
    totalDevices: 6,
    onlineDevices: 6,
    trapDevices: 0,
    recentPpsWindow: []
  });
  const [linkMetrics, setLinkMetrics] = useState({
    totalTransmitted: 0,
    totalDelivered: 0,
    droppedCount: 0,
    averageLatency: 25,
    deliveryRatioPercent: 100,
    config: { baseLatencyMs: 25, jitterMs: 15, dropRate: 0 }
  });

  const wsRef = useRef(null);
  const fallbackTimerRef = useRef(null);
  const isFallbackActiveRef = useRef(false);
  const dfaInstancesRef = useRef(new Map());

  // In-Browser Simulator Engine (activates on Vercel deployment)
  const startFallbackSimulator = useCallback(() => {
    if (isFallbackActiveRef.current) return;
    isFallbackActiveRef.current = true;
    setIsConnected(true);

    // Initialize DFAs
    INITIAL_DEVICES.forEach((d) => {
      const dfa = new InBrowserDFA(d.deviceId);
      // Advance to streaming
      dfa.evaluate("SYN", 1);
      dfa.evaluate("AUTH", 2);
      dfa.evaluate("DATA", 3);
      dfaInstancesRef.current.set(d.deviceId, dfa);
    });

    // Populate initial devices
    setDevices(
      INITIAL_DEVICES.map((d) => {
        const dfa = dfaInstancesRef.current.get(d.deviceId);
        return {
          ...d,
          currentState: dfa.currentState,
          inTrap: dfa.inTrap,
          isOnline: true,
          totalPacketsReceived: 3,
          latestTelemetry: {
            temp: 23.5,
            humidity: 50.2,
            voltage: 3.3,
            battery: d.battery,
            status: "NORMAL"
          },
          history: dfa.history
        };
      })
    );

    // Simulation loop emitting packets every 1.6s
    let seq = 4;
    fallbackTimerRef.current = setInterval(() => {
      seq++;
      const devIndex = Math.floor(Math.random() * INITIAL_DEVICES.length);
      const dev = INITIAL_DEVICES[devIndex];
      const dfa = dfaInstancesRef.current.get(dev.deviceId);

      const tempVal = parseFloat((22.0 + Math.random() * 5).toFixed(1));
      const humVal = parseFloat((48.0 + Math.random() * 8).toFixed(1));
      const payloadObj = {
        temp: tempVal,
        humidity: humVal,
        voltage: 3.3,
        battery: Math.max(10, dev.battery - Math.floor(seq / 50)),
        status: "NORMAL"
      };
      const payloadStr = JSON.stringify(payloadObj);

      const body = `IOTPDU/v1|${dev.transport}|${dev.deviceId}|DATA|SEQ:${seq}|ACK:${seq - 1}|TS:${Date.now()}|LEN:${payloadStr.length}|PAYLOAD:${payloadStr}`;
      const crc = calculateCRC32(body);
      const raw = `${body}|CRC32:${crc}`;

      const regexReport = InBrowserValidator.validate(raw);
      const dfaReport = dfa.evaluate("DATA", seq);

      const packetRecord = {
        id: `PKT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: Date.now(),
        raw,
        deviceId: dev.deviceId,
        packetType: "DATA",
        sequence: seq,
        transport: dev.transport,
        latency: Math.round(18 + Math.random() * 15),
        isValid: regexReport.isValid && dfaReport.isValidTransition,
        regexValidation: regexReport,
        dfaValidation: dfaReport,
        payload: payloadObj,
        pduInspection: {
          hexDump: Array.from(new TextEncoder().encode(raw))
            .map((b) => b.toString(16).toUpperCase().padStart(2, "0"))
            .join(" "),
          totalBytes: raw.length
        }
      };

      setPackets((prev) => [...prev.slice(-200), packetRecord]);

      setDevices((prev) =>
        prev.map((d) =>
          d.deviceId === dev.deviceId
            ? {
                ...d,
                currentState: dfa.currentState,
                inTrap: dfa.inTrap,
                totalPacketsReceived: (d.totalPacketsReceived || 0) + 1,
                latestTelemetry: payloadObj,
                history: dfa.history
              }
            : d
        )
      );

      setMetrics((m) => {
        const total = m.totalPackets + 1;
        const valid = m.validPackets + (packetRecord.isValid ? 1 : 0);
        return {
          ...m,
          totalPackets: total,
          validPackets: valid,
          passRatePercent: parseFloat(((valid / total) * 100).toFixed(1)),
          packetsPerSecond: 1
        };
      });

      setLinkMetrics((lm) => ({
        ...lm,
        totalTransmitted: lm.totalTransmitted + 1,
        totalDelivered: lm.totalDelivered + 1
      }));
    }, 1600);
  }, []);

  // Attack Injection Listener for in-browser simulation
  useEffect(() => {
    const handleAttackEvent = (e) => {
      const { attackType, targetId } = e.detail || {};
      const dev = INITIAL_DEVICES.find((d) => d.deviceId === targetId) || INITIAL_DEVICES[0];
      const dfa = dfaInstancesRef.current.get(dev.deviceId);

      let alertObj = null;

      if (attackType === "DATA_WITHOUT_HANDSHAKE") {
        // Force transition from S0 without auth
        dfa.currentState = "S0_IDLE";
        const trans = dfa.evaluate("DATA", 999);
        alertObj = {
          id: `ALT-${Date.now()}`,
          severity: "CRITICAL",
          type: "AUTOMATA_SEQUENCE_VIOLATION",
          title: "DFA Sequence Error: State S0_IDLE rejecting DATA",
          description: "δ(S0_IDLE, DATA) is undefined. Immediate transition to absorbing S_TRAP.",
          deviceId: dev.deviceId,
          packetType: "DATA",
          formalGrammarRef: "δ(S0_IDLE, DATA) ∉ δ_valid",
          timestamp: Date.now()
        };
      } else if (attackType === "SKIP_AUTH") {
        dfa.currentState = "S1_HANDSHAKE";
        const trans = dfa.evaluate("DATA", 999);
        alertObj = {
          id: `ALT-${Date.now()}`,
          severity: "CRITICAL",
          type: "AUTOMATA_SEQUENCE_VIOLATION",
          title: "DFA Sequence Error: State S1_HANDSHAKE rejecting DATA without AUTH",
          description: "δ(S1_HANDSHAKE, DATA) is undefined. Immediate transition to S_TRAP.",
          deviceId: dev.deviceId,
          packetType: "DATA",
          formalGrammarRef: "δ(S1_HANDSHAKE, DATA) ∉ δ_valid",
          timestamp: Date.now()
        };
      } else if (attackType === "MALFORMED_FRAME") {
        alertObj = {
          id: `ALT-${Date.now()}`,
          severity: "WARNING",
          type: "REGEX_SYNTAX_ERROR",
          title: "Regex Syntax Error on DATA",
          description: "Frame violates PDU Wire Regular Expression grammar (R1_FRAME_FORMAT).",
          deviceId: dev.deviceId,
          packetType: "DATA",
          formalGrammarRef: "R1_FRAME_FORMAT",
          timestamp: Date.now()
        };
      } else if (attackType === "CORRUPT_CRC") {
        alertObj = {
          id: `ALT-${Date.now()}`,
          severity: "WARNING",
          type: "CHECKSUM_INTEGRITY_FAIL",
          title: "CRC32 Checksum Mismatch",
          description: "Frame payload altered in transit. Computed CRC != Declared CRC.",
          deviceId: dev.deviceId,
          packetType: "DATA",
          formalGrammarRef: "R4_CHECKSUM_CRC32",
          timestamp: Date.now()
        };
      } else if (attackType === "RESET_RECOVERY") {
        dfa.reset();
        dfa.evaluate("SYN", 1);
        dfa.evaluate("AUTH", 2);
        dfa.evaluate("DATA", 3);
      }

      if (alertObj) {
        setAlerts((a) => [alertObj, ...a]);
        setMetrics((m) => ({
          ...m,
          dfaViolations: m.dfaViolations + (alertObj.severity === "CRITICAL" ? 1 : 0),
          regexErrors: m.regexErrors + (alertObj.severity === "WARNING" ? 1 : 0)
        }));
      }

      // Update device state
      setDevices((prev) =>
        prev.map((d) =>
          d.deviceId === dev.deviceId
            ? { ...d, currentState: dfa.currentState, inTrap: dfa.inTrap, history: dfa.history }
            : d
        )
      );
    };

    window.addEventListener("INJECT_ATTACK", handleAttackEvent);
    return () => window.removeEventListener("INJECT_ATTACK", handleAttackEvent);
  }, []);

  // WebSocket Connection
  useEffect(() => {
    let ws = null;
    let fallbackTimeout = null;

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      const wsUrl = process.env.NODE_ENV === "development" 
        ? "ws://localhost:5000/ws" 
        : `${protocol}//${host}/ws`;

      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      // If cannot connect within 1500ms, start in-browser simulation (for Vercel)
      fallbackTimeout = setTimeout(() => {
        if (!isConnected && !isFallbackActiveRef.current) {
          console.log("[Client] WebSocket timeout; starting in-browser IoT simulation engine (Vercel mode).");
          startFallbackSimulator();
        }
      }, 1500);

      ws.onopen = () => {
        if (fallbackTimeout) clearTimeout(fallbackTimeout);
        setIsConnected(true);
        console.log("[WS] Connected to live backend");
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "INITIAL_SYNC") {
            setDevices(msg.payload.devices || []);
            setPackets(msg.payload.recentPackets || []);
            setAlerts(msg.payload.recentAlerts || []);
            if (msg.payload.metrics) setMetrics(msg.payload.metrics);
            if (msg.payload.linkMetrics) setLinkMetrics(msg.payload.linkMetrics);
          } else if (msg.type === "PACKET_INGESTED") {
            const { packet, device, metrics: updatedMetrics } = msg.payload;
            setPackets((prev) => [...prev.slice(-200), packet]);
            setDevices((prev) => {
              const idx = prev.findIndex((d) => d.deviceId === device.deviceId);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = device;
                return next;
              }
              return [...prev, device];
            });
            if (updatedMetrics) setMetrics((m) => ({ ...m, ...updatedMetrics }));
          } else if (msg.type === "ALERT_GENERATED") {
            setAlerts((prev) => [msg.payload, ...prev.slice(0, 150)]);
          } else if (msg.type === "METRICS_UPDATE") {
            if (msg.payload.metrics) setMetrics(msg.payload.metrics);
            if (msg.payload.linkMetrics) setLinkMetrics(msg.payload.linkMetrics);
          }
        } catch (err) {
          console.error("[WS] Error", err);
        }
      };

      ws.onerror = () => {
        if (!isFallbackActiveRef.current) {
          startFallbackSimulator();
        }
      };

      ws.onclose = () => {
        if (!isFallbackActiveRef.current) {
          startFallbackSimulator();
        }
      };
    } catch {
      startFallbackSimulator();
    }

    return () => {
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
      if (fallbackTimerRef.current) clearInterval(fallbackTimerRef.current);
      if (ws) ws.close();
    };
  }, [isConnected, startFallbackSimulator]);

  return {
    isConnected,
    devices,
    packets,
    alerts,
    metrics,
    linkMetrics
  };
}
