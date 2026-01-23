# AI 검색 및 추천 정책 (AI Search Policy)

> 최종 업데이트: 2024-01-23

## 1. 개요

혼밥시러 앱의 AI 검색 시스템은 OpenAI GPT를 활용하여 자연어 검색 의도를 파악하고, 카카오 API를 통해 장소 검색을 제공합니다.

## 2. AI 검색 (`aiSearch`)

### 2.1 기능

사용자의 자연어 검색어에서 의도를 파악하여 적절한 모임을 검색합니다.

### 2.2 처리 흐름

```javascript
// 1. 검색어 유효성 검사
if (!query || query.trim().length === 0) {
  return error("검색어를 입력해주세요")
}

// 2. OpenAI로 검색 의도 파악
const intentPrompt = `
  사용자가 음식 모임 검색 앱에서 다음과 같이 검색했습니다: "${query}"

  다음 정보를 JSON 형식으로 추출해주세요:
  - category: 음식 카테고리 (한식, 중식, 일식, 양식, 동남아, 카페/디저트, 술집, 기타)
  - location: 위치/지역
  - time: 시간대 선호 (점심, 저녁, 아침)
  - priceRange: 가격대 (저렴, 보통, 비싼)
  - keywords: 핵심 키워드 배열
`

// 3. 의도 기반 DB 검색
// 4. 결과 반환
```

### 2.3 의도 파싱 결과

```javascript
{
  category: "한식",            // 음식 카테고리
  location: "강남",            // 위치
  time: "점심",                // 시간대
  priceRange: null,            // 가격대
  keywords: ["삼겹살", "회식"] // 키워드
}
```

### 2.4 검색 쿼리 생성

```javascript
let whereConditions = ["m.status IN ('모집중', '모집완료')"]

// 카테고리 필터
if (parsedIntent.category) {
  whereConditions.push(`m.category = $N`)
}

// 위치 필터 (ILIKE로 부분 매칭)
if (parsedIntent.location) {
  whereConditions.push(`(m.location ILIKE $N OR m.address ILIKE $N)`)
}

// 키워드 검색 (제목 + 설명)
if (parsedIntent.keywords.length > 0) {
  const keywordConditions = keywords.map(kw =>
    `(m.title ILIKE '%${kw}%' OR m.description ILIKE '%${kw}%')`
  )
  whereConditions.push(`(${keywordConditions.join(' OR ')})`)
}
```

### 2.5 응답 형식

```javascript
{
  success: true,
  query: "강남에서 점심에 삼겹살 먹을 사람",
  intent: {
    category: "한식",
    location: "강남",
    time: "점심",
    keywords: ["삼겹살"]
  },
  meetups: [...],
  total: 5
}
```

### 2.6 OpenAI 설정

| 항목 | 값 |
|------|-----|
| 모델 | gpt-3.5-turbo |
| max_tokens | 200 |
| temperature | 0.3 (낮은 창의성, 일관된 파싱) |

### 2.7 Fallback

AI 의도 파싱 실패 시 기본 키워드 검색으로 진행:

```javascript
let parsedIntent = {
  category: null,
  location: null,
  keywords: [query]  // 원본 검색어를 키워드로 사용
}
```

## 3. AI 챗봇 (`chatbot`)

### 3.1 기능

사용자와 대화하며 앱 사용을 도와주는 AI 어시스턴트입니다.

### 3.2 시스템 프롬프트

```
당신은 '혼밥시러' 앱의 친절한 AI 어시스턴트입니다.
사용자들이 음식 모임을 찾고 만드는 것을 도와줍니다.

주요 기능:
- 모임 검색 도움
- 앱 사용법 안내
- 맛집 추천
- 모임 참여 관련 질문 답변

응답은 친근하고 도움이 되는 톤으로, 한국어로 해주세요.
응답은 간결하게 2-3문장으로 해주세요.
```

### 3.3 대화 컨텍스트

최근 5개 대화를 컨텍스트로 유지:

```javascript
const messages = [
  { role: 'system', content: systemPrompt },
  ...context.slice(-5),  // 최근 5개 대화
  { role: 'user', content: message }
]
```

### 3.4 OpenAI 설정

| 항목 | 값 |
|------|-----|
| 모델 | gpt-3.5-turbo |
| max_tokens | 300 |
| temperature | 0.7 (적당한 창의성) |

### 3.5 응답 형식

```javascript
{
  success: true,
  reply: "강남역 근처에서 한식 모임을 찾으시는군요! '한식' 카테고리로 검색해보세요.",
  usage: {
    prompt_tokens: 150,
    completion_tokens: 50,
    total_tokens: 200
  }
}
```

## 4. 모임 추천 (`recommendMeetups`)

### 4.1 기능

사용자의 참여 이력을 기반으로 맞춤형 모임을 추천합니다.

### 4.2 추천 로직

