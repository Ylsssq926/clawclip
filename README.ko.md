<div align="center">

<img src="luelan-logo.png" alt="ClawClip 로고" width="96" />

# ClawClip

**AI Agent를 위한 로컬 진단 도구**

실행 인사이트 · Agent 성적표 · 비용 리포트 — OpenClaw, ZeroClaw, 그리고 실용적인 로컬 JSONL 워크플로를 위해.

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
  <img src="https://img.shields.io/badge/local-100%25%20local-0f172a?style=flat-square" alt="100% local" />
  <img src="https://img.shields.io/badge/agents-OpenClaw%20%7C%20ZeroClaw-3b82c4?style=flat-square" alt="OpenClaw and ZeroClaw" />
</p>

</div>

> ClawClip은 AI Agent를 위한 "성적표"이자 "비용 청구서"입니다.  
> 단순히 로그를 재생하는 것이 아닙니다. 글쓰기, 코딩, 도구 사용, 검색, 안전, 비용 효율 여섯 차원에서 당신의 Agent가 몇 점인지, 얼마를 썼는지, 지난번보다 나아졌는지를 알려줍니다.  
> 100% 로컬 실행. 데이터는 밖으로 나가지 않습니다.

<a id="quick-start"></a>

## 빠른 시작

```bash
git clone https://github.com/Ylsssq926/clawclip.git
cd clawclip && npm install
npm start
```

`http://localhost:8080`을 열면 먼저 번들된 데모 세션을 로컬에서 살펴볼 수 있고, 이어서 자신의 OpenClaw / ZeroClaw 로그를 불러올 수 있습니다.

<a id="core-capabilities"></a>

## 핵심 기능

| 기능 | 할 수 있는 일 |
| --- | --- |
| 🔍 **실행 인사이트 (Run Insights)** | 생각의 흐름, 도구 호출, 오류, 재시도, 결과를 단계별로 검토해 감사 가능한 증거 체인으로 정리합니다 |
| 📊 **Agent 성적표 (Agent Scorecard)** | 실제 실행 로그를 바탕으로 글쓰기 / 코딩 / 도구 사용 / 검색 / 안전 / 가성비 여섯 차원을 휴리스틱하게 점수화합니다 |
| 💰 **비용 리포트 (Cost Report)** | 모델별 비용 분해, 추세 추적, 예산 경고, 절약 기회를 확인할 수 있습니다 |
| 📈 **Prompt 효율 (Prompt Efficiency)** | Prompt에 투입한 토큰과 비용 대비 결과가 충분한지 판단합니다 |
| 🔄 **버전 비교 (Version Compare)** | 모델, Prompt, 설정, 실행 버전을 나란히 비교해 무엇이 좋아졌고 무엇이 후퇴했는지 확인합니다 |
| 📚 **템플릿 라이브러리 + 지식 베이스 (Template Library + Knowledge Base)** | 잘 작동한 템플릿을 재사용하고, 과거 세션을 검색하며, 로컬 개선 지식을 쌓습니다 |

## 호환성

ClawClip은 **OpenClaw**와 **ZeroClaw**의 공식 세션 구조를 우선 지원합니다.  
그 외 로컬 JSONL 기반 Agent 런타임은 실제 포맷 커버리지가 쌓이는 만큼 점진적으로 확장합니다.

## 점수 산정 방식

> Agent 성적표는 **Heuristic Scorecard** 방식에 기반합니다. 응답 품질, 도구 사용, 안전 신호, 비용 구조 같은 세션 로그의 행동 신호를 분석합니다. 표준화된 테스트셋 위의 엄격한 벤치마크가 아니라, 실행 품질을 빠르게 진단하기 위한 신호입니다.

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

## 로드맵

### v1.0 — 도구 성숙
- Run Insights, Agent Scorecard, Cost Report를 일상적으로 쓰는 로컬 진단 도구로 안정화
- 증거 검토 경험, 가져오기 흐름, OpenClaw / ZeroClaw 호환성 강화
- 로컬 퍼스트 워크플로를 빠르고, 명확하고, 신뢰할 수 있게 다듬기

### v1.5 — 최적화 루프
- Prompt 효율, 버전 비교, 절약 제안을 더 강화
- 진단 결과를 반복 가능한 최적화 제안과 변경 후 검증 흐름으로 연결
- 템플릿 라이브러리 + 지식 베이스를 실용적인 개선 루프로 발전시키기

### v2.0 — 팀 워크플로
- 팀 리뷰 화면, 공유 가능한 보고서, 기준선 비교 흐름 추가
- 시나리오 라이브러리, 정기 평가, 다중 실행 요약 지원
- 실행 하나하나가 아니라 팀 차원에서 Agent 품질과 비용을 함께 관리하도록 지원

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
