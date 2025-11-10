# 부산 맛집 데이터 관리 에이전트

부산의 16개 시군구별 맛집 정보를 자동으로 수집하고 매일 업데이트하는 데이터 관리 시스템입니다.

## 🏢 지원 구역

- **16개 시군구**: 중구, 서구, 동구, 영도구, 부산진구, 동래구, 남구, 북구, 해운대구, 사하구, 금정구, 강서구, 연제구, 수영구, 사상구, 기장군

## 📁 파일 구조

```
/
├── restaurantDataManager.js     # 메인 에이전트
├── restaurants_중구.json        # 중구 맛집 데이터
├── restaurants_서구.json        # 서구 맛집 데이터
├── ...                         # 다른 구역 데이터 파일들
├── restaurants_기장군.json      # 기장군 맛집 데이터
└── reports/                    # 일일/주간 리포트
    ├── daily_report_2024-01-01.json
    └── ...
```

## 🚀 사용법

### 1. 의존성 설치
```bash
npm install
```

### 2. 명령어 실행

#### 전체 구역 초기화
```bash
npm run data-init
# 또는
node restaurantDataManager.js init
```

#### 특정 구역 업데이트
```bash
npm run data-update 해운대구
# 또는
node restaurantDataManager.js update 해운대구
```

#### 전체 구역 업데이트
```bash
npm run data-update
# 또는
node restaurantDataManager.js update
```

#### 매일 자동 업데이트 스케줄러 시작
```bash
npm run data-schedule
# 또는
node restaurantDataManager.js schedule
```

#### 전체 통계 조회
```bash
npm run data-stats
# 또는
node restaurantDataManager.js stats
```

#### 일일 리포트 생성
```bash
npm run data-report
# 또는
node restaurantDataManager.js report
```

## 🕐 스케줄

- **매일 오전 6시**: 전체 구역 데이터 자동 업데이트
- **매주 일요일 오전 3시**: 30일 이전 오래된 데이터 정리

## 📊 데이터 구조

각 맛집 데이터는 다음과 같은 구조를 가집니다:

```json
{
  "id": "해운대구_1699123456789_0",
  "name": "해운대 맛집 1",
  "area": "해운대구",
  "category": "해산물",
  "description": "해운대구의 대표적인 맛집입니다.",
  "specialties": ["해산물", "회"],
  "rating": "4.2",
  "priceRange": "보통",
  "address": "부산광역시 해운대구",
  "phone": "051-1234-5678",
  "lastUpdated": "2024-01-01T12:00:00.000Z",
  "dataSource": "web_scraping",
  "verified": true
}
```

## 🔧 주요 기능

### 1. 자동 데이터 수집
- 네이버, 카카오맵, 망고플레이트 등에서 맛집 정보 수집
- 구역별 특색있는 카테고리 자동 분류
- 데이터 검증 및 중복 제거

### 2. 스마트 업데이트
- 기존 데이터와 새 데이터 자동 병합
- 중복 데이터 제거 (이름 + 주소 기준)
- 데이터 품질 검증

### 3. 모니터링 및 리포트
- 일일 업데이트 리포트 생성
- 구역별 통계 제공
- 오류 로그 관리

### 4. 데이터 정리
- 30일 이상 오래된 데이터 자동 정리
- 주간 데이터 정리 스케줄

## 📈 통계 예시

```json
{
  "districts": 16,
  "totalRestaurants": 248,
  "byDistrict": {
    "해운대구": 18,
    "서면": 22,
    "남포동": 15,
    ...
  },
  "byCategory": {
    "한식": 89,
    "해산물": 45,
    "카페": 32,
    ...
  }
}
```

## 🔄 업데이트 프로세스

1. **데이터 수집**: 웹 스크래핑을 통한 최신 맛집 정보 수집
2. **데이터 검증**: 필수 필드 확인 및 데이터 품질 검증
3. **중복 처리**: 기존 데이터와 비교하여 중복 제거
4. **파일 저장**: JSON 형식으로 각 구역별 파일에 저장
5. **로그 기록**: 업데이트 결과 및 오류 로그 기록

## ⚠️ 주의사항

- 웹 스크래핑 시 각 사이트의 robots.txt 및 이용약관 준수
- API 사용 시 요청 제한 및 인증키 관리
- 개인정보 보호를 위한 데이터 마스킹 처리

## 🛠️ 개발 정보

- **언어**: Node.js
- **주요 라이브러리**: 
  - `node-schedule`: 스케줄링
  - `axios`: HTTP 요청
  - `cheerio`: HTML 파싱
- **데이터 형식**: JSON
- **로그 레벨**: INFO, ERROR, DEBUG