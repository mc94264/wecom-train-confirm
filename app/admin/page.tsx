'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Session {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  _count: { assignments: number };
}

const statusMap: Record<string, string> = {
  draft: '草稿',
  content_ready: '内容就绪',
  extracting_key_points: '提取重点中',
  pending_admin_confirm: '待确认重点',
  pushed: '已推送',
  collecting_replies: '收集中',
  analyzing: '分析中',
  completed: '已完成',
};

const statusConfig: Record<string, { label: string; dot: string; bg: string }> = {
  draft: { label: '草稿', dot: 'bg-slate-400', bg: 'bg-slate-50 text-slate-600' },
  content_ready: { label: '内容就绪', dot: 'bg-blue-500', bg: 'bg-blue-50 text-blue-700' },
  extracting_key_points: { label: '提取重点中', dot: 'bg-amber-500', bg: 'bg-amber-50 text-amber-700' },
  pending_admin_confirm: { label: '待确认重点', dot: 'bg-orange-500', bg: 'bg-orange-50 text-orange-700' },
  pushed: { label: '已推送', dot: 'bg-purple-500', bg: 'bg-purple-50 text-purple-700' },
  collecting_replies: { label: '收集中', dot: 'bg-cyan-500', bg: 'bg-cyan-50 text-cyan-700' },
  analyzing: { label: '分析中', dot: 'bg-indigo-500', bg: 'bg-indigo-50 text-indigo-700' },
  completed: { label: '已完成', dot: 'bg-emerald-500', bg: 'bg-emerald-50 text-emerald-700' },
};

export default function AdminPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/sessions')
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`API ${res.status}: ${text}`);
        }
        return res.json();
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setSessions(list);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load sessions:', err);
        setError(err.message || '加载失败');
        setLoading(false);
      });
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">培训任务管理</h1>
          <p className="text-sm text-muted-foreground mt-1">创建、分配和跟踪安全培训效果</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/config"
            className="inline-flex items-center gap-2 border border-border bg-card px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            平台配置
          </Link>
          <Link
            href="/admin/sessions/new"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 shadow-md shadow-primary/20"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新建培训任务
          </Link>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : error ? (
        <div className="text-center py-20 bg-card border border-border rounded-xl shadow-sm">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-muted-foreground mb-2">加载培训任务失败</p>
          <p className="text-xs text-muted-foreground/60 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium"
          >
            刷新重试
          </button>
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border rounded-xl shadow-sm">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-muted-foreground mb-4">暂无培训任务</p>
          <Link
            href="/admin/sessions/new"
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            创建第一个培训任务
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => {
            const config = statusConfig[session.status] || statusConfig.draft;
            return (
              <Link
                key={session.id}
                href={`/admin/sessions/${session.id}`}
                className="group block bg-card border border-border rounded-xl p-5 hover:shadow-lg hover:border-primary/20 transition-all duration-200"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-lg text-foreground truncate group-hover:text-primary transition-colors">
                      {session.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {session._count.assignments} 人
                      </span>
                      <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                      <span className="inline-flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {new Date(session.createdAt).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium shrink-0 ${config.bg}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                    {config.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
