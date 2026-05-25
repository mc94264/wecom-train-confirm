'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

type InputMode = 'transcript' | 'audio';

export default function NewSessionPage() {
  const router = useRouter();
  const [mode, setMode] = useState<InputMode>('transcript');
  const [title, setTitle] = useState('');
  const [transcript, setTranscript] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setAudioFile(file);
  }

  function getSubmitLabel() {
    if (submitting) return mode === 'audio' ? '转写并创建中...' : '创建中...';
    return mode === 'audio' ? '上传并转写' : '创建并提取重点';
  }

  function canSubmit(): boolean {
    if (!title.trim()) return false;
    if (mode === 'transcript') return !!transcript.trim();
    return !!audioFile;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit()) return;

    setSubmitting(true);

    let res: Response;

    if (mode === 'audio') {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('audio', audioFile!);
      res = await fetch('/api/sessions', {
        method: 'POST',
        body: formData,
      });
    } else {
      res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          sourceTranscript: transcript.trim(),
        }),
      });
    }

    if (res.ok) {
      const data = await res.json();
      router.push(`/admin/sessions/${data.id}/confirm`);
    } else {
      const err = await res.json().catch(() => ({ error: '创建失败' }));
      alert(err.error || '创建失败');
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">新建培训任务</h1>
        <p className="text-sm text-muted-foreground mt-1">填写培训基本信息，系统将自动提取重点</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-6">
        {/* 输入方式切换 */}
        <div className="flex border-b border-border">
          <button
            type="button"
            onClick={() => setMode('transcript')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
              mode === 'transcript'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            录入文字稿
          </button>
          <button
            type="button"
            onClick={() => setMode('audio')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
              mode === 'audio'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            上传录音
          </button>
        </div>

        {/* 标题 */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            培训标题 <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：2024年Q2安全制度宣讲"
            className="w-full border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
            required
          />
        </div>

        {/* 文字稿输入 */}
        {mode === 'transcript' && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              宣讲文字稿 <span className="text-destructive">*</span>
            </label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="粘贴本次安全培训宣讲的完整文字稿..."
              rows={10}
              className="w-full border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition resize-y"
              required
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              系统将基于文字稿自动提取培训重点，建议 200 字以上
            </p>
          </div>
        )}

        {/* 录音上传 */}
        {mode === 'audio' && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              宣讲录音 <span className="text-destructive">*</span>
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg px-6 py-8 text-center cursor-pointer transition ${
                audioFile
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.webm,.m4a,.amr"
                onChange={handleFileChange}
                className="hidden"
              />
              {audioFile ? (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">{audioFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <svg className="mx-auto h-8 w-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  <p className="text-sm text-muted-foreground">点击选择音频文件</p>
                  <p className="text-xs text-muted-foreground">支持 MP3、WAV、WEBM、M4A 等格式</p>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              系统将自动转写录音内容，然后提取培训重点
            </p>
          </div>
        )}

        {/* 按钮 */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting || !canSubmit()}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 shadow-md shadow-primary/20 transition"
          >
            {submitting && (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {getSubmitLabel()}
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin')}
            className="border border-border bg-card text-foreground px-6 py-2.5 rounded-lg font-medium hover:bg-muted transition"
          >
            取消
          </button>
        </div>
      </form>
    </div>
  );
}
