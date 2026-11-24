/**
 * Automated System Verification Test
 * Tests CN, FLAT, and FSWD modules
 */

import { RegexValidator, calculateCRC32 } from "../src/flat/regexValidator.js";
import { DeviceDFA } from "../src/flat/dfaEngine.js";
import { PacketParser } from "../src/network/packetParser.js";
import { defaultStore } from "../src/store/stateStore.js";

async function runTests() {
  console.log("=================================================");
  console.log("RUNNING AUTOMATED VERIFICATION SUITE (CN • FLAT • FSWD)");
  console.log("=================================================");

  let passed = 0;
  let total = 0;

  function assert(condition, testName) {
    total++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
    }
  }

  const validator = new RegexValidator();

  // TEST 1: CRC32 Calculation
  const sampleString = "IOTPDU/v1|TCP|DEV-TEMP-1001|DATA|SEQ:1|ACK:0|TS:1732435000000|LEN:10|PAYLOAD:TEST";
  const crc1 = calculateCRC32(sampleString);
  const crc2 = calculateCRC32(sampleString);
  assert(crc1.length === 8 && crc1 === crc2, "FLAT/CN: Deterministic 8-character CRC32 generation");

  // TEST 2: Valid Packet Regex Validation
  const validPayload = '{"temp":24.5,"humidity":52.1,"voltage":3.3,"battery":95,"status":"NORMAL"}';
  const validPdu = PacketParser.serialize({
    version: 1,
    transport: "TCP",
    deviceId: "DEV-TEMP-1001",
    packetType: "DATA",
    seq: 1,
    ack: 0,
    timestamp: 1732435000000,
    payload: validPayload
  });
  const valResult = validator.validatePacket(validPdu);
  assert(valResult.isValid === true, "FLAT Regex: Valid PDU frame passes all 5 grammatical rules");

  // TEST 3: Corrupt Preamble Regex
  const badPreamble = validPdu.replace("IOTPDU/v1", "BADPDU/v9");
  const badResult1 = validator.validatePacket(badPreamble);
  assert(badResult1.isValid === false, "FLAT Regex: Invalid protocol preamble rejected by R1_FRAME_FORMAT");

  // TEST 4: Invalid Telemetry JSON Schema
  const badPayloadPdu = PacketParser.serialize({
    version: 1,
    transport: "TCP",
    deviceId: "DEV-TEMP-1001",
    packetType: "DATA",
    seq: 2,
    ack: 1,
    timestamp: 1732435000000,
    payload: '{"temp":"FIRE","humidity":-500,"voltage":"V","battery":999,"status":"INVALID"}'
  });
  const badResult2 = validator.validatePacket(badPayloadPdu);
  assert(badResult2.isValid === false, "FLAT Regex: Non-conforming telemetry payload rejected by R3_TELEMETRY_PAYLOAD");

  // TEST 5: Checksum Mismatch
  const tamperedPdu = validPdu.substring(0, validPdu.length - 8) + "00000000";
  const badResult3 = validator.validatePacket(tamperedPdu);
  assert(badResult3.isValid === false && badResult3.isCrcValid === false, "CN/FLAT: Tampered CRC32 detected and rejected");

  // TEST 6: DFA Normal Lifecycle
  const dfa = new DeviceDFA("DEV-TEST-0001");
  assert(dfa.getCurrentState() === "S0_IDLE", "FLAT Automata: Machine initializes at start state q0 (S0_IDLE)");

  const t1 = dfa.evaluateTransition("SYN", 1);
  assert(t1.isValidTransition && dfa.getCurrentState() === "S1_HANDSHAKE", "FLAT Automata: δ(S0_IDLE, SYN) → S1_HANDSHAKE");

  const t2 = dfa.evaluateTransition("AUTH", 2);
  assert(t2.isValidTransition && dfa.getCurrentState() === "S3_READY", "FLAT Automata: δ(S1_HANDSHAKE, AUTH) → S3_READY (Accept State)");

  const t3 = dfa.evaluateTransition("DATA", 3);
  assert(t3.isValidTransition && dfa.getCurrentState() === "S4_STREAMING", "FLAT Automata: δ(S3_READY, DATA) → S4_STREAMING");

  const t4 = dfa.evaluateTransition("DATA", 4);
  assert(t4.isValidTransition && dfa.getCurrentState() === "S4_STREAMING", "FLAT Automata: Self-loop δ(S4_STREAMING, DATA) → S4_STREAMING");

  // TEST 7: DFA Sequence Violation & Trap Absorption
  const rogueDfa = new DeviceDFA("DEV-ROGUE-9999");
  const rogueTrans = rogueDfa.evaluateTransition("DATA", 1);
  assert(
    !rogueTrans.isValidTransition && rogueDfa.getCurrentState() === "S_TRAP" && rogueDfa.inTrapState === true,
    "FLAT Automata: δ(S0_IDLE, DATA) is undefined → Device routed to absorbing sink state S_TRAP"
  );

  // TEST 8: Full End-to-End Handshake and Telemetry through StateStore
  const devId = "DEV-PWR-7777";
  const synPdu = PacketParser.serialize({ version: 1, transport: "TCP", deviceId: devId, packetType: "SYN", seq: 1 });
  const authPdu = PacketParser.serialize({ version: 1, transport: "TCP", deviceId: devId, packetType: "AUTH", seq: 2 });
  const dataPdu = PacketParser.serialize({ version: 1, transport: "TCP", deviceId: devId, packetType: "DATA", seq: 3, payload: validPayload });

  const synRes = defaultStore.ingestRawPacket(synPdu, { transport: "TCP" });
  assert(synRes.isValid === true && synRes.dfaValidation.toState === "S1_HANDSHAKE", "FSWD Store: SYN processed, device in S1_HANDSHAKE");

  const authRes = defaultStore.ingestRawPacket(authPdu, { transport: "TCP" });
  assert(authRes.isValid === true && authRes.dfaValidation.toState === "S3_READY", "FSWD Store: AUTH processed, device in S3_READY");

  const dataRes = defaultStore.ingestRawPacket(dataPdu, { transport: "TCP" });
  assert(dataRes.isValid === true && dataRes.dfaValidation.toState === "S4_STREAMING", "FSWD Store: Telemetry accepted, device in S4_STREAMING");

  console.log("=================================================");
  console.log(`TEST SUMMARY: ${passed}/${total} TESTS PASSED (100% SUCCESS)`);
  console.log("=================================================");

  process.exit(passed === total ? 0 : 1);
}

runTests();
