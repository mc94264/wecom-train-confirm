'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type InputMode = 'transcript' | 'audio';
type SubmitPhase = 'idle' | 'uploading' | 'transcribing' | 'creating' | 'done';

function StepIcon({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
      active ? 'bg-primary text-primary-foreground' :
      done ? 'bg-emerald-500 text-white' :
      'bg-muted text-muted-foreground'
    }`}>
      {active ? (
        <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : done ? (
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <span className="text-xs font-medium">{label}</span>
      )}
    </div>
  );
}

export default function NewSessionPage() {
  const router = useRouter();
  const [mode, setMode] = useState<InputMode>('transcript');
  const [title, setTitle] = useState('');
  const [transcript, setTranscript] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<SubmitPhase>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<(() => void) | null>(null);

  const isSubmitting = phase !== 'idle' && phase !== 'done';
  const showTranscribeDone = phase === 'creating' || phase === 'done';
  const showCreateDone = phase === 'done';

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setAudioFile(file);
    setErrorMsg('');
  }

  function canSubmit(): boolean {
    if (!title.trim()) return false;
    if (mode === 'transcript') return !!transcript.trim();
    return !!audioFile;
  }

  const reset = useCallback(() => {
    if (abortRef.current) abortRef.current();
    setPhase('idle');
    setUploadProgress(0);
    setErrorMsg('');
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit() || isSubmitting) return;

    setPhase(mode === 'audio' ? 'uploading' : 'creating');
    setUploadProgress(0);
    setErrorMsg('');

    try {
      let res: Response;

      if (mode === 'audio') {
        // 使用 XMLHttpRequest 获取上传进度
        res = await new Promise<Response>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          const formData = new FormData();
          formData.append('title', title.trim());
          formData.append('audio', audioFile!);

          abortRef.current = () => xhr.abort();

          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const pct = Math.round((event.loaded / event.total) * 100);
              setUploadProgress(pct);
              if (pct >= 95) {
                setPhase('transcribing');
              }
            }
          });

          xhr.addEventListener('load', () => {
            const response = new Response(xhr.response, {
              status: xhr.status,
              statusText: xhr.statusText,
              headers: { 'Content-Type': 'application/json' },
            });
            resolve(response);
          });

          xhr.addEventListener('error', () => reject(new Error('上传失败，请检查网络')));
          xhr.addEventListener('abort', () => reject(new Error('已取消')));
          xhr.addEventListener('timeout', () => reject(new Error('上传超时，请稍后重试')));

          xhr.open('POST', '/api/sessions');
          xhr.timeout = 300000; // 5 分钟
          xhr.send(formData);
        });
      } else {
        setPhase('creating');
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
        setPhase('done');
        const data = await res.json();
        router.push(`/admin/sessions/${data.id}/confirm`);
      } else {
        const text = await res.text();
        let err = '创建失败';
        try {
          const parsed = JSON.parse(text);
          err = parsed.error || `请求失败 (${res.status})`;
        } catch {
          err = text || `请求失败 (${res.status})`;
        }
        throw new Error(err);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '创建失败';
      setErrorMsg(msg);
      setPhase('idle');
      setUploadProgress(0);
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
            disabled={isSubmitting}
            onClick={() => { setMode('transcript'); reset(); }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
              mode === 'transcript'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            录入文字稿
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => { setMode('audio'); reset(); }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
              mode === 'audio'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
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
            disabled={isSubmitting}
            className="w-full border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition disabled:opacity-50"
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
              disabled={isSubmitting}
              className="w-full border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition resize-y disabled:opacity-50"
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
              onClick={() => !isSubmitting && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg px-6 py-8 text-center cursor-pointer transition ${
                audioFile
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.webm,.m4a,.amr"
                onChange={handleFileChange}
                disabled={isSubmitting}
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
                  <p className="text-xs text-muted-foreground">支持 MP3、WAV、WEBM、M4A 等格式，建议不超过 50MB</p>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              系统将自动转写录音内容，然后提取培训重点。大文件转写可能需要 1-3 分钟。
            </p>
          </div>
        )}

        {/* 错误提示 */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-700">创建失败</p>
              <p className="text-sm text-red-600 mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* 分阶段进度（仅录音模式） */}
        {mode === 'audio' && isSubmitting && (
          <div className="bg-muted/50 border border-border rounded-lg p-5 space-y-4">
            {/* 上传进度 */}
            <div className={`flex items-center gap-3 ${phase === 'uploading' ? 'opacity-100' : 'opacity-60'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                phase === 'uploading' ? 'bg-primary text-primary-foreground' :
                showTranscribeDone ? 'bg-emerald-500 text-white' :
                'bg-muted text-muted-foreground'
              }`}>
                {phase === 'uploading' ? (
                  <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{phase === 'uploading' ? '正在上传录音...' : '录音已上传'}</p>
                {phase === 'uploading' && (
                  <div className="mt-1.5">
                    <div className="h-1.5 bg-border rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{uploadProgress}%</p>
                  </div>
                )}
              </div>
            </div>

            {/* 转写进度 */}
            <div className={`flex items-center gap-3 ${phase === 'transcribing' ? 'opacity-100' : 'opacity-60'}`}>
              <StepIcon active={phase === 'transcribing'} done={showTranscribeDone} label="2" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {phase === 'transcribing' ? '正在转写录音内容...' :
                   showTranscribeDone ? '转写完成' :
                   '等待转写'}
                </p>
              </div>
            </div>

            {/* 创建进度 */}
            <div className={`flex items-center gap-3 ${phase === 'creating' ? 'opacity-100' : 'opacity-60'}`}>
              <StepIcon active={phase === 'creating'} done={showCreateDone} label="3" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {phase === 'creating' ? '正在创建培训任务...' :
                   showCreateDone ? '创建完成' :
                   '等待创建'}
                </p>
              </div>
            </div>

            {/* 提醒 */}
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-xs text-amber-700">
                转写过程可能需要几分钟，请勿关闭或刷新此页面
              </p>
            </div>
          </div>
        )}

        {/* 按钮 */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting || !canSubmit()}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 shadow-md shadow-primary/20 transition"
          >
            {isSubmitting && phase !== 'uploading' && (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {mode === 'audio' && isSubmitting
              ? phase === 'uploading' ? `上传中 ${uploadProgress}%...`
                : phase === 'transcribing' ? '转写中...'
                : phase === 'creating' ? '创建中...'
                : '处理中...'
              : mode === 'audio' ? '上传并转写'
              : '创建并提取重点'
            }
          </button>
          {!isSubmitting && (
            <button
              type="button"
              onClick={() => router.push('/admin')}
              className="border border-border bg-card text-foreground px-6 py-2.5 rounded-lg font-medium hover:bg-muted transition"
            >
              取消
            </button>
          )}
          {isSubmitting && (
            <button
              type="button"
              onClick={reset}
              className="border border-border bg-card text-foreground px-6 py-2.5 rounded-lg font-medium hover:bg-muted transition"
            >
              取消
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
