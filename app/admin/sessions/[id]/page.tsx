'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface EmployeeDetail {
  id: string;
  employeeName: string;
  employeeTeam: string | null;
  status: string;
  pushedAt: string | null;
  repliedAt: string | null;
  uniqueToken: string;
  replyUrl: string;
  transcript: string | null;
  audioPath: string | null;
  audioUrl: string | null;
  analysis: {
    level: string;
    overallScore: number | null;
    coveredPoints: string[];
    missingPoints: string[];
    wrongPoints: string[];
    summary: string | null;
    correctionSuggestion: string | null;
  } | null;
}

interface DashboardData {
  session: {
    id: string;
    title: string;
    status: string;
    demoMode: boolean;
    createdAt: string;
    sourceTranscript: string | null;
    summary: string | null;
    keyPoints: { id: string; title: string; description: string | null; keywords: string | null }[];
  };
  stats: {
    total: number;
    replied: number;
    notReplied: number;
    replyRate: number;
    transcribed: number;
    analyzed: number;
    understood: number;
    needCorrection: number;
    understandingRate: number;
  };
  employeeDetails: EmployeeDetail[];
}

const levelConfig: Record<string, { dot: string; bg: string; text: string }> = {
  '理解到位': { dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  '基本理解': { dot: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700' },
  '理解不足': { dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700' },
  '存在偏差': { dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700' },
};

const statusConfig: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  not_started: { label: '未开始', dot: 'bg-slate-400', bg: 'bg-slate-50', text: 'text-slate-600' },
  opened: { label: '已打开', dot: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-600' },
  replied: { label: '已回复', dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700' },
  transcribed: { label: '已转写', dot: 'bg-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-700' },
  analyzed: { label: '已分析', dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
};

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<{ id: string; name: string; team: string | null; wecomUserId: string | null }[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [pushing, setPushing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string>('');
  const [detailModal, setDetailModal] = useState<EmployeeDetail | null>(null);

  // External contacts state
  const [externalContacts, setExternalContacts] = useState<{ id: string; name: string; followUserName: string | null }[]>([]);
  const [selectedExternalIds, setSelectedExternalIds] = useState<string[]>([]);
  const [syncingExternal, setSyncingExternal] = useState(false);
  const [pushingExternal, setPushingExternal] = useState(false);
  const [externalSyncResult, setExternalSyncResult] = useState<string>('');

  useEffect(() => {
    fetchDashboard();
    fetchEmployees();
    fetchExternalContacts();
  }, [id]);

  async function fetchDashboard() {
    const res = await fetch(`/api/sessions/${id}/dashboard`);
    if (res.ok) {
      const d = await res.json();
      setData(d);
    }
    setLoading(false);
  }

  async function fetchEmployees() {
    const res = await fetch('/api/employees');
    if (res.ok) {
      const list = await res.json();
      setEmployees(list);
    }
  }

  async function handleSyncContacts() {
    setSyncing(true);
    setSyncResult('');
    try {
      const res = await fetch('/api/wecom/sync', { method: 'POST' });
      if (res.ok) {
        const result = await res.json();
        setSyncResult(`同步完成：新增 ${result.created} 人，更新 ${result.updated} 人`);
        fetchEmployees();
      } else {
        const err = await res.json();
        setSyncResult(`同步失败：${err.error || '未知错误'}`);
      }
    } catch {
      setSyncResult('同步失败：网络错误');
    }
    setSyncing(false);
  }

  async function handleAssign() {
    if (selectedEmployeeIds.length === 0) return;
    const res = await fetch(`/api/sessions/${id}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeIds: selectedEmployeeIds }),
    });
    if (res.ok) {
      setSelectedEmployeeIds([]);
      fetchDashboard();
    }
  }

  async function handlePush() {
    setPushing(true);
    const res = await fetch(`/api/sessions/${id}/push`, { method: 'POST' });
    if (res.ok) {
      const result = await res.json();
      const successCount = result.results.filter((r: { success: boolean }) => r.success).length;
      const failDetails = result.results
        .filter((r: { success: boolean }) => !r.success)
        .map((r: { employeeName: string; message: string }) => `${r.employeeName}: ${r.message}`)
        .join('\n');
      alert(`推送完成：${result.results.length} 人\n成功: ${successCount} 人${failDetails ? '\n\n失败详情:\n' + failDetails : ''}`);
      fetchDashboard();
    } else {
      alert('推送失败');
    }
    setPushing(false);
  }

  // External contacts handlers
  async function fetchExternalContacts() {
    const res = await fetch('/api/wecom/external-contacts');
    if (res.ok) {
      const list = await res.json();
      setExternalContacts(list);
    }
  }

  async function handleSyncExternalContacts() {
    setSyncingExternal(true);
    setExternalSyncResult('');
    try {
      const res = await fetch('/api/wecom/external-contacts', { method: 'POST' });
      if (res.ok) {
        const result = await res.json();
        setExternalSyncResult(`同步完成：新增 ${result.created} 人，更新 ${result.updated} 人，共 ${result.total} 人`);
        fetchExternalContacts();
      } else {
        const err = await res.json();
        setExternalSyncResult(`同步失败：${err.error || '未知错误'}`);
      }
    } catch {
      setExternalSyncResult('同步失败：网络错误');
    }
    setSyncingExternal(false);
  }

  async function handlePushExternal() {
    if (selectedExternalIds.length === 0) return;
    setPushingExternal(true);
    const res = await fetch(`/api/sessions/${id}/push-external`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ externalContactIds: selectedExternalIds }),
    });
    if (res.ok) {
      const result = await res.json();
      const successCount = result.results.filter((r: { success: boolean }) => r.success).length;
      const failDetails = result.results
        .filter((r: { success: boolean }) => !r.success)
        .map((r: { name: string; message: string }) => `${r.name}: ${r.message}`)
        .join('\n');
      alert(`推送完成：${result.results.length} 人\n成功: ${successCount} 人${failDetails ? '\n\n失败详情:\n' + failDetails : ''}`);
      setSelectedExternalIds([]);
    } else {
      alert('推送失败');
    }
    setPushingExternal(false);
  }

  async function handleTranscribe(token: string) {
    const res = await fetch(`/api/reply/${token}/transcribe`, { method: 'POST' });
    if (res.ok) {
      fetchDashboard();
    } else {
      alert('转写失败');
    }
  }

  async function handleAnalyze(token: string) {
    const res = await fetch(`/api/reply/${token}/analyze`, { method: 'POST' });
    if (res.ok) {
      fetchDashboard();
    } else {
      alert('分析失败');
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }
  if (!data) return <div className="max-w-6xl mx-auto px-4 py-8 text-muted-foreground">任务不存在</div>;

  const assignedIds = new Set(data.employeeDetails.map((e) => e.id));
  const availableEmployees = employees.filter((e) => !assignedIds.has(e.id));
  const assignedWithoutWecom = data.employeeDetails.filter(
    (a) => !a.pushedAt && employees.find((e) => e.id === a.id)?.wecomUserId === null
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{data.session.title}</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            创建于 {new Date(data.session.createdAt).toLocaleDateString('zh-CN')}
          </p>
        </div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          返回列表
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="总员工"
          value={data.stats.total}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <StatCard
          label="已回复"
          value={`${data.stats.replied} (${data.stats.replyRate}%)`}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="blue"
        />
        <StatCard
          label="理解通过"
          value={`${data.stats.understood} (${data.stats.understandingRate}%)`}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
          color="green"
        />
        <StatCard
          label="需纠正"
          value={data.stats.needCorrection}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
          color="red"
        />
      </div>

      {/* Key Points */}
      {data.session.keyPoints.length > 0 && (
        <div className="bg-card border border-border rounded-xl shadow-sm p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h2 className="font-semibold text-foreground">培训重点</h2>
          </div>
          <ul className="space-y-2">
            {data.session.keyPoints.map((kp, i) => (
              <li key={kp.id} className="flex gap-3 text-sm">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <div>
                  <span className="font-medium text-foreground">{kp.title}</span>
                  {kp.description && (
                    <p className="text-muted-foreground mt-0.5">{kp.description}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sync & Assign */}
      <div className="bg-card border border-border rounded-xl shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h2 className="font-semibold text-foreground">分配员工</h2>
          </div>
          <button
            onClick={handleSyncContacts}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 text-sm bg-muted text-muted-foreground px-3 py-1.5 rounded-lg hover:bg-muted/80 disabled:opacity-50 transition"
          >
            {syncing ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                同步中...
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                同步通讯录
              </>
            )}
          </button>
        </div>

        {syncResult && (
          <div
            className={`text-sm px-3 py-2 rounded-lg mb-3 ${
              syncResult.includes('失败')
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            {syncResult}
          </div>
        )}

        {availableEmployees.length > 0 ? (
          <div className="flex flex-wrap gap-2 mb-4">
            {availableEmployees.map((emp) => (
              <label
                key={emp.id}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm cursor-pointer border transition ${
                  selectedEmployeeIds.includes(emp.id)
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'bg-card border-border text-foreground hover:bg-muted'
                }`}
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={selectedEmployeeIds.includes(emp.id)}
                  onChange={(e) => {
                    setSelectedEmployeeIds((prev) =>
                      e.target.checked
                        ? [...prev, emp.id]
                        : prev.filter((id) => id !== emp.id)
                    );
                  }}
                />
                {emp.name}
                {emp.team && <span className="text-muted-foreground text-xs">{emp.team}</span>}
                {!emp.wecomUserId && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="未绑定企微" />
                )}
              </label>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm mb-4">所有员工已分配，或暂无员工数据。请先同步通讯录。</p>
        )}

        {assignedWithoutWecom.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800">
            <div className="flex items-center gap-1.5 font-medium mb-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              以下员工未绑定企微账号，无法推送：
            </div>
            <p className="text-amber-700">{assignedWithoutWecom.map((a) => a.employeeName).join('、')}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleAssign}
            disabled={selectedEmployeeIds.length === 0}
            className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 shadow-md shadow-primary/20 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            分配选中员工
          </button>
          <button
            onClick={handlePush}
            disabled={pushing || data.employeeDetails.length === 0}
            className="inline-flex items-center gap-1.5 bg-accent text-accent-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent/90 disabled:opacity-50 shadow-md shadow-accent/20 transition"
          >
            {pushing ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                推送中...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                推送到企微
              </>
            )}
          </button>
        </div>
      </div>

      {/* Employee Table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          <h2 className="font-semibold text-foreground">员工明细</h2>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {data.employeeDetails.length} 人
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">员工</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">状态</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">录音</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">转写</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">理解程度</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.employeeDetails.map((emp) => (
                <tr key={emp.id} className="hover:bg-muted/30 transition">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{emp.employeeName}</div>
                    {emp.employeeTeam && (
                      <div className="text-muted-foreground text-xs">{emp.employeeTeam}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={emp.status} />
                  </td>
                  <td className="px-4 py-3">
                    {emp.audioUrl ? (
                      <audio controls className="w-40 h-8" src={emp.audioUrl} />
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    {emp.transcript ? (
                      <p className="text-foreground truncate" title={emp.transcript}>
                        {emp.transcript}
                      </p>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {emp.analysis ? (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          levelConfig[emp.analysis.level]?.bg || 'bg-slate-100'
                        } ${levelConfig[emp.analysis.level]?.text || 'text-slate-700'}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${levelConfig[emp.analysis.level]?.dot || 'bg-slate-400'}`} />
                        {emp.analysis.level}
                        {emp.analysis.overallScore !== null && ` ${emp.analysis.overallScore}分`}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 flex-wrap">
                      {emp.status === 'replied' && (
                        <button
                          onClick={() => handleTranscribe(emp.uniqueToken)}
                          className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-md hover:bg-primary/20 transition"
                        >
                          转写
                        </button>
                      )}
                      {(emp.status === 'transcribed' || emp.status === 'replied') && (
                        <button
                          onClick={() => handleAnalyze(emp.uniqueToken)}
                          className="text-xs bg-accent/10 text-accent px-2.5 py-1 rounded-md hover:bg-accent/20 transition"
                        >
                          分析
                        </button>
                      )}
                      {emp.analysis && (
                        <button
                          onClick={() => setDetailModal(emp)}
                          className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-md hover:bg-muted/80 transition"
                        >
                          详情
                        </button>
                      )}
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}/reply/${emp.uniqueToken}`;
                          navigator.clipboard.writeText(url).then(() => alert('链接已复制到剪贴板'));
                        }}
                        className="text-xs bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-md hover:bg-emerald-100 transition"
                      >
                        复制链接
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {detailModal && detailModal.analysis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/40 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <h3 className="font-semibold text-foreground">{detailModal.employeeName}</h3>
                <p className="text-xs text-muted-foreground">分析详情</p>
              </div>
              <button
                onClick={() => setDetailModal(null)}
                className="p-1.5 rounded-lg hover:bg-muted transition"
              >
                <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="text-3xl font-bold text-foreground">{detailModal.analysis.overallScore}</div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${levelConfig[detailModal.analysis.level]?.bg} ${levelConfig[detailModal.analysis.level]?.text}`}>
                  {detailModal.analysis.level}
                </span>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-medium text-foreground mb-1">评价摘要</p>
                  <p className="text-muted-foreground">{detailModal.analysis.summary}</p>
                </div>
                {detailModal.analysis.coveredPoints.length > 0 && (
                  <div>
                    <p className="font-medium text-emerald-700 mb-1">已掌握</p>
                    <ul className="text-muted-foreground list-disc list-inside">
                      {detailModal.analysis.coveredPoints.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {detailModal.analysis.missingPoints.length > 0 && (
                  <div>
                    <p className="font-medium text-amber-700 mb-1">遗漏</p>
                    <ul className="text-muted-foreground list-disc list-inside">
                      {detailModal.analysis.missingPoints.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {detailModal.analysis.wrongPoints.length > 0 && (
                  <div>
                    <p className="font-medium text-red-700 mb-1">偏差</p>
                    <ul className="text-muted-foreground list-disc list-inside">
                      {detailModal.analysis.wrongPoints.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {detailModal.analysis.correctionSuggestion && (
                  <div className="bg-muted rounded-lg p-3">
                    <p className="font-medium text-foreground mb-1">纠正建议</p>
                    <p className="text-muted-foreground">{detailModal.analysis.correctionSuggestion}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'red';
}) {
  const colorMap = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-emerald-600 bg-emerald-50',
    red: 'text-red-600 bg-red-50',
  };
  const iconColor = color ? colorMap[color] : 'text-muted-foreground bg-muted';

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
      <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg mb-3 ${iconColor}`}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = statusConfig[status] || { label: status, dot: 'bg-slate-400', bg: 'bg-slate-50', text: 'text-slate-600' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
