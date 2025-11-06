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
   - 서비스 환경 등록:
     - 로컬 테스트: `http://localhost:3000`
     - Vercel 배포: `https://ddugiclaude.vercel.app`
     - Vercel Preview: `https://ddugiclaude-*.vercel.app`

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

### "Authentication Failed" 오류
1. Client ID가 올바른지 확인
2. 도메인이 Application에 등록되었는지 확인
3. Vercel 환경변수가 제대로 설정되었는지 확인

### 참고 링크
- [공지사항](https://www.ncloud.com/support/notice/all/1930)
- [마이그레이션 가이드](https://navermaps.github.io/maps.js.ncp/docs/tutorial-2-Getting-Started.html)
- [네이버 지도 API 문서](https://navermaps.github.io/maps.js.ncp/docs/)