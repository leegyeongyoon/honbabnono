# 디자인 워크플로우 가이드

혼밥시러 앱의 디자인 작업 흐름을 정의합니다. Pencil과 Figma를 연동하여 효율적인 디자인 프로세스를 구축합니다.

## 목차
1. [워크플로우 개요](#1-워크플로우-개요)
2. [Phase 1: Pencil 와이어프레임](#2-phase-1-pencil-와이어프레임)
3. [Phase 2: Figma 하이파이 디자인](#3-phase-2-figma-하이파이-디자인)
4. [Phase 3: 코드 구현](#4-phase-3-코드-구현)
5. [MCP 도구 활용법](#5-mcp-도구-활용법)

---

## 1. 워크플로우 개요

```
┌──────────────────────────────────────────────────────────────────┐
│                     디자인 워크플로우                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐ │
│  │ Pencil  │ ──▶  │  Figma  │ ──▶  │  Code   │ ──▶  │  Test   │ │
│  │ (.pen)  │      │ (.fig)  │      │ (.tsx)  │      │ (e2e)   │ │
│  └─────────┘      └─────────┘      └─────────┘      └─────────┘ │
│       │                │                │                │      │
│       ▼                ▼                ▼                ▼      │
│  와이어프레임      하이파이 디자인     React Native      E2E 테스트 │
│  빠른 프로토타입   시각적 완성도      컴포넌트 구현      QA 검증    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 도구별 역할

| 도구 | 용도 | MCP 서버 | 파일 형식 |
|------|------|----------|----------|
| **Pencil** | 와이어프레임, 빠른 프로토타입 | `pencil` | `.pen` |
| **Figma** | 하이파이 디자인, 디자인 시스템 | `figma` | `.fig` |
| **VS Code** | 코드 구현, 컴포넌트 개발 | `ide` | `.tsx` |

---

## 2. Phase 1: Pencil 와이어프레임

### 2.1 새 디자인 시작

```
# Claude Code에서 요청
"Pencil에서 홈 화면 와이어프레임 만들어줘"
```

### 2.2 Pencil 도구 사용 순서

1. **에디터 상태 확인**
   ```javascript
   mcp__pencil__get_editor_state({ include_schema: true })
   ```

2. **스타일 가이드 가져오기**
   ```javascript
   mcp__pencil__get_style_guide_tags()
   mcp__pencil__get_style_guide({ tags: ["mobile", "app", "minimal"] })
   ```

3. **컴포넌트 검색**
   ```javascript
   mcp__pencil__batch_get({
     patterns: [{ reusable: true }],
     readDepth: 2
   })
   ```

4. **디자인 작업**
   ```javascript
   mcp__pencil__batch_design({
     operations: `
       screen=I(document, {type: "frame", name: "HomeScreen", width: 390, height: 844})
       header=I(screen, {type: "frame", name: "Header", height: 72})
       ...
     `
   })
   ```

5. **스크린샷 확인**
   ```javascript
   mcp__pencil__get_screenshot({ nodeId: "screen_id" })
   ```

### 2.3 와이어프레임 체크리스트

- [ ] 화면 구조 레이아웃
- [ ] 주요 컴포넌트 배치
- [ ] 네비게이션 흐름
- [ ] 터치 영역 최소 44px
- [ ] 스크롤 영역 정의

---

## 3. Phase 2: Figma 하이파이 디자인

### 3.1 Pencil → Figma 전환

Pencil에서 완성된 와이어프레임을 기반으로 Figma에서 하이파이 디자인을 진행합니다.

### 3.2 Figma MCP 도구

1. **디자인 컨텍스트 가져오기**
   ```javascript
   mcp__figma__get_design_context({
     fileKey: "figma_file_key",
     nodeId: "node_id",
     clientLanguages: "typescript",
     clientFrameworks: "react"
   })
   ```

2. **스크린샷 확인**
   ```javascript
   mcp__figma__get_screenshot({
     fileKey: "figma_file_key",
     nodeId: "node_id"
   })
   ```

3. **변수 정의 가져오기**
   ```javascript
   mcp__figma__get_variable_defs({
     fileKey: "figma_file_key",
     nodeId: "node_id"
   })
   ```

4. **메타데이터 확인**
   ```javascript
   mcp__figma__get_metadata({
     fileKey: "figma_file_key",
     nodeId: "page_id"
   })
   ```

### 3.3 Figma URL 파싱

Figma URL에서 필요한 정보 추출:
```
https://figma.com/design/:fileKey/:fileName?node-id=1-2

- fileKey: URL의 :fileKey 부분
- nodeId: node-id 파라미터 (1-2 → 1:2로 변환)
```

### 3.4 디자인 시스템 적용

[figma-wireframe-specs.md](./figma-wireframe-specs.md)의 디자인 시스템 참조:
- 색상 팔레트
- 타이포그래피
- 간격 시스템
- 컴포넌트 스펙

---

## 4. Phase 3: 코드 구현

### 4.1 Figma → 코드 변환

```javascript
// Figma에서 코드 컨텍스트 가져오기
mcp__figma__get_design_context({
  fileKey: "file_key",
  nodeId: "component_node_id"
})

// 결과: React 컴포넌트 코드 + 스타일
```

### 4.2 컴포넌트 구현 위치

```
src/
├── components/          # 재사용 컴포넌트
│   ├── common/         # 공통 (Button, Input, Card 등)
│   ├── meetup/         # 모임 관련
│   └── user/           # 사용자 관련
├── screens/            # 화면 컴포넌트
│   ├── home/
│   ├── auth/
│   └── meetup/
└── styles/             # 스타일/테마
    ├── colors.ts
    ├── typography.ts
    └── theme.ts
```

### 4.3 스타일 매핑

Figma 디자인 시스템 → React Native 스타일:

```typescript
// src/styles/colors.ts
export const COLORS = {
  primary: {
    main: '#C9B59C',
    light: '#F9F8F6',
    dark: '#D9CFC7',
    accent: '#EFE9E3',
  },
  // ...
}

// src/styles/typography.ts
export const TYPOGRAPHY = {
  h1: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  // ...
}
```

---

## 5. MCP 도구 활용법

### 5.1 Pencil + Figma 연계 예시

```
# 1. Pencil에서 와이어프레임 생성
"Pencil에서 로그인 화면 와이어프레임 만들어줘"

# 2. Pencil 결과 확인
mcp__pencil__get_screenshot({ nodeId: "login_screen" })

# 3. Figma에서 상세 디자인 확인
"이 Figma URL의 로그인 화면 디자인 가져와: [URL]"

# 4. 코드 생성
mcp__figma__get_design_context({ ... })

# 5. 코드 구현
"LoginScreen.tsx 컴포넌트 구현해줘"
```

### 5.2 자주 사용하는 명령어

| 작업 | 명령어 |
|------|--------|
| Pencil 새 문서 | `mcp__pencil__open_document("new")` |
| Pencil 디자인 가이드라인 | `mcp__pencil__get_guidelines({ topic: "design-system" })` |
| Figma 디자인 가져오기 | `mcp__figma__get_design_context({ ... })` |
| Figma 스크린샷 | `mcp__figma__get_screenshot({ ... })` |
| 다이어그램 생성 | `mcp__figma__generate_diagram({ ... })` |

### 5.3 디자인 리뷰 워크플로우

```
1. Pencil 와이어프레임 완성
   ↓
2. mcp__pencil__get_screenshot으로 확인
   ↓
3. 피드백 반영 및 수정
   ↓
4. Figma에서 하이파이 디자인
   ↓
5. mcp__figma__get_design_context로 코드 생성
   ↓
6. code-reviewer 에이전트로 코드 리뷰
   ↓
7. 테스트 및 배포
```

---

## 디자인 파일 관리

### 폴더 구조

```
honbabnono/
├── designs/                    # Pencil 디자인 파일
│   ├── wireframes/
│   │   ├── home.pen
│   │   ├── login.pen
│   │   └── meetup.pen
│   └── components/
│       └── design-system.pen
├── docs/
│   ├── figma-wireframe-specs.md  # 디자인 스펙
│   ├── DESIGN_WORKFLOW.md        # 이 문서
│   └── PENCIL_SETUP.md           # Pencil 설치 가이드
└── src/
    └── styles/                   # 구현된 스타일
```

### 버전 관리

- `.pen` 파일은 Git에 커밋 가능
- 큰 변경 시 별도 브랜치에서 작업
- 디자인 변경 시 관련 코드도 함께 업데이트

---

## 관련 문서

- [Pencil 설치 가이드](./PENCIL_SETUP.md)
- [Figma 와이어프레임 스펙](./figma-wireframe-specs.md)
- [컬러 가이드](../COLOR_GUIDE.md)
- [테스팅 가이드](../TESTING.md)
