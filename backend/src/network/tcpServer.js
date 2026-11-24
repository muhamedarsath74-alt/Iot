/**
 * Native TCP Network Socket Server
 * Module: Computer Networks (CN) / Transport Layer (TCP)
 */

import net from "net";
import { defaultStore } from "../store/stateStore.js";
import { defaultLinkEmulator } from "./linkEmulator.js";

export class TcpServer {
  constructor(port = 8085) {
    this.port = port;
    this.server = null;
    this.connections = new Map();
    this.isRunning = false;
  }

  start() {
    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => {
        const clientKey = `${socket.remoteAddress}:${socket.remotePort}`;
        this.connections.set(clientKey, socket);

        let buffer = "";

        socket.on("data", (chunk) => {
          buffer += chunk.toString("utf8");
          const lines = buffer.split("\n");
          buffer = lines.pop(); // keep partial

          for (const line of lines) {
            const rawPacket = line.trim();
            if (!rawPacket) continue;

            // Pass through network link emulator (simulates latency & loss)
            defaultLinkEmulator.transmit(rawPacket, (deliveredPacket, actualDelay) => {
              const record = defaultStore.ingestRawPacket(deliveredPacket, {
                transport: "TCP",
                ip: socket.remoteAddress,
                port: socket.remotePort,
                latency: actualDelay
              });

              // Send TCP acknowledgment if session is established and valid
              if (record.isValid && record.dfaValidation?.toState === "S4_STREAMING") {
                const ackMsg = `ACK|SEQ:${record.sequence}|OK\n`;
                socket.write(ackMsg);
              }
            });
          }
        });

        socket.on("error", (err) => {
          // Socket error handled cleanly
        });

        socket.on("close", () => {
          this.connections.delete(clientKey);
        });
      });

      this.server.on("error", (err) => {
        console.error(`[TCP Server Error]`, err);
        reject(err);
      });

      this.server.listen(this.port, "127.0.0.1", () => {
        this.isRunning = true;
        console.log(`[CN] TCP Socket Server listening on 127.0.0.1:${this.port}`);
        resolve();
      });
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        for (const sock of this.connections.values()) {
          sock.destroy();
        }
        this.connections.clear();
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

export const defaultTcpServer = new TcpServer();
