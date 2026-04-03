/**
 * 카카오톡 공유 유틸리티
 * 웹에서는 카카오 SDK를 사용하고, 네이티브에서는 React Native Share API를 사용
 */
import { Platform, Share, Alert } from 'react-native';

declare global {
  interface Window {
    Kakao?: {
      init: (appKey: string) => void;
      isInitialized: () => boolean;
      Share: {
        sendDefault: (settings: KakaoShareSettings) => void;
      };
    };
  }
}

interface KakaoShareContent {
  title: string;
  description: string;
  imageUrl: string;
  link: {
    mobileWebUrl: string;
    webUrl: string;
  };
}

interface KakaoShareButton {
  title: string;
  link: {
    mobileWebUrl: string;
    webUrl: string;
  };
}

interface KakaoShareSettings {
  objectType: 'feed';
  content: KakaoShareContent;
  buttons: KakaoShareButton[];
}

interface MeetupShareData {
  id: string;
  title: string;
  description?: string;
  location?: string;
  date?: string;
  time?: string;
  imageUrl?: string;
  currentParticipants?: number;
  maxParticipants?: number;
}

const APP_URL = 'https://eattable.kr';

function getMeetupUrl(meetupId: string): string {
  return `${APP_URL}/meetup/${meetupId}`;
}

function buildShareDescription(meetup: MeetupShareData): string {
  const parts: string[] = [];

  if (meetup.location) {
    parts.push(`${meetup.location}`);
  } else {
    parts.push('장소 미정');
  }

  if (meetup.date) {
    parts.push(`${meetup.date}${meetup.time ? ' ' + meetup.time : ''}`);
  } else {
    parts.push('날짜 미정');
  }

  const current = meetup.currentParticipants ?? 0;
  const max = meetup.maxParticipants ?? 0;
  if (max > 0) {
    parts.push(`${current}/${max}명 참가중`);
  }

  return parts.join(' | ');
}

function ensureKakaoInitialized(): boolean {
  if (typeof window === 'undefined' || !window.Kakao) {
    return false;
  }

  if (!window.Kakao.isInitialized()) {
    const appKey = process.env.REACT_APP_KAKAO_JS_KEY || '';
    if (!appKey) {
      return false;
    }
    window.Kakao.init(appKey);
  }

  return window.Kakao.isInitialized();
}

/**
 * 카카오톡으로 모임 공유 (웹 전용)
 * 카카오 SDK가 없는 경우 Web Share API 또는 링크 복사로 fallback
 */
export function shareToKakao(meetup: MeetupShareData): void {
  const meetupUrl = getMeetupUrl(meetup.id);
  const description = buildShareDescription(meetup);

  if (Platform.OS === 'web') {
    // 웹: 카카오 SDK 사용 시도
    if (ensureKakaoInitialized() && window.Kakao) {
      try {
        window.Kakao.Share.sendDefault({
          objectType: 'feed',
          content: {
            title: meetup.title,
            description,
            imageUrl: meetup.imageUrl || `${APP_URL}/og-image.png`,
            link: {
              mobileWebUrl: meetupUrl,
              webUrl: meetupUrl,
            },
          },
          buttons: [
            {
              title: '모임 보기',
              link: {
                mobileWebUrl: meetupUrl,
                webUrl: meetupUrl,
              },
            },
          ],
        });
        return;
      } catch (_error) {
        // 카카오 SDK 실패 시 fallback
      }
    }

    // Fallback: Web Share API 또는 클립보드 복사
    shareViaWebApi(meetup.title, description, meetupUrl);
  } else {
    // 네이티브: React Native Share API
    shareViaNative(meetup.title, description, meetupUrl);
  }
}

/**
 * Web Share API 또는 클립보드 복사 fallback
 */
async function shareViaWebApi(title: string, text: string, url: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return;
    } catch (_error) {
      // 사용자 취소 등은 무시
    }
  }

  // 최후 fallback: 클립보드에 링크 복사
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      if (typeof window !== 'undefined') {
        window.alert('링크가 복사되었습니다!');
      }
    }
  } catch (_error) {
    // 클립보드 접근 불가
  }
}

/**
 * 네이티브 앱에서 공유
 */
async function shareViaNative(title: string, text: string, url: string): Promise<void> {
  try {
    await Share.share({
      title,
      message: `${title}\n${text}\n${url}`,
      url,
    });
  } catch (_error) {
    Alert.alert('오류', '공유하기에 실패했습니다.');
  }
}
