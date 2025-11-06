# 네이버 지도 API 설정 가이드

## 중요 공지
네이버 클라우드 플랫폼의 AI NAVER API 상품에서 제공되던 지도 API 서비스가 점진적으로 종료됩니다.
**신규 Maps API로 마이그레이션이 필요합니다.**

## 신규 Client ID 발급 방법

1. **네이버 클라우드 플랫폼 접속**
   - https://www.ncloud.com 로그인

2. **신규 Maps API 신청**
   - 콘솔 > AI·NAVER API > Application 등록
   - Maps > Web Dynamic Map v3 선택
   - 서비스 환경 등록 (모든 도메인 추가 필수):
     - 로컬 테스트: `http://localhost:3000`
     - Vercel 메인: `https://ddugiclaude.vercel.app`
     - Vercel Preview: `https://ddugiclaude-*.vercel.app`
     - Vercel 프로젝트 URL: `https://ddugiclaude-m46ijnngl-phs0309s-projects.vercel.app`
     - 모든 Vercel 브랜치 URL: `https://*.vercel.app`

3. **Client Key ID 확인**
   - Application 상세 페이지에서 "Client ID" 복사
   - 이 값이 새로운 `ncpKeyId`입니다

## 환경 변수 설정

### Vercel (프로덕션)
```bash
# Vercel 대시보드 또는 CLI에서 설정
# Settings > Environment Variables
naver_client_id = "발급받은_Client_ID"
```

### 로컬 개발 (.env 파일)
```bash
# .env 파일에 추가
naver_client_id=발급받은_Client_ID
```

## API 변경사항

### 기존 (구 API)
```javascript
https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=YOUR_CLIENT_ID
```

### 신규 (새 API) ✅
```javascript
https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=YOUR_KEY_ID
```

## 트러블슈팅

### "Authentication Failed" / "500 Internal Server Error" 오류

1. **도메인 등록 확인 (가장 중요)**
   - 네이버 클라우드 플랫폼 > Application > Web 서비스 URL
   - 현재 Vercel URL 패턴 확인 후 모두 등록
   - 예: `https://ddugiclaude-m46ijnngl-phs0309s-projects.vercel.app`

2. **Client ID 확인**
   - 신규 Maps API Client ID 사용 (기존 AI NAVER API 아님)
   - Application 페이지에서 정확한 ID 복사

3. **Vercel 환경변수**
   - `naver_client_id` = "신규_Client_ID"
   - Vercel 대시보드 > Settings > Environment Variables

4. **API 할당량 확인**
   - 네이버 클라우드 플랫폼에서 일일 할당량 초과 여부 확인

### 참고 링크
- [공지사항](https://www.ncloud.com/support/notice/all/1930)
- [마이그레이션 가이드](https://navermaps.github.io/maps.js.ncp/docs/tutorial-2-Getting-Started.html)
- [네이버 지도 API 문서](https://navermaps.github.io/maps.js.ncp/docs/)