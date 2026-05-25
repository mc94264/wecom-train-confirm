import WebSocket from 'ws';
import { prisma } from '@/lib/prisma';

const WS_URL = 'wss://openws.work.weixin.qq.com';
const HEARTBEAT_INTERVAL = 30000;
const RECONNECT_BASE_DELAY = 1000;
const MAX_RECONNECT_ATTEMPTS = 10;

interface WsFrame {
  cmd?: string;
  headers: { req_id: string; [key: string]: unknown };
  body?: Record<string, unknown>;
  errcode?: number;
  errmsg?: string;
}

function generateReqId(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}`;
}

class WeComMcpClient {
  private ws: WebSocket | null = null;
  private botId: string;
  private secret: string;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private isManualClose = false;
  private pendingAcks = new Map<
    string,
    { resolve: (frame: WsFrame) => void; reject: (err: Error) => void; timer: NodeJS.Timeout }
  >();
  private onMessageCallbacks: Array<(frame: WsFrame) => void> = [];
  private _authenticated = false;

  constructor(botId: string, secret: string) {
    this.botId = botId;
    this.secret = secret;
  }

  get authenticated() {
    return this._authenticated;
  }

  get connected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.isManualClose = false;

      try {
        this.ws = new WebSocket(WS_URL);

        this.ws.on('open', () => {
          this.reconnectAttempts = 0;
          this.sendAuth().then(() => resolve()).catch(reject);
        });

        this.ws.on('message', (data) => {
          try {
            const frame = JSON.parse(data.toString()) as WsFrame;
            this.handleFrame(frame);
          } catch {
            console.error('[MCP] Failed to parse WebSocket message');
          }
        });

        this.ws.on('close', (code, reason) => {
          this._authenticated = false;
          this.stopHeartbeat();
          const reasonStr = reason.toString() || `code: ${code}`;
          console.log(`[MCP] Connection closed: ${reasonStr}`);
          if (!this.isManualClose) {
            this.scheduleReconnect();
          }
        });

        this.ws.on('error', (err) => {
          console.error('[MCP] WebSocket error:', err.message);
          reject(err);
        });
      } catch (err) {
        reject(err as Error);
      }
    });
  }

  disconnect(): void {
    this.isManualClose = true;
    this.stopHeartbeat();
    this.clearPendingAcks('Client disconnected');
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private sendAuth(): Promise<void> {
    return new Promise((resolve, reject) => {
      const reqId = generateReqId('aibot_subscribe');
      const frame: WsFrame = {
        cmd: 'aibot_subscribe',
        headers: { req_id: reqId },
        body: {
          bot_id: this.botId,
          secret: this.secret,
        },
      };

      const timer = setTimeout(() => {
        this.pendingAcks.delete(reqId);
        reject(new Error('Auth timeout'));
      }, 10000);

      this.pendingAcks.set(reqId, {
        resolve: (ackFrame: WsFrame) => {
          clearTimeout(timer);
          if (ackFrame.errcode === 0) {
            this._authenticated = true;
            this.startHeartbeat();
            console.log('[MCP] Authenticated successfully');
            resolve();
          } else {
            reject(new Error(`Auth failed: ${ackFrame.errmsg} (code: ${ackFrame.errcode})`));
          }
        },
        reject: (err: Error) => {
          clearTimeout(timer);
          reject(err);
        },
        timer,
      });

      this.sendRaw(frame);
    });
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (!this.connected) return;
      const frame: WsFrame = {
        cmd: 'ping',
        headers: { req_id: generateReqId('ping') },
      };
      this.sendRaw(frame);
    }, HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('[MCP] Max reconnect attempts reached');
      return;
    }
    const delay = Math.min(
      RECONNECT_BASE_DELAY * Math.pow(2, this.reconnectAttempts),
      30000
    );
    this.reconnectAttempts++;
    console.log(`[MCP] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    setTimeout(() => {
      this.connect().catch(() => {
        // Reconnect failed, schedule next
      });
    }, delay);
  }

  private handleFrame(frame: WsFrame): void {
    const reqId = frame.headers?.req_id;

    // Handle ack responses
    if (reqId && this.pendingAcks.has(reqId)) {
      const pending = this.pendingAcks.get(reqId)!;
      this.pendingAcks.delete(reqId);
      clearTimeout(pending.timer);
      pending.resolve(frame);
      return;
    }

    // Handle incoming messages/events
    this.onMessageCallbacks.forEach((cb) => {
      try {
        cb(frame);
      } catch (err) {
        console.error('[MCP] Message callback error:', err);
      }
    });
  }

  onMessage(callback: (frame: WsFrame) => void): () => void {
    this.onMessageCallbacks.push(callback);
    return () => {
      this.onMessageCallbacks = this.onMessageCallbacks.filter((cb) => cb !== callback);
    };
  }

  async sendMessage(chatid: string, content: string): Promise<WsFrame> {
    if (!this.connected || !this._authenticated) {
      throw new Error('MCP client not connected or not authenticated');
    }

    const reqId = generateReqId('aibot_send_msg');
    // MCP bot send_message only supports 'markdown' and 'template_card' msgtypes
    const frame: WsFrame = {
      cmd: 'aibot_send_msg',
      headers: { req_id: reqId },
      body: {
        chatid,
        msgtype: 'markdown',
        markdown: { content },
      },
    };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingAcks.delete(reqId);
        reject(new Error('Send message timeout'));
      }, 10000);

      this.pendingAcks.set(reqId, {
        resolve: (ackFrame: WsFrame) => {
          clearTimeout(timer);
          resolve(ackFrame);
        },
        reject: (err: Error) => {
          clearTimeout(timer);
          reject(err);
        },
        timer,
      });

      this.sendRaw(frame);
    });
  }

  private sendRaw(frame: WsFrame): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('[MCP] Cannot send, WebSocket not open');
      return;
    }
    this.ws.send(JSON.stringify(frame));
  }

  private clearPendingAcks(reason: string): void {
    this.pendingAcks.forEach((pending) => {
      clearTimeout(pending.timer);
      pending.reject(new Error(reason));
    });
    this.pendingAcks.clear();
  }
}

