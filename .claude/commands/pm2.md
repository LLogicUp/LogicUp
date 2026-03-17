# PM2 Init

프로젝트를 자동 분석하여 PM2 서비스 명령을 생성합니다.

**명령**: `$ARGUMENTS`

---

## 워크플로우

1. PM2 확인 (없으면 `npm install -g pm2`로 설치)
2. 프로젝트 스캔하여 서비스 파악 (프론트엔드/백엔드/데이터베이스)
3. 설정 파일 및 개별 명령 파일 생성

---

## 서비스 감지

| 유형 | 감지 방법 | 기본 포트 |
|------|----------|----------|
| Vite | vite.config.* | 5173 |
| Next.js | next.config.* | 3000 |
| Nuxt | nuxt.config.* | 3000 |
| CRA | package.json의 react-scripts | 3000 |
| Express/Node | server/backend/api 디렉토리 + package.json | 3000 |
| FastAPI/Flask | requirements.txt / pyproject.toml | 8000 |
| Go | go.mod / main.go | 8080 |

**포트 감지 우선순위**: 사용자 지정 > .env > 설정 파일 > 스크립트 인수 > 기본 포트

---

## 생성되는 파일

```
project/
├── ecosystem.config.cjs              # PM2 설정
├── {backend}/start.cjs               # Python 래퍼 (해당 시)
└── .claude/
    ├── commands/
    │   ├── pm2-all.md                # 전체 시작 + monit
    │   ├── pm2-all-stop.md           # 전체 중지
    │   ├── pm2-all-restart.md        # 전체 재시작
    │   ├── pm2-{port}.md             # 단일 시작 + 로그
    │   ├── pm2-{port}-stop.md        # 단일 중지
    │   ├── pm2-{port}-restart.md     # 단일 재시작
    │   ├── pm2-logs.md               # 전체 로그 보기
    │   └── pm2-status.md             # 상태 보기
    └── scripts/
        ├── pm2-logs-{port}.ps1       # 단일 서비스 로그
        └── pm2-monit.ps1             # PM2 모니터
```

---

## Windows 설정 (중요)

### ecosystem.config.cjs

**반드시 `.cjs` 확장자 사용**

```javascript
module.exports = {
  apps: [
    // Node.js (Vite/Next/Nuxt)
    {
      name: 'project-3000',
      cwd: './packages/web',
      script: 'node_modules/vite/bin/vite.js',
      args: '--port 3000',
      interpreter: 'C:/Program Files/nodejs/node.exe',
      env: { NODE_ENV: 'development' }
    },
    // Python
    {
      name: 'project-8000',
      cwd: './backend',
      script: 'start.cjs',
      interpreter: 'C:/Program Files/nodejs/node.exe',
      env: { PYTHONUNBUFFERED: '1' }
    }
  ]
}
```

**프레임워크별 script 경로:**

| 프레임워크 | script | args |
|-----------|--------|------|
| Vite | `node_modules/vite/bin/vite.js` | `--port {port}` |
| Next.js | `node_modules/next/dist/bin/next` | `dev -p {port}` |
| Nuxt | `node_modules/nuxt/bin/nuxt.mjs` | `dev --port {port}` |
| Express | `src/index.js` 또는 `server.js` | - |

### Python 래퍼 스크립트 (start.cjs)

```javascript
const { spawn } = require('child_process');
const proc = spawn('python', ['-m', 'uvicorn', 'app.main:app', '--host', '0.0.0.0', '--port', '8000', '--reload'], {
  cwd: __dirname, stdio: 'inherit', windowsHide: true
});
proc.on('close', (code) => process.exit(code));
```

---

## 명령 파일 템플릿 (최소 내용)

### pm2-all.md (전체 시작 + monit)
````markdown
모든 서비스를 시작하고 PM2 모니터를 엽니다.
```bash
cd "{PROJECT_ROOT}" && pm2 start ecosystem.config.cjs && start wt.exe -d "{PROJECT_ROOT}" pwsh -NoExit -c "pm2 monit"
```
````

### pm2-all-stop.md
````markdown
모든 서비스를 중지합니다.
```bash
cd "{PROJECT_ROOT}" && pm2 stop all
```
````

### pm2-all-restart.md
````markdown
모든 서비스를 재시작합니다.
```bash
cd "{PROJECT_ROOT}" && pm2 restart all
```
````

