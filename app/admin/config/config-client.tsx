'use client';

import { useState } from 'react';

interface ModelProvider {
  id: string;
  key: string;
  displayName: string;
  capabilities: string;
  defaultBaseUrl: string | null;
  connections?: { id: string }[];
}

interface ModelConnection {
  id: string;
  displayName: string;
  baseUrl: string | null;
  apiKeyRef: string;
  modelName: string;
  isDefault: boolean;
  enabled: boolean;
  capabilities: string;
  notes: string | null;
  provider: ModelProvider;
}

interface AgentSpec {
  id: string;
  agentKey: string;
  displayName: string;
  description: string | null;
  capability: string;
  enabled: boolean;
  config: string;
  modelConnectionId: string | null;
  modelConnection: ModelConnection | null;
}

interface ServiceConfig {
  id: string;
  serviceKey: string;
  displayName: string;
  config: string;
  enabled: boolean;
}

type Tab = 'connections' | 'agents' | 'services';

export default function ConfigClient({
  providers,
  connections: initialConnections,
  agentSpecs: initialAgentSpecs,
  serviceConfigs: initialServiceConfigs,
}: {
  providers: ModelProvider[];
  connections: ModelConnection[];
  agentSpecs: AgentSpec[];
  serviceConfigs: ServiceConfig[];
}) {
  const [tab, setTab] = useState<Tab>('connections');
  const [connections, setConnections] = useState(initialConnections);
  const [agentSpecs, setAgentSpecs] = useState(initialAgentSpecs);
  const [serviceConfigs, setServiceConfigs] = useState(initialServiceConfigs);

  async function reload() {
    const [cRes, aRes, sRes] = await Promise.all([
      fetch('/api/admin/model-connections'),
      fetch('/api/admin/agent-specs'),
      fetch('/api/admin/service-configs'),
    ]);
    const [c, a, s] = await Promise.all([cRes.json(), aRes.json(), sRes.json()]);
    setConnections(c);
    setAgentSpecs(a);
    setServiceConfigs(s);
  }

  return (
    <>
      <div className="flex gap-1 border-b mb-6">
        <TabButton label="模型连接" active={tab === 'connections'} onClick={() => setTab('connections')} />
        <TabButton label="Agent 管理" active={tab === 'agents'} onClick={() => setTab('agents')} />
        <TabButton label="服务配置" active={tab === 'services'} onClick={() => setTab('services')} />
      </div>

      {tab === 'connections' && (
        <ConnectionsTab providers={providers} connections={connections} onUpdate={reload} />
      )}
      {tab === 'agents' && (
        <AgentsTab agentSpecs={agentSpecs} connections={connections} onUpdate={reload} />
      )}
      {tab === 'services' && (
        <ServicesTab serviceConfigs={serviceConfigs} onUpdate={reload} />
      )}
    </>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
        active ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      {label}
    </button>
  );
}

function ConnectionsTab({ providers, connections, onUpdate }: {
  providers: ModelProvider[];
  connections: ModelConnection[];
  onUpdate: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; ok: boolean; message: string } | null>(null);
  const [form, setForm] = useState({
    providerId: '', displayName: '', baseUrl: '', apiKeyRef: '', modelName: '',
    capabilities: 'llm,chat', isDefault: false, notes: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/admin/model-connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, capabilities: form.capabilities.split(',').map(s => s.trim()) }),
    });
    if (res.ok) { setShowForm(false); setForm({ providerId: '', displayName: '', baseUrl: '', apiKeyRef: '', modelName: '', capabilities: 'llm,chat', isDefault: false, notes: '' }); onUpdate(); }
    else alert('创建失败');
  }

  async function handleTest(id: string) {
    setTesting(id); setTestResult(null);
    const res = await fetch(`/api/admin/model-connections/${id}/test`, { method: 'POST' });
    const data = await res.json();
    setTestResult({ id, ok: data.ok, message: data.message }); setTesting(null);
  }

  async function handleToggle(id: string, enabled: boolean) {
    await fetch(`/api/admin/model-connections/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: !enabled }) });
    onUpdate();
  }

  async function handleDelete(id: string) {
    if (!confirm('确认删除此连接？')) return;
    await fetch(`/api/admin/model-connections/${id}`, { method: 'DELETE' });
    onUpdate();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">模型连接</h2>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition">
          {showForm ? '取消' : '+ 新建连接'}
        </button>
      </div>
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-4 mb-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <select value={form.providerId} onChange={e => setForm({ ...form, providerId: e.target.value })} className="border rounded px-3 py-2 text-sm" required>
              <option value="">选择 Provider</option>
              {providers.map(p => <option key={p.id} value={p.id}>{p.displayName}</option>)}
            </select>
            <input type="text" value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} placeholder="显示名称" className="border rounded px-3 py-2 text-sm" required />
            <input type="text" value={form.baseUrl} onChange={e => setForm({ ...form, baseUrl: e.target.value })} placeholder="Base URL（可选）" className="border rounded px-3 py-2 text-sm" />
            <input type="text" value={form.modelName} onChange={e => setForm({ ...form, modelName: e.target.value })} placeholder="模型名称" className="border rounded px-3 py-2 text-sm" required />
          </div>
          <input type="text" value={form.apiKeyRef} onChange={e => setForm({ ...form, apiKeyRef: e.target.value })} placeholder="API Key 引用，如 env://OPENAI_API_KEY" className="w-full border rounded px-3 py-2 text-sm" required />
          <input type="text" value={form.capabilities} onChange={e => setForm({ ...form, capabilities: e.target.value })} placeholder="能力标签，逗号分隔" className="w-full border rounded px-3 py-2 text-sm" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isDefault} onChange={e => setForm({ ...form, isDefault: e.target.checked })} />设为默认</label>
          <div className="flex gap-2">
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition">保存</button>
            <button type="button" onClick={() => setShowForm(false)} className="border px-4 py-2 rounded text-sm hover:bg-gray-100 transition">取消</button>
          </div>
        </form>
      )}
      <div className="space-y-2">
        {connections.map(conn => (
          <div key={conn.id} className="border rounded-lg p-4 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${conn.enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="font-medium">{conn.displayName}</span>
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{conn.provider.displayName}</span>
                {conn.isDefault && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">默认</span>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleTest(conn.id)} disabled={testing === conn.id} className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded hover:bg-blue-100 transition disabled:opacity-50">{testing === conn.id ? '测试中...' : '测试'}</button>
                <button onClick={() => handleToggle(conn.id, conn.enabled)} className="text-xs bg-gray-50 text-gray-700 px-3 py-1 rounded hover:bg-gray-100 transition">{conn.enabled ? '禁用' : '启用'}</button>
                <button onClick={() => handleDelete(conn.id)} className="text-xs bg-red-50 text-red-700 px-3 py-1 rounded hover:bg-red-100 transition">删除</button>
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-500 space-y-1">
              <p>模型: {conn.modelName} · Base URL: {conn.baseUrl || conn.provider.defaultBaseUrl || '-'}</p>
              <p>API Key Ref: {conn.apiKeyRef} · 能力: {conn.capabilities}</p>
            </div>
            {testResult?.id === conn.id && (
              <div className={`mt-2 text-sm px-3 py-2 rounded ${testResult.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {testResult.ok ? '✓' : '✗'} {testResult.message}
              </div>
            )}
          </div>
        ))}
        {connections.length === 0 && <p className="text-gray-500 text-center py-8">暂无模型连接，请先创建一个</p>}
      </div>
    </div>
  );
}

