'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';

interface ReplyData {
  session: {
    title: string;
    keyPoints: { title: string; description: string }[];
  };
  employee: { name: string };
  reply: {
    transcript: string;
    submittedAt: string;
    audioPath: string | null;
    analysis: {
      level: string;
      overallScore: number;
      summary: string;
      correctionSuggestion: string;
      coveredPoints: string;
      missingPoints: string;
      wrongPoints: string;
    } | null;
  } | null;
}

declare global {
  interface Window {
    wx?: WechatJsSdk;
  }
}

interface WechatJsSdk {
  config: (config: Record<string, unknown>) => void;
  ready: (callback: () => void) => void;
  error: (callback: (err: { errMsg: string }) => void) => void;
  startRecord: (opts?: { success?: () => void; fail?: (err: { errMsg: string }) => void }) => void;
  stopRecord: (opts: { success: (res: { localId: string }) => void; fail?: (err: { errMsg: string }) => void }) => void;
  onVoiceRecordEnd: (opts: { complete: (res: { localId: string }) => void }) => void;
  playVoice: (opts: { localId: string; success?: () => void; fail?: (err: { errMsg: string }) => void }) => void;
  pauseVoice: (opts: { localId: string }) => void;
  stopVoice: (opts: { localId: string }) => void;
  uploadVoice: (opts: {
    localId: string;
    isShowProgressTips: number;
    success: (res: { serverId: string }) => void;
    fail?: (err: { errMsg: string }) => void;
  }) => void;
  downloadVoice: (opts: {
    serverId: string;
    isShowProgressTips: number;
    success: (res: { localId: string }) => void;
  }) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function detectWecom(): boolean {
  return typeof window !== 'undefined' && /wxwork/i.test(navigator.userAgent);
}

// --- Icon Components ---
function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  );
}

function StopIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <rect x="6" y="6" width="12" height="12" rx="1" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function FileTextIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function TargetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  );
}

// --- Score Ring ---
function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const color = score >= 80 ? 'text-emerald-500' : score >= 60 ? 'text-blue-500' : score >= 40 ? 'text-amber-500' : 'text-red-500';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="absolute inset-0 -rotate-90" width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/50" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          className={`${color} transition-all duration-700 ease-out`}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>
      <span className={`relative z-10 text-xl font-bold ${color}`}>{score}</span>
    </div>
  );
}

