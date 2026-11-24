/**
 * Central State Store & Real-time Event Broker
 * Module: FSWD / State Management & Event Streaming
 */

import { RegexValidator } from "../flat/regexValidator.js";
import { DeviceDFA } from "../flat/dfaEngine.js";
import { PacketParser } from "../network/packetParser.js";
import { defaultLinkEmulator } from "../network/linkEmulator.js";

export class StateStore {
  constructor() {
    this.devices = new Map(); // deviceId -> DeviceRecord
    this.packets = [];        // Ring buffer of packets (max 500)
    this.alerts = [];         // Ring buffer of alerts (max 200)
    this.validator = new RegexValidator();
    this.wsClients = new Set();

    this.metrics = {
      totalPackets: 0,
      validPackets: 0,
      regexErrors: 0,
      dfaViolations: 0,
      packetsPerSecond: 0,
      recentPpsWindow: []
    };

    // Calculate PPS every 1 second
    this._ppsCounter = 0;
    setInterval(() => {
      this.metrics.packetsPerSecond = this._ppsCounter;
      this.metrics.recentPpsWindow.push(this._ppsCounter);
      if (this.metrics.recentPpsWindow.length > 30) {
        this.metrics.recentPpsWindow.shift();
      }
      this._ppsCounter = 0;
    }, 1000);

    // Periodic heartbeat check: check for stale devices (>15s without packet)
    setInterval(() => {
      this._checkDeviceTimeouts();
    }, 5000);
  }

  registerWsClient(ws) {
    this.wsClients.add(ws);
    // Send immediate initial sync
    ws.send(JSON.stringify({
      type: "INITIAL_SYNC",
      payload: {
        devices: this.getDevicesList(),
        recentPackets: this.packets.slice(-50),
        recentAlerts: this.alerts.slice(-30),
        metrics: this.getSummaryMetrics(),
        linkMetrics: defaultLinkEmulator.getMetrics()
      }
    }));
  }

  unregisterWsClient(ws) {
    this.wsClients.delete(ws);
  }

  broadcast(message) {
    const data = typeof message === "string" ? message : JSON.stringify(message);
    for (const client of this.wsClients) {
      if (client.readyState === 1) { // OPEN
        try {
          client.send(data);
        } catch {
          // Client might have abruptly disconnected
        }
      }
    }
  }