function AgentsTab({ agentSpecs, connections, onUpdate }: {
  agentSpecs: AgentSpec[];
  connections: ModelConnection[];
  onUpdate: () => void;
}) {
  async function handleUpdate(agentKey: string, updates: { modelConnectionId?: string | null; enabled?: boolean }) {
    const res = await fetch('/api/admin/agent-specs', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agentKey, ...updates }) });
    if (res.ok) onUpdate(); else alert('更新失败');
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Agent 管理</h2>
      <div className="space-y-3">
        {agentSpecs.map(spec => (
          <div key={spec.agentKey} className="border rounded-lg p-4 bg-white">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${spec.enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="font-medium">{spec.displayName}</span>
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{spec.agentKey}</span>
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">{spec.capability}</span>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={spec.enabled} onChange={e => handleUpdate(spec.agentKey, { enabled: e.target.checked })} />启用
              </label>
            </div>
            <p className="text-sm text-gray-500 mb-3">{spec.description}</p>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">绑定模型连接:</span>
              <select value={spec.modelConnectionId || ''} onChange={e => handleUpdate(spec.agentKey, { modelConnectionId: e.target.value || null })} className="border rounded px-3 py-1 text-sm">
                <option value="">自动选择（按 capability 匹配）</option>
                {connections.filter(c => c.enabled && JSON.parse(c.capabilities || '[]').includes(spec.capability)).map(c => (
                  <option key={c.id} value={c.id}>{c.displayName} ({c.modelName})</option>
                ))}
              </select>
            </div>
            {spec.modelConnection && <p className="mt-2 text-xs text-blue-600">当前绑定: {spec.modelConnection.displayName} ({spec.modelConnection.modelName})</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ServicesTab({ serviceConfigs, onUpdate }: { serviceConfigs: ServiceConfig[]; onUpdate: () => void }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [formConfig, setFormConfig] = useState('');

  function startEdit(cfg: ServiceConfig) { setEditing(cfg.serviceKey); setFormConfig(JSON.stringify(JSON.parse(cfg.config), null, 2)); }

  async function handleSave(serviceKey: string) {
    try {
      const parsed = JSON.parse(formConfig);
      const res = await fetch('/api/admin/service-configs', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ serviceKey, config: parsed }) });
      if (res.ok) { setEditing(null); onUpdate(); } else alert('保存失败');
    } catch { alert('JSON 格式错误'); }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">服务配置</h2>
      <div className="space-y-3">
        {serviceConfigs.map(cfg => (
          <div key={cfg.serviceKey} className="border rounded-lg p-4 bg-white">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${cfg.enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="font-medium">{cfg.displayName}</span>
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{cfg.serviceKey}</span>
              </div>
              {editing !== cfg.serviceKey && <button onClick={() => startEdit(cfg)} className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded hover:bg-blue-100 transition">编辑</button>}
            </div>
            {editing === cfg.serviceKey ? (
              <div className="space-y-2">
                <textarea value={formConfig} onChange={e => setFormConfig(e.target.value)} rows={6} className="w-full border rounded px-3 py-2 text-sm font-mono" />
                <div className="flex gap-2">
                  <button onClick={() => handleSave(cfg.serviceKey)} className="bg-blue-600 text-white px-4 py-1 rounded text-sm hover:bg-blue-700 transition">保存</button>
                  <button onClick={() => setEditing(null)} className="border px-4 py-1 rounded text-sm hover:bg-gray-50 transition">取消</button>
                </div>
              </div>
            ) : (
              <pre className="bg-gray-50 rounded p-3 text-xs overflow-x-auto">{JSON.stringify(JSON.parse(cfg.config), null, 2)}</pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
