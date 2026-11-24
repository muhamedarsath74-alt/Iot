# Full Stack Web Development (FSWD) Technical Report
## Architecture, Real-Time WebSockets, REST APIs & Responsive UI Design

---

### 1. Technology Stack Architecture

The application is structured as a high-performance, real-time client-server architecture:

```
[ IoT Device Fleet ]
       │  (TCP Sockets :8085 / UDP Datagrams :8086)
       ▼
[ Node.js Multi-Protocol Ingestion Server ]
  ├── FLAT Lexical Regex Validator (Type-3 Grammar)
  ├── FLAT Deterministic Finite Automaton Engine (DFA M)
  ├── Computer Networks Link Emulator (Jitter/Loss)
  └── Central State Store & Event Ring Buffers
       │
       ├── REST API Endpoints (Express.js on :5000)
       └── WebSocket Server (`ws` on :5000/ws)
             │  (Bidirectional Real-Time Event Stream)
             ▼
[ React 18 + Vite Web Dashboard Client ]
  ├── Interactive SVG DFA Automaton Visualizer
  ├── Live Device Fleet Grid & Telemetry Gauges
  ├── Regex Testing Laboratory & Decomposer
  ├── CN Wire Frame Hex Dump Inspector
  ├── Real-time Searchable Packet Stream
  └── Security Attack Injection Cockpit
```

---

### 2. Backend Architecture (Node.js & Express)

- **Express REST API (`src/server.js`)**: Manages device queries, historical packet retrieval, simulation configurations, and automated attack triggers.
- **WebSocket Gateway (`ws`)**: Emits high-frequency JSON frames on every ingested packet and state transition, maintaining synchronization between server state and browser clients without client polling.
- **Ring Buffer In-Memory Storage (`src/store/stateStore.js`)**:
  - Maintains up to 500 recent packets and 200 security alerts using circular arrays, providing $O(1)$ insertions and preventing memory exhaustion during packet floods.
  - Automatic stale device detection: Devices inactive for $>20$s are transitioned and marked as offline.

---

### 3. REST API Specification

| Method | Endpoint | Description | Request / Query Params |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/status` | System health, server uptime, active sockets | None |
| `GET` | `/api/devices` | All registered devices and active DFA states | None |
| `GET` | `/api/devices/:id`| Comprehensive device snapshot & transition log | `id` in path |
| `GET` | `/api/packets` | Paginated packet history with filters | `?deviceId=&isValid=&type=&limit=` |
| `GET` | `/api/alerts` | Active validation and security incident alerts | None |
| `GET` | `/api/flat/dfa` | Formal 5-tuple, states, alphabet, and $\delta$ matrix | None |
| `GET` | `/api/flat/regex` | Regex definitions and patterns | None |
| `POST`| `/api/flat/regex/test`| Interactive regex playground validator | `{ testString, ruleKey }` |
| `GET` | `/api/network/metrics`| Transport statistics, RTT, delivery ratio | None |
| `POST`| `/api/network/config` | Update latency, jitter, and drop probability | `{ baseLatencyMs, jitterMs, dropRate }` |
| `POST`| `/api/simulator/control`| Start, stop, or pause simulator fleet | `{ action: "START" \| "STOP" }` |
| `POST`| `/api/simulator/attack` | Trigger targeted validation or sequence attack | `{ attackType, targetId }` |
| `POST`| `/api/simulator/reset`  | Reset all automata machines and logs | None |

---

### 4. WebSocket Event Protocol (`/ws`)

The dashboard establishes a persistent WebSocket connection receiving structured typed events:

1. `INITIAL_SYNC`: Dispatched immediately upon client connection containing active fleet snapshot, recent packets, and current metrics.
2. `PACKET_INGESTED`: Dispatched when any packet is processed. Includes validation outcome, regex breakdown, updated device state, and throughput counters.
3. `ALERT_GENERATED`: Dispatched when an automata sequence violation or regex error occurs.
4. `METRICS_UPDATE`: Periodic 1-second pulse broadcasting throughput (pkts/sec) and link quality metrics.
5. `DEVICE_OFFLINE`: Broadcast when a device fails heartbeat timeout.
6. `STORE_RESET`: Broadcast when the system state is reinitialized.

---

### 5. Frontend Reactive Design System

Built with **React 18**, **Vite**, and **Tailwind CSS**:
- **Design Theme**: High-contrast cyberpunk / sci-fi dark interface (`#090d16` base) utilizing glowing accents (cyan, emerald, violet, rose) to highlight real-time states.
- **Interactive SVG Automata**: Custom vector graph rendering nodes, bezier curves, active glowing pulses, and a full $Q \times \Sigma$ matrix view.
- **Custom React Hooks (`useSocket`)**: Implements auto-reconnection, buffering, and throttled state updates to ensure zero frame drops under high packet ingestion.
