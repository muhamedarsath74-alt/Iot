/**
 * In-Browser Formal Automata & Regex Engine (Vercel Standalone Support)
 * Ensures 100% functionality on static/serverless Vercel deployments
 */

export const FLAT_SPEC = {
  name: "IoT-SecPDU Protocol Automaton",
  version: "2.1.0",
  formalDefinition: {
    states: [
      "S0_IDLE",
      "S1_HANDSHAKE",
      "S2_AUTHENTICATING",
      "S3_READY",
      "S4_STREAMING",
      "S5_PING_WAIT",
      "S6_CRITICAL_ALERT",
      "S_TRAP"
    ],
    startState: "S0_IDLE",
    acceptStates: ["S0_IDLE", "S3_READY", "S4_STREAMING"],
    alphabet: [
      "SYN", "SYN_ACK", "AUTH", "AUTH_ACK", "DATA",
      "PING", "PONG", "ACK", "ALERT", "DISC", "RST"
    ]
  },
  stateDetails: {
    "S0_IDLE": { label: "S0: Idle / Disconnected", color: "zinc", isStart: true, isAccept: true },
    "S1_HANDSHAKE": { label: "S1: Handshake (SYN)", color: "cyan", isAccept: false },
    "S2_AUTHENTICATING": { label: "S2: Authenticating", color: "blue", isAccept: false },
    "S3_READY": { label: "S3: Ready / Session Active", color: "emerald", isAccept: true },
    "S4_STREAMING": { label: "S4: Streaming Telemetry", color: "violet", isAccept: true },
    "S5_PING_WAIT": { label: "S5: Heartbeat Wait", color: "amber", isAccept: false },
    "S6_CRITICAL_ALERT": { label: "S6: Critical Anomaly Alert", color: "rose", isAccept: false },
    "S_TRAP": { label: "S_TRAP: Protocol Sink / Trap", color: "red", isTrap: true }
  },
  transitions: {
    "S0_IDLE": { "SYN": "S1_HANDSHAKE", "RST": "S0_IDLE" },
    "S1_HANDSHAKE": { "SYN_ACK": "S2_AUTHENTICATING", "AUTH": "S3_READY", "DISC": "S0_IDLE", "RST": "S0_IDLE" },
    "S2_AUTHENTICATING": { "AUTH": "S3_READY", "AUTH_ACK": "S3_READY", "DISC": "S0_IDLE", "RST": "S0_IDLE" },
    "S3_READY": { "DATA": "S4_STREAMING", "PING": "S5_PING_WAIT", "ALERT": "S6_CRITICAL_ALERT", "DISC": "S0_IDLE", "RST": "S0_IDLE" },
    "S4_STREAMING": { "DATA": "S4_STREAMING", "ACK": "S3_READY", "PING": "S5_PING_WAIT", "ALERT": "S6_CRITICAL_ALERT", "DISC": "S0_IDLE", "RST": "S0_IDLE" },
    "S5_PING_WAIT": { "PONG": "S3_READY", "DATA": "S4_STREAMING", "DISC": "S0_IDLE", "RST": "S0_IDLE" },
    "S6_CRITICAL_ALERT": { "ACK": "S3_READY", "DISC": "S0_IDLE", "RST": "S0_IDLE" },
    "S_TRAP": { "RST": "S0_IDLE" }
  },
  regexRules: {
    FRAME_SYNTAX: {
      id: "R1_FRAME_FORMAT",
      name: "PDU Frame Serialization Syntax",
      pattern: "^IOTPDU\\/v[1-2]\\|(TCP|UDP)\\|DEV-[A-Z]{3,4}-\\d{4}\\|(SYN|SYN_ACK|AUTH|AUTH_ACK|DATA|PING|PONG|ACK|ALERT|DISC|RST)\\|SEQ:\\d{1,10}\\|ACK:\\d{1,10}\\|TS:\\d{13}\\|LEN:\\d{1,4}\\|PAYLOAD:(?:\\{[\\s\\S]*\\}|\\[[\\s\\S]*\\]|NONE)\\|CRC32:[0-9A-Fa-f]{8}$"
    },
    DEVICE_ID: {
      id: "R2_DEVICE_ID",
      name: "Device Hardware Identifier",
      pattern: "^DEV-(TEMP|ENV|PWR|FLOW|IND|SEC)-\\d{4}$"
    },
    TELEMETRY_PAYLOAD: {
      id: "R3_TELEMETRY_PAYLOAD",
      name: "Sensor Telemetry JSON Structure",
      pattern: '^\\{"temp":-?\\d{1,3}(?:\\.\\d+)?,"humidity":\\d{1,3}(?:\\.\\d+)?,"voltage":\\d{1,2}(?:\\.\\d+)?,"battery":\\d{1,3},"status":"(NORMAL|WARNING|CRITICAL)"\\}$'
    },
    CHECKSUM_HEX: {
      id: "R4_CHECKSUM_CRC32",
      name: "CRC32 Checksum Validation",
      pattern: "^[0-9A-Fa-f]{8}$"
    }
  }
};

