# IoT Device Communication Monitoring and Validation System
### An Academic Integration Project for **Computer Networks (CN)**, **Full Stack Web Development (FSWD)**, and **Formal Languages & Automata Theory (FLAT)**

[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![WebSockets](https://img.shields.io/badge/WebSockets-ws-blue)](https://github.com/websockets/ws)
[![FLAT](https://img.shields.io/badge/FLAT-DFA%20%26%20Regex-purple)](docs/FLAT_REPORT.md)
[![CN](https://img.shields.io/badge/CN-TCP%20%2F%20UDP%20Sockets-orange)](docs/CN_REPORT.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📌 Project Overview

The **IoT Device Communication Monitoring and Validation System** is an end-to-end distributed system and interactive web dashboard designed to monitor, inspect, and validate real-time communications from simulated IoT sensor fleets over actual network sockets.

The system combines three foundational pillars of computer science:
1. **Computer Networks (CN)**: Multi-protocol socket listeners (TCP & UDP), Protocol Data Unit (PDU) framing, CRC32 error-detection hashes, and network link emulation (latency, jitter, packet drop).
2. **Formal Languages & Automata Theory (FLAT)**: Strict lexical format validation using formal Regular Expressions ($R_1 \dots R_5$) and protocol sequence verification using a Deterministic Finite Automaton (DFA $M = (Q, \Sigma, \delta, q_0, F)$) with an absorbing error/trap state ($S\_TRAP$).
3. **Full Stack Web Development (FSWD)**: A modern, reactive cyber-themed dashboard built with React 18, Vite, Tailwind CSS, Lucide icons, and WebSockets for real-time bidirectional streaming.

---

## 🏛️ System Architecture

```
[ Virtual IoT Devices (Simulated Fleet) ]
   ├── DEV-TEMP-1001 (HVAC Sensor over TCP)
   ├── DEV-ENV-2042  (Climate Sensor over UDP)
   ├── DEV-PWR-3099  (Power Meter over TCP)
   └── DEV-IND-4015  (Hydraulic Node over TCP)
             │
             │  (Real TCP Sockets :8085 / UDP Datagrams :8086)
             ▼
[ Network Link Impairment Emulator ]
   ├── RTT Latency Jitter (Gaussian variance)
   ├── Bernoulli Packet Drop Simulation
   └── Sequence Reordering & Duplicate Injection
             │
             ▼
[ Multi-Protocol Ingestion Server (Node.js) ]
   ├── 1. Computer Networks Inspector (PDU bitfield & hex extraction)
   ├── 2. FLAT Lexical Validator (Formal Regular Expressions)
   │      └── Checksum Verification (CRC32 polynomial 0xEDB88320)
   ├── 3. FLAT Automata Engine (Deterministic Finite Automaton M)
   │      ├── State Progression δ(q, σ) → q'
   │      ├── Monotonic Sequence Check (Seq_k = Seq_{k-1} + 1)
   │      └── Absorbing Error Sink State (S_TRAP)
   └── 4. Central In-Memory Ring Store (500-packet & alert buffers)
             │
             ├── REST API (:5000/api)
             └── WebSockets (:5000/ws)
                   │
                   ▼
[ Modern Web Dashboard (React 18 + Vite + Tailwind CSS) ]
   ├── Live Fleet Status & Telemetry Gauges
   ├── Interactive SVG DFA State Machine Diagram (Real-Time Node Glow)
   ├── Full State Transition Matrix δ(Q, Σ)
   ├── Interactive Regex Testing Laboratory & Decomposer
   ├── Network Inspector & PDU Wire Hex Viewer
   ├── Searchable & Filterable Live Packet Stream
   ├── Validation & Security Incident Log
   └── Attack Injection Cockpit (One-Click Anomaly Triggers)
```

---

## 🔬 Academic Domain Breakdown

### 1. Computer Networks (CN)
- **Multi-Protocol Sockets**:
  - **TCP Server** (`127.0.0.1:8085`): Connection-oriented byte stream with newline framing and automated TCP ACKs.
  - **UDP Server** (`127.0.0.1:8086`): Connectionless, minimal overhead datagram receiver for high-frequency telemetry.
- **PDU Wire Serialization**:
  ```
  IOTPDU/v1|TCP|DEV-TEMP-1001|DATA|SEQ:12|ACK:11|TS:1732435000000|LEN:98|PAYLOAD:{...}|CRC32:3D82A7C1
  ```
- **Error Detection**: 32-bit standard IEEE 802.3 Cyclic Redundancy Check (CRC32) calculated over frame content.
- **Link Impairment Emulator**: Configurable RTT latency (0–400ms), jitter ($\pm 100$ms), and packet drop probability (0–50%).

### 2. Formal Languages & Automata Theory (FLAT)
- **Lexical Grammar (Chomsky Type-3 / Regular Languages)**:
  - $R_1$: PDU Frame Serialization Syntax
  - $R_2$: Hardware Identifier Format (`DEV-(TEMP|ENV|PWR|FLOW|IND|SEC)-\d{4}`)
  - $R_3$: Telemetry JSON Schema Pattern
  - $R_4$: 8-digit Hexadecimal Checksum (`^[0-9A-Fa-f]{8}$`)
  - $R_5$: IPv4 Dotted-Decimal Socket Address
- **Deterministic Finite Automaton (DFA)**:
  - **Formal 5-Tuple**: $M = (Q, \Sigma, \delta, q_0, F)$
  - **States ($Q$)**: $\{ S0\_IDLE, S1\_HANDSHAKE, S2\_AUTHENTICATING, S3\_READY, S4\_STREAMING, S5\_PING\_WAIT, S6\_CRITICAL\_ALERT, S\_TRAP \}$
  - **Alphabet ($\Sigma$)**: $\{ SYN, SYN\_ACK, AUTH, AUTH\_ACK, DATA, PING, PONG, ACK, ALERT, DISC, RST \}$
  - **Start State ($q_0$)**: $S0\_IDLE$
  - **Accept States ($F$)**: $\{ S0\_IDLE, S3\_READY, S4\_STREAMING \}$
  - **Absorbing Error Trap ($S\_TRAP$)**: Any sequence violation (e.g. `DATA` before `SYN/AUTH`) or sequence replay triggers an immediate transition to $S\_TRAP$, quarantining the device until administrative `RST` is received.

### 3. Full Stack Web Development (FSWD)
- **Frontend**: React 18, Vite, Tailwind CSS, Lucide icons, responsive high-contrast cyber theme with real-time SVG vector state diagram.
- **Backend**: Node.js, Express REST API, `ws` WebSocket broadcast gateway, circular ring buffers.
- **Live WebSocket Streaming**: Client dashboard receives real-time packet ingestion, metrics updates, and alerts with zero polling.

---

## ⚡ Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- npm (v9.0.0 or higher)

### 1. Installation
Clone the repository and install all dependencies for both backend and frontend:

```bash
# Clone repository
git clone https://github.com/<your-username>/iot-validation-system.git
cd iot-validation-system

# Install dependencies
npm run install:all
```

### 2. Build Frontend
```bash
npm run build
```

### 3. Launch System
```bash
npm start
```

Open your browser at:
👉 **`http://localhost:5000`**

*(Both the frontend dashboard and backend socket servers are live. Simulated IoT devices will automatically connect and stream telemetry).*

---

## 🧪 Automated Verification Suite

Run the built-in automated test suite verifying all 14 CN, FLAT, and FSWD invariants:

```bash
node backend/test/systemTest.js
```

**Test Coverage Output:**
```
=================================================
RUNNING AUTOMATED VERIFICATION SUITE (CN • FLAT • FSWD)
=================================================
[PASS] FLAT/CN: Deterministic 8-character CRC32 generation
[PASS] FLAT Regex: Valid PDU frame passes all 5 grammatical rules
[PASS] FLAT Regex: Invalid protocol preamble rejected by R1_FRAME_FORMAT
[PASS] FLAT Regex: Non-conforming telemetry payload rejected by R3_TELEMETRY_PAYLOAD
[PASS] CN/FLAT: Tampered CRC32 detected and rejected
[PASS] FLAT Automata: Machine initializes at start state q0 (S0_IDLE)
[PASS] FLAT Automata: δ(S0_IDLE, SYN) → S1_HANDSHAKE
[PASS] FLAT Automata: δ(S1_HANDSHAKE, AUTH) → S3_READY (Accept State)
[PASS] FLAT Automata: δ(S3_READY, DATA) → S4_STREAMING
[PASS] FLAT Automata: Self-loop δ(S4_STREAMING, DATA) → S4_STREAMING
[PASS] FLAT Automata: δ(S0_IDLE, DATA) is undefined → Device routed to absorbing sink state S_TRAP
[PASS] FSWD Store: SYN processed, device in S1_HANDSHAKE
[PASS] FSWD Store: AUTH processed, device in S3_READY
[PASS] FSWD Store: Telemetry accepted, device in S4_STREAMING
=================================================
TEST SUMMARY: 14/14 TESTS PASSED (100% SUCCESS)
=================================================
```

---

## 🎯 Attack Vectors & Live Demonstrations

The dashboard includes a dedicated **Attack Injection Cockpit** allowing one-click verification of security and validation controls:

| Vector | Classification | Triggered Mechanism | Expected System Response |
| :--- | :--- | :--- | :--- |
| **Data Without Handshake** | FLAT Automata | Sends `DATA` from $S0\_IDLE$ | $\delta(S0, DATA) \to S\_TRAP$ triggered; CRITICAL alert generated; device quarantined. |
| **Skip Authentication** | FLAT Automata | Sends `SYN` then `DATA` (no `AUTH`) | $\delta(S1, DATA) \to S\_TRAP$ triggered; rogue transition logged in audit trail. |
| **Sequence Replay Attack** | Sequence Verification | Replays stale sequence number | Duplicate sequence anomaly flagged; potential replay attack alert emitted. |
| **Malformed Frame Syntax** | FLAT Lexical | Breaks preamble and separators | $R_1$ regex mismatch; warning alert emitted; frame rejected at wire boundary. |
| **Payload Schema Failure** | FLAT Lexical | Invalid JSON data types/ranges | $R_3$ regex mismatch; sensor reading dropped. |
| **Corrupted CRC32 Checksum** | CN Integrity | Modifies 8-digit hex hash | Checksum mismatch; packet flagged as corrupted in transit. |
| **Network Latency/Loss Spike**| CN Transport | Injects 350ms delay & 40% loss | Dynamic drop counters and RTT graphs react in real-time. |
| **Protocol Reset (RST)** | Automata Recovery | Emits `RST` control symbol | Absorbing state cleared: $\delta(S\_TRAP, RST) \to S0\_IDLE$. |

---

## 📂 Project Structure

```
iot-validation-system/
├── backend/
│   ├── src/
│   │   ├── flat/
│   │   │   ├── dfaEngine.js          # Deterministic Finite Automaton (Q, Sigma, delta, q0, F)
│   │   │   ├── protocolGrammar.js    # Formal definitions, token sets, transition matrix
│   │   │   └── regexValidator.js     # Lexical validation & CRC32 calculation
│   │   ├── network/
│   │   │   ├── linkEmulator.js       # RTT jitter, drop rate, and reorder simulator
│   │   │   ├── packetParser.js       # PDU serialization, bitfield & hex inspector
│   │   │   ├── tcpServer.js          # Native TCP socket listener (:8085)
│   │   │   └── udpServer.js          # Native UDP datagram socket listener (:8086)
│   │   ├── simulator/
│   │   │   ├── attackInjector.js     # One-click security vector injector
│   │   │   └── deviceSimulator.js    # Multi-device virtual IoT fleet
│   │   ├── store/
│   │   │   └── stateStore.js         # Circular ring buffers & real-time event broker
│   │   └── server.js                 # Express REST API & WebSocket server (:5000)
│   ├── test/
│   │   └── systemTest.js             # Automated 14-test verification suite
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AlertCenter.jsx       # Incident log & security alert feed
│   │   │   ├── AttackControlPanel.jsx# One-click attack injection cockpit
│   │   │   ├── DeviceFleet.jsx       # Real-time device cards & telemetry gauges
│   │   │   ├── DfaVisualizer.jsx     # Interactive SVG DFA graph & delta matrix
│   │   │   ├── MetricsOverview.jsx   # Top KPI metrics & throughput counters
│   │   │   ├── Navbar.jsx            # Header, tab navigation, simulation toggle
│   │   │   ├── NetworkInspector.jsx  # PDU hex dump & link emulator controls
│   │   │   ├── PacketStream.jsx      # Filterable message table with modal audit
│   │   │   └── RegexEngineView.jsx   # Regex rule catalog & testing laboratory
│   │   ├── hooks/
│   │   │   └── useSocket.js          # Auto-reconnecting WebSocket client hook
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
├── docs/
│   ├── CN_REPORT.md                  # Computer Networks comprehensive technical report
│   ├── FLAT_REPORT.md                # Formal Languages and Automata Theory formal report
│   ├── FSWD_REPORT.md                # Full Stack Web Development architecture report
│   └── GITHUB_PUSH_GUIDE.md          # Step-by-step instructions to push to GitHub
├── .gitignore
├── package.json                      # Root workspace scripts
└── README.md                         # Main repository documentation
```

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
