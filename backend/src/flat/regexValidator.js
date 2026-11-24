/**
 * Lexical Validator using Formal Regular Expressions
 * Module: FLAT / Regex Engine
 */

import { FLAT_SPEC } from "./protocolGrammar.js";

// Fast CRC32 calculation table
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  CRC_TABLE[i] = c >>> 0;
}

export function calculateCRC32(str) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ code) & 0xFF];
  }
  return ((crc ^ 0xFFFFFFFF) >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

export class RegexValidator {
  constructor() {
    this.compiledRules = {};
    for (const [key, rule] of Object.entries(FLAT_SPEC.regexRules)) {
      this.compiledRules[key] = new RegExp(rule.pattern, rule.flags);
    }
  }

  /**
   * Performs complete lexical and syntactical verification on raw packet wire string
   * @param {string} rawString 
   * @returns {Object} validation report
   */
  validatePacket(rawString) {
    const report = {
      isValid: true,
      timestamp: Date.now(),
      raw: rawString,
      rulesChecked: [],
      tokens: null,
      errors: [],
      calculatedCrc: null,
      isCrcValid: false
    };

    if (!rawString || typeof rawString !== "string") {
      report.isValid = false;
      report.errors.push("Empty or non-string packet received.");
      return report;
    }

    // 1. Check Full Frame Syntax Regex
    const frameRegex = this.compiledRules.FRAME_SYNTAX;
    const passesFrame = frameRegex.test(rawString.trim());
    report.rulesChecked.push({
      ruleId: FLAT_SPEC.regexRules.FRAME_SYNTAX.id,
      name: FLAT_SPEC.regexRules.FRAME_SYNTAX.name,
      pattern: FLAT_SPEC.regexRules.FRAME_SYNTAX.pattern,
      passed: passesFrame
    });

    if (!passesFrame) {
      report.isValid = false;
      report.errors.push("Syntax Error: Packet fails PDU Frame Regular Expression grammar.");
      // Attempt partial token extraction to locate where the syntax failed
      this._extractFaultyTokens(rawString, report);
      return report;
    }

    // 2. Tokenize pipe-delimited packet
    // IOTPDU/v1|TCP|DEV-TEMP-0012|DATA|SEQ:10|ACK:9|TS:1732435000000|LEN:98|PAYLOAD:{...}|CRC32:A1B2C3D4
    const parts = rawString.trim().split("|");
    const [headerVersion, transport, deviceId, packetType, seqPart, ackPart, tsPart, lenPart, payloadPart, crcPart] = parts;

    const tokens = {
      header: headerVersion,
      transport: transport,
      deviceId: deviceId,
      packetType: packetType,
      sequence: parseInt(seqPart.replace("SEQ:", ""), 10),
      ack: parseInt(ackPart.replace("ACK:", ""), 10),
      timestamp: parseInt(tsPart.replace("TS:", ""), 10),
      declaredLength: parseInt(lenPart.replace("LEN:", ""), 10),
      rawPayload: payloadPart.replace("PAYLOAD:", ""),
      declaredCrc: crcPart.replace("CRC32:", "")
    };
    report.tokens = tokens;

    // 3. Verify Device ID Regex
    const devIdRegex = this.compiledRules.DEVICE_ID;
    const passesDevId = devIdRegex.test(tokens.deviceId);
    report.rulesChecked.push({
      ruleId: FLAT_SPEC.regexRules.DEVICE_ID.id,
      name: FLAT_SPEC.regexRules.DEVICE_ID.name,
      pattern: FLAT_SPEC.regexRules.DEVICE_ID.pattern,
      passed: passesDevId
    });
    if (!passesDevId) {
      report.isValid = false;
      report.errors.push(`Device Identifier '${tokens.deviceId}' does not conform to regex pattern.`);
    }

    // 4. Verify Payload Regex if DATA or ALERT packet
    if (tokens.packetType === "DATA" || tokens.packetType === "ALERT") {
      const payloadRegex = this.compiledRules.TELEMETRY_PAYLOAD;
      const passesPayload = payloadRegex.test(tokens.rawPayload);
      report.rulesChecked.push({
        ruleId: FLAT_SPEC.regexRules.TELEMETRY_PAYLOAD.id,
        name: FLAT_SPEC.regexRules.TELEMETRY_PAYLOAD.name,
        pattern: FLAT_SPEC.regexRules.TELEMETRY_PAYLOAD.pattern,
        passed: passesPayload
      });
      if (!passesPayload) {
        report.isValid = false;
        report.errors.push(`Payload '${tokens.rawPayload}' failed Telemetry JSON Schema Regular Expression.`);
      } else {
        try {
          tokens.parsedPayload = JSON.parse(tokens.rawPayload);
        } catch {
          report.isValid = false;
          report.errors.push("Payload string matches regex but fails strict JSON parse.");
        }
      }
    }

    // 5. Verify CRC32 Checksum
    const checksumRegex = this.compiledRules.CHECKSUM_HEX;
    const passesChecksumSyntax = checksumRegex.test(tokens.declaredCrc);
    report.rulesChecked.push({
      ruleId: FLAT_SPEC.regexRules.CHECKSUM_HEX.id,
      name: FLAT_SPEC.regexRules.CHECKSUM_HEX.name,
      pattern: FLAT_SPEC.regexRules.CHECKSUM_HEX.pattern,
      passed: passesChecksumSyntax
    });

    if (!passesChecksumSyntax) {
      report.isValid = false;
      report.errors.push("CRC32 Checksum format is invalid hexadecimal (must be 8 hex digits).");
    } else {
      // Calculate CRC32 of content before |CRC32:
      const contentToHash = rawString.substring(0, rawString.lastIndexOf("|CRC32:"));
      const calculatedCrc = calculateCRC32(contentToHash);
      report.calculatedCrc = calculatedCrc;
      report.isCrcValid = (calculatedCrc.toUpperCase() === tokens.declaredCrc.toUpperCase());

      if (!report.isCrcValid) {
        report.isValid = false;
        report.errors.push(`Checksum Mismatch: Declared ${tokens.declaredCrc} != Computed ${calculatedCrc}`);
      }
    }

    return report;
  }

  _extractFaultyTokens(rawString, report) {
    if (!rawString.startsWith("IOTPDU/")) {
      report.errors.push("Protocol framing violation: Missing or corrupt preamble 'IOTPDU/'");
    }
    const parts = rawString.split("|");
    if (parts.length < 10) {
      report.errors.push(`Insufficient fields: Expected 10 delimited segments, received ${parts.length}`);
    }
  }
}

export const defaultValidator = new RegexValidator();
