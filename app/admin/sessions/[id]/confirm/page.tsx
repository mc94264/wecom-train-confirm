'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface KeyPoint {
  id?: string;
  title: string;
  description: string;
  keywords: string;
}

interface Session {
  id: string;
  title: string;
  status: string;
  sourceTranscript: string;
  keyPoints: KeyPoint[];
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function SaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
    </svg>
  );
}

export default function ConfirmPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [keyPoints, setKeyPoints] = useState<KeyPoint[]>([]);

  useEffect(() => {
    fetch(`/api/sessions/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setSession(data);
        if (data.keyPoints?.length > 0) {
          setKeyPoints(data.keyPoints.map((kp: { title: string; description: string; keywords: string }) => ({
            title: kp.title,
            description: kp.description || '',
            keywords: kp.keywords || '',
          })));
        } else if (data.status === 'content_ready') {
          handleExtract();
        }
        setLoading(false);
      });
  }, [id]);

  async function handleExtract() {
    setExtracting(true);
    const res = await fetch(`/api/sessions/${id}/key-points`, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      setSession(data);
      setKeyPoints(data.keyPoints.map((kp: { title: string; description: string; keywords: string }) => ({
        title: kp.title,
        description: kp.description || '',
        keywords: kp.keywords || '',
      })));
    } else {
      alert('提取重点失败');
    }
    setExtracting(false);
  }

  async function handleConfirm() {
    const res = await fetch(`/api/sessions/${id}/confirm`, {
      method: 'POST',
    });
    if (res.ok) {
      router.push(`/admin/sessions/${id}`);
    } else {
      alert('确认失败');
    }
  }

  function updateKeyPoint(index: number, field: keyof KeyPoint, value: string) {
    setKeyPoints((prev) =>
      prev.map((kp, i) => (i === index ? { ...kp, [field]: value } : kp))
    );
  }

  function removeKeyPoint(index: number) {
    setKeyPoints((prev) => prev.filter((_, i) => i !== index));
  }

  function addKeyPoint() {
    setKeyPoints((prev) => [...prev, { title: '', description: '', keywords: '' }]);
  }

  async function handleSaveKeyPoints() {
    const res = await fetch(`/api/sessions/${id}/key-points`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyPoints }),
    });
    if (res.ok) {
      const data = await res.json();
      setSession(data);
      alert('已保存');
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="h-8 w-8 text-primary" />
          <p className="text-sm text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 text-muted-foreground">任务不存在</div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">确认培训重点</h1>
        <p className="text-sm text-muted-foreground mt-1">{session.title}</p>
      </div>

      {/* Extracting State */}
      {extracting && (
        <div className="flex items-center gap-3 bg-warning/5 border border-warning/15 rounded-xl px-4 py-3.5 mb-6">
          <Spinner className="h-4 w-4 text-warning shrink-0" />
          <p className="text-sm text-warning">AI 正在分析宣讲内容，提取培训重点...</p>
        </div>
      )}

      {/* Empty State */}
      {keyPoints.length === 0 && !extracting && (
        <div className="bg-card border border-border rounded-xl shadow-sm p-8 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <RefreshIcon className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground mb-4">尚未提取培训重点</p>
          <button
            onClick={handleExtract}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-medium hover:bg-primary/90 shadow-md shadow-primary/20 transition"
          >
            <RefreshIcon className="w-4 h-4" />
            提取培训重点
          </button>
        </div>
      )}

      {/* Key Points List */}
      {keyPoints.length > 0 && (
        <>
          <div className="space-y-4 mb-6">
            {keyPoints.map((kp, index) => (
              <div key={index} className="bg-card border border-border rounded-xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                    重点 {index + 1}
                  </span>
                  <button
                    onClick={() => removeKeyPoint(index)}
                    className="inline-flex items-center gap-1 text-sm text-destructive hover:text-destructive/80 transition"
                  >
                    <TrashIcon className="w-4 h-4" />
                    删除
                  </button>
                </div>

                {/* Title + Keywords in one row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      value={kp.title}
                      onChange={(e) => updateKeyPoint(index, 'title', e.target.value)}
                      placeholder="重点标题"
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm text-foreground bg-background placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <input
                      type="text"
                      value={kp.keywords}
                      onChange={(e) => updateKeyPoint(index, 'keywords', e.target.value)}
                      placeholder="关键词（逗号分隔）"
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm text-foreground bg-background placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
                    />
                  </div>
                </div>

                {/* Description */}
                <textarea
                  value={kp.description}
                  onChange={(e) => updateKeyPoint(index, 'description', e.target.value)}
                  placeholder="详细描述"
                  rows={2}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm text-foreground bg-background placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition resize-y"
                />
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mb-8">
            <button
              onClick={addKeyPoint}
              className="inline-flex items-center gap-1.5 border border-border bg-card text-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition"
            >
              <PlusIcon className="w-4 h-4" />
              添加重点
            </button>
            <button
              onClick={handleSaveKeyPoints}
              className="inline-flex items-center gap-1.5 border border-border bg-card text-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition"
            >
              <SaveIcon className="w-4 h-4" />
              保存修改
            </button>
            <button
              onClick={handleExtract}
              disabled={extracting}
              className="inline-flex items-center gap-1.5 border border-border bg-card text-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-muted disabled:opacity-50 transition"
            >
              <RefreshIcon className="w-4 h-4" />
              {extracting ? '提取中...' : '重新提取'}
            </button>
            <button
              onClick={handleConfirm}
              className="inline-flex items-center gap-1.5 bg-accent text-accent-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-accent/90 shadow-md shadow-accent/20 transition"
            >
              <CheckIcon className="w-4 h-4" />
              确认重点并继续
            </button>
          </div>
        </>
      )}

      {/* Original Transcript */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground text-sm">原始宣讲稿</h3>
        </div>
        <div className="p-4 bg-muted/30 max-h-64 overflow-y-auto">
          <p className="text-sm text-muted-foreground leading-relaxed">{session.sourceTranscript}</p>
        </div>
      </div>
    </div>
  );
}
