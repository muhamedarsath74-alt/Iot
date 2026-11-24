/**
 * Formal Languages and Automata Theory (FLAT) Specification
 * IoT Protocol Grammar & Finite State Automata Definitions
 * 
 * Formal 5-tuple: M = (Q, Σ, δ, q0, F)
 */

export const FLAT_SPEC = {
  name: "IoT-SecPDU Protocol Automaton",
  version: "2.1.0",
  formalDefinition: {
    states: [
      "S0_IDLE",          // q0: Initial state - Device offline/disconnected
      "S1_HANDSHAKE",     // q1: SYN received, awaiting mutual authentication
      "S2_AUTHENTICATING",// q2: In auth negotiation, awaiting credentials
      "S3_READY",         // q3: Authenticated & idle, ready for telemetry
      "S4_STREAMING",     // q4: Active telemetry data streaming
      "S5_PING_WAIT",     // q5: Keepalive ping transmitted, awaiting pong
      "S6_CRITICAL_ALERT",// q6: Sensor threshold breached / safety anomaly
      "S_TRAP"            // q_trap: Non-accepting sink state (Sequence/Security Violation)
    ],
    startState: "S0_IDLE",
    acceptStates: [
      "S0_IDLE",          // Clean teardown returns to S0_IDLE
      "S3_READY",         // Stable operational state
      "S4_STREAMING"      // Active data exchange state
    ],
    alphabet: [
      "SYN",              // Connection initialization
      "SYN_ACK",          // Server handshake acknowledgment
      "AUTH",             // Authentication token / credentials
      "AUTH_ACK",         // Server authorization granted
      "DATA",             // Valid sensor telemetry frame
      "PING",             // Heartbeat keep-alive check
      "PONG",             // Heartbeat keep-alive reply
      "ACK",              // Packet acknowledgment
      "ALERT",            // Emergency alert payload
      "DISC",             // Graceful disconnect request
      "RST"               // Protocol reset signal
    ]
  },

  // State metadata for frontend visualization and reports
  stateDetails: {
    "S0_IDLE": {
      label: "S0: Idle / Disconnected",
      description: "Initial quiescent state. Device is offline or reset.",
      color: "zinc",
      isStart: true,
      isAccept: true,
      isTrap: false
    },
    "S1_HANDSHAKE": {
      label: "S1: Handshake (SYN)",
      description: "SYN packet received. TCP/IoT Handshake initiated.",
      color: "cyan",
      isStart: false,
      isAccept: false,
      isTrap: false
    },
    "S2_AUTHENTICATING": {
      label: "S2: Authenticating",
      description: "SYN established. Awaiting cryptographic device token.",
      color: "blue",
      isStart: false,
      isAccept: false,
      isTrap: false
    },
    "S3_READY": {
      label: "S3: Ready / Session Active",
      description: "Device authenticated. Secure session active and ready.",
      color: "emerald",
      isStart: false,
      isAccept: true,
      isTrap: false
    },
    "S4_STREAMING": {
      label: "S4: Streaming Telemetry",
      description: "Continuous sensor data ingestion and verification.",
      color: "violet",
      isStart: false,
      isAccept: true,
      isTrap: false
    },
    "S5_PING_WAIT": {
      label: "S5: Heartbeat Wait",
      description: "PING heartbeat sent. Timer running awaiting PONG.",
      color: "amber",
      isStart: false,
      isAccept: false,
      isTrap: false
    },
    "S6_CRITICAL_ALERT": {
      label: "S6: Critical Anomaly Alert",
      description: "Emergency sensor alert triggered. Controller intervention required.",
      color: "rose",
      isStart: false,
      isAccept: false,
      isTrap: false
    },
    "S_TRAP": {
      label: "S_TRAP: Protocol Sink / Trap",
      description: "Formal absorbing sink state. Sequence violation or rogue packet detected.",
      color: "red",
      isStart: false,
      isAccept: false,
      isTrap: true
    }
  },

  // Formal transition mapping: δ(current_state, symbol) -> next_state
  transitions: {
    "S0_IDLE": {
      "SYN": "S1_HANDSHAKE",
      "RST": "S0_IDLE"
      // Any other symbol -> S_TRAP (e.g. DATA without SYN)
    },
    "S1_HANDSHAKE": {
      "SYN_ACK": "S2_AUTHENTICATING",
      "AUTH": "S3_READY", // direct auth after syn
      "DISC": "S0_IDLE",
      "RST": "S0_IDLE"
    },
    "S2_AUTHENTICATING": {
      "AUTH": "S3_READY",
      "AUTH_ACK": "S3_READY",
      "DISC": "S0_IDLE",
      "RST": "S0_IDLE"
    },
    "S3_READY": {
      "DATA": "S4_STREAMING",
      "PING": "S5_PING_WAIT",
      "ALERT": "S6_CRITICAL_ALERT",
      "DISC": "S0_IDLE",
      "RST": "S0_IDLE"
    },
    "S4_STREAMING": {
      "DATA": "S4_STREAMING", // Self loop for continuous data
      "ACK": "S3_READY",      // Batch acknowledgment returns to ready
      "PING": "S5_PING_WAIT",
      "ALERT": "S6_CRITICAL_ALERT",
      "DISC": "S0_IDLE",
      "RST": "S0_IDLE"
    },
    "S5_PING_WAIT": {
      "PONG": "S3_READY",
      "DATA": "S4_STREAMING",
      "DISC": "S0_IDLE",
      "RST": "S0_IDLE"
    },
    "S6_CRITICAL_ALERT": {
      "ACK": "S3_READY",      // Acknowledged by controller
      "DISC": "S0_IDLE",
      "RST": "S0_IDLE"
    },
    "S_TRAP": {
      "RST": "S0_IDLE"        // Trap state can only be cleared by explicit RST
      // All other transitions stay in S_TRAP
    }
  },

  // Regular Expression Definitions (Lexical Layer)
  regexRules: {
    // 1. Full Protocol Data Unit (PDU) Frame Format
    // Format: IOTPDU/v(1|2)|<TRANS>|<DEV_ID>|<TYPE>|SEQ:<num>|ACK:<num>|TS:<epoch_ms>|LEN:<bytes>|PAYLOAD:<json_or_none>|CRC32:<8_hex>
    FRAME_SYNTAX: {
      id: "R1_FRAME_FORMAT",
      name: "PDU Frame Serialization Syntax",
      pattern: "^IOTPDU\\/v[1-2]\\|(TCP|UDP)\\|DEV-[A-Z]{3,4}-\\d{4}\\|(SYN|SYN_ACK|AUTH|AUTH_ACK|DATA|PING|PONG|ACK|ALERT|DISC|RST)\\|SEQ:\\d{1,10}\\|ACK:\\d{1,10}\\|TS:\\d{13}\\|LEN:\\d{1,4}\\|PAYLOAD:(?:\\{[\\s\\S]*\\}|\\[[\\s\\S]*\\]|NONE)\\|CRC32:[0-9A-Fa-f]{8}$",
      flags: "",
      description: "Validates wire serialization, protocol preamble, pipe-delimited fields, and structural tags."
    },

    // 2. Device Identifier Syntax
    DEVICE_ID: {
      id: "R2_DEVICE_ID",
      name: "Device Hardware Identifier",
      pattern: "^DEV-(TEMP|ENV|PWR|FLOW|IND|SEC)-\\d{4}$",
      flags: "",
      description: "Enforces IoT device naming schema: prefix DEV, category code (3-4 letters), and 4-digit numeric ID."
    },

    // 3. Telemetry Payload Schema
    TELEMETRY_PAYLOAD: {
      id: "R3_TELEMETRY_PAYLOAD",
      name: "Sensor Telemetry JSON Structure",
      pattern: '^\\{"temp":-?\\d{1,3}(?:\\.\\d+)?,"humidity":\\d{1,3}(?:\\.\\d+)?,"voltage":\\d{1,2}(?:\\.\\d+)?,"battery":\\d{1,3},"status":"(NORMAL|WARNING|CRITICAL)"\\}$',
      flags: "",
      description: "Validates JSON telemetry fields: numeric ranges for temperature, humidity, voltage, battery, and enumeration for status."
    },

    // 4. Hexadecimal Checksum / CRC32
    CHECKSUM_HEX: {
      id: "R4_CHECKSUM_CRC32",
      name: "CRC32 Checksum Validation",
      pattern: "^[0-9A-Fa-f]{8}$",
      flags: "",
      description: "Verifies exactly 8 hexadecimal characters (32-bit CRC) representing packet integrity hash."
    },

    // 5. Network Address (IPv4:Port)
    NETWORK_SOCKET: {
      id: "R5_SOCKET_ADDR",
      name: "IPv4 Socket Address",
      pattern: "^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?):(?:6553[0-5]|655[0-2][0-9]|65[0-4][0-9]{2}|6[0-4][0-9]{3}|[1-5][0-9]{4}|[1-9][0-9]{0,3})$",
      flags: "",
      description: "Standard IPv4 dotted-decimal quad notation with valid port range (1-65535)."
    }
  }
};
