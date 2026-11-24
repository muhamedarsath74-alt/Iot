import { useState, useEffect, useRef, useCallback } from "react";

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [devices, setDevices] = useState([]);
  const [packets, setPackets] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [metrics, setMetrics] = useState({
    totalPackets: 0,
    validPackets: 0,
    regexErrors: 0,
    dfaViolations: 0,
    passRatePercent: 100,
    packetsPerSecond: 0,
    totalDevices: 0,
    onlineDevices: 0,
    trapDevices: 0,
    recentPpsWindow: []
  });
  const [linkMetrics, setLinkMetrics] = useState({
    totalTransmitted: 0,
    totalDelivered: 0,
    droppedCount: 0,
    averageLatency: 25,
    deliveryRatioPercent: 100,
    config: { baseLatencyMs: 25, jitterMs: 15, dropRate: 0 }
  });

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const connect = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = process.env.NODE_ENV === "development" 
      ? "ws://localhost:5000/ws" 
      : `${protocol}//${host}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      console.log("[WS] Connected to IoT Validation Server");
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case "INITIAL_SYNC":
            setDevices(msg.payload.devices || []);
            setPackets(msg.payload.recentPackets || []);
            setAlerts(msg.payload.recentAlerts || []);
            if (msg.payload.metrics) setMetrics(msg.payload.metrics);
            if (msg.payload.linkMetrics) setLinkMetrics(msg.payload.linkMetrics);
            break;

          case "PACKET_INGESTED": {
            const { packet, device, metrics: updatedMetrics } = msg.payload;
            
            // Append packet
            setPackets((prev) => {
              const next = [...prev, packet];
              return next.length > 300 ? next.slice(-300) : next;
            });

            // Update device in list
            setDevices((prev) => {
              const idx = prev.findIndex((d) => d.deviceId === device.deviceId);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = device;
                return next;
              }
              return [...prev, device];
            });

            if (updatedMetrics) {
              setMetrics((prev) => ({ ...prev, ...updatedMetrics }));
            }
            break;
          }

          case "ALERT_GENERATED":
            setAlerts((prev) => {
              const next = [msg.payload, ...prev];
              return next.length > 150 ? next.slice(0, 150) : next;
            });
            break;

          case "METRICS_UPDATE":
            if (msg.payload.metrics) setMetrics(msg.payload.metrics);
            if (msg.payload.linkMetrics) setLinkMetrics(msg.payload.linkMetrics);
            break;

          case "DEVICE_OFFLINE":
            setDevices((prev) =>
              prev.map((d) =>
                d.deviceId === msg.payload.deviceId
                  ? { ...d, isOnline: false }
                  : d
              )
            );
            break;

          case "STORE_RESET":
            setDevices([]);
            setPackets([]);
            setAlerts([]);
            break;

          default:
            break;
        }
      } catch (err) {
        console.error("[WS] Parse error", err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      reconnectTimeoutRef.current = setTimeout(connect, 2000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  return {
    isConnected,
    devices,
    packets,
    alerts,
    metrics,
    linkMetrics
  };
}
