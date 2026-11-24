/**
 * Main Web Server, REST API & WebSocket Server
 * Module: FSWD (Full Stack Web Development)
 */

import http from "http";
import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";
import path from "path";
import { fileURLToPath } from "url";

import { FLAT_SPEC } from "./flat/protocolGrammar.js";
import { defaultStore } from "./store/stateStore.js";
import { defaultTcpServer } from "./network/tcpServer.js";
import { defaultUdpServer } from "./network/udpServer.js";
import { defaultSimulator } from "./simulator/deviceSimulator.js";
import { AttackInjector } from "./simulator/attackInjector.js";
import { defaultLinkEmulator } from "./network/linkEmulator.js";
import { defaultValidator } from "./flat/regexValidator.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

const HTTP_PORT = process.env.PORT || 5000;
const TCP_PORT = process.env.TCP_PORT || 8085;
const UDP_PORT = process.env.UDP_PORT || 8086;

app.use(cors());
app.use(express.json());

// ----------------------------------------------------
// 1. WebSocket Connection Management
// ----------------------------------------------------
wss.on("connection", (ws) => {
  defaultStore.registerWsClient(ws);

  ws.on("close", () => {
    defaultStore.unregisterWsClient(ws);
  });
});

// Periodic metrics push over WebSocket
setInterval(() => {
  defaultStore.broadcast({
    type: "METRICS_UPDATE",
    payload: {
      metrics: defaultStore.getSummaryMetrics(),
      linkMetrics: defaultLinkEmulator.getMetrics()
    }
  });
}, 1000);

// ----------------------------------------------------
// 2. REST API Routes
// ----------------------------------------------------

// Overall status
app.get("/api/status", (req, res) => {
  res.json({
    status: "ONLINE",
    version: "2.1.0",
    uptime: process.uptime(),
    servers: {
      http: { port: HTTP_PORT, status: "RUNNING" },
      tcp: { port: TCP_PORT, isRunning: defaultTcpServer.isRunning },
      udp: { port: UDP_PORT, isRunning: defaultUdpServer.isRunning }
    },
    simulator: {
      isActive: defaultSimulator.isActive,
      deviceCount: defaultSimulator.fleet.size
    },
    metrics: defaultStore.getSummaryMetrics()
  });
});

// Device fleet list
app.get("/api/devices", (req, res) => {
  res.json({
    count: defaultStore.devices.size,
    devices: defaultStore.getDevicesList()
  });
});

// Specific device details
app.get("/api/devices/:id", (req, res) => {
  const dev = defaultStore.getDeviceById(req.params.id);
  if (!dev) {
    return res.status(404).json({ error: "Device not found" });
  }
  res.json(dev);
});

// Packet history with filtering
app.get("/api/packets", (req, res) => {
  const { deviceId, isValid, packetType, limit = 100 } = req.query;
  let result = defaultStore.packets;

  if (deviceId) {
    result = result.filter(p => p.deviceId === deviceId);
  }
  if (isValid !== undefined) {
    const boolVal = isValid === "true";
    result = result.filter(p => p.isValid === boolVal);
  }
  if (packetType) {
    result = result.filter(p => p.packetType === packetType);
  }

  res.json({
    totalMatching: result.length,
    packets: result.slice(-parseInt(limit, 10))
  });
});

// Validation alerts
app.get("/api/alerts", (req, res) => {
  res.json({
    count: defaultStore.alerts.length,
    alerts: defaultStore.alerts
  });
});

// FLAT: Formal Automata 5-Tuple & Specifications
app.get("/api/flat/dfa", (req, res) => {
  res.json({
    name: FLAT_SPEC.name,
    version: FLAT_SPEC.version,
    formalDefinition: FLAT_SPEC.formalDefinition,
    stateDetails: FLAT_SPEC.stateDetails,
    transitions: FLAT_SPEC.transitions
  });
});

// FLAT: Regular Expressions Rules
app.get("/api/flat/regex", (req, res) => {
  res.json({
    rules: FLAT_SPEC.regexRules
  });
});

// FLAT: Regex Interactive Lab Tester
app.post("/api/flat/regex/test", (req, res) => {
  const { testString, ruleKey } = req.body;
  if (!testString) {
    return res.status(400).json({ error: "testString is required" });
  }

  if (ruleKey && FLAT_SPEC.regexRules[ruleKey]) {
    const rule = FLAT_SPEC.regexRules[ruleKey];
    const regex = new RegExp(rule.pattern, rule.flags);
    const passed = regex.test(testString.trim());
    return res.json({
      rule: rule,
      input: testString,
      passed: passed,
      explanation: passed 
        ? `Input matches formal regex: ${rule.pattern}`
        : `Syntax mismatch: input does not satisfy pattern ${rule.pattern}`
    });
  }

  // Full packet validation
  const validation = defaultValidator.validatePacket(testString);
  res.json(validation);
});

