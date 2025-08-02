# 🚀 뚜기 웹사이트 배포 가이드

이 문서는 뚜기 부산 맛집 가이드를 실제 웹사이트로 배포하는 방법을 설명합니다.

## 📋 배포 전 준비사항

### 1. GitHub 저장소 생성
```bash
# Git 초기화
git init

# 파일 추가
git add .

# 첫 커밋
git commit -m "Initial commit: 뚜기 부산 맛집 가이드"

# GitHub 저장소 연결 (GitHub에서 저장소 생성 후)
git remote add origin https://github.com/YOUR_USERNAME/ddugi-busan-guide.git
git branch -M main
git push -u origin main
```

### 2. 환경 변수 설정
- Claude API 키 준비
- Google OAuth 클라이언트 ID 준비 (선택사항)

## 🌐 Vercel로 배포하기 (추천)

### 1. Vercel 계정 생성
- [vercel.com](https://vercel.com) 접속
- GitHub 계정으로 로그인

### 2. 프로젝트 import
1. "New Project" 클릭
2. GitHub 저장소 선택
3. 프로젝트 설정:
   - **Framework Preset**: Other
   - **Root Directory**: ./
   - **Build Command**: npm run build
   - **Output Directory**: ./
   - **Install Command**: npm install

### 3. 환경 변수 설정
Vercel 대시보드에서:
1. **Settings** → **Environment Variables**
2. 다음 변수들 추가:
   ```
   CLAUDE_API_KEY=your_actual_claude_api_key
   NODE_ENV=production
   ```

### 4. 배포
- **Deploy** 버튼 클릭
- 몇 분 후 배포 완료!

## 🔧 다른 배포 옵션들

### Netlify 배포
```bash
# Netlify CLI 설치
npm install -g netlify-cli

# 로그인
netlify login

# 배포
netlify deploy --prod --dir=.
```

### Railway 배포
1. [railway.app](https://railway.app) 접속
2. GitHub 저장소 연결
3. 환경 변수 설정
4. 자동 배포

### Render 배포
1. [render.com](https://render.com) 접속
2. "New Web Service" 생성
3. GitHub 저장소 연결
4. 설정:
   - **Environment**: Node
   - **Build Command**: npm install
   - **Start Command**: npm start

## 🔐 보안 설정

### 1. API 키 보안
- **절대로** API 키를 코드에 직접 입력하지 마세요
- 환경 변수만 사용하세요
- `.env` 파일은 `.gitignore`에 포함되어 있습니다

### 2. CORS 설정
배포 후 도메인이 확정되면 필요시 CORS 설정을 업데이트하세요.

## 🌍 Google OAuth 설정 (로그인 기능)

배포 완료 후:

### 1. Google Cloud Console 설정 업데이트
1. [console.cloud.google.com](https://console.cloud.google.com) 접속
2. **API 및 서비스** → **사용자 인증 정보**
3. OAuth 2.0 클라이언트 ID 편집
4. **승인된 JavaScript 원본**에 배포 도메인 추가:
   ```
   https://your-app-name.vercel.app
   ```

### 2. 클라이언트 ID 업데이트
`script.js` 파일에서 클라이언트 ID를 실제 값으로 변경:
```javascript
client_id: 'YOUR_ACTUAL_GOOGLE_CLIENT_ID'
```

## 📊 배포 후 확인사항

### ✅ 체크리스트
- [ ] 웹사이트 접속 가능
- [ ] 챗봇 응답 정상 작동
- [ ] 메뉴 기능 작동
- [ ] 모바일 반응형 확인
- [ ] Google 로그인 테스트 (설정 시)

### 🐛 문제 해결
**API 오류 발생 시:**
1. Vercel 대시보드에서 환경 변수 확인
2. 배포 로그 확인
3. Claude API 키 유효성 확인

**로그인 오류 발생 시:**
1. Google Cloud Console 도메인 설정 확인
2. 클라이언트 ID 정확성 확인
3. HTTPS 사용 여부 확인

## 🎉 배포 완료!

배포가 완료되면 다음과 같은 URL로 접속할 수 있습니다:
```
https://your-app-name.vercel.app
```

이제 전 세계 누구나 뚜기의 부산 맛집 추천을 받을 수 있습니다! 🐧🍜

## 📈 추가 기능 (선택사항)

### 커스텀 도메인 연결
Vercel에서 커스텀 도메인을 연결할 수 있습니다:
1. 도메인 구매 (예: ddugi.kr)
2. Vercel 대시보드에서 도메인 추가
3. DNS 설정 업데이트

### 분석 도구 추가
Google Analytics나 Vercel Analytics를 추가하여 사용자 통계를 확인할 수 있습니다.

---

💡 **도움이 필요하시면 GitHub Issues에 문의해주세요!**