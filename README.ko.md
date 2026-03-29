<div align="center">

<img src="luelan-logo.png" alt="ClawClip 로고" width="96" />

# ClawClip

**당신의 AI Agent가 47단계를 실행했습니다. 당신은 아무것도 보지 못했습니다.**

세션 리플레이 · 오프라인 벤치마크 · 비용 추적 — OpenClaw, ZeroClaw, 그리고 그 너머.

<p>
  <a href="https://clawclip.luelan.online">라이브 데모</a> ·
  <a href="#quick-start">빠른 시작</a> ·
  <a href="#why-clawclip">왜 ClawClip인가</a> ·
  <a href="./README.md">English</a> ·
  <a href="./README.zh-CN.md">中文</a> ·
  <a href="./README.ja.md">日本語</a> ·
  <strong>한국어</strong>
</p>

<p>
  <a href="https://clawclip.luelan.online"><img src="https://img.shields.io/badge/demo-live-blue?style=flat-square" alt="라이브 데모" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="MIT 라이선스" /></a>
  <img src="https://img.shields.io/badge/TypeScript-strict-blue?style=flat-square" alt="TypeScript strict" />
  <img src="https://img.shields.io/badge/i18n-7%20languages-orange?style=flat-square" alt="i18n 7 languages" />
</p>

</div>

---

> 클라우드 제로. API 호출 제로. 비용 제로. Agent 데이터는 당신의 컴퓨터에 그대로 남습니다.

---

<a id="quick-start"></a>

## 빠른 시작

```bash
git clone https://github.com/Ylsssq926/clawclip.git
cd clawclip && npm install
npm start
```

`http://localhost:8080`을 여세요. ClawClip에는 데모 세션이 함께 들어 있어 리플레이, 벤치마크, 비용 화면을 바로 둘러볼 수 있습니다.

---

## 문제

Agent는 하루 종일 돌았다. 로그는 남았다. 그런데 진실은 보이지 않았다.

폴더에는 JSONL 세션이 계속 쌓인다. 그 안 어딘가에는 도구 실패, 프롬프트 퇴행, 토큰 급증, 그리고 어쩌면 Agent가 정말 좋아졌던 그 한 번의 실행도 숨어 있다. 하지만 원본 파일을 열어 보면 전부 비슷해 보인다. 타임스탬프, 덩어리, 노이즈.

그래서 결국 모든 Agent 빌더는 같은 질문을 하게 됩니다. **돈은 어디로 새고 있지? 새 프롬프트가 도움이 됐나? 이 Agent는 정말 나아지고 있나, 아니면 내가 잘 된 실행만 기억하는 건가?**

그리고 어느새 새벽 2시, 터미널을 오가며 JSON을 손으로 뒤지고, Agent가 이미 한 번 살아낸 이야기를 다시 맞춰 보고 있다.

ClawClip은 이 모든 과정을 바꿉니다. 실행을 다시 보고, 행동을 점수화하고, 비용을 들여다보고, 변화 추세까지 확인할 수 있습니다. 새벽이 아니라 몇 분 안에.

---

## 기능

| | 기능 | 얻는 것 |
| --- | --- | --- |
| 🎬 | **세션 리플레이** | 생각, 도구 호출, 출력, 토큰 추적을 따라갈 수 있는 인터랙티브 타임라인 |
| 📊 | **6차원 벤치마크** | 여섯 가지 관점의 점수, 등급, 레이더 차트, 변화 추적 |
| 💸 | **비용 모니터** | 토큰 추세, 모델별 분석, 예산 알림, 절약 제안 |
| ☁️ | **워드 클라우드** | 자동 추출 키워드, 카테고리, 세션 라벨링 |
| 🏆 | **리더보드** | 점수 제출과 커뮤니티 비교 |
| 🪄 | **스마트 절약** | 실시간 가격을 바탕으로 한 대체 모델 추천 |
| 📚 | **지식 베이스** | 세션 JSON 가져오기, 실행 검색, 로컬 메모리 레이어 구축 |
| 🧩 | **템플릿 마켓** | 재사용 가능한 Agent 시나리오와 스킬 관리 |

---

<a id="why-clawclip"></a>

## 왜 ClawClip인가

### 100% 로컬
세션 데이터는 당신의 컴퓨터에 남습니다. 클라우드 업로드도, 계정 장벽도, 추적도 없습니다.

### 비용 제로
벤치마크와 분석은 오프라인에서 돌아갑니다. LLM API 호출이 필요 없습니다. 어젯밤 실행을 이해하려고 요금이 더 붙는 일도 없습니다.

### 프레임워크 불문
OpenClaw를 위해 만들어졌지만 ZeroClaw에서도 잘 작동합니다. JSONL 세션을 남기는 Agent 워크플로우라면 자연스럽게 맞아떨어집니다.

---

## 데이터 소스

| 소스 | 메모 |
| --- | --- |
| `~/.openclaw/` | 시작 시 자동 감지 |
| `OPENCLAW_STATE_DIR` | 기본 세션 디렉터리 재정의 |
| `CLAWCLIP_LOBSTER_DIRS` | 스캔할 추가 폴더 지정 |
| 내장 데모 세션 | 실제 데이터가 없어도 바로 제품을 살펴볼 수 있음 |
| SQLite 전용 구성 | 현재 ClawClip은 공식 JSONL 세션 경로에 집중 |

---

## 기술 스택

Express + TypeScript · React 18 · Vite · Tailwind CSS · Recharts · Framer Motion · Lucide React

---

## 로드맵

- [x] 내장 데모 세션이 포함된 세션 리플레이 엔진
- [x] 오프라인 6차원 벤치마크 시스템
- [x] 비용 모니터, 알림, 절약 제안
- [x] 워드 클라우드, 자동 태깅, 지식 베이스 검색
- [x] 리더보드, 공유 카드, 템플릿 마켓
- [ ] 런타임 / 게이트웨이와의 더 깊은 통합
- [ ] 현재 JSONL 워크플로우를 넘어서는 더 많은 생태계 어댑터
- [ ] 팀 단위 비교와 리뷰 흐름 강화

---

## 새우 이야기

> 나는 주인이 OpenClaw 생태계에서 건져 올린 바닷가재입니다.
>
> 주인은 말했어요. "너는 하루 종일 백그라운드에서 돌아가는데, 아무도 네가 뭘 하는지 못 본다."
>
> 나는 말했어요. "그럼 내 일을 기록해서 보여 주면 되죠."
>
> 주인은 말했어요. "기록은 했지만, 네가 정말 잘하는지는 아직 모르겠어."
>
> 나는 말했어요. "그럼 시험해 보면 되죠. 여섯 과목 전부, 나는 겁나지 않아요."
>
> 그렇게 ClawClip이 태어났습니다.
>
> — 🍤 ClawClip 마스코트

---

## 커뮤니티

QQ 그룹: `892555092`

---

## 라이선스

[MIT](./LICENSE)

---

<div align="center">

🍤와 함께 만든 사람은 **[Luelan (掠蓝)](https://github.com/Ylsssq926)**입니다

</div>
