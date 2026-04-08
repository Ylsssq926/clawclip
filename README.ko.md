<div align="center">

<img src="luelan-logo.png" alt="ClawClip 로고" width="96" />

# ClawClip

**로컬 Agent 진단 콘솔 · v1.1.0**

Agent가 실제로 무엇을 했는지 본다.  
그 실행이 끝까지 버텼는지 확인한다.  
결과가 비용에 값했는지 비교한다.

Run Insights · Agent Scorecard · Cost Report — OpenClaw, ZeroClaw, 그리고 로컬 JSONL 세션 검토를 위해.

<p>
  <a href="https://clawclip.luelan.online">라이브 데모</a> ·
  <a href="#quick-start">빠른 시작</a> ·
  <a href="#visual-proof">미리보기</a> ·
  <a href="./docs/FAQ.ko.md">FAQ</a> ·
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
  <img src="https://img.shields.io/badge/agents-OpenClaw%20%7C%20ZeroClaw-3b82c4?style=flat-square" alt="OpenClaw 및 ZeroClaw" />
</p>

</div>

> 세션을 열고 무슨 일이 있었는지 본다.  
> 그 실행이 정말 버텼는지 확인한다.  
> 변경을 유지하기 전에 결과와 비용을 비교한다.

<a id="visual-proof"></a>

## 15초 안에 보기

한 번의 실행만 불러오면, 무슨 일이 있었는지, 실제로 버텼는지, 그 지출이 값어치를 했는지 세 가지를 빠르게 확인할 수 있습니다.

<p align="center">
  <img src="./docs/radar-animation-en.gif" alt="ClawClip이 하나의 Agent 실행을 Run Insights, Agent Scorecard, Cost Report로 정리하는 모습" />
</p>

<a id="core-capabilities"></a>

## 빠르게 답할 수 있는 세 가지 질문

| 실제로 궁금한 질문 | ClawClip이 주는 답 |
| --- | --- |
| **Agent가 실제로 무엇을 했나?** | **Run Insights**가 실행을 단계별로 펼쳐 보여 주므로 원시 로그를 뒤지지 않고도 검토할 수 있습니다 |
| **그 실행은 정말 버텼나?** | **Agent Scorecard**가 글쓰기, 코딩, 도구 사용, 검색, 안전성, 비용 대비 성능 여섯 측면을 빠르게 진단합니다 |
| **그 최적화는 정말 값어치를 했나?** | **Cost Report**가 모델별·사용량별 비용을 나눠 보여 주어, 얻은 개선이 청구서를 정당화하는지 확인하게 합니다 |

## v1.1.0에 포함된 내용

| 이번 릴리스에 포함된 것 | 왜 중요한가 |
| --- | --- |
| **Prompt Efficiency** | 추가 토큰과 더 복잡한 Prompt가 그만큼의 출력 품질을 실제로 사 오고 있는지 확인합니다 |
| **Version Compare** | 모델, Prompt, 설정, 실행 결과를 나란히 비교해 개선과 퇴행을 빠르게 구분합니다 |
| **Template Library + Knowledge Base** | 잘 통하는 패턴을 재사용하고, 로컬 기록을 검색하고, 세션에서 얻은 배움을 한곳에 모읍니다 |
| **내장 데모 세션** | 실제 프로젝트 데이터를 건드리기 전에 전체 흐름을 먼저 살펴볼 수 있습니다 |

## 로컬에 남는 것

- 세션 탐색, 파싱, 분석은 내 컴퓨터에서 이뤄집니다.
- ClawClip은 Agent 실행 데이터를 업로드하지 않습니다.
- 공개 가격 갱신은 최신 참고 가격이 필요할 때만 선택적으로 사용할 수 있습니다.
- 그 갱신 과정에서도 세션 내용은 어디에도 전송되지 않습니다.

<a id="quick-start"></a>

## 빠른 시작

```bash
git clone https://github.com/Ylsssq926/clawclip.git
cd clawclip && npm install
npm start
```

`http://localhost:8080`을 열면 먼저 번들된 데모 세션을 로컬에서 확인한 뒤, 자신의 OpenClaw / ZeroClaw 로그를 불러올 수 있습니다.

## 호환성

ClawClip은 현재 **OpenClaw**와 **ZeroClaw**의 공식 세션 구조를 우선 지원합니다.  
그 밖의 로컬 JSONL 런타임은 파서 커버리지가 넓어지는 만큼 점진적으로 확장됩니다.

## Scorecard 읽는 법

> Agent Scorecard는 **휴리스틱 해석**이지 benchmark 순위표가 아닙니다. 응답 품질, 도구 사용, 안전 신호, 비용 구조 같은 세션 신호를 읽어 반복 비교를 더 빠르게 하도록 돕습니다.

## 세션 소스

| 소스 | 용도 |
| --- | --- |
| `~/.openclaw/` | 시작 시 자동 감지되는 기본 OpenClaw 세션 디렉터리 |
| `OPENCLAW_STATE_DIR` | 기본 OpenClaw state 경로를 덮어씁니다 |
| `CLAWCLIP_LOBSTER_DIRS` | 세션 스캔 대상에 추가 로컬 폴더를 넣습니다 |
| 내장 데모 세션 | 실제 데이터를 가져오지 않아도 Run Insights, Agent Scorecard, Cost Report를 살펴볼 수 있습니다 |
| ZeroClaw 내보내기 / 추가 JSONL 폴더 | 포맷 지원 범위가 넓어지는 만큼 순차적으로 지원됩니다 |

## 마스코트가 새우인 이유

> ClawClip의 마스코트가 새우인 이유는 OpenClaw 실행을 검토하는 데서 시작했기 때문입니다.
>
> 그리고 남은 질문은 이것이었습니다. "이 Agent가 정말 좋아진 걸까, 아니면 그냥 더 비싸진 걸까?"
>
> 그래서 ClawClip은 실행을 다시 보고, 버텼는지 확인하고, 결과와 비용을 함께 비교하는 도구입니다.
>
> — 🍤 ClawClip 마스코트

<a id="roadmap"></a>

## v1.1.0 이후

- Prompt, 모델, 설정 변경의 전후 검증을 더 분명하게 보여 주기
- OpenClaw / ZeroClaw 지원을 더 깊게 하고, 인접한 로컬 JSONL 런타임까지 확장하기
- 세션을 로컬에 둔 채 팀이 공유하기 좋은 리뷰 결과물을 더 늘리기

## 커뮤니티

- QQ 그룹: `892555092`
- 이슈와 제안: [GitHub Issues](https://github.com/Ylsssq926/clawclip/issues)

## 라이선스

[MIT](./LICENSE)

---

<div align="center">

Built with 🍤 by **[Luelan (掠蓝)](https://github.com/Ylsssq926)**

</div>
