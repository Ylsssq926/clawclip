<div align="center">

<img src="luelan-logo.png" alt="ClawClip 로고" width="96" />

# ClawClip

**로컬 Agent 진단 콘솔 · v1.1.0**

Agent가 실제로 무엇을 했는지 본다.  
그 실행이 끝까지 버텼는지 판단한다.  
최적화가 정말 비용값을 했는지 확인한다.

실행 인사이트 · Agent 성적표 · 비용 리포트 — OpenClaw, ZeroClaw, 그리고 실전형 로컬 JSONL 워크플로를 위해.

<p>
  <a href="https://clawclip.luelan.online">라이브 데모</a> ·
  <a href="#quick-start">빠른 시작</a> ·
  <a href="#core-capabilities">핵심 기능</a> ·
  <a href="#roadmap">로드맵</a> ·
  <a href="./README.md">English</a> ·
  <a href="./README.zh-CN.md">中文</a> ·
  <a href="./README.ja.md">日本語</a> ·
  <strong>한국어</strong> ·
  <a href="./README.es.md">Español</a> ·
  <a href="./README.fr.md">Français</a> ·
  <a href="./README.de.md">Deutsch</a>
</p>

<p>
  <a href="https://clawclip.luelan.online"><img src="https://img.shields.io/badge/demo-live-2563eb?style=flat-square" alt="라이브 데모" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-16a34a?style=flat-square" alt="MIT 라이선스" /></a>
  <img src="https://img.shields.io/badge/analysis-session%20analysis%20local-0f172a?style=flat-square" alt="세션 분석은 로컬에서 처리" />
  <img src="https://img.shields.io/badge/agents-OpenClaw%20%7C%20ZeroClaw-3b82c4?style=flat-square" alt="OpenClaw and ZeroClaw" />
</p>

</div>

> ClawClip은 원시 Agent 세션을 믿고 검토할 수 있는 진단 콘솔로 바꿔 줍니다.  
> 실행 전체를 증거 체인으로 보여 주고, Agent가 실제로 버텼는지 점검하고, 품질을 비용과 연결해 "더 좋아졌다"가 정말 돈값을 했는지 판단하게 해 줍니다.
>
> **경계는 먼저 분명히 말합니다:** 세션 분석은 로컬에서 처리되고, Agent 실행 데이터는 업로드되지 않으며, 가격 갱신은 최신 공개 요금 참고값이 필요할 때만 선택적으로 사용됩니다.

<a id="core-capabilities"></a>

## ClawClip이 먼저 답하는 세 가지 질문

| 정말 알고 싶은 것 | ClawClip의 답 |
| --- | --- |
| **Agent가 실제로 무엇을 했나?** | **Run Insights**가 사고 흐름, 도구 호출, 재시도, 오류, 결과를 하나의 검토 가능한 증거 체인으로 재구성합니다 |
| **그 실행은 정말 버텼나?** | **Agent Scorecard**가 글쓰기, 코딩, 도구 사용, 검색, 안전, 비용 효율을 실전적인 휴리스틱으로 읽어 줍니다 |
| **그 최적화는 정말 값어치를 했나?** | **Cost Report**가 모델별·사용량별 비용을 풀어 보여 주어, 얻은 개선이 청구서를 정당화하는지 확인하게 합니다 |

## v1.1.0에 포함된 것

| 이번 릴리스에 들어간 것 | 왜 중요한가 |
| --- | --- |
| **Prompt 효율** | 토큰과 Prompt 복잡도를 더 투입했을 때, 그만큼의 결과 품질이 실제로 돌아오는지 확인합니다 |
| **버전 비교** | 모델, Prompt, 설정, 실행 결과를 나란히 비교해 진짜 개선과 진짜 후퇴를 구분합니다 |
| **템플릿 라이브러리 + 지식 베이스** | 잘 통하는 패턴을 재사용하고, 로컬 히스토리를 검색하고, 흩어진 세션을 반복 개선의 기억으로 바꿉니다 |
| **내장 데모 세션** | 실제 프로젝트 데이터를 건드리기 전에 전체 흐름을 먼저 둘러볼 수 있습니다 |

