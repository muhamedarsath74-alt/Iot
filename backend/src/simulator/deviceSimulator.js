/**
 * Virtual Multi-Device IoT Fleet Simulator
 * Module: Computer Networks (CN) & FSWD
 * 
 * Creates realistic IoT devices communicating over real TCP & UDP sockets.
 */

import net from "net";
import dgram from "dgram";
import { PacketParser } from "../network/packetParser.js";

const PRESET_DEVICES = [
  { id: "DEV-TEMP-1001", name: "HVAC Temperature Sensor A1", transport: "TCP", type: "TEMP", intervalMs: 2000 },
  { id: "DEV-ENV-2042", name: "Greenhouse Climate Station", transport: "UDP", type: "ENV", intervalMs: 2500 },
  { id: "DEV-PWR-3099", name: "Main Distribution Power Meter", transport: "TCP", type: "PWR", intervalMs: 3000 },
  { id: "DEV-IND-4015", name: "Turbine Hydraulic Pressure Node", transport: "TCP", type: "IND", intervalMs: 1800 },
  { id: "DEV-FLOW-5021", name: "Coolant Flow Rate Sensor", transport: "UDP", type: "FLOW", intervalMs: 2200 },
  { id: "DEV-SEC-6003", name: "Server Room Perimeter Sensor", transport: "TCP", type: "SEC", intervalMs: 3500 }
];

class SimulatedDevice {
  constructor(config, targetPorts = { tcp: 8085, udp: 8086 }) {
    this.id = config.id;
    this.name = config.name;
    this.transport = config.transport;
    this.type = config.type;
    this.intervalMs = config.intervalMs || 2500;
    this.targetPorts = targetPorts;

    this.seq = 1;
    this.isRunning = false;
    this.tcpClient = null;
    this.udpClient = null;
    this.timer = null;
    this.pingCounter = 0;

    // Sensor baseline state
    this.telemetry = {
      temp: 22.5 + (Math.random() * 5 - 2.5),
      humidity: 50.0 + (Math.random() * 10 - 5),
      voltage: 3.3,
      battery: 98,
      status: "NORMAL"
    };
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    if (this.transport === "TCP") {
      this._startTcpLifecycle();
    } else {
      this._startUdpLifecycle();
    }
  }

  stop() {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    // Send graceful disconnect DISC
    this._sendPacket("DISC", "NONE");

    if (this.tcpClient) {
      this.tcpClient.end();
      this.tcpClient.destroy();
      this.tcpClient = null;
    }

    if (this.udpClient) {
      this.udpClient.close();
      this.udpClient = null;
    }
  }

  _startTcpLifecycle() {
    this.tcpClient = new net.Socket();

    this.tcpClient.connect(this.targetPorts.tcp, "127.0.0.1", () => {
      // 1. Send SYN (Initial Handshake)
      this._sendPacket("SYN", "NONE");

      // 2. Send AUTH after 300ms
      setTimeout(() => {
        if (!this.isRunning) return;
        this._sendPacket("AUTH", JSON.stringify({ token: "AUTH_TOKEN_HASH_SECURE" }));

        // 3. Start steady telemetry streaming
        this.timer = setInterval(() => {
          this._stepCycle();
        }, this.intervalMs);
      }, 400);
    });

    this.tcpClient.on("error", (err) => {
      // Reconnect if server restarts
      if (this.isRunning) {
        setTimeout(() => this._startTcpLifecycle(), 2000);
      }
    });
  }

  _startUdpLifecycle() {
    this.udpClient = dgram.createSocket("udp4");

    // 1. Send SYN
    this._sendPacket("SYN", "NONE");

    // 2. Send AUTH
    setTimeout(() => {
      if (!this.isRunning) return;
      this._sendPacket("AUTH", JSON.stringify({ token: "UDP_AUTH_TOKEN_OK" }));

      // 3. Start steady telemetry streaming
      this.timer = setInterval(() => {
        this._stepCycle();
      }, this.intervalMs);
    }, 400);
  }

