import { prisma } from '@/lib/prisma';
import { mkdirSync, writeFileSync } from 'fs';
import * as path from 'path';

interface StorageConfig {
  type: 'local' | 'oss';
  localPath?: string;
  endpoint?: string;
  bucket?: string;
  accessKeyId?: string;
  accessKeySecret?: string;
  region?: string;
  objectPrefix?: string;
}

async function getConfig(): Promise<StorageConfig> {
  const cfg = await prisma.serviceConfig.findUnique({
    where: { serviceKey: 'storage' },
  });
  if (!cfg || !cfg.enabled) {
    return { type: 'local', localPath: './uploads' };
  }
  return JSON.parse(cfg.config) as StorageConfig;
}

function getOSSClient(config: StorageConfig) {
  if (!config.accessKeyId || !config.accessKeySecret || !config.endpoint || !config.bucket) {
    throw new Error('OSS config incomplete');
  }
  const OSS = require('ali-oss');
  return new OSS({
    region: config.region || 'oss-cn-hangzhou',
    endpoint: config.endpoint,
    accessKeyId: config.accessKeyId,
    accessKeySecret: config.accessKeySecret,
    bucket: config.bucket,
  });
}

export async function saveFile(
  data: Buffer,
  filename: string,
  metadata?: Record<string, string>
): Promise<{ url: string; objectKey: string }> {
  const config = await getConfig();

  if (config.type === 'local') {
    const baseDir = config.localPath || './uploads';
    const dir = path.resolve(process.cwd(), baseDir);
    mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, filename);
    writeFileSync(filePath, data);
    return {
      url: `/uploads/${filename}`,
      objectKey: filePath,
    };
  }

  const prefix = config.objectPrefix || 'wecom-train-confirm';
  const objectKey = `${prefix}/${filename}`;
  const client = getOSSClient(config);
  await client.put(objectKey, data, {
    headers: metadata ? { 'x-oss-meta-filename': filename } : undefined,
  });

  const url = client.signatureUrl(objectKey, { expires: 3600 * 24 * 7 });
  return { url, objectKey };
}

export async function generatePlayUrl(objectKey: string): Promise<string> {
  const config = await getConfig();
  if (config.type === 'local') {
    return objectKey;
  }
  const client = getOSSClient(config);
  return client.signatureUrl(objectKey, { expires: 3600 });
}
