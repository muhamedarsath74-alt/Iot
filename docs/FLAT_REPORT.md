# Formal Languages and Automata Theory (FLAT) Technical Report
## Formal Grammar, Deterministic Finite Automaton (DFA) & Lexical Validation

---

### 1. Mathematical Formalism: Deterministic Finite Automaton (DFA)

The protocol communication lifecycle of every IoT device is formally modeled as a **Deterministic Finite Automaton (DFA)**:

$$M = (Q, \Sigma, \delta, q_0, F)$$

Where:
- **$Q$**: Finite set of internal protocol states.
- **$\Sigma$**: Finite input alphabet composed of valid packet and network control symbols.
- **$\delta$**: Transition function $\delta: Q \times \Sigma \to Q$.
- **$q_0$**: Initial start state ($q_0 \in Q$).
- **$F$**: Set of final / accepting operational states ($F \subseteq Q$).

---

### 2. Formal 5-Tuple Specifications

#### 2.1 Set of States ($Q$)
$$Q = \{ S0\_IDLE, S1\_HANDSHAKE, S2\_AUTHENTICATING, S3\_READY, S4\_STREAMING, S5\_PING\_WAIT, S6\_CRITICAL\_ALERT, S\_TRAP \}$$

- **$S0\_IDLE$ ($q_0$)**: Initial quiescent state. Device is offline or awaiting connection initiation.
- **$S1\_HANDSHAKE$**: Handshake negotiation state (SYN received, awaiting mutual authentication).
- **$S2\_AUTHENTICATING$**: Cryptographic credential verification state.
- **$S3\_READY$**: Authenticated session established; device ready for bidirectional transmission.
- **$S4\_STREAMING$**: High-throughput telemetry streaming state.
- **$S5\_PING\_WAIT$**: Keepalive pulse initiated; awaiting PONG acknowledgment.
- **$S6\_CRITICAL\_ALERT$**: Device anomaly state requiring controller intervention.
- **$S\_TRAP$**: Absorbing sink/error state entered when a sequence violation or rogue token occurs.

#### 2.2 Input Alphabet ($\Sigma$)
$$\Sigma = \{ SYN, SYN\_ACK, AUTH, AUTH\_ACK, DATA, PING, PONG, ACK, ALERT, DISC, RST \}$$

#### 2.3 Start State ($q_0$)
$$q_0 = S0\_IDLE$$

#### 2.4 Set of Accepting States ($F$)
$$F = \{ S0\_IDLE, S3\_READY, S4\_STREAMING \}$$
*(Devices in $S0\_IDLE$ represent clean termination; $S3$ and $S4$ represent stable operational equilibria).*

---

### 3. State Transition Matrix $\delta(Q, \Sigma)$

| Current State $Q$ | $SYN$ | $SYN\_ACK$ | $AUTH$ | $AUTH\_ACK$ | $DATA$ | $PING$ | $PONG$ | $ACK$ | $ALERT$ | $DISC$ | $RST$ |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **$S0\_IDLE$** | $S1$ | $S_{TRAP}$ | $S_{TRAP}$ | $S_{TRAP}$ | $S_{TRAP}$ | $S_{TRAP}$ | $S_{TRAP}$ | $S_{TRAP}$ | $S_{TRAP}$ | $S0$ | $S0$ |
| **$S1\_HANDSHAKE$** | $S_{TRAP}$ | $S2$ | $S3$ | $S_{TRAP}$ | $S_{TRAP}$ | $S_{TRAP}$ | $S_{TRAP}$ | $S_{TRAP}$ | $S_{TRAP}$ | $S0$ | $S0$ |
| **$S2\_AUTH$** | $S_{TRAP}$ | $S_{TRAP}$ | $S3$ | $S3$ | $S_{TRAP}$ | $S_{TRAP}$ | $S_{TRAP}$ | $S_{TRAP}$ | $S_{TRAP}$ | $S0$ | $S0$ |
| **$S3\_READY$** | $S_{TRAP}$ | $S_{TRAP}$ | $S_{TRAP}$ | $S_{TRAP}$ | $S4$ | $S5$ | $S_{TRAP}$ | $S3$ | $S6$ | $S0$ | $S0$ |
| **$S4\_STREAMING$**| $S_{TRAP}$ | $S_{TRAP}$ | $S_{TRAP}$ | $S_{TRAP}$ | $S4$ | $S5$ | $S_{TRAP}$ | $S3$ | $S6$ | $S0$ | $S0$ |
| **$S5\_PING\_WAIT$** | $S_{TRAP}$ | $S_{TRAP}$ | $S_{TRAP}$ | $S_{TRAP}$ | $S4$ | $S_{TRAP}$ | $S3$ | $S_{TRAP}$ | $S6$ | $S0$ | $S0$ |
| **$S6\_ALERT$** | $S_{TRAP}$ | $S_{TRAP}$ | $S_{TRAP}$ | $S_{TRAP}$ | $S_{TRAP}$ | $S_{TRAP}$ | $S_{TRAP}$ | $S3$ | $S6$ | $S0$ | $S0$ |
| **$S\_TRAP$** | $S_{TRAP}$ | $S_{TRAP}$ | $S_{TRAP}$ | $S_{TRAP}$ | $S_{TRAP}$ | $S_{TRAP}$ | $S_{TRAP}$ | $S_{TRAP}$ | $S_{TRAP}$ | $S_{TRAP}$ | $S0$ |

