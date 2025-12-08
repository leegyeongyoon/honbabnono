# Notion MCP 서버 설정 가이드

## 개요
이 가이드는 혼밥시러 프로젝트에서 Notion MCP 서버를 설정하여 개발 로그와 기능 정책을 자동으로 관리하는 방법을 설명합니다.

## 필요한 것들

1. **Notion 계정**
2. **Notion Integration 생성**
3. **Notion 데이터베이스 설정**
4. **Claude Code에서 MCP 연결**

## 1단계: Notion Integration 생성

1. [Notion Developers](https://www.notion.so/my-integrations) 페이지 접속
2. "New integration" 버튼 클릭
3. Integration 정보 입력:
   - Name: `혼밥시러 개발 로그`
   - Associated workspace: 작업할 워크스페이스 선택
   - Type: Internal
4. "Submit" 클릭
5. **Internal Integration Token**을 복사하여 안전한 곳에 보관

## 2단계: Notion 데이터베이스 설정

### 개발 로그 데이터베이스
다음 속성들을 가진 데이터베이스를 생성하세요:

| 속성명 | 타입 | 설명 |
|--------|------|------|
| 제목 | Title | 작업 내용 요약 |
| 설명 | Rich Text | 상세한 작업 설명 |
| 타입 | Multi-select | Feature, Bug Fix, Documentation 등 |
| 상태 | Select | 진행중, 완료, 보류 |
| 날짜 | Date | 작업 일자 |
| 프로젝트 | Select | 혼밥시러 앱 개발 |
| 커밋 해시 | Rich Text | Git 커밋 해시 |
| 변경된 파일 | Multi-select | 수정된 파일 목록 |
| 작업자 | Rich Text | 작업자명 |
| 작업 시간 | Number | 예상 작업 시간 |

### 기능 정책 데이터베이스
Team > 기획 > 정책 페이지에 다음 구조로 생성:

| 속성명 | 타입 | 설명 |
|--------|------|------|
| 기능명 | Title | 기능 이름 |
| 정책 설명 | Rich Text | 상세 정책 내용 |
| 카테고리 | Select | 인증, 모임, 채팅, 결제 등 |
| 우선순위 | Select | High, Medium, Low |
| 담당자 | Person | 책임 개발자 |
| 상태 | Select | 검토중, 승인됨, 구현됨 |

## 3단계: 데이터베이스 권한 설정

1. 생성한 데이터베이스 페이지 우상단 "..." 메뉴 클릭
2. "Add connections" 선택
3. 1단계에서 생성한 Integration 선택
4. 권한 부여

## 4단계: 데이터베이스 ID 확인

1. 데이터베이스 페이지 URL에서 ID 추출
   - URL 예시: `https://www.notion.so/12345678901234567890123456789012?v=...`
   - 데이터베이스 ID: `12345678901234567890123456789012`

## 5단계: .mcp.json 설정

1. `.mcp.json.example` 파일을 `.mcp.json`으로 복사
2. 실제 값으로 교체:

\`\`\`json
{
  "mcpServers": {
    "notion-dev-log": {
      "command": "npx",
      "args": [
        "@notion-md/mcp-server"
      ],
      "env": {
        "NOTION_API_KEY": "secret_실제_인테그레이션_토큰",
        "NOTION_DATABASE_ID": "실제_데이터베이스_ID"
      }
    }
  }
}
\`\`\`

## 6단계: Claude Code 재시작

1. Claude Code를 완전히 종료
2. 다시 시작하여 MCP 설정 로드
3. MCP 연결 확인

## 사용 방법

### 개발 로그 작성
\`\`\`
"오늘 작업 내용을 Notion MCP에 로그로 남겨줘"
"최근 커밋들을 분석해서 개발 task 작성해줘"
\`\`\`

### 기능 정책 관리
\`\`\`
"사용자 인증 기능의 정책을 Notion에 정리해줘"
"모임 생성 기능의 비즈니스 로직을 정책 페이지에 업데이트해줘"
\`\`\`

## 문제 해결

### 연결 실패 시
1. Integration Token 재확인
2. 데이터베이스 ID 재확인
3. 데이터베이스 권한 설정 확인
4. Claude Code 완전 재시작

### 권한 오류 시
1. Notion Integration이 데이터베이스에 접근 권한이 있는지 확인
2. 워크스페이스 관리자 권한 확인

## 보안 주의사항

- `.mcp.json` 파일은 절대 Git에 커밋하지 마세요 (이미 .gitignore에 추가됨)
- Integration Token은 안전하게 보관하세요
- 팀원과 공유할 때는 `.mcp.json.example` 파일을 참조하도록 하세요

## 추가 설정

프로젝트별로 다른 데이터베이스를 사용하려면 여러 MCP 서버를 설정할 수 있습니다:

\`\`\`json
{
  "mcpServers": {
    "notion-dev-log": {
      "command": "npx",
      "args": ["@notion-md/mcp-server"],
      "env": {
        "NOTION_API_KEY": "secret_token_1",
        "NOTION_DATABASE_ID": "database_id_1"
      }
    },
    "notion-policies": {
      "command": "npx", 
      "args": ["@notion-md/mcp-server"],
      "env": {
        "NOTION_API_KEY": "secret_token_2",
        "NOTION_DATABASE_ID": "database_id_2"
      }
    }
  }
}
\`\`\`