  /**
   * Main entry point for ingesting an incoming raw wire packet
   */
  ingestRawPacket(rawString, transportMeta = {}) {
    this.metrics.totalPackets++;
    this._ppsCounter++;

    const timestamp = Date.now();
    const packetId = `PKT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // STEP 1: Computer Networks Inspection
    const pduInspection = PacketParser.getPduInspection(rawString);

    // STEP 2: FLAT - Regular Expression Lexical Validation
    const regexResult = this.validator.validatePacket(rawString);

    let deviceId = "UNKNOWN";
    let packetType = "UNKNOWN";
    let seq = null;
    let payload = null;

    if (regexResult.tokens) {
      deviceId = regexResult.tokens.deviceId;
      packetType = regexResult.tokens.packetType;
      seq = regexResult.tokens.sequence;
      payload = regexResult.tokens.parsedPayload || regexResult.tokens.rawPayload;
    } else {
      // Partial extraction from faulty packet
      const matchDev = rawString.match(/DEV-[A-Z0-9_\-]+/);
      if (matchDev) deviceId = matchDev[0];
      const matchType = rawString.match(/\|(SYN|SYN_ACK|AUTH|AUTH_ACK|DATA|PING|PONG|ACK|ALERT|DISC|RST)\|/);
      if (matchType) packetType = matchType[1];
    }

    // Ensure device registered
    const device = this._getOrCreateDevice(deviceId, transportMeta);

    // STEP 3: FLAT - Deterministic Finite Automaton Sequence Validation
    let dfaResult = null;
    let isValidOverall = regexResult.isValid;

    if (regexResult.isValid) {
      this.metrics.validPackets++;
      dfaResult = device.dfa.evaluateTransition(packetType, seq, transportMeta);

      if (!dfaResult.isValidTransition || !dfaResult.isSequenceValid) {
        this.metrics.dfaViolations++;
        isValidOverall = false;

        // Create Security/FLAT Violation Alert
        this._addAlert({
          severity: "CRITICAL",
          type: "AUTOMATA_SEQUENCE_VIOLATION",
          deviceId: deviceId,
          packetId: packetId,
          title: `DFA Sequence Error: State '${dfaResult.fromState}' rejecting '${packetType}'`,
          description: dfaResult.formalExplanation,
          formalGrammarRef: `δ(${dfaResult.fromState}, ${packetType}) ∉ δ_valid`,
          packetType: packetType,
          sequence: seq,
          timestamp: timestamp
        });
      }

      // Update Device Live State
      device.currentState = device.dfa.getCurrentState();
      device.lastSeq = seq;
      device.inTrap = device.dfa.inTrapState;
    } else {
      this.metrics.regexErrors++;
      isValidOverall = false;

      // Create Lexical/Syntax Alert
      this._addAlert({
        severity: "WARNING",
        type: "REGEX_SYNTAX_ERROR",
        deviceId: deviceId,
        packetId: packetId,
        title: `Regex Validation Failure on ${packetType}`,
        description: regexResult.errors.join("; "),
        formalGrammarRef: regexResult.rulesChecked.find(r => !r.passed)?.pattern || "Regex Grammar",
        packetType: packetType,
        sequence: seq,
        timestamp: timestamp
      });
    }

    // Update Device statistics
    device.totalPacketsReceived++;
    device.lastSeen = timestamp;
    device.isOnline = true;
    if (transportMeta.ip) device.ip = transportMeta.ip;
    if (transportMeta.port) device.port = transportMeta.port;
    if (transportMeta.transport) device.transport = transportMeta.transport;
    if (payload && typeof payload === "object") {
      if (payload.battery !== undefined) device.battery = payload.battery;
      if (payload.status !== undefined) device.status = payload.status;
      device.latestTelemetry = payload;
    }

    // Packet Record for Stream Log
    const packetRecord = {
      id: packetId,
      timestamp: timestamp,
      raw: rawString,
      deviceId: deviceId,
      packetType: packetType,
      sequence: seq,
      transport: transportMeta.transport || regexResult.tokens?.transport || "TCP",
      latency: transportMeta.latency || 0,
      isValid: isValidOverall,
      regexValidation: regexResult,
      dfaValidation: dfaResult,
      pduInspection: pduInspection,
      payload: payload
    };

    // Store in packet ring buffer
    this.packets.push(packetRecord);
    if (this.packets.length > 500) {
      this.packets.shift();
    }

    // Broadcast live event to WebSockets
    this.broadcast({
      type: "PACKET_INGESTED",
      payload: {
        packet: packetRecord,
        device: device.getSnapshot(),
        metrics: this.getSummaryMetrics()
      }
    });

    return packetRecord;
  }

  _getOrCreateDevice(deviceId, transportMeta = {}) {
    if (!this.devices.has(deviceId)) {
      const dfa = new DeviceDFA(deviceId);
      const newDev = {
        deviceId: deviceId,
        dfa: dfa,
        name: this._generateFriendlyName(deviceId),
        type: this._inferDeviceType(deviceId),
        currentState: dfa.getCurrentState(),
        ip: transportMeta.ip || "192.168.1." + Math.floor(10 + Math.random() * 200),
        port: transportMeta.port || Math.floor(30000 + Math.random() * 20000),
        transport: transportMeta.transport || "TCP",
        battery: 100,
        rssi: -50 - Math.floor(Math.random() * 30),
        totalPacketsReceived: 0,
        createdAt: Date.now(),
        lastSeen: Date.now(),
        isOnline: true,
        inTrap: false,
        latestTelemetry: null,
        getSnapshot() {
          return {
            deviceId: this.deviceId,
            name: this.name,
            type: this.type,
            currentState: this.currentState,
            stateInfo: this.dfa.getStateDetails(),
            ip: this.ip,
            port: this.port,
            transport: this.transport,
            battery: this.battery,
            rssi: this.rssi,
            totalPacketsReceived: this.totalPacketsReceived,
            lastSeen: this.lastSeen,
            isOnline: this.isOnline,
            inTrap: this.inTrap,
            latestTelemetry: this.latestTelemetry,
            history: this.dfa.history.slice(-8)
          };
        }
      };
      this.devices.set(deviceId, newDev);
    }
    return this.devices.get(deviceId);
  }

  _inferDeviceType(deviceId) {
    if (deviceId.includes("TEMP")) return "Temperature / Humidity Sensor";
    if (deviceId.includes("ENV")) return "Ambient Environmental Monitor";
    if (deviceId.includes("PWR")) return "Smart Power Meter";
    if (deviceId.includes("FLOW")) return "Fluid Flow Telemetry Node";
    if (deviceId.includes("IND")) return "Industrial Actuator Node";
    if (deviceId.includes("SEC")) return "Facility Access Controller";
    return "Generic IoT Sensor";
  }

  _generateFriendlyName(deviceId) {
    const parts = deviceId.split("-");
    const num = parts[parts.length - 1] || "0001";
    return `Node #${num} (${parts[1] || "IoT"})`;
  }

