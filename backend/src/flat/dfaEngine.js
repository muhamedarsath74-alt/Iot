/**
 * Deterministic Finite Automaton (DFA) Execution Engine
 * Module: FLAT / Automata Theory
 * 
 * Implements M = (Q, Σ, δ, q0, F)
 */

import { FLAT_SPEC } from "./protocolGrammar.js";

export class DeviceDFA {
  constructor(deviceId) {
    this.deviceId = deviceId;
    this.currentState = FLAT_SPEC.formalDefinition.startState; // q0: S0_IDLE
    this.lastSeqNum = -1;
    this.stepCount = 0;
    this.history = [];
    this.violationCount = 0;
    this.inTrapState = false;
  }

  /**
   * Resets the automaton to initial state q0
   */
  reset() {
    this.currentState = FLAT_SPEC.formalDefinition.startState;
    this.lastSeqNum = -1;
    this.inTrapState = false;
    this.history.push({
      step: ++this.stepCount,
      fromState: "ANY",
      symbol: "RST",
      toState: FLAT_SPEC.formalDefinition.startState,
      timestamp: Date.now(),
      isValidTransition: true,
      reason: "Automaton reset to initial state q0 (S0_IDLE)."
    });
  }

  /**
   * Evaluates input symbol σ and validates sequence order
   * @param {string} symbol - Protocol symbol σ ∈ Σ
   * @param {number} seqNum - Packet sequence number
   * @param {Object} metadata - Supplementary network/packet metadata
   * @returns {Object} transition outcome
   */
  evaluateTransition(symbol, seqNum = null, metadata = {}) {
    const fromState = this.currentState;
    const result = {
      deviceId: this.deviceId,
      step: ++this.stepCount,
      fromState: fromState,
      symbol: symbol,
      toState: null,
      isValidTransition: false,
      isSequenceValid: true,
      isAcceptState: false,
      inTrap: false,
      timestamp: Date.now(),
      formalExplanation: ""
    };

    // 1. Verify Alphabet Membership: σ ∈ Σ
    const isAlphabetValid = FLAT_SPEC.formalDefinition.alphabet.includes(symbol);
    if (!isAlphabetValid) {
      result.toState = "S_TRAP";
      result.isValidTransition = false;
      this.currentState = "S_TRAP";
      this.inTrapState = true;
      this.violationCount++;
      result.formalExplanation = `Symbol Error: '${symbol}' ∉ Σ. Alphabet contains only valid protocol tokens. Immediate transition to Trap State (S_TRAP).`;
      this.history.push(result);
      return result;
    }

    // 2. Sequence Number Monotonic Check
    if (seqNum !== null && typeof seqNum === "number") {
      if (this.lastSeqNum !== -1) {
        if (seqNum === this.lastSeqNum) {
          result.isSequenceValid = false;
          result.sequenceAnomaly = "REPLAY_ATTACK";
          result.formalExplanation = `Sequence Anomaly: Duplicate sequence number ${seqNum} received. Potential replay attack!`;
        } else if (seqNum < this.lastSeqNum) {
          result.isSequenceValid = false;
          result.sequenceAnomaly = "OUT_OF_ORDER";
          result.formalExplanation = `Sequence Anomaly: Backward sequence leap (${seqNum} < ${this.lastSeqNum}). Packet dropped or reordered.`;
        } else if (seqNum > this.lastSeqNum + 1) {
          result.sequenceAnomaly = "PACKET_LOSS_GAP";
          // We note the gap, but may still permit state transition if transition allows
        }
      }
      this.lastSeqNum = seqNum;
    }

    // 3. State Transition: δ(fromState, symbol) -> toState
    const stateTransitions = FLAT_SPEC.transitions[fromState] || {};
    const nextState = stateTransitions[symbol];

    if (nextState) {
      // Valid transition in δ
      this.currentState = nextState;
      result.toState = nextState;
      result.isValidTransition = true;
      result.isAcceptState = FLAT_SPEC.formalDefinition.acceptStates.includes(nextState);
      result.formalExplanation = `Valid Transition: δ(${fromState}, ${symbol}) → ${nextState}. Target is ${result.isAcceptState ? "an Accept" : "an Intermediate"} state.`;
      
      if (nextState === "S_TRAP") {
        this.inTrapState = true;
      }
    } else {
      // Invalid transition: δ(fromState, symbol) is UNDEFINED in grammar!
      this.currentState = "S_TRAP";
      this.inTrapState = true;
      this.violationCount++;
      result.toState = "S_TRAP";
      result.isValidTransition = false;
      result.formalExplanation = `Automata Violation: δ(${fromState}, ${symbol}) is undefined. Sequence violation detected! Device forced into absorbing trap state S_TRAP.`;
    }

    result.inTrap = (this.currentState === "S_TRAP");

    // Maintain recent history window (max 50)
    if (this.history.length > 50) {
      this.history.shift();
    }
    this.history.push(result);

    return result;
  }

  getCurrentState() {
    return this.currentState;
  }

  getStateDetails() {
    return FLAT_SPEC.stateDetails[this.currentState] || FLAT_SPEC.stateDetails["S0_IDLE"];
  }

  getSnapshot() {
    return {
      deviceId: this.deviceId,
      currentState: this.currentState,
      stateInfo: this.getStateDetails(),
      lastSeqNum: this.lastSeqNum,
      inTrapState: this.inTrapState,
      violationCount: this.violationCount,
      stepCount: this.stepCount,
      recentTransitions: this.history.slice(-10)
    };
  }
}
