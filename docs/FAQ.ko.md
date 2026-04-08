# ClawClip FAQ / 자주 묻는 질문

> `v1.1.x` 범위(`v1.1.0` 포함)에 적용됩니다. 반복해서 많이 나오는 질문에만 짧게 답하는 FAQ입니다.

- 정확한 포맷 경계가 필요하면 [COMPATIBILITY.md](./COMPATIBILITY.md)를 보세요.
- 설치와 셀프호스팅 세부 내용이 필요하면 [DEPLOYMENT.md](./DEPLOYMENT.md)를 보세요.

## 왜 Demo 데이터만 보이나요?

ClawClip은 아직 호환되는 실제 로컬 세션을 찾지 못했을 때 내장 Demo 데이터를 보여 줍니다. 공개 라이브 데모도 의도적으로 샘플 데이터만 제공합니다.

- 내 실행 결과를 보고 싶다면 로컬 인스턴스나 셀프호스팅 인스턴스를 사용하세요.
- 가장 안전한 다음 단계는 먼저 몇 가지 작업을 실행한 뒤, `agents/<agent>/sessions/*.jsonl` 또는 `<root>/sessions/*.jsonl` 이 들어 있는 폴더를 ClawClip에 지정하는 것입니다.
- 그래도 Demo만 보인다면 아래의 **"페이지는 열리는데 왜 세션이 보이지 않나요?"** 항목으로 가세요.

## ClawClip이 사용자 지정 로그 디렉터리를 스캔하게 하려면 어떻게 하나요?

개별 transcript 파일이 아니라 **데이터 루트** 를 ClawClip에 지정하세요.

```bash
OPENCLAW_STATE_DIR=/path/to/.openclaw
CLAWCLIP_LOBSTER_DIRS=/data/runs;/data/export
CLAWCLIP_SESSION_EXTENSIONS=.jsonl,.ndjson
```

- `OPENCLAW_STATE_DIR`: 기본 OpenClaw state 루트를 대체합니다.
- `CLAWCLIP_LOBSTER_DIRS`: 추가 루트를 하나 이상 넣습니다. 구분자는 쉼표나 세미콜론을 사용할 수 있습니다.
- `CLAWCLIP_SESSION_EXTENSIONS`: transcript 확장자가 `.jsonl` 이 아닐 때만 필요합니다.
- 가장 안전한 레이아웃은 `agents/<agent>/sessions/*.jsonl` 또는 `<root>/sessions/*.jsonl` 입니다.
- Docker에서는 이 경로들이 **호스트 경로가 아니라 컨테이너 경로** 여야 합니다.

## OpenClaw / ZeroClaw / Claw / custom JSONL은 실제로 어디까지 지원되나요?

짧게 말하면, **OpenClaw와 ZeroClaw가 주 경로입니다. Claw와 custom JSONL은 best-effort 지원이며, "무엇이든 다 된다"는 식의 전면 지원은 아닙니다.**

- 가장 잘 지원되는 것은 공식 OpenClaw / ZeroClaw 스타일의 로컬 JSONL 세션 레이아웃입니다.
- 호환되는 transcript가 있으면 ClawClip은 `~/.claw` 도 스캔합니다.
- 파서는 이미 일반적인 OpenClaw 스타일 이벤트, 여러 개의 `tool_calls`, `tool_result` / `function_call_output`, reasoning / thinking 블록, 그리고 일부 오래된 chat-completions 스타일 라인까지 다룹니다.
- SQLite / `.db` / `.sqlite` 를 직접 읽는 기능은 **아직** 지원하지 않습니다.
- `sessions.json` 은 메타데이터 보조에는 도움이 되지만, **transcript 자체는 아닙니다**.
- 정확한 경계가 필요하면 [COMPATIBILITY.md](./COMPATIBILITY.md)를 읽어 보세요.

## 내 데이터가 업로드되나요?

