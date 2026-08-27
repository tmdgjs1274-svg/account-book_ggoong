# 머니로그 — 우리 가족 가계부 웹앱

토스 스타일의 미니멀한 UI를 참고해 만든 가계부 웹앱 초안입니다. PC와 모바일 모두 대응하며,
프론트엔드(Next.js) / 백엔드(Express) / 데이터베이스(Supabase)로 구성되어 있습니다.

## 폴더 구조

```
hh-budget/
├── frontend/        # Next.js (App Router) - 화면
├── backend/         # Express API 서버
├── supabase/        # DB 스키마 SQL
└── render.yaml       # Render 배포 설정 (Blueprint)
```

## 기술 스택 및 아키텍처

- **프론트엔드**: Next.js 14 + TypeScript + Tailwind CSS. Supabase Auth로 로그인/회원가입을 직접 처리하고,
  발급받은 JWT(access token)를 백엔드 API 호출 시 `Authorization: Bearer` 헤더로 전달합니다.
- **백엔드**: Express API 서버. 프론트엔드가 보낸 JWT를 검증(`SUPABASE_JWT_SECRET`)한 뒤,
  Supabase service role 키로 DB에 접근합니다. 모든 쿼리에 `user_id` 필터가 걸려 있어 본인 데이터만 조회/수정됩니다.
- **DB**: Supabase(PostgreSQL, 무료 플랜) + Row Level Security. 회원가입 시 트리거로 기본 카테고리가 자동 생성됩니다.

```
[Next.js 프론트엔드] --(1. 로그인)--> [Supabase Auth]
        |                                   |
        | (2. API 요청 + JWT)                | (JWT 발급)
        v
[Express 백엔드] --(service role, user_id 필터)--> [Supabase Postgres]
```

## 1. Supabase 프로젝트 만들기

