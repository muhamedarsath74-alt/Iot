/**
 * Native UDP Datagram Socket Server
 * Module: Computer Networks (CN) / Transport Layer (UDP)
 */

import dgram from "dgram";
import { defaultStore } from "../store/stateStore.js";
import { defaultLinkEmulator } from "./linkEmulator.js";

export class UdpServer {
  constructor(port = 8086) {
    this.port = port;
    this.server = null;
    this.isRunning = false;
  }

  start() {
    return new Promise((resolve, reject) => {
      this.server = dgram.createSocket("udp4");

      this.server.on("message", (msg, rinfo) => {
        const rawPacket = msg.toString("utf8").trim();
        if (!rawPacket) return;

        // Route through network link emulator
        defaultLinkEmulator.transmit(rawPacket, (deliveredPacket, actualDelay) => {
          defaultStore.ingestRawPacket(deliveredPacket, {
            transport: "UDP",
            ip: rinfo.address,
            port: rinfo.port,
            latency: actualDelay
          });
        });
      });

      this.server.on("error", (err) => {
        console.error(`[UDP Server Error]`, err);
        reject(err);
      });

      this.server.bind(this.port, "127.0.0.1", () => {
        this.isRunning = true;
        console.log(`[CN] UDP Socket Server listening on 127.0.0.1:${this.port}`);
        resolve();
      });
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.isRunning = false;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

export const defaultUdpServer = new UdpServer();
