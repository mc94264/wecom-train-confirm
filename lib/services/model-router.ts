import { prisma } from '@/lib/prisma';
import { resolveApiKey } from './config';

interface GenerateOptions {
  messages: { role: string; content: string }[];
  temperature?: number;
  maxTokens?: number;
}

export async function generateWithAgent(
  agentKey: string,
  options: GenerateOptions
): Promise<string> {
  const agent = await prisma.agentSpec.findUnique({
    where: { agentKey },
    include: { modelConnection: { include: { provider: true } } },
  });

  if (!agent || !agent.enabled) {
    throw new Error(`Agent ${agentKey} not found or disabled`);
  }

  let connection = agent.modelConnection;

  if (!connection || !connection.enabled) {
    const fallback = await prisma.modelConnection.findFirst({
      where: {
        enabled: true,
        capabilities: { contains: agent.capability },
      },
      include: { provider: true },
      orderBy: { isDefault: 'desc' },
    });
    if (!fallback) {
      throw new Error(`No enabled model connection for capability: ${agent.capability}`);
    }
    connection = fallback;
  }

  const baseUrl = connection.baseUrl || connection.provider.defaultBaseUrl || '';
  const apiKey = resolveApiKey(connection.apiKeyRef);
  const config = JSON.parse(agent.config || '{}');
  const temperature = options.temperature ?? config.temperature ?? 0.3;
  const maxTokens = options.maxTokens ?? config.maxTokens ?? 2400;

  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: connection.modelName,
      messages: options.messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Model API error ${resp.status}: ${text}`);
  }

  const data = await resp.json();
  return data.choices?.[0]?.message?.content || '';
}

export async function generateWithCapability(
  capability: string,
  options: GenerateOptions
): Promise<string> {
  const connection = await prisma.modelConnection.findFirst({
    where: {
      enabled: true,
      capabilities: { contains: capability },
    },
    include: { provider: true },
    orderBy: { isDefault: 'desc' },
  });

  if (!connection) {
    throw new Error(`No enabled model connection for capability: ${capability}`);
  }

  const baseUrl = connection.baseUrl || connection.provider.defaultBaseUrl || '';
  const apiKey = resolveApiKey(connection.apiKeyRef);

  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: connection.modelName,
      messages: options.messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 2400,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Model API error ${resp.status}: ${text}`);
  }

  const data = await resp.json();
  return data.choices?.[0]?.message?.content || '';
}