1. [supabase.com](https://supabase.com) 에서 무료 계정으로 새 프로젝트를 생성합니다.
2. 프로젝트가 준비되면 좌측 메뉴 **SQL Editor** 에 들어가 `supabase/schema.sql` 파일 내용을 전체 붙여넣고 실행합니다.
   - `categories`, `transactions`, `budgets`, `recurring_transactions` 테이블과 RLS 정책, 신규 가입자 기본 카테고리 생성 트리거가 만들어집니다.
3. **Authentication > Providers** 에서 Email 로그인이 켜져 있는지 확인합니다.
   - 테스트 단계에서는 **Authentication > Settings** 에서 "Confirm email"을 꺼두면 가입 즉시 로그인되어 편합니다. 실서비스 전환 시 다시 켜는 것을 권장합니다.
4. **Project Settings > API** 에서 아래 값을 복사해둡니다.
   - `Project URL` → `SUPABASE_URL`
   - `anon public` 키 → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` 키 (⚠️ 절대 프론트엔드에 노출하지 말 것) → `SUPABASE_SERVICE_ROLE_KEY`
5. **Project Settings > API > JWT Settings** 에서 `JWT Secret` 값을 복사해 `SUPABASE_JWT_SECRET`으로 사용합니다.
   - 만약 이 항목이 보이지 않으면(신규 프로젝트는 비대칭 키를 기본 사용) "Legacy JWT Secret"을 활성화해 값을 발급받으세요.

## 2. 로컬에서 실행해보기

### 백엔드

```bash
cd backend
cp .env.example .env   # 값 채워넣기
npm install
npm run dev             # http://localhost:4000
```

### 프론트엔드

```bash
cd frontend
cp .env.example .env.local   # 값 채워넣기 (NEXT_PUBLIC_API_URL=http://localhost:4000)
npm install
npm run dev              # http://localhost:3000
```

브라우저에서 `http://localhost:3000` 접속 → 회원가입 → 자동으로 기본 카테고리 14개가 생성됩니다.

## 3. Git에 올리기

```bash
cd hh-budget
git add .
git commit -m "가계부 웹앱 초안"
git branch -M main
git remote add origin <본인의 GitHub 저장소 주소>
git push -u origin main
```

## 4. Render 배포

가장 쉬운 방법은 저장소 루트의 `render.yaml`(Blueprint)을 사용하는 것입니다.

1. Render 대시보드에서 **New > Blueprint** 선택 → 방금 올린 GitHub 저장소 연결
2. `render.yaml`을 인식하면 `hh-budget-api`(백엔드), `hh-budget-web`(프론트엔드) 두 개 서비스가 자동으로 잡힙니다.
3. 배포 전, 각 서비스의 **Environment** 탭에서 값을 채워줍니다.

   **hh-budget-api (백엔드)**
   | 키 | 값 |
   |---|---|
   | `SUPABASE_URL` | Supabase Project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role 키 |
   | `SUPABASE_JWT_SECRET` | Supabase JWT Secret |
   | `CORS_ORIGIN` | 프론트엔드 Render 주소 (예: `https://hh-budget-web.onrender.com`) |

   **hh-budget-web (프론트엔드)**
   | 키 | 값 |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon 키 |
   | `NEXT_PUBLIC_API_URL` | 백엔드 Render 주소 (예: `https://hh-budget-api.onrender.com`) |

4. 두 서비스 모두 처음 배포 후 실제 발급된 주소(.onrender.com)를 서로의 환경변수(`CORS_ORIGIN`, `NEXT_PUBLIC_API_URL`)에 반영하고 재배포합니다. (닭이 먼저냐 달걀이 먼저냐 문제이므로, 배포 → 주소 확인 → 환경변수 수정 → 재배포 순서로 한 번 순환합니다.)
5. Render 무료 플랜은 일정 시간 요청이 없으면 슬립 모드로 전환되어 첫 요청 응답이 느릴 수 있습니다(콜드 스타트). 무료로 사용하는 이상 자연스러운 현상입니다.

Blueprint 없이 수동으로 배포하려면, 백엔드는 **Web Service**(Root Directory: `backend`, Build: `npm install`, Start: `npm start`), 프론트엔드도 **Web Service**(Root Directory: `frontend`, Build: `npm install && npm run build`, Start: `npm start`)로 각각 만들면 됩니다.

## 5. 현재 버전(v1)에 포함된 기능

- 이메일 회원가입 / 로그인 (Supabase Auth)
- 수입·지출 거래 기록, 수정, 삭제
- 카테고리 관리 (가입 시 기본 카테고리 자동 제공 — 지출 10종 · 수입 4종)
- 카테고리별 월 예산 설정 및 사용률 확인
- 반복 거래 등록 (매달 특정 일자에 자동으로 거래 생성)
- 대시보드 (이번 달 요약, 카테고리별 지출 비중, 예산 현황, 최근 거래)
- 통계 (최근 6개월 수입/지출 추이, 카테고리별 비중)
- PC / 모바일 반응형 (PC: 좌측 사이드바, 모바일: 하단 탭바 + 플로팅 추가 버튼)

## 6. 다음 단계로 고려해볼 것 (v2 이후 논의 필요)

- 다중 계좌 / 카드 연동, 가족 공유 가계부, 저축 목표 등은 이번 초안(표준형) 범위 밖입니다. 필요해지면 별도 논의 후 반영하는 것을 권장합니다.
- 반복 거래는 Render 무료 플랜 특성상 별도 크론 없이, 화면 조회 시점에 "이번 달치가 없으면 생성"하는 방식으로 동작합니다. 트래픽이 거의 없는 달에는 사용자가 접속해야 그 달 거래가 생성되니, 유료 플랜으로 전환 시 Render Cron Job으로 교체하는 것을 고려하세요.
- 카테고리 변경/삭제 시 기존 거래 데이터가 영향받을 수 있어, 실사용 전 카테고리 삭제 정책(예: 사용 중인 카테고리는 삭제 대신 비활성화)을 정하는 것을 권장합니다.