// Computer Networks: Link Emulator Metrics & Config
app.get("/api/network/metrics", (req, res) => {
  res.json(defaultLinkEmulator.getMetrics());
});

app.post("/api/network/config", (req, res) => {
  defaultLinkEmulator.updateConfig(req.body);
  res.json({
    message: "Network link parameters updated",
    currentConfig: defaultLinkEmulator.getMetrics()
  });
});

// Simulator Fleet Controls
app.post("/api/simulator/control", (req, res) => {
  const { action, deviceConfig } = req.body;
  if (action === "START") {
    defaultSimulator.startAll();
  } else if (action === "STOP") {
    defaultSimulator.stopAll();
  } else if (action === "SPAWN" && deviceConfig) {
    defaultSimulator.spawnCustomDevice(deviceConfig);
  }
  res.json({
    simulatorActive: defaultSimulator.isActive,
    fleetSize: defaultSimulator.fleet.size
  });
});

// Attack Vector Injections
app.post("/api/simulator/attack", (req, res) => {
  const { attackType, targetId } = req.body;
  let result = null;

  switch (attackType) {
    case "MALFORMED_FRAME":
      result = AttackInjector.injectMalformedFrame(targetId);
      break;
    case "PAYLOAD_SCHEMA_FAIL":
      result = AttackInjector.injectPayloadSchemaViolation(targetId);
      break;
    case "CORRUPT_CRC":
      result = AttackInjector.injectCorruptedCrc(targetId);
      break;
    case "DATA_WITHOUT_HANDSHAKE":
      result = AttackInjector.injectDataWithoutHandshake(targetId);
      break;
    case "SKIP_AUTH":
      result = AttackInjector.injectSkipAuthAttack(targetId);
      break;
    case "REPLAY_ATTACK":
      result = AttackInjector.injectReplayAttack(targetId);
      break;
    case "RESET_RECOVERY":
      result = AttackInjector.injectResetRecovery(targetId);
      break;
    case "NETWORK_SPIKE":
      result = AttackInjector.injectNetworkImpairment(350, 0.4);
      break;
    default:
      return res.status(400).json({ error: `Unknown attack type: ${attackType}` });
  }

  res.json({
    attackType,
    executed: true,
    result
  });
});

// Manual HTTP Ingestion (for devices that use HTTP REST)
app.post("/api/packets/ingest", (req, res) => {
  const { rawPacket, ip } = req.body;
  if (!rawPacket) {
    return res.status(400).json({ error: "rawPacket is required" });
  }
  const result = defaultStore.ingestRawPacket(rawPacket, {
    transport: "HTTP",
    ip: ip || req.ip,
    port: req.socket.remotePort,
    latency: 10
  });
  res.json(result);
});

// System Reset
app.post("/api/simulator/reset", (req, res) => {
  defaultSimulator.stopAll();
  defaultStore.resetAll();
  defaultSimulator.startAll();
  res.json({ message: "System state and automata successfully reset." });
});

// ----------------------------------------------------
// 3. Serve Frontend Build in Production
// ----------------------------------------------------
const frontendDist = path.resolve(__dirname, "../../frontend/dist");
app.use(express.static(frontendDist));

app.get("*", (req, res) => {
  if (req.path.startsWith("/api") || req.path.startsWith("/ws")) {
    return res.status(404).json({ error: "Endpoint not found" });
  }
  res.sendFile(path.join(frontendDist, "index.html"), (err) => {
    if (err) {
      res.send(`<h2>IoT Validation Backend is Active</h2><p>REST API: /api/status</p><p>Frontend is running via Vite or build.</p>`);
    }
  });
});

// ----------------------------------------------------
// 4. Server Initialization
// ----------------------------------------------------
async function startServer() {
  try {
    await defaultTcpServer.start();
    await defaultUdpServer.start();

    server.listen(HTTP_PORT, () => {
      console.log(`=======================================================`);
      console.log(`IoT Device Communication Monitoring & Validation System`);
      console.log(`[FSWD] HTTP & WebSocket Server: http://localhost:${HTTP_PORT}`);
      console.log(`[CN]   TCP Socket Listener:    127.0.0.1:${TCP_PORT}`);
      console.log(`[CN]   UDP Socket Listener:    127.0.0.1:${UDP_PORT}`);
      console.log(`[FLAT] DFA Automaton & Regex Validation Engine Active`);
      console.log(`=======================================================`);

      // Start the simulated device fleet automatically
      defaultSimulator.startAll();
    });
  } catch (err) {
    console.error("Failed to start IoT Validation System:", err);
  }
}

startServer();
