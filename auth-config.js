// Google OAuth2 설정 파일
// 이 파일을 사용하기 전에 다음 단계를 완료하세요:

/*
Google OAuth2 설정 단계:

1. Google Cloud Console 접속
   - https://console.cloud.google.com/ 접속
   - 새 프로젝트 생성 또는 기존 프로젝트 선택

2. OAuth 2.0 설정
   - "API 및 서비스" > "사용자 인증 정보" 메뉴
   - "+ 사용자 인증 정보 만들기" > "OAuth 2.0 클라이언트 ID"
   - 애플리케이션 유형: "웹 애플리케이션"
   - 승인된 JavaScript 원본: http://localhost:3000
   - 승인된 리디렉션 URI: http://localhost:3000

3. 클라이언트 ID 복사
   - 생성된 클라이언트 ID를 복사
   - script.js의 'YOUR_GOOGLE_CLIENT_ID' 부분에 붙여넣기

4. Google Identity Services API 활성화
   - "API 및 서비스" > "라이브러리"
   - "Google Identity Services API" 검색 후 활성화
*/

// 설정 예시:
const GOOGLE_AUTH_CONFIG = {
    // 실제 클라이언트 ID로 교체하세요
    CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
    
    // 사용할 범위
    SCOPES: 'profile email',
    
    // 로그인 후 리디렉션 URL
    REDIRECT_URI: 'http://localhost:3000'
};

// 주의사항:
// - CLIENT_ID는 공개되어도 안전합니다 (프론트엔드에서 사용)
// - 하지만 승인된 도메인에서만 작동하도록 Google에서 제한됩니다
// - 실제 배포 시에는 도메인을 추가하거나 변경해야 합니다

module.exports = GOOGLE_AUTH_CONFIG;