# Pencil + Figma 디자인 워크플로우 가이드

Claude Code를 활용해 Pencil에서 와이어프레임을 만들고, figma-use로 Figma에 자동 생성하는 방법입니다.

---

## 1. 설치

### Pencil.dev 설치 (macOS)

```bash
# Apple Silicon
curl -L -o ~/Downloads/Pencil-mac-arm64.dmg \
  "https://5ykymftd1soethh5.public.blob.vercel-storage.com/Pencil-mac-arm64.dmg"

# DMG 마운트 및 설치
hdiutil attach ~/Downloads/Pencil-mac-arm64.dmg -nobrowse
cp -R "/Volumes/Pencil 1.1.9-arm64/Pencil.app" /Applications/
hdiutil detach "/Volumes/Pencil 1.1.9-arm64"

# 실행
open -a Pencil
```

### figma-use 설치

```bash
npm install -g figma-use
```

### 연결 확인

```bash
# Pencil MCP 확인
claude mcp list  # pencil: Connected 확인

# Figma 연결 확인 (Figma 앱 실행 상태에서)
figma-use status
# ✓ Connected to Figma
#   File: 파일명
```

---

## 2. Pencil에서 와이어프레임 만들기

Claude Code에서 자연어로 요청:

```
"Pencil에서 로그인 화면 와이어프레임 만들어줘"
```

### Claude가 사용하는 Pencil MCP 도구들

| 도구 | 용도 |
|------|------|
| `get_editor_state` | 현재 에디터 상태 확인 |
| `get_style_guide_tags` | 스타일 태그 조회 |
| `batch_get` | 컴포넌트 검색 |
| `batch_design` | 디자인 생성/수정 |
| `get_screenshot` | 결과 확인 |

### 생성된 Pencil 프레임 예시

**와이어프레임 (그레이스케일)**
- 배경: `#FFFFFF`, `#F5F5F5`
- 텍스트: `#333333`, `#888888`
- 아이콘: `#D0D0D0`, `#E0E0E0`

**디자인 (컬러 적용)**
- Primary: `#C9B59C`
- Background: `#F9F8F6`
- Accent: `#FEE500` (Kakao Yellow)

---

## 3. figma-use로 Figma에 생성하기

### 페이지 선택

```bash
figma-use page list          # 페이지 목록
figma-use page set "페이지명"  # 페이지 선택
figma-use page bounds        # 빈 공간 확인
```

### 섹션 생성

```bash
figma-use create section \
  --x 0 --y 0 \
  --width 600 --height 1000 \
  --name "로그인 화면 - 와이어프레임"
```

### JSX로 디자인 렌더링

```bash
echo '<Frame name="LoginScreen" w={390} h={844} bg="#FFFFFF" flex="col" p={24} gap={24}>
  <Frame name="Header" w="fill" h={180} flex="col" gap={12} items="center" justify="center">
    <Rectangle w={72} h={72} bg="#E0E0E0" rounded={12} />
    <Text size={24} weight="bold" color="#333333">App Name</Text>
    <Text size={14} color="#888888">Welcome to our service</Text>
  </Frame>
  <Frame name="Button" w="fill" h={52} bg="#E0E0E0" rounded={8} items="center" justify="center">
    <Text size={16} weight={600} color="#333333">Continue</Text>
  </Frame>
</Frame>' | figma-use render --stdin --parent "섹션ID" --x 100 --y 50
```

### JSX 주요 속성

| 속성 | 설명 | 예시 |
|------|------|------|
| `w`, `h` | 너비, 높이 | `w={390}`, `h="fill"` |
| `bg` | 배경색 | `bg="#FFFFFF"` |
| `flex` | 레이아웃 방향 | `flex="col"`, `flex="row"` |
| `gap` | 간격 | `gap={12}` |
| `p`, `px`, `py` | 패딩 | `p={24}`, `px={16}` |
| `items` | 정렬 (cross) | `items="center"` |
| `justify` | 정렬 (main) | `justify="center"` |
| `rounded` | 모서리 | `rounded={8}` |
| `stroke` | 테두리 | `stroke="#CCCCCC"` |
| `shadow` | 그림자 | `shadow="0px 2px 8px rgba(0,0,0,0.08)"` |

---

## 4. 실제 작업 결과

### Figma gytest 페이지 구조

```
gytest/
├── 로그인 화면 - 와이어프레임 (650:3514)
│   └── LoginScreen - Wireframe
├── 로그인 화면 - 디자인 (650:3515)
│   └── LoginScreen - Design
├── 공통 컴포넌트 - 와이어프레임 (650:3516)
│   └── Wireframe Components
└── 공통 컴포넌트 - 디자인 (650:3517)
    └── Design Components
```

### 공통 컴포넌트 목록

| 카테고리 | 와이어프레임 | 디자인 |
|---------|-------------|--------|
| Buttons | Primary, Secondary, Outline, Ghost | + Social (Kakao) |
| Cards | Feature Item, Card | 그림자 추가 |
| Inputs | Label + Input Field | 컬러 테두리 |
| Avatars | Small(32), Medium(48), Large(64) | 컬러 적용 |
| Badges | Dark, Light, Outline | Active, Inactive, Tag |

---

## 5. 빠른 참조

### Claude Code 명령어 예시

```
# 와이어프레임 생성
"Pencil에서 홈 화면 와이어프레임 만들어줘"

# 컴포넌트 조회
"Pencil에서 사용 가능한 컴포넌트 보여줘"

# Figma 생성
"figma-use로 gytest 페이지에 섹션 만들고 렌더링해줘"

# 스크린샷 확인
"Pencil 결과 스크린샷 보여줘"
```

### figma-use 자주 쓰는 명령어

```bash
figma-use status              # 연결 확인
figma-use page list           # 페이지 목록
figma-use page set "name"     # 페이지 변경
figma-use create section ...  # 섹션 생성
figma-use render --stdin ...  # JSX 렌더링
figma-use find --type FRAME   # 프레임 검색
```

---

## 워크플로우 요약

```
┌─────────────────────────────────────────────────────────┐
│  1. Pencil 실행 → Claude Code에서 디자인 요청           │
│     "로그인 화면 와이어프레임 만들어줘"                   │
│                         ↓                               │
│  2. Pencil MCP로 .pen 파일에 와이어프레임 생성          │
│     - 그레이스케일 와이어프레임                          │
│     - 컬러 디자인 버전                                  │
│     - 재사용 컴포넌트                                   │
│                         ↓                               │
│  3. figma-use로 Figma에 섹션 생성                       │
│     figma-use create section --name "섹션명" ...        │
│                         ↓                               │
│  4. JSX로 디자인 렌더링                                 │
│     echo '<Frame>...</Frame>' | figma-use render ...    │
│                         ↓                               │
│  5. Figma에서 확인 및 편집                              │
└─────────────────────────────────────────────────────────┘
```

---

## 관련 문서

- [Pencil 설치 가이드](./PENCIL_SETUP.md)
- [디자인 워크플로우](./DESIGN_WORKFLOW.md)
- [Figma 와이어프레임 스펙](./figma-wireframe-specs.md)