// CRC32 table calculation
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

export class InBrowserDFA {
  constructor(deviceId) {
    this.deviceId = deviceId;
    this.currentState = "S0_IDLE";
    this.lastSeq = -1;
    this.step = 0;
    this.history = [];
    this.inTrap = false;
  }

  reset() {
    this.currentState = "S0_IDLE";
    this.lastSeq = -1;
    this.inTrap = false;
    this.history.push({
      step: ++this.step,
      fromState: "ANY",
      symbol: "RST",
      toState: "S0_IDLE",
      isValidTransition: true,
      formalExplanation: "Automaton reset to initial state q0 (S0_IDLE)."
    });
  }

  evaluate(symbol, seqNum = null) {
    const fromState = this.currentState;
    const isAlphabet = FLAT_SPEC.formalDefinition.alphabet.includes(symbol);
    
    const result = {
      step: ++this.step,
      fromState,
      symbol,
      toState: null,
      isValidTransition: false,
      isSequenceValid: true,
      formalExplanation: ""
    };

    if (!isAlphabet) {
      this.currentState = "S_TRAP";
      this.inTrap = true;
      result.toState = "S_TRAP";
      result.formalExplanation = `Symbol Error: '${symbol}' ∉ Σ. Alphabet violation. Routed to S_TRAP.`;
      this.history.push(result);
      return result;
    }

    if (seqNum !== null && this.lastSeq !== -1) {
      if (seqNum <= this.lastSeq) {
        result.isSequenceValid = false;
        result.formalExplanation = `Sequence Anomaly: Duplicate/out-of-order sequence #${seqNum} received.`;
      }
      this.lastSeq = seqNum;
    }

    const stateTransitions = FLAT_SPEC.transitions[fromState] || {};
    const nextState = stateTransitions[symbol];

    if (nextState) {
      this.currentState = nextState;
      result.toState = nextState;
      result.isValidTransition = true;
      result.formalExplanation = `Valid Transition: δ(${fromState}, ${symbol}) → ${nextState}.`;
      if (nextState === "S_TRAP") this.inTrap = true;
    } else {
      this.currentState = "S_TRAP";
      this.inTrap = true;
      result.toState = "S_TRAP";
      result.isValidTransition = false;
      result.formalExplanation = `Automata Violation: δ(${fromState}, ${symbol}) is undefined. Sequence violation detected! Routed to S_TRAP.`;
    }

    if (this.history.length > 30) this.history.shift();
    this.history.push(result);
    return result;
  }
}

export class InBrowserValidator {
  static validate(rawString) {
    const report = {
      isValid: true,
      raw: rawString,
      rulesChecked: [],
      tokens: null,
      errors: []
    };

    if (!rawString) {
      report.isValid = false;
      report.errors.push("Empty packet");
      return report;
    }

    const frameRegex = new RegExp(FLAT_SPEC.regexRules.FRAME_SYNTAX.pattern);
    const passesFrame = frameRegex.test(rawString.trim());
    report.rulesChecked.push({
      ruleId: "R1_FRAME_FORMAT",
      name: "PDU Frame Syntax",
      passed: passesFrame
    });

    if (!passesFrame) {
      report.isValid = false;
      report.errors.push("Frame Syntax Error: Packet fails PDU Regular Expression.");
      return report;
    }

    const parts = rawString.trim().split("|");
    const [header, transport, deviceId, packetType, seqPart, ackPart, tsPart, lenPart, payloadPart, crcPart] = parts;
    const tokens = {
      header,
      transport,
      deviceId,
      packetType,
      sequence: parseInt(seqPart.replace("SEQ:", ""), 10),
      rawPayload: payloadPart.replace("PAYLOAD:", ""),
      declaredCrc: crcPart.replace("CRC32:", "")
    };
    report.tokens = tokens;

    // Check payload if DATA
    if (tokens.packetType === "DATA" || tokens.packetType === "ALERT") {
      const payloadRegex = new RegExp(FLAT_SPEC.regexRules.TELEMETRY_PAYLOAD.pattern);
      const passesPayload = payloadRegex.test(tokens.rawPayload);
      report.rulesChecked.push({
        ruleId: "R3_TELEMETRY_PAYLOAD",
        name: "Telemetry JSON Payload",
        passed: passesPayload
      });
      if (!passesPayload) {
        report.isValid = false;
        report.errors.push("Payload violates Telemetry Schema Regular Expression.");
      }
    }

    // Check CRC
    const contentToHash = rawString.substring(0, rawString.lastIndexOf("|CRC32:"));
    const calculatedCrc = calculateCRC32(contentToHash);
    report.calculatedCrc = calculatedCrc;
    report.isCrcValid = calculatedCrc.toUpperCase() === tokens.declaredCrc.toUpperCase();
    if (!report.isCrcValid) {
      report.isValid = false;
      report.errors.push(`CRC Mismatch: Declared ${tokens.declaredCrc} != Computed ${calculatedCrc}`);
    }

    return report;
  }
}