  _addAlert(alert) {
    const alertRecord = {
      id: `ALT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ...alert
    };
    this.alerts.push(alertRecord);
    if (this.alerts.length > 200) {
      this.alerts.shift();
    }

    this.broadcast({
      type: "ALERT_GENERATED",
      payload: alertRecord
    });
  }

  _checkDeviceTimeouts() {
    const now = Date.now();
    for (const [deviceId, dev] of this.devices.entries()) {
      if (dev.isOnline && (now - dev.lastSeen > 20000)) {
        dev.isOnline = false;
        // Evaluate timeout symbol on DFA
        if (dev.currentState !== "S0_IDLE") {
          dev.dfa.evaluateTransition("DISC", null, { reason: "HEARTBEAT_TIMEOUT" });
          dev.currentState = dev.dfa.getCurrentState();
        }
        this.broadcast({
          type: "DEVICE_OFFLINE",
          payload: {
            deviceId: deviceId,
            reason: "Heartbeat timeout (>20s silence)"
          }
        });
      }
    }
  }

  getDevicesList() {
    const list = [];
    for (const dev of this.devices.values()) {
      list.push(dev.getSnapshot());
    }
    return list;
  }

  getDeviceById(id) {
    const dev = this.devices.get(id);
    return dev ? dev.getSnapshot() : null;
  }

  resetAll() {
    this.devices.clear();
    this.packets = [];
    this.alerts = [];
    this.metrics.totalPackets = 0;
    this.metrics.validPackets = 0;
    this.metrics.regexErrors = 0;
    this.metrics.dfaViolations = 0;
    this.metrics.packetsPerSecond = 0;

    this.broadcast({
      type: "STORE_RESET",
      payload: {
        timestamp: Date.now()
      }
    });
  }

  getSummaryMetrics() {
    const passRate = this.metrics.totalPackets > 0
      ? ((this.metrics.validPackets / this.metrics.totalPackets) * 100).toFixed(1)
      : "100.0";

    let onlineCount = 0;
    let trapCount = 0;
    for (const d of this.devices.values()) {
      if (d.isOnline) onlineCount++;
      if (d.inTrap) trapCount++;
    }

    return {
      totalPackets: this.metrics.totalPackets,
      validPackets: this.metrics.validPackets,
      regexErrors: this.metrics.regexErrors,
      dfaViolations: this.metrics.dfaViolations,
      passRatePercent: parseFloat(passRate),
      packetsPerSecond: this.metrics.packetsPerSecond,
      recentPpsWindow: this.metrics.recentPpsWindow,
      totalDevices: this.devices.size,
      onlineDevices: onlineCount,
      trapDevices: trapCount
    };
  }
}

export const defaultStore = new StateStore();
