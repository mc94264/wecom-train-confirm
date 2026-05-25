import { prisma } from '@/lib/prisma';
import { sendMcpMessage, getChatId, initMcpClient, getMcpClient } from './wecom-mcp';

interface WecomConfig {
  webhookUrl?: string;
}

async function getConfig(): Promise<WecomConfig | null> {
  const cfg = await prisma.serviceConfig.findUnique({
    where: { serviceKey: 'wecom' },
  });
  if (!cfg || !cfg.enabled) return null;
  try {
    return JSON.parse(cfg.config) as WecomConfig;
  } catch {
    return null;
  }
}

export interface PushResult {
  success: boolean;
  message: string;
}

export async function pushTrainingLink(
  title: string,
  employeeName: string,
  replyUrl: string
): Promise<PushResult> {
  const config = await getConfig();
  const webhookUrl = config?.webhookUrl || process.env.WECOM_WEBHOOK_URL;

  // Priority 1: MCP bot (if configured)
  const mcpBotId = process.env.WECOM_MCP_BOT_ID;
  const mcpSecret = process.env.WECOM_MCP_BOT_SECRET;
  if (mcpBotId && mcpSecret) {
    // Ensure MCP client is connected
    let client = getMcpClient();
    if (!client?.connected) {
      client = await initMcpClient();
    }

    const chatid = await getChatId();
    if (chatid && client?.authenticated) {
      const content = `${employeeName}，您好！\n\n您有一项安全培训效果确认任务：「${title}」\n\n请点击下方链接，用语音复述您理解的2-3条培训重点（约30秒）：\n${replyUrl}\n\n请尽快完成，谢谢！`;
      const result = await sendMcpMessage(chatid, content);
      return result;
    }

    // MCP configured but no chatid yet
    if (!chatid) {
      return {
        success: false,
        message: 'MCP 已连接但尚未获取 chatid。请将机器人拉到群里并 @机器人或发送消息，系统会自动捕获 chatid',
      };
    }
  }

  // Priority 2: Webhook (traditional group bot)
  if (webhookUrl) {
    return sendWebhook(webhookUrl, title, employeeName, replyUrl);
  }

  // Fallback: mock
  return mockPush(title, employeeName, replyUrl);
}

async function sendWebhook(
  webhookUrl: string,
  title: string,
  employeeName: string,
  replyUrl: string
): Promise<PushResult> {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      msgtype: 'text',
      text: {
        content: `${employeeName}，您好！\n\n您有一项安全培训效果确认任务：「${title}」\n\n请点击下方链接，用语音复述您理解的2-3条培训重点（约30秒）：\n${replyUrl}\n\n请尽快完成，谢谢！`,
      },
    }),
  });

  if (!response.ok) {
    return { success: false, message: `Webhook failed: ${response.status}` };
  }

  const data = await response.json();
  if (data.errcode !== 0) {
    return { success: false, message: `WeCom error: ${data.errmsg}` };
  }

  return { success: true, message: '推送成功' };
}

function mockPush(title: string, employeeName: string, replyUrl: string): PushResult {
  console.log('[MOCK] 企微推送:', { title, employeeName, replyUrl });
  return { success: true, message: '[MOCK] 已记录推送（未配置 WECOM_WEBHOOK_URL）' };
}

// Export for external use
export { getChatId, initMcpClient };