---

### 4. Absorbing Trap State ($S\_TRAP$) Properties

The state $S\_TRAP$ serves as an absorbing sink:
$$\forall \sigma \in \Sigma \setminus \{ RST \}, \quad \delta(S\_TRAP, \sigma) = S\_TRAP$$

A device entering $S\_TRAP$ is quarantined from transmitting further telemetry until an authenticated administrative reset ($RST$) symbol is processed:
$$\delta(S\_TRAP, RST) = S0\_IDLE$$

This mathematically prevents:
1. **Unauthenticated Data Ingestion**: Devices transmitting `DATA` prior to completing handshake ($S0 \xrightarrow{DATA} S_{TRAP}$).
2. **Session Hijacking**: Premature commands sent prior to credential exchange ($S1 \xrightarrow{DATA} S_{TRAP}$).
3. **Out-of-Order Execution**: Bypassing protocol negotiation steps.

---

### 5. Regular Expressions & Chomsky Hierarchy (Type-3 Languages)

All incoming messages pass through a two-stage validation pipeline:
1. **Lexical Analysis (Chomsky Type-3 / Regular Languages)**:
   Verified via Deterministic Regular Expressions before symbol generation.
2. **Syntactic & Sequence Analysis (Finite State Machine)**:
   The parsed tokens are fed into the DFA.

#### Formal Regular Expressions:

1. **PDU Wire Serialization ($R_1$)**:
   ```regex
   ^IOTPDU\/v[1-2]\|(TCP|UDP)\|DEV-[A-Z]{3,4}-\d{4}\|(SYN|SYN_ACK|AUTH|AUTH_ACK|DATA|PING|PONG|ACK|ALERT|DISC|RST)\|SEQ:\d{1,10}\|ACK:\d{1,10}\|TS:\d{13}\|LEN:\d{1,4}\|PAYLOAD:(?:\{[\s\S]*\}|\[[\s\S]*\]|NONE)\|CRC32:[0-9A-Fa-f]{8}$
   ```

2. **Device Identifier Naming Schema ($R_2$)**:
   ```regex
   ^DEV-(TEMP|ENV|PWR|FLOW|IND|SEC)-\d{4}$
   ```

3. **Sensor Telemetry JSON Structure ($R_3$)**:
   ```regex
   ^\{"temp":-?\d{1,3}(?:\.\d+)?,"humidity":\d{1,3}(?:\.\d+)?,"voltage":\d{1,2}(?:\.\d+)?,"battery":\d{1,3},"status":"(NORMAL|WARNING|CRITICAL)"\}$
   ```

4. **CRC32 Checksum Hex ($R_4$)**:
   ```regex
   ^[0-9A-Fa-f]{8}$
   ```

5. **IPv4 Socket Specification ($R_5$)**:
   ```regex
   ^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?):\d{1,5}$
   ```
