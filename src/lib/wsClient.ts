type Handler = (msg: any) => void;

class WSClient {
  private ws: WebSocket | null = null;
  private handlers = new Set<Handler>();
  private isConnecting = false;

  private connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    if (this.isConnecting) return;

    this.isConnecting = true;
    const ws = new WebSocket('ws://localhost:4000/ws');
    this.ws = ws;

    ws.onopen = () => {
      this.isConnecting = false;
      ws.send(JSON.stringify({ type: 'subscribe_all' }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.handlers.forEach((h) => h(msg));
      } catch (e) {
        console.error('WS parse error', e);
      }
    };

    ws.onclose = () => {
      this.ws = null;
      this.isConnecting = false;
      setTimeout(() => this.connect(), 1500);
    };

    ws.onerror = () => {};
  }

  subscribe(handler: Handler) {
    this.handlers.add(handler);
    this.connect();
    return () => {
      this.handlers.delete(handler);
    };
  }

  identify(userId: number) {
    const send = () => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'identify', userId }));
        return true;
      }
      return false;
    };

    if (send()) return;

    const check = setInterval(() => {
      if (send()) clearInterval(check);
    }, 200);
    setTimeout(() => clearInterval(check), 5000);
  }
}

export const wsClient = new WSClient();