export default function ReplyPage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<ReplyData | null>(null);
  const [loading, setLoading] = useState(true);

  // WeCom JS-SDK state
  const [isWecom, setIsWecom] = useState(false);
  const [wxReady, setWxReady] = useState(false);
  const [wxError, setWxError] = useState('');

  // Recording state (WeCom)
  const [recording, setRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [localId, setLocalId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Fallback recording state (browser MediaRecorder)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [playTime, setPlayTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Common state
  const [transcript, setTranscript] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [transcribing, setTranscribing] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');

  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);
  const playTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load data
  useEffect(() => {
    fetch(`/api/reply/${token}`)
      .then(async (res) => {
        const d = await res.json();
        if (!res.ok || d.error) {
          throw new Error(d.error || '加载失败');
        }
        setData(d);
        if (d.reply) {
          setTranscript(d.reply.transcript || '');
          setTranscribedText(d.reply.transcript || '');
          setSubmitted(true);
        }
        setLoading(false);
      })
      .catch((err) => {
        setData(null);
        setSubmitError(err instanceof Error ? err.message : '加载失败，请刷新重试');
        setLoading(false);
      });
  }, [token]);

  // Detect WeCom and init JS-SDK
  useEffect(() => {
    const wecom = detectWecom();
    setIsWecom(wecom);

    if (wecom) {
      loadWxJsSdk();
    }
  }, []);

  async function loadWxJsSdk() {
    if (!window.wx) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://res.wx.qq.com/open/js/jweixin-1.2.0.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('加载 JS-SDK 失败'));
        document.head.appendChild(script);
      });
    }

    const wx = window.wx;
    if (!wx) {
      setWxError('JS-SDK 加载失败');
      return;
    }

    try {
      const currentUrl = window.location.href.split('#')[0];
      const res = await fetch(`/api/wecom/jssdk-config?url=${encodeURIComponent(currentUrl)}`);
      const config = await res.json();

      if (config.error) {
        setWxError(config.error);
        return;
      }

      wx.config({
        beta: false,
        debug: false,
        appId: config.appId,
        timestamp: config.timestamp,
        nonceStr: config.nonceStr,
        signature: config.signature,
        jsApiList: [
          'startRecord',
          'stopRecord',
          'onVoiceRecordEnd',
          'playVoice',
          'pauseVoice',
          'stopVoice',
          'uploadVoice',
          'downloadVoice',
        ],
      });

      wx.ready(() => {
        setWxReady(true);
        wx.onVoiceRecordEnd?.({
          complete: (res: { localId: string }) => {
            setRecording(false);
            setLocalId(res.localId);
            if (recordTimerRef.current) {
              clearInterval(recordTimerRef.current);
              recordTimerRef.current = null;
            }
          },
        });
      });

      wx.error((err: { errMsg: string }) => {
        setWxError(`JS-SDK 配置失败: ${err.errMsg}`);
      });
    } catch (err) {
      setWxError(err instanceof Error ? err.message : '初始化失败');
    }
  }

  // Recording timer
  useEffect(() => {
    if (recording) {
      recordTimerRef.current = setInterval(() => {
        setRecordTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }
    }
    return () => {
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
      }
    };
  }, [recording]);

  // Play timer (fallback only)
  useEffect(() => {
    if (isPlaying && !isWecom) {
      playTimerRef.current = setInterval(() => {
        setPlayTime((prev) => {
          if (prev >= audioDuration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (playTimerRef.current) {
        clearInterval(playTimerRef.current);
        playTimerRef.current = null;
      }
    }
    return () => {
      if (playTimerRef.current) {
        clearInterval(playTimerRef.current);
      }
    };
  }, [isPlaying, audioDuration, isWecom]);

  // ===== WeCom JS-SDK Recording =====
  function startWecomRecord() {
    const wx = window.wx;
    if (!wx) return;

    setRecordTime(0);
    setLocalId(null);
    setIsPlaying(false);

    wx.startRecord({
      success: () => {
        setRecording(true);
      },
      fail: (err: { errMsg: string }) => {
        setSubmitError(`录音启动失败: ${err.errMsg}`);
      },
    });
  }

  function stopWecomRecord() {
    const wx = window.wx;
    if (!wx) return;

    wx.stopRecord({
      success: (res: { localId: string }) => {
        setRecording(false);
        setLocalId(res.localId);
      },
      fail: (err: { errMsg: string }) => {
        setRecording(false);
        setSubmitError(`录音停止失败: ${err.errMsg}`);
      },
    });
  }

  function playWecomVoice() {
    const wx = window.wx;
    if (!wx || !localId) return;

    wx.playVoice({
      localId,
      success: () => {
        setIsPlaying(true);
      },
      fail: (err: { errMsg: string }) => {
        setSubmitError(`播放失败: ${err.errMsg}`);
      },
    });
  }

  function stopWecomVoice() {
    const wx = window.wx;
    if (!wx || !localId) return;

    wx.stopVoice({ localId });
    setIsPlaying(false);
  }

  function deleteWecomRecord() {
    stopWecomVoice();
    setLocalId(null);
    setRecordTime(0);
    setIsPlaying(false);
  }

  // ===== Fallback Browser Recording =====
  async function startBrowserRecord() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      setRecordTime(0);
      setAudioBlob(null);
      setAudioDuration(0);
      setPlayTime(0);
      setIsPlaying(false);
      setLocalId(null);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioDuration(recordTime);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setRecording(true);
    } catch {
      setSubmitError('无法访问麦克风，请在企业微信中打开此页面');
    }
  }

  function stopBrowserRecord() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  function deleteBrowserRecord() {
    setAudioBlob(null);
    setAudioDuration(0);
    setPlayTime(0);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }

  function toggleBrowserPlay() {
    if (!audioBlob) return;

    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      const url = URL.createObjectURL(audioBlob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.play();
      setIsPlaying(true);
      setPlayTime(0);
      audio.onended = () => {
        setIsPlaying(false);
        setPlayTime(0);
      };
    }
  }

  // Unified handlers
  function startRecord() {
    if (isWecom && wxReady) {
      startWecomRecord();
    } else {
      startBrowserRecord();
    }
  }

  function stopRecord() {
    if (isWecom && wxReady) {
      stopWecomRecord();
    } else {
      stopBrowserRecord();
    }
  }

  function deleteRecord() {
    if (isWecom && wxReady) {
      deleteWecomRecord();
    } else {
      deleteBrowserRecord();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError('');

    const hasRecording = isWecom ? !!localId : !!audioBlob;
    if (!hasRecording && !transcript.trim()) {
      setSubmitError('请录制语音或手动输入复述内容');
      return;
    }

    setSubmitting(true);

    try {
      if (isWecom && localId) {
        const wx = window.wx;
        if (!wx) throw new Error('JS-SDK 未加载');

        wx.uploadVoice({
          localId,
          isShowProgressTips: 1,
          success: async (res: { serverId: string }) => {
            const formData = new FormData();
            formData.append('serverId', res.serverId);
            if (transcript.trim()) {
              formData.append('transcript', transcript.trim());
            }

            try {
              const postRes = await fetch(`/api/reply/${token}`, {
                method: 'POST',
                body: formData,
              });

              if (postRes.ok) {
                setSubmitted(true);
                await autoTranscribe();
              } else {
                setSubmitError('提交失败，请重试');
              }
            } catch {
              setSubmitError('提交失败，请重试');
            }
            setSubmitting(false);
          },
          fail: (err: { errMsg: string }) => {
            setSubmitError(`语音上传失败: ${err.errMsg}`);
            setSubmitting(false);
          },
        });
      } else if (audioBlob) {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        if (transcript.trim()) {
          formData.append('transcript', transcript.trim());
        }

        const res = await fetch(`/api/reply/${token}`, {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          setSubmitted(true);
          await autoTranscribe();
        } else {
          setSubmitError('提交失败，请重试');
        }
        setSubmitting(false);
      } else {
        const formData = new FormData();
        if (transcript.trim()) {
          formData.append('transcript', transcript.trim());
        }

        const res = await fetch(`/api/reply/${token}`, {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          setSubmitted(true);
        } else {
          setSubmitError('提交失败，请重试');
        }
        setSubmitting(false);
      }
    } catch {
      setSubmitError('提交失败，请重试');
      setSubmitting(false);
    }
  }

  async function autoTranscribe() {
    setTranscribing(true);
    try {
      const res = await fetch(`/api/reply/${token}/transcribe`, { method: 'POST' });
      if (res.ok) {
        const t = await res.json();
        setTranscribedText(t.transcript || '');
        setTranscript(t.transcript || '');
        await fetch(`/api/reply/${token}/analyze`, { method: 'POST' });
      }
    } catch {
      // ignore
    }
    setTranscribing(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="h-8 w-8 text-primary" />
          <p className="text-sm text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="bg-card border border-border rounded-xl shadow-sm p-8 text-center max-w-sm w-full">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertIcon className="w-7 h-7 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">链接无效</h2>
          <p className="text-sm text-muted-foreground">该链接已过期或不存在</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    const analysis = data.reply?.analysis;
    const levelConfig = analysis?.level === '理解到位'
      ? { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', ring: 'text-emerald-500', dot: 'bg-emerald-500' }
      : analysis?.level === '基本理解'
      ? { color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', ring: 'text-blue-500', dot: 'bg-blue-500' }
      : analysis?.level === '理解不足'
      ? { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', ring: 'text-amber-500', dot: 'bg-amber-500' }
      : { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', ring: 'text-red-500', dot: 'bg-red-500' };

    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-lg mx-auto px-4 py-8">
          {/* Success Header */}
          <div className="bg-card border border-border rounded-xl shadow-sm p-6 mb-4 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-50 flex items-center justify-center">
              <CheckCircleIcon className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-1">提交成功</h2>
            <p className="text-sm text-muted-foreground">
              {data.employee.name}，感谢您的回复！
            </p>
          </div>

          {/* Transcribing */}
          {transcribing && (
            <div className="bg-card border border-warning/20 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-3">
                <Spinner className="h-5 w-5 text-warning" />
                <p className="text-sm text-warning">正在转写语音内容...</p>
              </div>
            </div>
          )}

          {/* Transcript */}
          {transcribedText && (
            <div className="bg-card border border-border rounded-xl shadow-sm p-5 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <FileTextIcon className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">语音转写内容</p>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{transcribedText}</p>
            </div>
          )}

          {/* Analysis Result */}
          {analysis && (
            <div className={`bg-card border ${levelConfig.border} rounded-xl shadow-sm overflow-hidden`}>
              {/* Header */}
              <div className={`${levelConfig.bg} px-5 py-4 border-b ${levelConfig.border}`}>
                <div className="flex items-center gap-2 mb-3">
                  <TargetIcon className={`w-4 h-4 ${levelConfig.color}`} />
                  <h3 className={`font-semibold ${levelConfig.color}`}>培训效果分析结果</h3>
                </div>
                <div className="flex items-center gap-4">
                  <ScoreRing score={analysis.overallScore} size={72} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${levelConfig.dot}`} />
                      <span className={`font-bold text-lg ${levelConfig.color}`}>{analysis.level}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">综合得分（满分100）</p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 space-y-5">
                {/* Summary */}
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">评价摘要</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{analysis.summary}</p>
                </div>

                {/* Covered Points */}
                {analysis.coveredPoints && (
                  <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
                      <p className="text-sm font-medium text-emerald-800">已掌握的重点</p>
                    </div>
                    <p className="text-sm text-emerald-700 leading-relaxed">{analysis.coveredPoints}</p>
                  </div>
                )}

                {/* Missing Points */}
                {analysis.missingPoints && (
                  <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <AlertIcon className="w-4 h-4 text-amber-600" />
                      <p className="text-sm font-medium text-amber-800">遗漏的重点</p>
                    </div>
                    <p className="text-sm text-amber-700 leading-relaxed">{analysis.missingPoints}</p>
                  </div>
                )}

                {/* Wrong Points */}
                {analysis.wrongPoints && (
                  <div className="bg-red-50/50 border border-red-100 rounded-lg p-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <AlertIcon className="w-4 h-4 text-red-600" />
                      <p className="text-sm font-medium text-red-800">理解偏差</p>
                    </div>
                    <p className="text-sm text-red-700 leading-relaxed">{analysis.wrongPoints}</p>
                  </div>
                )}

                {/* Correction */}
                {analysis.correctionSuggestion && (
                  <div className="bg-muted/50 border border-border rounded-lg p-4">
                    <p className="text-sm font-medium text-foreground mb-2">纠正建议</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{analysis.correctionSuggestion}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const hasRecording = isWecom ? !!localId : !!audioBlob;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header Card */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-5 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <TargetIcon className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-foreground leading-snug">{data.session.title}</h1>
              <p className="text-sm text-muted-foreground mt-1">{data.employee.name}，请完成以下确认</p>
            </div>
          </div>
        </div>

        {/* Key Points */}
        <div className="bg-info/5 border border-info/10 rounded-xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <InfoIcon className="w-4 h-4 text-info" />
            <h3 className="text-sm font-semibold text-info">本次培训重点</h3>
          </div>
          <ul className="space-y-2.5">
            {data.session.keyPoints.map((kp, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-info/10 text-info text-xs font-medium flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <span className="text-foreground/80">{kp.title}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Environment Notice */}
        {isWecom && !wxReady && !wxError && (
          <div className="flex items-center gap-2.5 bg-warning/5 border border-warning/15 rounded-xl px-4 py-3.5 mb-4">
            <Spinner className="h-4 w-4 text-warning shrink-0" />
            <p className="text-sm text-warning">正在初始化企业微信录音组件...</p>
          </div>
        )}
        {isWecom && wxError && (
          <div className="flex items-center gap-2.5 bg-destructive/5 border border-destructive/15 rounded-xl px-4 py-3.5 mb-4">
            <AlertIcon className="w-4 h-4 text-destructive shrink-0" />
            <p className="text-sm text-destructive">{wxError}</p>
          </div>
        )}
        {!isWecom && (
          <div className="flex items-center gap-2.5 bg-warning/5 border border-warning/15 rounded-xl px-4 py-3.5 mb-4">
            <InfoIcon className="w-4 h-4 text-warning shrink-0" />
            <p className="text-sm text-warning">建议在企业微信中打开此页面以获得最佳录音体验</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Recording Section */}
          <div className="bg-card border border-border rounded-xl shadow-sm p-5">
            <label className="block text-sm font-medium text-foreground mb-4">
              请用语音复述您理解的 2-3 条培训重点（约30秒）
            </label>

            {/* Recording State */}
            {recording ? (
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-destructive/20 animate-ping" />
                  <button
                    type="button"
                    onClick={stopRecord}
                    className="relative w-20 h-20 rounded-full bg-destructive text-white flex items-center justify-center shadow-lg shadow-destructive/30 active:scale-95 transition"
                    aria-label="停止录音"
                  >
                    <StopIcon className="w-7 h-7" />
                  </button>
                </div>
                <p className="text-2xl font-mono text-destructive font-semibold tabular-nums">
                  {formatTime(recordTime)}
                </p>
                <p className="text-sm text-destructive/80">正在录音，点击停止</p>
              </div>
            ) : hasRecording ? (
              /* Playback State */
              <div className="bg-muted/50 border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (isWecom) {
                        if (isPlaying) stopWecomVoice();
                        else playWecomVoice();
                      } else {
                        toggleBrowserPlay();
                      }
                    }}
                    className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center shadow-md shadow-primary/20 active:scale-95 transition"
                    aria-label={isPlaying ? '暂停' : '播放'}
                  >
                    {isPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5 ml-0.5" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    {isWecom ? (
                      <p className="text-sm text-muted-foreground">
                        已录音 <span className="font-mono tabular-nums">{formatTime(recordTime)}</span>
                      </p>
                    ) : (
                      <>
                        <div className="h-2 bg-border rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{
                              width: `${audioDuration > 0 ? (playTime / audioDuration) * 100 : 0}%`,
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground mt-1 font-mono tabular-nums">
                          <span>{formatTime(playTime)}</span>
                          <span>{formatTime(audioDuration)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={deleteRecord}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm bg-destructive/5 text-destructive border border-destructive/15 px-3 py-2.5 rounded-lg hover:bg-destructive/10 active:scale-[0.98] transition"
                  >
                    <TrashIcon className="w-4 h-4" />
                    删除录音
                  </button>
                  <button
                    type="button"
                    onClick={startRecord}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm bg-primary/5 text-primary border border-primary/15 px-3 py-2.5 rounded-lg hover:bg-primary/10 active:scale-[0.98] transition"
                  >
                    <RefreshIcon className="w-4 h-4" />
                    重新录制
                  </button>
                </div>
              </div>
            ) : (
              /* Idle State */
              <div className="flex flex-col items-center gap-3 py-4">
                <button
                  type="button"
                  onClick={startRecord}
                  disabled={isWecom && !wxReady}
                  className="w-20 h-20 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/25 hover:bg-primary/90 disabled:opacity-40 disabled:shadow-none active:scale-95 transition"
                  aria-label="开始录音"
                >
                  <MicIcon className="w-8 h-8" />
                </button>
                <p className="text-sm text-muted-foreground">
                  {isWecom && !wxReady ? '正在初始化录音...' : '点击麦克风开始录音'}
                </p>
              </div>
            )}
          </div>

          {/* Manual Input */}
          <div className="bg-card border border-border rounded-xl shadow-sm p-5">
            <label className="block text-sm font-medium text-foreground mb-3">
              或手动输入您的复述内容
            </label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="请用您自己的话，复述本次培训中最重要的2-3条安全要求..."
              rows={5}
              className="w-full border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition resize-y"
            />
          </div>

          {/* Error Message */}
          {submitError && (
            <div className="flex items-center gap-2.5 bg-destructive/5 border border-destructive/15 rounded-xl px-4 py-3.5">
              <AlertIcon className="w-4 h-4 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{submitError}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || (isWecom && !wxReady)}
            className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3.5 rounded-xl hover:bg-primary/90 disabled:opacity-50 shadow-md shadow-primary/20 active:scale-[0.98] transition font-medium"
          >
            {submitting ? (
              <>
                <Spinner className="h-5 w-5" />
                提交中...
              </>
            ) : (
              <>
                <SendIcon className="w-4 h-4" />
                提交确认
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
