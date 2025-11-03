# Google Maps API 설정 가이드

## 🗺️ Google Maps 통합

뚜기의 부산 맛집 봇에서 실제 지도를 표시하려면 Google Maps API가 필요합니다.

## 설정 방법

### 1. Google Maps API 키 발급

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 생성 또는 선택
3. "API 및 서비스" > "라이브러리" 이동
4. "Maps JavaScript API" 검색하여 활성화
5. "사용자 인증 정보" > "사용자 인증 정보 만들기" > "API 키" 생성

### 2. API 키 적용

`public/index.html` 파일에서 주석을 해제하고 API 키를 설정:

```html
<!-- 주석 해제하고 YOUR_GOOGLE_MAPS_API_KEY를 실제 키로 교체 -->
<script async defer src="https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY&callback=initGoogleMaps"></script>
```

### 3. API 제한 설정 (보안)

Google Cloud Console에서:
- HTTP 리퍼러 제한 설정
- 도메인별 접근 제한
- API 사용량 모니터링

## 현재 상태

- ✅ Google Maps 통합 코드 완료
- ✅ Fallback 지도 시스템 구현
- ⏳ API 키 설정 필요
- ✅ 좌표 기반 마커 표시
- ✅ 정보창 및 슬라이더 연동

## 기능

### 🗺️ 실제 지도 표시
- 부산 전체 지역 지도
- 다크 테마 스타일링
- 반응형 디자인

### 📍 맛집 마커
- 번호가 표시된 커스텀 마커
- 클릭 시 상세 정보창
- 슬라이더와 실시간 연동

### 🔄 상호작용
- 마커 클릭 → 해당 카드로 이동
- 카드 변경 → 지도 중심 이동
- 정보창에서 직접 카드 보기

### 🛡️ Fallback 시스템
- API 로드 실패 시 대체 지도
- 좌표 정보 텍스트 표시
- Google Maps 외부 링크 제공

## 비용

Google Maps API는 사용량에 따라 과금됩니다:
- 월 $200 무료 크레딧 제공
- 지도 로드: 1,000회당 $7
- 소규모 프로젝트는 무료 범위 내 사용 가능

## 대안

API 키 없이도 다음 기능들은 정상 동작:
- 좌표 정보 표시
- Google Maps 외부 링크
- 맛집 카드 슬라이더
- 채팅 기능