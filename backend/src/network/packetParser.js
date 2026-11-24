/**
 * IoT Protocol Data Unit (PDU) Parser & Serializer
 * Module: Computer Networks (CN) / Protocol Engineering
 */

import { calculateCRC32 } from "../flat/regexValidator.js";

export class PacketParser {
  /**
   * Serializes packet fields into standardized wire string format
   */
  static serialize({
    version = 1,
    transport = "TCP",
    deviceId,
    packetType,
    seq,
    ack = 0,
    timestamp = Date.now(),
    payload = "NONE"
  }) {
    const payloadStr = (typeof payload === "object") ? JSON.stringify(payload) : String(payload);
    const byteLength = Buffer.byteLength(payloadStr, "utf8");

    // Construct body prior to CRC32
    const body = `IOTPDU/v${version}|${transport}|${deviceId}|${packetType}|SEQ:${seq}|ACK:${ack}|TS:${timestamp}|LEN:${byteLength}|PAYLOAD:${payloadStr}`;
    const crc32 = calculateCRC32(body);
    return `${body}|CRC32:${crc32}`;
  }

  /**
   * Parses and decomposes raw wire buffer or string into structured packet
   */
  static parse(rawString) {
    if (!rawString || typeof rawString !== "string") {
      throw new Error("Invalid raw packet input");
    }

    const trimmed = rawString.trim();
    const parts = trimmed.split("|");
    if (parts.length < 10) {
      throw new Error(`Malformed PDU: Expected 10 delimited segments, got ${parts.length}`);
    }

    const [headerVersion, transport, deviceId, packetType, seqPart, ackPart, tsPart, lenPart, payloadPart, crcPart] = parts;

    const version = headerVersion.replace("IOTPDU/v", "");
    const seq = parseInt(seqPart.replace("SEQ:", ""), 10);
    const ack = parseInt(ackPart.replace("ACK:", ""), 10);
    const timestamp = parseInt(tsPart.replace("TS:", ""), 10);
    const len = parseInt(lenPart.replace("LEN:", ""), 10);
    const rawPayload = payloadPart.replace("PAYLOAD:", "");
    const crc32 = crcPart ? crcPart.replace("CRC32:", "") : "";

    let parsedPayload = null;
    if (rawPayload && rawPayload !== "NONE") {
      try {
        parsedPayload = JSON.parse(rawPayload);
      } catch {
        parsedPayload = rawPayload;
      }
    }

    return {
      version,
      transport,
      deviceId,
      packetType,
      seq,
      ack,
      timestamp,
      len,
      rawPayload,
      parsedPayload,
      crc32,
      rawFrame: trimmed,
      byteSize: Buffer.byteLength(trimmed, "utf8")
    };
  }

  /**
   * Produces detailed Hex Dump & Bitfield mapping for Computer Networks inspector UI
   */
  static getPduInspection(rawString) {
    const buf = Buffer.from(rawString, "utf8");
    const hexArray = [];
    const asciiArray = [];

    for (let i = 0; i < buf.length; i++) {
      const b = buf[i];
      hexArray.push(b.toString(16).toUpperCase().padStart(2, "0"));
      asciiArray.push((b >= 32 && b <= 126) ? String.fromCharCode(b) : ".");
    }

    return {
      hexDump: hexArray.join(" "),
      asciiDump: asciiArray.join(""),
      totalBytes: buf.length,
      headerBytes: rawString.indexOf("|PAYLOAD:"),
      crcOffset: rawString.lastIndexOf("|CRC32:")
    };
  }
}