// Singleton instance
let mcpClient: WeComMcpClient | null = null;
let chatIdStore: string | null = null;

async function loadChatIdFromDb(): Promise<string | null> {
  try {
    const cfg = await prisma.serviceConfig.findUnique({ where: { serviceKey: 'wecom' } });
    if (cfg) {
      const config = JSON.parse(cfg.config);
      return config.mcpChatId || null;
    }
  } catch {
    // ignore
  }
  return null;
}

async function saveChatIdToDb(chatid: string): Promise<void> {
  try {
    const cfg = await prisma.serviceConfig.findUnique({ where: { serviceKey: 'wecom' } });
    const config = cfg ? { ...JSON.parse(cfg.config), mcpChatId: chatid } : { mcpChatId: chatid };
    await prisma.serviceConfig.upsert({
      where: { serviceKey: 'wecom' },
      update: { config: JSON.stringify(config) },
      create: { serviceKey: 'wecom', displayName: '企业微信', config: JSON.stringify(config) },
    });
    console.log(`[MCP] ChatId saved to DB: ${chatid}`);
  } catch (err) {
    console.error('[MCP] Failed to save chatId to DB:', err);
  }
}

export function getMcpClient(): WeComMcpClient | null {
  return mcpClient;
}

export async function getChatId(): Promise<string | null> {
  if (chatIdStore) return chatIdStore;
  chatIdStore = await loadChatIdFromDb();
  return chatIdStore;
}

export function setChatId(chatid: string): void {
  chatIdStore = chatid;
}

export async function initMcpClient(): Promise<WeComMcpClient | null> {
  const botId = process.env.WECOM_MCP_BOT_ID;
  const secret = process.env.WECOM_MCP_BOT_SECRET;

  if (!botId || !secret) {
    console.log('[MCP] Bot ID or Secret not configured, skipping MCP init');
    return null;
  }

  if (mcpClient?.connected) {
    return mcpClient;
  }

  // Load cached chatId from DB
  if (!chatIdStore) {
    chatIdStore = await loadChatIdFromDb();
    if (chatIdStore) {
      console.log(`[MCP] ChatId loaded from DB: ${chatIdStore}`);
    }
  }

  mcpClient = new WeComMcpClient(botId, secret);

  // Listen for messages to capture chatid
  mcpClient.onMessage((frame) => {
    const body = frame.body;
    if (!body) return;

    // Capture chatid from incoming messages
    if (body.chatid && typeof body.chatid === 'string' && !chatIdStore) {
      chatIdStore = body.chatid;
      console.log(`[MCP] ChatId captured: ${chatIdStore}`);
      void saveChatIdToDb(chatIdStore);
    }

    // Log events for debugging
    if (frame.cmd === 'aibot_event_callback') {
      console.log('[MCP] Event received:', JSON.stringify(body).slice(0, 200));
    }
  });

  try {
    await mcpClient.connect();
    return mcpClient;
  } catch (err) {
    console.error('[MCP] Failed to connect:', err);
    return null;
  }
}

export async function sendMcpMessage(
  chatid: string,
  content: string
): Promise<{ success: boolean; message: string }> {
  const client = mcpClient;
  if (!client || !client.authenticated) {
    return { success: false, message: 'MCP client not connected' };
  }

  try {
    const result = await client.sendMessage(chatid, content);

    if (result.errcode === 0) {
      return { success: true, message: '发送成功' };
    }
    return { success: false, message: `发送失败: ${result.errmsg} (code: ${result.errcode})` };
  } catch (err) {
    return { success: false, message: `发送异常: ${(err as Error).message}` };
  }
}