기본적으로는 아닙니다. 세션 탐색, 파싱, 리플레이, Agent Scorecard 분석은 모두 내 컴퓨터나 직접 배포한 환경에서 이루어집니다.

- ClawClip은 기본적으로 Agent 실행 데이터를 업로드하지 않습니다.
- 선택적으로 네트워크를 쓰는 단계는 공개 가격 정보 갱신뿐이며, 이때도 갱신되는 것은 가격 참조 정보뿐이고 세션 내용은 보내지지 않습니다.
- ClawClip을 셀프호스팅하면 데이터는 **내가 배포한 곳** 에 머뭅니다.

## Docker / `npm start` / dev 모드는 각각 언제 써야 하나요?

지금 하려는 일에 맞는 **가장 작은 구성** 을 고르세요.

- `npm start`: 내 컴퓨터나 단순한 서버에서 ClawClip을 쓰는 가장 빠른 방법입니다.
- Docker / `docker compose up --build`: 격리된 배포, 더 명확한 볼륨 마운트, 더 쉬운 서버 운영이 필요할 때 더 적합합니다.
- `npm run dev:server` + `npm run dev:web`: ClawClip 자체를 개발하는 사람만을 위한 모드입니다.
- `dev:server` 만 켜고 `/` 를 열면, 빌드된 프런트엔드가 없어서 전체 앱 대신 백엔드 메시지가 보일 수 있습니다. 정상 동작입니다.

더 자세한 설치 가이드는 [DEPLOYMENT.md](./DEPLOYMENT.md)를 보세요.

## 페이지는 열리는데 왜 세션이 보이지 않나요?

대부분의 경우 ClawClip은 정상적으로 실행 중이고, 단지 호환되는 transcript를 아직 찾지 못했을 뿐입니다.

- 실제로 작업을 실행해서 transcript가 생성되었는지 확인하세요.
- 스캔 경로가 JSONL 파일 하나가 아니라 `agents/<agent>/sessions` **바로 위 폴더** 를 가리키는지 확인하세요.
- Docker에서는 호스트 폴더가 올바르게 마운트되었는지, 그리고 환경 변수가 **컨테이너 경로** 를 가리키는지 확인하세요.
- 런타임이 세션을 주로 SQLite / DB에 저장한다면 먼저 JSONL로 내보내거나 동기화하세요.
- 다른 확장자를 사용한다면 `CLAWCLIP_SESSION_EXTENSIONS` 를 설정하세요.
- 설정 파일이나 `sessions.json` 만 있어도 그것만으로는 리플레이 가능한 transcript가 되지 않습니다.

## 왜 점수가 "표준 benchmark 점수"가 아닌가요?

ClawClip은 하나의 공통 테스트셋으로 Agent를 채점하는 도구가 아니기 때문입니다. Agent Scorecard는 사용자의 실제 로컬 실행 행동을 바탕으로 만든 **휴리스틱 진단** 입니다.

- 변경 전후 비교, 반복 방향 설정, 리뷰 속도 향상에 활용하세요.
- 벤더 benchmark 증빙이나 팀 간 보편적인 순위표처럼 받아들이면 안 됩니다.
- Demo 전용 점수와 곡선은 설명용일 뿐이며, 실제 세션이 훨씬 더 중요합니다.

## 가격 데이터는 실시간인가요?

엄밀한 의미의 "실시간 과금 대시보드" 는 아닙니다. ClawClip에는 검증된 정적 fallback 가격표가 기본 포함되어 있고, 네트워크가 허용되면 더 새로운 공개 가격 참조를 갱신할 수 있습니다.

- 비용 방향을 판단하거나 최적화가 값어치를 했는지 보는 용도로 사용하세요.
- 공급자 청구서를 한 줄씩 따질 때의 최종 근거로 쓰지는 마세요.
- 아주 새롭거나 이름이 특이한 모델은 가격 매핑이 따라잡기 전까지 일시적으로 추정값으로 fallback될 수 있습니다.
