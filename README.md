# 🐧 뚜기 - 부산 맛집 가이드 챗봇

부산의 로컬 맛집을 소개해주는 AI 챗봇 웹사이트입니다.

## 🌟 기능
- 🐧 뚜기와의 한국어 채팅
- 🍜 부산 지역 맛집 추천
- 📍 구체적인 주소와 메뉴 정보 제공
- 💬 친근한 부산 사투리 사용
- 🔐 Google 로그인 지원
- 📱 모바일 최적화

## 🚀 배포된 사이트
- **라이브 데모**: [Vercel에서 확인하세요](https://ddugiclaude.vercel.app)

## ⚡ 빠른 시작
1. 위 링크 클릭
2. 뚜기에게 부산 맛집 질문하기
3. 예시: "해운대 근처 맛집 추천해줘", "돼지국밥 맛있는 곳 어디야?"

## 🛠 로컬 개발

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정 (선택사항)
```bash
# .env 파일 생성
CLAUDE_API_KEY=your_claude_api_key_here
```

### 3. 개발 서버 실행
```bash
npm run dev
```

### 4. 웹사이트 접속
- 브라우저에서 `http://localhost:3000` 접속

## 📁 프로젝트 구조
```
ddugi_2/
├── public/           # 정적 파일
│   ├── index.html   # 메인 HTML 페이지
│   ├── style.css    # 스타일링
│   └── script.js    # 프론트엔드 로직
├── api/             # Vercel 서버리스 함수
│   ├── chat.js      # 메인 챗봇 API
│   ├── test.js      # API 테스트
│   └── restaurantData.js # 맛집 데이터
├── vercel.json      # Vercel 배포 설정
└── package.json     # 프로젝트 설정
```

## 🎯 주요 특징
- **서버리스 아키텍처**: Vercel Functions 사용
- **Fallback 시스템**: API 키 없어도 기본 응답 제공
- **실시간 맛집 검색**: 키워드 기반 맛집 필터링
- **모바일 친화적**: 반응형 디자인

## 🔧 기술 스택
- **Frontend**: Vanilla JavaScript, CSS3, HTML5
- **Backend**: Vercel Serverless Functions
- **AI**: Claude 3.5 Sonnet API
- **Authentication**: Google OAuth2
- **Deployment**: Vercel

## 📝 API 엔드포인트
- `GET /` - 메인 페이지
- `POST /api/chat` - 챗봇 대화
- `GET /api/test` - API 연결 테스트

## 🤝 기여하기
1. Fork this repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 라이선스
MIT License

---
**Made with ❤️ for Busan food lovers! 🍜**