### pm2-{port}.md (단일 시작 + 로그)
````markdown
{name} ({port})을 시작하고 로그를 엽니다.
```bash
cd "{PROJECT_ROOT}" && pm2 start ecosystem.config.cjs --only {name} && start wt.exe -d "{PROJECT_ROOT}" pwsh -NoExit -c "pm2 logs {name}"
```
````

### pm2-{port}-stop.md
````markdown
{name} ({port})을 중지합니다.
```bash
cd "{PROJECT_ROOT}" && pm2 stop {name}
```
````

### pm2-{port}-restart.md
````markdown
{name} ({port})을 재시작합니다.
```bash
cd "{PROJECT_ROOT}" && pm2 restart {name}
```
````

### pm2-logs.md
````markdown
모든 PM2 로그를 봅니다.
```bash
cd "{PROJECT_ROOT}" && pm2 logs
```
````

### pm2-status.md
````markdown
PM2 상태를 봅니다.
```bash
cd "{PROJECT_ROOT}" && pm2 status
```
````

### PowerShell 스크립트 (pm2-logs-{port}.ps1)
```powershell
Set-Location "{PROJECT_ROOT}"
pm2 logs {name}
```

### PowerShell 스크립트 (pm2-monit.ps1)
```powershell
Set-Location "{PROJECT_ROOT}"
pm2 monit
```

---

## 핵심 규칙

1. **설정 파일**: `ecosystem.config.cjs` (.js 아님)
2. **Node.js**: bin 경로 직접 지정 + interpreter
3. **Python**: Node.js 래퍼 스크립트 + `windowsHide: true`
4. **새 창 열기**: `start wt.exe -d "{path}" pwsh -NoExit -c "command"`
5. **최소 내용**: 각 명령 파일은 설명 1-2줄 + bash 블록만 포함
6. **직접 실행**: AI 파싱 불필요, bash 명령만 실행

---

## 실행

`$ARGUMENTS`에 따라 초기화 실행:

1. 프로젝트에서 서비스 스캔
2. `ecosystem.config.cjs` 생성
3. Python 서비스용 `{backend}/start.cjs` 생성 (해당 시)
4. `.claude/commands/`에 명령 파일 생성
5. `.claude/scripts/`에 스크립트 파일 생성
6. **프로젝트 CLAUDE.md에 PM2 정보 업데이트** (아래 참조)
7. **완료 요약 표시** (터미널 명령 포함)

---

## 초기화 후: CLAUDE.md 업데이트

파일 생성 후, 프로젝트의 `CLAUDE.md`에 PM2 섹션 추가 (없으면 생성):

````markdown
## PM2 Services

| Port | Name | Type |
|------|------|------|
| {port} | {name} | {type} |

**Terminal Commands:**
```bash
pm2 start ecosystem.config.cjs   # 최초 실행
pm2 start all                    # 최초 실행 이후
pm2 stop all / pm2 restart all
pm2 start {name} / pm2 stop {name}
pm2 logs / pm2 status / pm2 monit
pm2 save                         # 프로세스 목록 저장
pm2 resurrect                    # 저장된 목록 복원
```
````

**CLAUDE.md 업데이트 규칙:**
- PM2 섹션이 있으면 교체
- 없으면 맨 끝에 추가
- 내용을 최소하고 핵심만 유지

---

## 초기화 후: 요약 표시

모든 파일 생성 후 출력:

```
## PM2 Init Complete

**Services:**

| Port | Name | Type |
|------|------|------|
| {port} | {name} | {type} |

**Claude Commands:** /pm2-all, /pm2-all-stop, /pm2-{port}, /pm2-{port}-stop, /pm2-logs, /pm2-status

**Terminal Commands:**
## 최초 실행 (설정 파일 사용)
pm2 start ecosystem.config.cjs && pm2 save

## 최초 실행 이후 (간소화)
pm2 start all          # 전체 시작
pm2 stop all           # 전체 중지
pm2 restart all        # 전체 재시작
pm2 start {name}       # 단일 시작
pm2 stop {name}        # 단일 중지
pm2 logs               # 로그 보기
pm2 monit              # 모니터 패널
pm2 resurrect          # 저장된 프로세스 복원

**팁:** 최초 시작 후 `pm2 save`를 실행하면 간소화된 명령어를 사용할 수 있습니다.
```
