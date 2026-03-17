# Sessions 명령

`~/.claude/sessions/`에 저장된 Claude Code 세션 기록을 관리합니다 - 목록 조회, 불러오기, 별칭 지정, 정보 확인.

## 사용법

`/sessions [list|load|alias|info|help] [옵션]`

## 액션

### 세션 목록 조회

메타데이터, 필터링, 페이지네이션과 함께 모든 세션을 표시합니다.

```bash
/sessions                              # 모든 세션 목록 (기본값)
/sessions list                         # 위와 동일
/sessions list --limit 10              # 10개 세션 표시
/sessions list --date 2026-02-01       # 날짜로 필터링
/sessions list --search abc            # 세션 ID로 검색
```

**스크립트:**
```bash
node -e "
const sm = require((process.env.CLAUDE_PLUGIN_ROOT||require('path').join(require('os').homedir(),'.claude'))+'/scripts/lib/session-manager');
const aa = require((process.env.CLAUDE_PLUGIN_ROOT||require('path').join(require('os').homedir(),'.claude'))+'/scripts/lib/session-aliases');

const result = sm.getAllSessions({ limit: 20 });
const aliases = aa.listAliases();
const aliasMap = {};
for (const a of aliases) aliasMap[a.sessionPath] = a.name;

console.log('세션 (표시: ' + result.sessions.length + ' / 전체: ' + result.total + '):');
console.log('');
console.log('ID        날짜        시간     크기     줄수  별칭');
console.log('────────────────────────────────────────────────────');

for (const s of result.sessions) {
  const alias = aliasMap[s.filename] || '';
  const size = sm.getSessionSize(s.sessionPath);
  const stats = sm.getSessionStats(s.sessionPath);
  const id = s.shortId === 'no-id' ? '(없음)' : s.shortId.slice(0, 8);
  const time = s.modifiedTime.toTimeString().slice(0, 5);

  console.log(id.padEnd(8) + ' ' + s.date + '  ' + time + '   ' + size.padEnd(7) + '  ' + String(stats.lineCount).padEnd(5) + '  ' + alias);
}
"
```

### 세션 불러오기

세션 내용을 불러오고 표시합니다 (ID 또는 별칭으로).

```bash
/sessions load <id|alias>             # 세션 불러오기
/sessions load 2026-02-01             # 날짜로 (ID 없는 세션의 경우)
/sessions load a1b2c3d4               # 짧은 ID로
/sessions load my-alias               # 별칭 이름으로
```

**스크립트:**
```bash
node -e "
const sm = require((process.env.CLAUDE_PLUGIN_ROOT||require('path').join(require('os').homedir(),'.claude'))+'/scripts/lib/session-manager');
const aa = require((process.env.CLAUDE_PLUGIN_ROOT||require('path').join(require('os').homedir(),'.claude'))+'/scripts/lib/session-aliases');
const id = process.argv[1];

// 먼저 별칭으로 해석 시도
const resolved = aa.resolveAlias(id);
const sessionId = resolved ? resolved.sessionPath : id;

const session = sm.getSessionById(sessionId, true);
if (!session) {
  console.log('세션을 찾을 수 없습니다: ' + id);
  process.exit(1);
}

const stats = sm.getSessionStats(session.sessionPath);
const size = sm.getSessionSize(session.sessionPath);
const aliases = aa.getAliasesForSession(session.filename);

console.log('세션: ' + session.filename);
console.log('경로: ~/.claude/sessions/' + session.filename);
console.log('');
console.log('통계:');
console.log('  줄 수: ' + stats.lineCount);
console.log('  전체 항목: ' + stats.totalItems);
console.log('  완료됨: ' + stats.completedItems);
console.log('  진행 중: ' + stats.inProgressItems);
console.log('  크기: ' + size);
console.log('');

if (aliases.length > 0) {
  console.log('별칭: ' + aliases.map(a => a.name).join(', '));
  console.log('');
}

if (session.metadata.title) {
  console.log('제목: ' + session.metadata.title);
  console.log('');
}

if (session.metadata.started) {
  console.log('시작됨: ' + session.metadata.started);
}

if (session.metadata.lastUpdated) {
  console.log('마지막 업데이트: ' + session.metadata.lastUpdated);
}
" "$ARGUMENTS"
```

### 별칭 생성

세션에 기억하기 쉬운 별칭을 만듭니다.

```bash
/sessions alias <id> <name>           # 별칭 생성
/sessions alias 2026-02-01 today-work # "today-work"라는 별칭 생성
```

**스크립트:**
```bash
node -e "
const sm = require((process.env.CLAUDE_PLUGIN_ROOT||require('path').join(require('os').homedir(),'.claude'))+'/scripts/lib/session-manager');
const aa = require((process.env.CLAUDE_PLUGIN_ROOT||require('path').join(require('os').homedir(),'.claude'))+'/scripts/lib/session-aliases');

const sessionId = process.argv[1];
const aliasName = process.argv[2];

if (!sessionId || !aliasName) {
  console.log('사용법: /sessions alias <id> <name>');
  process.exit(1);
}

// 세션 파일명 가져오기
const session = sm.getSessionById(sessionId);
if (!session) {
  console.log('세션을 찾을 수 없습니다: ' + sessionId);
  process.exit(1);
}

const result = aa.setAlias(aliasName, session.filename);
if (result.success) {
  console.log('✓ 별칭 생성됨: ' + aliasName + ' → ' + session.filename);
} else {
  console.log('✗ 에러: ' + result.error);
  process.exit(1);
}
" "$ARGUMENTS"
```

