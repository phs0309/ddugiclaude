# 뚜기 부산 맛집 앱 - Vercel PostgreSQL 데이터베이스 설정 가이드

## 🗄️ 데이터베이스 구조

### 사용자 테이블 (users)
- 사용자 기본 정보 및 OAuth 로그인 지원
- Google, 카카오, 일반 이메일 로그인 통합 관리

### 저장된 맛집 테이블 (saved_restaurants)
- 사용자별 맛집 저장 기능
- 전체 맛집 정보를 JSON으로 저장하여 빠른 조회

### 활동 로그 테이블 (user_activity_logs)
- 사용자 행동 분석 및 통계
- 로그인, 검색, 저장 등 주요 활동 추적

## 🚀 Vercel 배포 설정

### 1. Vercel PostgreSQL 데이터베이스 생성

```bash
# Vercel CLI로 로그인
vercel login

# 프로젝트에 PostgreSQL 데이터베이스 추가
vercel postgres create --name ddugi-restaurant-db

# 데이터베이스를 프로젝트에 연결
vercel postgres connect ddugi-restaurant-db
```

### 2. 환경 변수 설정

Vercel 대시보드에서 다음 환경 변수를 설정하세요:

```bash
# 필수 환경 변수
JWT_SECRET=random_generated_secret_key_here
claude_api_key=your_claude_api_key

# 선택적 환경 변수
GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
NAVER_MAP_CLIENT_ID=your_naver_map_client_id
```

### 3. 데이터베이스 초기화

데이터베이스는 첫 번째 API 요청시 자동으로 초기화됩니다.
수동으로 초기화하려면:

```bash
# 로컬에서 초기화 스크립트 실행
node scripts/init-database.js
```

## 📁 주요 파일 구조

```
├── lib/
│   ├── database.js          # 데이터베이스 연결 및 관리
│   └── auth.js              # JWT 인증 및 사용자 관리
├── api/
│   ├── auth.js              # 사용자 인증 API
│   ├── user-restaurants.js  # 저장 맛집 관리 API
│   └── chat.js              # 기존 챗봇 API
├── public/
│   ├── api-client.js        # 프론트엔드 API 클라이언트
│   ├── login.html           # 로그인 페이지 (Google OAuth 지원)
│   ├── index.html           # 메인 페이지
│   └── script.js            # 메인 JavaScript (데이터베이스 연동)
└── scripts/
    └── init-db.sql          # 데이터베이스 스키마
```

## 🔐 인증 시스템

### 지원되는 로그인 방식
- **Google OAuth**: 소셜 로그인 (추천)
- **게스트 모드**: 임시 사용자 (localStorage 기반)
- **일반 로그인**: 이메일/비밀번호 (향후 지원)

### JWT 토큰 관리
- 액세스 토큰: 7일 유효기간
- 자동 갱신 및 검증
- localStorage와 API 동기화

## 💾 데이터 관리 전략

### 하이브리드 저장 방식
1. **로그인 사용자**: PostgreSQL 데이터베이스
2. **게스트 사용자**: localStorage (클라이언트 사이드)
3. **오류 발생시**: localStorage 폴백

### API 엔드포인트

#### 인증 관련
```javascript
POST /api/auth?action=google-login    # Google 로그인
POST /api/auth?action=guest-login     # 게스트 로그인
POST /api/auth?action=verify-token    # 토큰 검증
GET  /api/auth?action=profile         # 사용자 프로필
```

#### 저장 맛집 관련
```javascript
GET    /api/user-restaurants          # 저장된 맛집 조회
POST   /api/user-restaurants          # 맛집 저장
DELETE /api/user-restaurants?restaurantId={id}  # 맛집 제거
```

## 🛠️ 로컬 개발 설정

1. **환경 변수 설정**
   ```bash
   cp .env.example .env.local
   # .env.local 파일에 실제 값 입력
   ```

2. **의존성 설치**
   ```bash
   npm install
   ```

3. **로컬 서버 실행**
   ```bash
   npm start
   ```

## 📈 모니터링 및 분석

### 사용자 활동 추적
- 로그인/로그아웃
- 맛집 검색 패턴
- 저장/제거 행동
- 지역별 선호도

### 데이터 분석 쿼리 예시
```sql
-- 가장 많이 저장된 맛집 TOP 10
SELECT 
    restaurant_name,
    restaurant_area,
    restaurant_category,
    COUNT(*) as save_count
FROM saved_restaurants 
GROUP BY restaurant_id, restaurant_name, restaurant_area, restaurant_category 
ORDER BY save_count DESC 
LIMIT 10;

-- 활성 사용자 통계
SELECT 
    DATE(created_at) as date,
    COUNT(*) as daily_signups
FROM users 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date;
```

## 🔧 트러블슈팅

### 일반적인 문제
1. **데이터베이스 연결 실패**: Vercel PostgreSQL 환경 변수 확인
2. **JWT 토큰 오류**: JWT_SECRET 환경 변수 설정
3. **Google 로그인 실패**: GOOGLE_CLIENT_ID 설정 및 도메인 등록
4. **API 응답 지연**: 데이터베이스 쿼리 최적화 필요

### 로그 확인
```bash
# Vercel 함수 로그 확인
vercel logs --follow

# 로컬 개발 로그
npm start
```

## 📊 성능 최적화

### 데이터베이스 최적화
- 인덱스 적절히 설정
- 쿼리 캐싱 활용
- 연결 풀 관리

### 프론트엔드 최적화
- API 호출 최소화
- localStorage 캐싱
- 오류시 폴백 메커니즘

## 🔒 보안 고려사항

### 데이터 보호
- JWT 토큰 안전한 저장
- SQL 인젝션 방지 (Prepared Statements)
- 사용자 입력 데이터 검증
- CORS 적절한 설정

### 개인정보 보호
- 최소한의 사용자 정보만 수집
- 비밀번호 안전한 해싱 (bcrypt)
- 활동 로그 익명화 옵션

이제 Vercel PostgreSQL 데이터베이스를 활용한 완전한 사용자 데이터 관리 시스템이 구축되었습니다! 🎉