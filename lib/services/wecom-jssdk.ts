import crypto from 'crypto';
import { writeFile } from 'fs/promises';
import { spawn } from 'child_process';
import { existsSync } from 'fs';

let accessTokenCache: { token: string; expiresAt: number } | null = null;
let jsapiTicketCache: { ticket: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string> {
  if (accessTokenCache && accessTokenCache.expiresAt > Date.now() + 60000) {
    return accessTokenCache.token;
  }

  const corpId = process.env.WECOM_CORP_ID;
  const secret = process.env.WECOM_AGENT_SECRET;

  if (!corpId || !secret) {
    throw new Error('缺少 WECOM_CORP_ID 或 WECOM_AGENT_SECRET');
  }

  const res = await fetch(
    `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${corpId}&corpsecret=${secret}`
  );
  const data = await res.json();

  if (data.access_token) {
    accessTokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
    return data.access_token;
  }
  throw new Error(`获取 access_token 失败: ${data.errmsg || data.errmsg}`);
}

async function getJsapiTicket(): Promise<string> {
  if (jsapiTicketCache && jsapiTicketCache.expiresAt > Date.now() + 60000) {
    return jsapiTicketCache.ticket;
  }

  const accessToken = await getAccessToken();
  const res = await fetch(
    `https://qyapi.weixin.qq.com/cgi-bin/get_jsapi_ticket?access_token=${accessToken}`
  );
  const data = await res.json();

  if (data.ticket) {
    jsapiTicketCache = {
      ticket: data.ticket,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
    return data.ticket;
  }
  throw new Error(`获取 jsapi_ticket 失败: ${data.errmsg}`);
}

export async function getJssdkConfig(url: string) {
  const ticket = await getJsapiTicket();
  const nonceStr = Math.random().toString(36).substring(2, 15);
  const timestamp = Math.floor(Date.now() / 1000);

  const str = `jsapi_ticket=${ticket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${url}`;
  const signature = crypto.createHash('sha1').update(str).digest('hex');

  return {
    appId: process.env.WECOM_CORP_ID!,
    agentId: process.env.WECOM_AGENT_ID!,
    timestamp,
    nonceStr,
    signature,
  };
}

async function tryConvertAmrToWav(amrPath: string): Promise<string | null> {
  const wavPath = amrPath.replace(/\.amr$/i, '.wav');
  return new Promise((resolve) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i', amrPath,
      '-ar', '16000',
      '-ac', '1',
      '-y',
      wavPath,
    ]);
    ffmpeg.on('close', (code) => {
      if (code === 0 && existsSync(wavPath)) {
        resolve(wavPath);
      } else {
        resolve(null);
      }
    });
    ffmpeg.on('error', () => resolve(null));
  });
}

export async function downloadVoice(mediaId: string, saveDir: string): Promise<string> {
  const accessToken = await getAccessToken();
  const url = `https://qyapi.weixin.qq.com/cgi-bin/media/get?access_token=${accessToken}&media_id=${mediaId}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`下载语音失败: ${res.status}`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const err = await res.json();
    throw new Error(`下载语音失败: ${err.errmsg || JSON.stringify(err)}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const amrPath = `${saveDir}/voice_${mediaId}_${Date.now()}.amr`;
  await writeFile(amrPath, buffer);

  // Try convert to wav for better compatibility
  const wavPath = await tryConvertAmrToWav(amrPath);
  if (wavPath) {
    return wavPath;
  }

  return amrPath;
}
