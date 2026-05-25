import { generateWithAgent } from './model-router';

export async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
  try {
    const agent = await (await import('@/lib/prisma')).prisma.agentSpec.findUnique({
      where: { agentKey: 'transcribe_audio' },
      include: { modelConnection: { include: { provider: true } } },
    });

    if (!agent?.modelConnection) {
      return mockTranscribe();
    }

    const { resolveApiKey } = await import('./config');
    const baseUrl = agent.modelConnection.baseUrl || agent.modelConnection.provider.defaultBaseUrl || '';
    const apiKey = resolveApiKey(agent.modelConnection.apiKeyRef);
    const modelName = agent.modelConnection.modelName;

    const blob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
    const formData = new FormData();
    formData.append('file', blob, 'audio.webm');
    formData.append('model', modelName);

    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/audio/transcriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`ASR API error: ${response.status}`);
    }

    const data = await response.json();
    return data.text || '';
  } catch (error) {
    console.error('ASR transcribe failed, using fallback:', error);
    return mockTranscribe();
  }
}

function mockTranscribe(): string {
  return '我知道高处作业的时候要系好安全带，发现有问题要及时报告班组长。';
}
