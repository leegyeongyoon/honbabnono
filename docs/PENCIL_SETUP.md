# Pencil.dev 설치 및 MCP 연결 가이드

Pencil.dev는 Claude Code와 연동되는 AI 디자인 도구입니다. 와이어프레임과 UI 디자인을 코드와 함께 작업할 수 있습니다.

## 목차
1. [설치 방법](#1-설치-방법)
2. [MCP 연결 설정](#2-mcp-연결-설정)
3. [연결 확인](#3-연결-확인)
4. [문제 해결](#4-문제-해결)
5. [사용법](#5-사용법)

---

## 1. 설치 방법

### macOS (Apple Silicon)

```bash
# 1. DMG 다운로드
curl -L -o ~/Downloads/Pencil-mac-arm64.dmg \
  "https://5ykymftd1soethh5.public.blob.vercel-storage.com/Pencil-mac-arm64.dmg"

# 2. DMG 마운트
hdiutil attach ~/Downloads/Pencil-mac-arm64.dmg -nobrowse

# 3. Applications 폴더에 복사
cp -R "/Volumes/Pencil 1.1.9-arm64/Pencil.app" /Applications/

# 4. DMG 분리
hdiutil detach "/Volumes/Pencil 1.1.9-arm64"

# 5. Pencil 실행
open -a Pencil
```

### macOS (Intel)

```bash
# Intel Mac용 DMG 다운로드
curl -L -o ~/Downloads/Pencil-mac-x64.dmg \
  "https://5ykymftd1soethh5.public.blob.vercel-storage.com/Pencil-mac-x64.dmg"

# 이후 동일한 설치 과정
```

### 공식 웹사이트에서 다운로드

[https://pencil.dev](https://pencil.dev) 에서 직접 다운로드 가능

---

## 2. MCP 연결 설정

Pencil을 설치하고 실행하면 자동으로 Claude Code MCP 설정이 추가됩니다.

### 자동 설정 확인

`~/.claude.json` 파일에 다음과 같은 설정이 추가됩니다:

```json
{
  "mcpServers": {
    "pencil": {
      "command": "/Applications/Pencil.app/Contents/Resources/app.asar.unpacked/out/mcp-server-darwin-arm64",
      "args": [
        "--ws-port",
        "51329"
      ],
      "env": {}
    }
  }
}
```

### 수동 설정 (자동 설정이 안 된 경우)

1. `~/.claude.json` 파일 열기:
```bash
code ~/.claude.json  # VS Code
# 또는
nano ~/.claude.json  # 터미널
```

2. `mcpServers` 섹션에 pencil 추가:
```json
{
  "mcpServers": {
    "pencil": {
      "command": "/Applications/Pencil.app/Contents/Resources/app.asar.unpacked/out/mcp-server-darwin-arm64",
      "args": ["--ws-port", "51329"],
      "env": {}
    }
  }
}
```

---

## 3. 연결 확인

### MCP 연결 상태 확인

```bash
claude mcp list
```

정상 연결 시 출력:
```
pencil: /Applications/Pencil.app/.../mcp-server-darwin-arm64 --ws-port 51329 - ✓ Connected
```

### Pencil 앱 실행 확인

```bash
ps aux | grep -i pencil | grep -v grep
```

### Claude Code 세션 재시작

MCP 설정 변경 후에는 Claude Code 세션을 재시작해야 합니다:

```bash
# 현재 세션 종료
/exit

# 다시 시작
claude
```

---

## 4. 문제 해결

### MCP에 pencil이 연결되지 않음

1. **Pencil 앱 실행 확인**
   - Pencil 앱이 실행 중인지 확인
   - 앱이 실행되지 않으면 `open -a Pencil` 실행

2. **Claude Code 재시작**
   - 세션 중간에 MCP가 추가된 경우 재시작 필요
   - `/exit` 후 `claude` 다시 실행

3. **설정 파일 확인**
   ```bash
   cat ~/.claude.json | grep -A 10 '"pencil"'
   ```

4. **포트 충돌 확인**
   ```bash
   lsof -i :51329
   ```

### Pencil 앱이 실행되지 않음

```bash
# Gatekeeper 허용 (첫 실행 시)
xattr -cr /Applications/Pencil.app

# 다시 실행
open -a Pencil
```

### MCP 서버 수동 재시작

Pencil 앱을 종료했다가 다시 실행:
```bash
# Pencil 종료
osascript -e 'quit app "Pencil"'

# 3초 대기 후 재실행
sleep 3 && open -a Pencil
```

---

## 5. 사용법

### 기본 명령어

Pencil MCP 도구가 연결되면 다음과 같이 사용할 수 있습니다:

```
# 에디터 상태 확인
mcp__pencil__get_editor_state

# 새 문서 열기
mcp__pencil__open_document("new")

# 기존 .pen 파일 열기
mcp__pencil__open_document("path/to/file.pen")

# 스타일 가이드 태그 가져오기
mcp__pencil__get_style_guide_tags

# 디자인 배치 작업
mcp__pencil__batch_design(operations)
```

### Claude Code에서 디자인 요청 예시

```
"Pencil에서 로그인 화면 디자인해줘"
"혼밥시러 메인 화면 와이어프레임 만들어줘"
"Pencil 캔버스 열어줘"
```

### .pen 파일 구조

Pencil은 `.pen` 확장자 파일을 사용합니다:
- 프로젝트 루트나 `designs/` 폴더에 저장 권장
- 암호화된 형식으로 Pencil MCP 도구로만 읽기/쓰기 가능
- Git에 커밋하여 버전 관리 가능

---

## 연동 MCP 서버 목록

현재 프로젝트에서 사용 중인 MCP 서버:

| MCP 서버 | 용도 | 상태 |
|---------|------|------|
| pencil | AI 디자인 도구 (.pen 파일) | ✅ Connected |
| figma | Figma 연동 (코드 생성, 스크린샷) | ✅ Connected |
| notion-dev-log | Notion 연동 (문서, 태스크) | ✅ Connected |
| ide | VS Code 연동 | ✅ Connected |

---

## 관련 문서

- [디자인 워크플로우](./DESIGN_WORKFLOW.md)
- [Figma 와이어프레임 스펙](./figma-wireframe-specs.md)
- [컬러 가이드](../COLOR_GUIDE.md)
