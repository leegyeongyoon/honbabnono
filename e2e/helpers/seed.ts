/**
 * E2E 테스트용 시드 데이터 생성 헬퍼
 * API를 직접 호출하여 테스트에 필요한 모임/참가/출석 데이터를 생성
 */

const API_URL = 'http://localhost:3001/api';

const USER1_ID = '11111111-1111-1111-1111-111111111111'; // 호스트
const USER2_ID = '22222222-2222-2222-2222-222222222222'; // 참가자

// 토큰 캐시
const apiTokenCache: Map<string, string> = new Map();

/**
 * 서버에서 직접 JWT 토큰 발급 (fetch 사용, Playwright page 불필요)
 */
export async function getApiToken(userId: string): Promise<string> {
  const cached = apiTokenCache.get(userId);
  if (cached) return cached;

  const res = await fetch(`${API_URL}/auth/test-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });

  if (!res.ok) {
    throw new Error(`test-login failed for ${userId}: ${await res.text()}`);
  }

  const data = await res.json();
  apiTokenCache.set(userId, data.token);
  return data.token;
}

/**
 * 모임 생성 (호스트 = User1)
 */
export async function createTestMeetup(
  token: string,
  overrides: Record<string, any> = {}
): Promise<any> {
  // 내일 날짜
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split('T')[0];

  const payload = {
    title: `E2E 테스트 모임 ${Date.now()}`,
    description: 'Playwright E2E 테스트로 생성된 모임',
    category: '한식',
    location: '강남역 1번 출구',
    address: '서울특별시 강남구 강남대로 396',
    latitude: 37.4979,
    longitude: 127.0276,
    date: dateStr,
    time: '18:00',
    maxParticipants: 4,
    genderPreference: '상관없음',
    ageRange: '무관',
    priceRange: '1-2만원',
    ...overrides,
  };

  const res = await fetch(`${API_URL}/meetups`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`모임 생성 실패: ${await res.text()}`);
  }

  const data = await res.json();
  return data.meetup || data.data || data;
}

/**
 * 모임 참가
 */
export async function joinTestMeetup(
  token: string,
  meetupId: string
): Promise<any> {
  const res = await fetch(`${API_URL}/meetups/${meetupId}/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    // 이미 참가한 경우 무시
    if (text.includes('이미 참가')) return { alreadyJoined: true };
    throw new Error(`모임 참가 실패: ${text}`);
  }

  return await res.json();
}

/**
 * 모임 상태 변경 (호스트만 가능)
 */
export async function updateMeetupStatus(
  token: string,
  meetupId: string,
  status: string
): Promise<any> {
  const res = await fetch(`${API_URL}/meetups/${meetupId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    throw new Error(`상태 변경 실패: ${await res.text()}`);
  }

  return await res.json();
}

/**
 * GPS 체크인
 */
export async function gpsCheckin(
  token: string,
  meetupId: string,
  latitude: number,
  longitude: number
): Promise<any> {
  const res = await fetch(`${API_URL}/meetups/${meetupId}/checkin/gps`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ latitude, longitude }),
  });

  return {
    ok: res.ok,
    status: res.status,
    data: await res.json(),
  };
}

/**
 * 채팅 메시지 전송
 */
export async function sendChatMessage(
  token: string,
  roomId: string,
  message: string
): Promise<any> {
  const res = await fetch(`${API_URL}/chat/rooms/${roomId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ message }),
  });

  if (!res.ok) {
    throw new Error(`메시지 전송 실패: ${await res.text()}`);
  }

  return await res.json();
}

// ===== 복합 시나리오 =====

/**
 * 시나리오: 모집중 모임 + 참가자 1명
 * User1이 생성, User2가 참가
 */
export async function seedRecruitingMeetupWithParticipant(
  overrides: Record<string, any> = {}
): Promise<{ meetupId: string; chatRoomId?: string }> {
  const hostToken = await getApiToken(USER1_ID);
  const participantToken = await getApiToken(USER2_ID);

  const meetup = await createTestMeetup(hostToken, overrides);
  const meetupId = meetup.id || meetup.meetupId;

  const joinResult = await joinTestMeetup(participantToken, meetupId);
  const chatRoomId = joinResult.chatRoomId || joinResult.data?.chatRoomId;

  return { meetupId, chatRoomId };
}

/**
 * 시나리오: 종료된 모임 + 출석 완료
 * User1 생성 → User2 참가 → 상태 '종료' → 양쪽 출석
 */
export async function seedCompletedMeetupWithAttendance(
  overrides: Record<string, any> = {}
): Promise<{ meetupId: string; chatRoomId?: string }> {
  const hostToken = await getApiToken(USER1_ID);
  const participantToken = await getApiToken(USER2_ID);

  // 모임 위치 (강남역)
  const lat = 37.4979;
  const lng = 127.0276;

  const meetup = await createTestMeetup(hostToken, {
    latitude: lat,
    longitude: lng,
    ...overrides,
  });
  const meetupId = meetup.id || meetup.meetupId;

  // User2 참가
  const joinResult = await joinTestMeetup(participantToken, meetupId);
  const chatRoomId = joinResult.chatRoomId || joinResult.data?.chatRoomId;

  // 상태 → 종료
  await updateMeetupStatus(hostToken, meetupId, '종료');

  // 양쪽 GPS 체크인 (동일 좌표 = 0m 거리)
  await gpsCheckin(hostToken, meetupId, lat, lng).catch(() => {});
  await gpsCheckin(participantToken, meetupId, lat, lng).catch(() => {});

  return { meetupId, chatRoomId };
}

/**
 * 시나리오: 인원 마감 모임
 * User1 생성 (max=2) → User2 참가 → 2/2 마감
 */
export async function seedFullMeetup(): Promise<{ meetupId: string }> {
  const hostToken = await getApiToken(USER1_ID);
  const participantToken = await getApiToken(USER2_ID);

  const meetup = await createTestMeetup(hostToken, { maxParticipants: 2 });
  const meetupId = meetup.id || meetup.meetupId;

  await joinTestMeetup(participantToken, meetupId);

  return { meetupId };
}
