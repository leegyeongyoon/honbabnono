/**
 * 브라우저 알림 + 비프음 유틸리티
 *
 * - requestNotificationPermission(): Notification 권한 요청
 * - showBrowserNotification(title, body): 권한 허용 시에만 알림 표시
 * - playBeep(): Web Audio API로 짧은 비프음 재생 (lazy 싱글톤 AudioContext)
 */

/** 현재 알림 권한 상태를 반환 ('granted' | 'denied' | 'default' | 'unsupported') */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return 'unsupported';
  }
  return Notification.permission;
}

/** 알림 권한을 요청한다. 반환값은 최종 권한 상태. */
export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return 'unsupported';
  }
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission;
  }
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch {
    return Notification.permission;
  }
}

/** 권한이 허용된 경우에만 브라우저 알림을 표시한다. */
export function showBrowserNotification(title: string, body: string): void {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return;
  }
  if (Notification.permission !== 'granted') {
    return;
  }
  try {
    // eslint-disable-next-line no-new
    new Notification(title, { body });
  } catch {
    /* ignore — 일부 브라우저는 SW 없이 Notification 생성 시 에러 */
  }
}

// ── 비프음 (Web Audio API) ──────────────────────────────────────
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = (window.AudioContext || (window as any).webkitAudioContext) as
    | typeof AudioContext
    | undefined;
  if (!Ctor) return null;
  if (!audioCtx) {
    try {
      audioCtx = new Ctor();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

/** 880Hz, 0.15초 비프음을 재생한다. */
export function playBeep(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    // 일부 브라우저는 사용자 상호작용 전 suspended 상태 — resume 시도
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 880;
    gain.gain.value = 0.1;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    oscillator.start(now);
    oscillator.stop(now + 0.15);
  } catch {
    /* ignore */
  }
}