```javascript
// 1. 사용자가 자주 참여한 카테고리 조회 (상위 3개)
SELECT DISTINCT m.category
FROM meetup_participants mp
JOIN meetups m ON mp.meetup_id = m.id
WHERE mp.user_id = ?
ORDER BY COUNT(*) DESC
LIMIT 3

// 2. 추천 조건
- 상태: '모집중'
- 본인이 호스트가 아닌 모임
- 선호 카테고리 모임 우선
- 이미 참여한 모임 제외
```

### 4.3 응답 형식

```javascript
{
  success: true,
  recommendations: [...meetups],
  basedOn: ["한식", "일식", "양식"]  // 추천 기반 카테고리
}
```

## 5. 주소/장소 검색 (`searchAddress`)

### 5.1 기능

카카오 API를 통해 주소 및 장소를 검색합니다.

### 5.2 카카오 API 호출

두 가지 API를 병렬 호출:

```javascript
const [keywordResponse, addressResponse] = await Promise.allSettled([
  // 키워드 검색 (장소명, 업체명)
  axios.get('https://dapi.kakao.com/v2/local/search/keyword.json', {
    headers: { 'Authorization': `KakaoAK ${KAKAO_REST_API_KEY}` },
    params: { query, size: 10 }
  }),
  // 주소 검색
  axios.get('https://dapi.kakao.com/v2/local/search/address.json', {
    headers: { 'Authorization': `KakaoAK ${KAKAO_REST_API_KEY}` },
    params: { query, size: 5 }
  })
])
```

### 5.3 결과 형식

```javascript
{
  documents: [
    {
      type: 'place',            // 또는 'address'
      placeName: "스타벅스 강남역점",
      categoryName: "음식점 > 카페",
      addressName: "서울 강남구 역삼동 123",
      roadAddressName: "서울 강남구 강남대로 390",
      latitude: 37.498095,
      longitude: 127.027610,
      phone: "02-1234-5678",
      placeUrl: "http://place.map.kakao.com/12345",
      fullAddress: "서울 강남구 강남대로 390",
      district: "강남구",
      neighborhood: "역삼동"
    }
  ]
}
```

### 5.4 중복 제거

동일 주소의 중복 결과 제거:

```javascript
const uniqueResults = results.filter((item, index, self) =>
  index === self.findIndex(t => t.fullAddress === item.fullAddress)
)
```

### 5.5 Fallback (더미 데이터)

카카오 API 호출 실패 시 더미 데이터로 대체:

```javascript
// 주요 지역 키워드별 더미 데이터
- 강남 관련
- 홍대/홍익대 관련
- 신촌 관련
- 맥도날드, 스타벅스 등 프랜차이즈
```

## 6. 환경 설정

### 6.1 필수 환경변수

| 변수 | 설명 |
|------|------|
| `OPENAI_API_KEY` | OpenAI API 키 |
| `KAKAO_CLIENT_ID` | 카카오 REST API 키 |

### 6.2 테스트 환경

```javascript
// 테스트 환경에서는 더미 키 사용
const apiKey = process.env.OPENAI_API_KEY ||
  (process.env.NODE_ENV === 'test' ? 'test-key' : undefined)
```

## 7. 에러 처리

| 상황 | 에러 코드 | 메시지 |
|------|-----------|--------|
| 검색어 없음 | 400 | "검색어를 입력해주세요" |
| 메시지 없음 | 400 | "메시지를 입력해주세요" |
| AI 검색 실패 | 500 | "AI 검색 중 오류가 발생했습니다" |
| 챗봇 실패 | 500 | "챗봇 응답 생성 중 오류가 발생했습니다" |
| 주소 검색 실패 | 500 | "주소 검색에 실패했습니다" |

## 8. 관련 API 엔드포인트

| 메서드 | 엔드포인트 | 설명 | 함수명 |
|--------|------------|------|--------|
| POST | `/api/ai/search` | AI 검색 | `aiSearch` |
| POST | `/api/ai/chatbot` | AI 챗봇 | `chatbot` |
| GET | `/api/ai/recommend` | 모임 추천 | `recommendMeetups` |
| GET | `/api/search/address` | 주소/장소 검색 | `searchAddress` |

## 9. 음식 카테고리

AI 검색에서 인식하는 카테고리:

| 카테고리 | 키워드 예시 |
|----------|------------|
| 한식 | 삼겹살, 비빔밥, 김치찌개, 불고기 |
| 중식 | 짜장면, 짬뽕, 탕수육, 양꼬치 |
| 일식 | 초밥, 라멘, 돈카츠, 사시미 |
| 양식 | 파스타, 스테이크, 피자, 버거 |
| 동남아 | 쌀국수, 팟타이, 분짜, 똠양꿍 |
| 카페/디저트 | 커피, 케이크, 브런치, 빵 |
| 술집 | 맥주, 와인, 막걸리, 안주 |
| 기타 | - |

## 10. 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2024-01-23 | 1.0.0 | 최초 작성 |