### 별칭 삭제

기존 별칭을 삭제합니다.

```bash
/sessions alias --remove <name>        # 별칭 삭제
/sessions unalias <name>               # 위와 동일
```

**스크립트:**
```bash
node -e "
const aa = require((process.env.CLAUDE_PLUGIN_ROOT||require('path').join(require('os').homedir(),'.claude'))+'/scripts/lib/session-aliases');

const aliasName = process.argv[1];
if (!aliasName) {
  console.log('사용법: /sessions alias --remove <name>');
  process.exit(1);
}

const result = aa.deleteAlias(aliasName);
if (result.success) {
  console.log('✓ 별칭 삭제됨: ' + aliasName);
} else {
  console.log('✗ 에러: ' + result.error);
  process.exit(1);
}
" "$ARGUMENTS"
```

### 세션 정보

세션에 대한 상세 정보를 표시합니다.

```bash
/sessions info <id|alias>              # 세션 상세 정보 표시
```

**스크립트:**
```bash
node -e "
const sm = require((process.env.CLAUDE_PLUGIN_ROOT||require('path').join(require('os').homedir(),'.claude'))+'/scripts/lib/session-manager');
const aa = require((process.env.CLAUDE_PLUGIN_ROOT||require('path').join(require('os').homedir(),'.claude'))+'/scripts/lib/session-aliases');

const id = process.argv[1];
const resolved = aa.resolveAlias(id);
const sessionId = resolved ? resolved.sessionPath : id;

const session = sm.getSessionById(sessionId, true);
if (!session) {
  console.log('세션을 찾을 수 없습니다: ' + id);
  process.exit(1);
}

const stats = sm.getSessionStats(session.sessionPath);
const size = sm.getSessionSize(session.sessionPath);
const aliases = aa.getAliasesForSession(session.filename);

console.log('세션 정보');
console.log('════════════════════');
console.log('ID:          ' + (session.shortId === 'no-id' ? '(없음)' : session.shortId));
console.log('파일명:    ' + session.filename);
console.log('날짜:        ' + session.date);
console.log('수정됨:    ' + session.modifiedTime.toISOString().slice(0, 19).replace('T', ' '));
console.log('');
console.log('내용:');
console.log('  줄 수:         ' + stats.lineCount);
console.log('  전체 항목:   ' + stats.totalItems);
console.log('  완료됨:     ' + stats.completedItems);
console.log('  진행 중:   ' + stats.inProgressItems);
console.log('  크기:          ' + size);
if (aliases.length > 0) {
  console.log('별칭:     ' + aliases.map(a => a.name).join(', '));
}
" "$ARGUMENTS"
```

### 별칭 목록 조회

모든 세션 별칭을 표시합니다.

```bash
/sessions aliases                      # 모든 별칭 목록 조회
```

**스크립트:**
```bash
node -e "
const aa = require((process.env.CLAUDE_PLUGIN_ROOT||require('path').join(require('os').homedir(),'.claude'))+'/scripts/lib/session-aliases');

const aliases = aa.listAliases();
console.log('세션 별칭 (' + aliases.length + '개):');
console.log('');

if (aliases.length === 0) {
  console.log('별칭이 없습니다.');
} else {
  console.log('이름          세션 파일                       제목');
  console.log('─────────────────────────────────────────────────────────────');
  for (const a of aliases) {
    const name = a.name.padEnd(12);
    const file = (a.sessionPath.length > 30 ? a.sessionPath.slice(0, 27) + '...' : a.sessionPath).padEnd(30);
    const title = a.title || '';
    console.log(name + ' ' + file + ' ' + title);
  }
}
"
```

## 인수

$ARGUMENTS:
- `list [옵션]` - 세션 목록 조회
  - `--limit <n>` - 표시할 최대 세션 수 (기본값: 50)
  - `--date <YYYY-MM-DD>` - 날짜로 필터링
  - `--search <패턴>` - 세션 ID에서 검색
- `load <id|alias>` - 세션 내용 불러오기
- `alias <id> <name>` - 세션 별칭 생성
- `alias --remove <name>` - 별칭 삭제
- `unalias <name>` - `--remove`와 동일
- `info <id|alias>` - 세션 통계 표시
- `aliases` - 모든 별칭 목록 조회
- `help` - 도움말 표시

## 예시

```bash
# 모든 세션 목록 조회
/sessions list

# 오늘 세션에 별칭 생성
/sessions alias 2026-02-01 today

# 별칭으로 세션 불러오기
/sessions load today

# 세션 정보 표시
/sessions info today

# 별칭 삭제
/sessions alias --remove today

# 모든 별칭 목록 조회
/sessions aliases
```

## 참고

- 세션은 `~/.claude/sessions/`에 마크다운 파일로 저장됩니다
- 별칭은 `~/.claude/session-aliases.json`에 저장됩니다
- 세션 ID는 단축 가능합니다 (처음 4-8자로 보통 고유성 충분)
- 자주 참조하는 세션에는 별칭 사용을 권장합니다