## 로컬 우선, 하지만 과장 없이

- 세션 탐색, 파싱, 분석은 내 컴퓨터에서 이뤄집니다.
- ClawClip은 Agent 실행 데이터를 업로드하지 않습니다.
- 공개 가격 갱신은 선택 사항이며 비용 참고값을 업데이트하는 용도로만 쓰입니다.
- 그 과정에서도 세션 내용은 외부로 전송되지 않습니다.

<a id="quick-start"></a>

## 빠른 시작

```bash
git clone https://github.com/Ylsssq926/clawclip.git
cd clawclip && npm install
npm start
```

`http://localhost:8080`을 열면 먼저 번들된 데모 세션을 로컬에서 살펴볼 수 있고, 이어서 자신의 OpenClaw / ZeroClaw 로그를 불러올 수 있습니다.

## 호환성

ClawClip은 **OpenClaw**와 **ZeroClaw**의 공식 세션 구조를 우선 지원합니다.  
그 외 로컬 JSONL 기반 Agent 런타임은 실제 포맷 커버리지가 쌓이는 만큼 점진적으로 확장합니다.

## 성적표 읽는 법

> Agent Scorecard는 **휴리스틱 진단**이지 엄격한 benchmark 순위표가 아닙니다. 실제 세션에서 드러나는 응답 품질, 도구 사용, 안전 신호, 비용 구조 같은 행동 신호를 읽어 빠르게 검토하고, 개선 방향을 더 자신 있게 비교하도록 돕습니다.

## 데이터 소스

| 소스 | 설명 |
| --- | --- |
| `~/.openclaw/` | 시작 시 자동 감지되는 기본 OpenClaw 세션 디렉터리 |
| `OPENCLAW_STATE_DIR` | 기본 OpenClaw 상태 경로를 덮어쓰기 |
| `CLAWCLIP_LOBSTER_DIRS` | 추가 로컬 세션 폴더를 스캔 대상에 추가 |
| 번들 데모 세션 | 실제 데이터를 넣지 않아도 Run Insights, Scorecard, Cost Report를 체험 가능 |
| ZeroClaw 내보내기 / 추가 JSONL 폴더 | 파서 지원이 성숙하는 범위에서 순차 지원 |

## Tech Stack

Express + TypeScript · React 18 · Vite · Tailwind CSS · Recharts · Framer Motion · Lucide React

<a id="roadmap"></a>

## v1.1.0 이후

- Prompt, 모델, 설정 변경의 전후 검증을 더 분명하게 보여 주기
- OpenClaw / ZeroClaw 지원을 더 깊게 하고, 인접한 로컬 JSONL 런타임까지 확장하기
- 로컬 우선의 핵심을 유지하면서 팀이 공유하기 좋은 리뷰 출력물 늘리기

## 새우 이야기

> 나는 OpenClaw 조수웅덩이에서 건져 올린 작은 새우였습니다.
>
> 주인은 말했습니다. "너는 하루 종일 돌아가는데, 정말 더 좋아졌는지 아니면 그냥 더 비싸졌는지 아무도 모르겠구나."
>
> 나는 답했습니다. "그럼 원시 로그만 보지 말아요. 내 실행을 증거로 바꾸고, 성적표를 만들고, 청구서를 펼쳐 보세요."
>
> 그렇게 ClawClip은 Agent가 무엇을 했고, 얼마나 잘했으며, 얼마를 썼는지 로컬에서 검토하는 진단 도구가 되었습니다.
>
> — 🍤 ClawClip 마스코트

## Community

- QQ 그룹: `892555092`
- 이슈와 제안: [GitHub Issues](https://github.com/Ylsssq926/clawclip/issues)

## License

[MIT](./LICENSE)

---

<div align="center">

Built with 🍤 by **[Luelan (掠蓝)](https://github.com/Ylsssq926)**

</div>
