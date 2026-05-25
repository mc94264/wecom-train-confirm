import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import ConfigClient from './config-client';

export const dynamic = 'force-dynamic';

export default async function ConfigPage() {
  const [providers, connections, agentSpecs, serviceConfigs] = await Promise.all([
    prisma.modelProvider.findMany({ orderBy: { displayName: 'asc' }, include: { connections: true } }),
    prisma.modelConnection.findMany({ orderBy: { createdAt: 'desc' }, include: { provider: true } }),
    prisma.agentSpec.findMany({ orderBy: { agentKey: 'asc' }, include: { modelConnection: { include: { provider: true } } } }),
    prisma.serviceConfig.findMany({ orderBy: { serviceKey: 'asc' } }),
  ]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">平台配置管理</h1>
        <Link href="/admin" className="text-blue-600 hover:underline">← 返回</Link>
      </div>
      <ConfigClient
        providers={providers}
        connections={connections}
        agentSpecs={agentSpecs}
        serviceConfigs={serviceConfigs}
      />
    </div>
  );
}
