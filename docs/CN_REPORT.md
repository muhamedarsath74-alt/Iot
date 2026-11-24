# Computer Networks (CN) Technical Report
## IoT Protocol Architecture, Socket Layer & Network Link Emulation

---

### 1. Executive Summary
This report formalizes the networking components of the **IoT Device Communication Monitoring and Validation System**. In IoT ecosystems, constrained edge devices transmit critical telemetry across heterogeneous transport channels (cellular, Wi-Fi, LPWAN). This project establishes a multi-protocol socket architecture operating simultaneously on **TCP** (reliable stream) and **UDP** (lightweight datagrams), reinforced by an active **Network Link Impairment Emulator** modeling latency jitter, packet loss, and reordering.

---

### 2. Protocol Architecture & OSI Layer Mapping

The system operates across three primary layers of the OSI model:

```
+-------------------------------------------------------------+
| Layer 7 (Application): Custom IOTPDU Protocol Framing       |
| - Preambles, Delimiters, PDU Header Fields, JSON Telemetry  |
+-------------------------------------------------------------+
| Layer 4 (Transport): Dual TCP/UDP Network Sockets           |
| - TCP (Port 8085): Connection-oriented, Stream Framing      |
| - UDP (Port 8086): Connectionless, Minimal Datagram Overhead|
| - WebSockets (Port 5000): Duplex Server-to-Client Stream    |
+-------------------------------------------------------------+
| Layer 3 (Network): IPv4 Addressing & Port Demultiplexing    |
| - IP validation, Source/Destination Socket tracking         |
+-------------------------------------------------------------+
```

---

### 3. Protocol Data Unit (PDU) Frame Specification

Every packet transmitted by an IoT device follows a standardized, pipe-delimited serialization format called `IOTPDU`:

```
IOTPDU/v<VER>|<TRANSPORT>|<DEV_ID>|<TYPE>|SEQ:<SEQ>|ACK:<ACK>|TS:<EPOCH_MS>|LEN:<BYTES>|PAYLOAD:<CONTENT>|CRC32:<HEX_HASH>
```

#### Field Bitfield Definitions:
| Field Segment | Type / Grammar | Description | Example |
| :--- | :--- | :--- | :--- |
| `Preamble` | `IOTPDU/v[1-2]` | Protocol identifier and version flag | `IOTPDU/v1` |
| `Transport` | `TCP \| UDP` | Transport layer protocol indicator | `TCP` |
| `Device ID` | `DEV-[A-Z]{3,4}-\d{4}` | Globally unique hardware identifier | `DEV-TEMP-1001` |
| `Packet Type` | Enum Token | Connection/data/control signal | `DATA` |
| `Sequence #` | `uint32` | Monotonically increasing packet counter | `SEQ:42` |
| `Ack #` | `uint32` | Sequence acknowledgment number | `ACK:41` |
| `Timestamp` | `epoch ms (13 digits)` | Transmission timestamp | `TS:1732435000000` |
| `Length` | `uint16` | Byte length of payload segment | `LEN:98` |
| `Payload` | JSON / String / `NONE` | Telemetry sensor readings or command token | `PAYLOAD:{"temp":24.5,...}` |
| `CRC32` | `8 hex digits` | Cyclic Redundancy Check polynomial 0xEDB88320 | `CRC32:3D82A7C1` |

---

### 4. Transport Protocols Implementation

#### 4.1 Native TCP Socket Server (`127.0.0.1:8085`)
- **Characteristics**: Reliable, ordered, byte-stream delivery using Node.js `net.Server`.
- **Stream Delimitation**: Implements newline framing (`\n`) to prevent TCP packet concatenation/fragmentation issues.
- **Bi-directional Acknowledgment**: When receiving a valid `DATA` packet in streaming state, the server automatically transmits an acknowledgment datagram (`ACK|SEQ:<n>|OK\n`) back to the client socket.

#### 4.2 Native UDP Datagram Socket Server (`127.0.0.1:8086`)
- **Characteristics**: Connectionless, low-latency, stateless datagram transport using Node.js `dgram.Socket` (IPv4).
- **Use Case**: Ambient environmental sensors (e.g. `DEV-ENV-2042`) where occasional dropped readings are preferable to TCP connection overhead and retransmission delay.

---

### 5. Network Link Impairment Emulator

To evaluate system resilience under realistic network conditions, the backend includes an inline **Link Quality Emulator** (`LinkEmulator`):

1. **Round-Trip Time (RTT) & Jitter**:
   $$\text{Actual Delay} = \max(2, \text{BaseLatency} + \mathcal{U}(-\text{Jitter}, +\text{Jitter}))$$
   Configurable dynamically from 0ms to 400ms with $\pm 100$ms jitter.
2. **Packet Loss Simulation**:
   Calculated via Bernoulli trial: if $\text{random}() < \text{DropRate}$, the packet is immediately dropped and recorded without reaching the application layer.
3. **Packet Reordering & Duplicate Injection**:
   Simulates multi-path routing delays and replay attacks by introducing artificial delays or duplicated delivery triggers.

---

### 6. Integrity Verification (CRC32)

Every frame incorporates a 32-bit Cyclic Redundancy Check calculated using the IEEE 802.3 standard polynomial:
$$P(x) = x^{32} + x^{26} + x^{23} + x^{22} + x^{16} + x^{12} + x^{11} + x^{10} + x^8 + x^7 + x^5 + x^4 + x^2 + x + 1$$
Represented in reverse hex notation as `0xEDB88320`. Any single-bit transmission corruption or unauthorized payload tampering triggers an immediate checksum mismatch alert.