  _stepCycle() {
    if (!this.isRunning) return;

    this.pingCounter++;

    // Every 8 packets, send a PING keepalive
    if (this.pingCounter % 8 === 0) {
      this._sendPacket("PING", "NONE");
      return;
    }

    // Mutate sensor telemetry realistically
    this.telemetry.temp = parseFloat((this.telemetry.temp + (Math.random() * 0.8 - 0.4)).toFixed(1));
    this.telemetry.humidity = parseFloat((this.telemetry.humidity + (Math.random() * 1.2 - 0.6)).toFixed(1));
    this.telemetry.battery = Math.max(10, Math.round(this.telemetry.battery - 0.05));

    // Rare natural anomaly (high temp)
    if (Math.random() < 0.04) {
      this.telemetry.temp = parseFloat((48.5 + Math.random() * 8).toFixed(1));
      this.telemetry.status = "CRITICAL";
      this._sendPacket("ALERT", this.telemetry);
      this.telemetry.status = "NORMAL"; // reset
      return;
    }

    this.telemetry.status = "NORMAL";
    this._sendPacket("DATA", this.telemetry);
  }

  _sendPacket(packetType, payload) {
    const rawWire = PacketParser.serialize({
      version: 1,
      transport: this.transport,
      deviceId: this.id,
      packetType: packetType,
      seq: this.seq++,
      ack: Math.max(0, this.seq - 1),
      timestamp: Date.now(),
      payload: payload
    });

    if (this.transport === "TCP" && this.tcpClient && !this.tcpClient.destroyed) {
      this.tcpClient.write(rawWire + "\n");
    } else if (this.transport === "UDP" && this.udpClient) {
      const buf = Buffer.from(rawWire, "utf8");
      this.udpClient.send(buf, 0, buf.length, this.targetPorts.udp, "127.0.0.1");
    }
  }

  // Method used by attack injector to manually dispatch custom strings
  sendRawOverride(rawPacket) {
    if (this.transport === "TCP" && this.tcpClient && !this.tcpClient.destroyed) {
      this.tcpClient.write(rawPacket + "\n");
    } else if (this.udpClient) {
      const buf = Buffer.from(rawPacket, "utf8");
      this.udpClient.send(buf, 0, buf.length, this.targetPorts.udp, "127.0.0.1");
    }
  }
}

export class DeviceSimulatorFleet {
  constructor() {
    this.fleet = new Map();
    this.isActive = false;
  }

  startAll() {
    this.isActive = true;
    for (const preset of PRESET_DEVICES) {
      if (!this.fleet.has(preset.id)) {
        const dev = new SimulatedDevice(preset);
        this.fleet.set(preset.id, dev);
        dev.start();
      }
    }
    console.log(`[Simulator] Fleet started with ${this.fleet.size} virtual IoT devices.`);
  }

  stopAll() {
    this.isActive = false;
    for (const dev of this.fleet.values()) {
      dev.stop();
    }
    this.fleet.clear();
    console.log(`[Simulator] Fleet stopped.`);
  }

  getDevice(id) {
    return this.fleet.get(id);
  }

  getAllDevices() {
    return Array.from(this.fleet.values());
  }

  spawnCustomDevice({ id, name, transport = "TCP", intervalMs = 2000 }) {
    if (this.fleet.has(id)) {
      this.fleet.get(id).stop();
    }
    const dev = new SimulatedDevice({
      id: id || `DEV-IND-${Math.floor(1000 + Math.random() * 9000)}`,
      name: name || "Custom Virtual Sensor",
      transport: transport,
      type: "IND",
      intervalMs: intervalMs
    });
    this.fleet.set(dev.id, dev);
    dev.start();
    return dev;
  }
}

export const defaultSimulator = new DeviceSimulatorFleet();
