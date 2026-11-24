/**
 * Network Link Quality & Impairment Emulator
 * Module: Computer Networks (CN) / Transport Layer Simulation
 */

export class LinkEmulator {
  constructor(config = {}) {
    this.enabled = config.enabled ?? true;
    this.baseLatencyMs = config.baseLatencyMs ?? 25;   // Base latency in ms
    this.jitterMs = config.jitterMs ?? 15;            // Jitter variance (+/- ms)
    this.dropRate = config.dropRate ?? 0.0;           // Packet drop probability [0.0 - 1.0]
    this.reorderRate = config.reorderRate ?? 0.0;     // Out-of-order probability [0.0 - 1.0]
    this.duplicateRate = config.duplicateRate ?? 0.0; // Replay duplicate rate [0.0 - 1.0]

    // Statistics
    this.stats = {
      totalTransmitted: 0,
      totalDelivered: 0,
      droppedCount: 0,
      delayedCount: 0,
      reorderedCount: 0,
      duplicatedCount: 0,
      averageLatency: 25,
      rttSamples: []
    };

    this.pendingBuffer = [];
  }

  updateConfig(newConfig) {
    if (newConfig.baseLatencyMs !== undefined) this.baseLatencyMs = Math.max(0, newConfig.baseLatencyMs);
    if (newConfig.jitterMs !== undefined) this.jitterMs = Math.max(0, newConfig.jitterMs);
    if (newConfig.dropRate !== undefined) this.dropRate = Math.min(1.0, Math.max(0, newConfig.dropRate));
    if (newConfig.reorderRate !== undefined) this.reorderRate = Math.min(1.0, Math.max(0, newConfig.reorderRate));
    if (newConfig.duplicateRate !== undefined) this.duplicateRate = Math.min(1.0, Math.max(0, newConfig.duplicateRate));
  }

  /**
   * Processes a packet through the simulated network channel
   * @param {string} rawPacket 
   * @param {Function} deliverCallback 
   */
  transmit(rawPacket, deliverCallback) {
    this.stats.totalTransmitted++;

    // 1. Packet Loss Check
    if (this.dropRate > 0 && Math.random() < this.dropRate) {
      this.stats.droppedCount++;
      return { status: "DROPPED", latency: 0 };
    }

    // 2. Latency & Jitter Calculation
    const jitter = (Math.random() * 2 - 1) * this.jitterMs;
    let actualDelay = Math.max(2, Math.round(this.baseLatencyMs + jitter));

    // 3. Packet Reordering Simulation
    if (this.reorderRate > 0 && Math.random() < this.reorderRate) {
      actualDelay += Math.round(150 + Math.random() * 200);
      this.stats.reorderedCount++;
    }

    this.stats.delayedCount++;
    this._recordLatency(actualDelay);

    // Schedule delivery
    setTimeout(() => {
      this.stats.totalDelivered++;
      deliverCallback(rawPacket, actualDelay);
    }, actualDelay);

    // 4. Duplicate Packet Simulation (Replay Attack or duplicate ACK)
    if (this.duplicateRate > 0 && Math.random() < this.duplicateRate) {
      const duplicateDelay = actualDelay + Math.round(50 + Math.random() * 100);
      this.stats.duplicatedCount++;
      setTimeout(() => {
        this.stats.totalDelivered++;
        deliverCallback(rawPacket, duplicateDelay, true);
      }, duplicateDelay);
    }

    return { status: "SCHEDULED", latency: actualDelay };
  }

  _recordLatency(latency) {
    this.stats.rttSamples.push(latency);
    if (this.stats.rttSamples.length > 50) {
      this.stats.rttSamples.shift();
    }
    const sum = this.stats.rttSamples.reduce((a, b) => a + b, 0);
    this.stats.averageLatency = Math.round(sum / this.stats.rttSamples.length);
  }

  getMetrics() {
    const deliveryRatio = this.stats.totalTransmitted > 0 
      ? ((this.stats.totalDelivered / this.stats.totalTransmitted) * 100).toFixed(1)
      : "100.0";

    return {
      ...this.stats,
      deliveryRatioPercent: parseFloat(deliveryRatio),
      config: {
        baseLatencyMs: this.baseLatencyMs,
        jitterMs: this.jitterMs,
        dropRate: this.dropRate,
        reorderRate: this.reorderRate,
        duplicateRate: this.duplicateRate
      }
    };
  }
}

export const defaultLinkEmulator = new LinkEmulator();
