/**
 * Validation & Security Attack Vector Injector
 * Modules: FLAT, Computer Networks, and FSWD Security
 */

import { defaultSimulator } from "./deviceSimulator.js";
import { defaultLinkEmulator } from "../network/linkEmulator.js";
import { PacketParser } from "../network/packetParser.js";
import { defaultStore } from "../store/stateStore.js";
import { calculateCRC32 } from "../flat/regexValidator.js";

export class AttackInjector {
  /**
   * ATTACK 1: Malformed Frame Serialization (Regex Syntax Failure)
   * Violates R1_FRAME_FORMAT by corrupting preamble and separators
   */
  static injectMalformedFrame(targetId = "DEV-TEMP-1001") {
    const rawCorrupt = `BADPDU/vX#UNKNOWN_DELIMITERS#${targetId}#DATA#INVALID_HEX_CRC`;
    // Directly ingest or dispatch
    return defaultStore.ingestRawPacket(rawCorrupt, {
      transport: "TCP",
      ip: "192.168.1.199",
      port: 48911,
      latency: 12
    });
  }

  /**
   * ATTACK 2: Telemetry JSON Schema Violation (Regex Payload Failure)
   * Frame syntax is valid, but payload regex fails (e.g. invalid status, string temp)
   */
  static injectPayloadSchemaViolation(targetId = "DEV-TEMP-1001") {
    const badPayload = '{"temp":"EXTREME_HOT","humidity":-999,"voltage":"FIVE_VOLTS","battery":"LOW","status":"EXPLODING"}';
    const body = `IOTPDU/v1|TCP|${targetId}|DATA|SEQ:999|ACK:998|TS:${Date.now()}|LEN:${Buffer.byteLength(badPayload)}|PAYLOAD:${badPayload}`;
    const crc = calculateCRC32(body);
    const rawWire = `${body}|CRC32:${crc}`;

    return defaultStore.ingestRawPacket(rawWire, {
      transport: "TCP",
      ip: "192.168.1.105",
      port: 39120,
      latency: 15
    });
  }

  /**
   * ATTACK 3: Checksum / CRC32 Tampering (Integrity Failure)
   * Valid packet with tampered CRC32 hash to simulate packet corruption in transit
   */
  static injectCorruptedCrc(targetId = "DEV-PWR-3099") {
    const validPayload = '{"temp":23.5,"humidity":45.2,"voltage":3.3,"battery":90,"status":"NORMAL"}';
    const body = `IOTPDU/v1|TCP|${targetId}|DATA|SEQ:50|ACK:49|TS:${Date.now()}|LEN:${Buffer.byteLength(validPayload)}|PAYLOAD:${validPayload}`;
    const badCrc = "DEADBEEF"; // Intentionally falsified
    const rawWire = `${body}|CRC32:${badCrc}`;

    return defaultStore.ingestRawPacket(rawWire, {
      transport: "TCP",
      ip: "192.168.1.144",
      port: 52100,
      latency: 22
    });
  }

  /**
   * ATTACK 4: Data Without Handshake (DFA Protocol Violation)
   * Device sends DATA while still in S0_IDLE without completing SYN / AUTH.
   * Formal Automata: δ(S0_IDLE, DATA) is UNDEFINED -> Transition to S_TRAP!
   */
  static injectDataWithoutHandshake(targetId = null) {
    const rogueId = targetId || `DEV-ROGUE-${Math.floor(1000 + Math.random() * 9000)}`;
    const payload = '{"temp":25.0,"humidity":50.0,"voltage":3.3,"battery":99,"status":"NORMAL"}';
    const rawWire = PacketParser.serialize({
      version: 1,
      transport: "TCP",
      deviceId: rogueId,
      packetType: "DATA",
      seq: 1,
      ack: 0,
      timestamp: Date.now(),
      payload: payload
    });

    return defaultStore.ingestRawPacket(rawWire, {
      transport: "TCP",
      ip: "10.0.0.99",
      port: 44332,
      latency: 18
    });
  }

  /**
   * ATTACK 5: Skip Authentication (DFA Protocol Violation)
   * Device initiates SYN (transitions S0 -> S1), but then sends DATA directly without AUTH.
   * Formal Automata: δ(S1_HANDSHAKE, DATA) is UNDEFINED -> Transition to S_TRAP!
   */
  static injectSkipAuthAttack(targetId = "DEV-SEC-6003") {
    // 1. Send SYN
    const synPacket = PacketParser.serialize({
      version: 1,
      transport: "TCP",
      deviceId: targetId,
      packetType: "SYN",
      seq: 1,
      ack: 0,
      timestamp: Date.now(),
      payload: "NONE"
    });
    defaultStore.ingestRawPacket(synPacket, { transport: "TCP", latency: 10 });

    // 2. Immediately send DATA (skipping AUTH)
    const payload = '{"temp":30.0,"humidity":60.0,"voltage":3.3,"battery":85,"status":"NORMAL"}';
    const dataPacket = PacketParser.serialize({
      version: 1,
      transport: "TCP",
      deviceId: targetId,
      packetType: "DATA",
      seq: 2,
      ack: 1,
      timestamp: Date.now(),
      payload: payload
    });

    return defaultStore.ingestRawPacket(dataPacket, { transport: "TCP", latency: 14 });
  }

  /**
   * ATTACK 6: Sequence Number Replay Attack
   * Replays an already received sequence number.
   */
  static injectReplayAttack(targetId = "DEV-TEMP-1001") {
    const dev = defaultStore.devices.get(targetId);
    const staleSeq = dev ? Math.max(1, dev.lastSeq - 3) : 5;

    const payload = '{"temp":24.0,"humidity":48.0,"voltage":3.3,"battery":92,"status":"NORMAL"}';
    const rawWire = PacketParser.serialize({
      version: 1,
      transport: "TCP",
      deviceId: targetId,
      packetType: "DATA",
      seq: staleSeq, // Replayed sequence number!
      ack: staleSeq - 1,
      timestamp: Date.now(),
      payload: payload
    });

    return defaultStore.ingestRawPacket(rawWire, {
      transport: "TCP",
      ip: dev?.ip || "192.168.1.101",
      port: dev?.port || 31289,
      latency: 20
    });
  }

  /**
   * REMEDY: Protocol Reset (RST)
   * Transmits RST symbol to restore device DFA from S_TRAP back to S0_IDLE
   */
  static injectResetRecovery(targetId = "DEV-TEMP-1001") {
    const rawWire = PacketParser.serialize({
      version: 1,
      transport: "TCP",
      deviceId: targetId,
      packetType: "RST",
      seq: 9999,
      ack: 0,
      timestamp: Date.now(),
      payload: "NONE"
    });

    return defaultStore.ingestRawPacket(rawWire, {
      transport: "TCP",
      latency: 8
    });
  }

  /**
   * ATTACK 7: Network Impairment Spike
   * Injects burst latency and packet drop in the link emulator
   */
  static injectNetworkImpairment(latencyMs = 350, dropRate = 0.35) {
    defaultLinkEmulator.updateConfig({
      baseLatencyMs: latencyMs,
      jitterMs: 80,
      dropRate: dropRate,
      reorderRate: 0.2
    });

    // Reset back after 10 seconds
    setTimeout(() => {
      defaultLinkEmulator.updateConfig({
        baseLatencyMs: 25,
        jitterMs: 15,
        dropRate: 0.0,
        reorderRate: 0.0
      });
    }, 10000);

    return defaultLinkEmulator.getMetrics();
  }
}
