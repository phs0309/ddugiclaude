# 뚜기 - 부산 맛집 가이드 챗봇

부산의 로컬 맛집을 소개해주는 AI 챗봇 웹사이트입니다.

## 기능
- 🐧 뚜기와의 한국어 채팅
- 🍜 부산 지역 맛집 추천
- 📍 구체적인 주소와 메뉴 정보 제공
- 💬 친근한 부산 사투리 사용

## 설정 방법

1. **의존성 설치**
   ```bash
   npm install
   ```

2. **Claude API 키 설정**
   - [Anthropic Console](https://console.anthropic.com/)에서 계정 생성
   - API 키 발급 받기
   - `server.js` 파일에서 `CLAUDE_API_KEY` 값을 실제 API 키로 교체

3. **서버 실행**
   ```bash
   npm start
   ```

4. **웹사이트 접속**
   - 브라우저에서 `http://localhost:3000` 접속
   - 뚜기와 대화 시작!

## 파일 구조
```
ddugi_2/
├── index.html      # 메인 HTML 페이지
├── style.css       # 스타일링
├── script.js       # 챗봇 기능
├── config.js       # API 설정
└── README.md       # 이 파일
```

## 사용법
1. 웹페이지에서 뚜기에게 부산 맛집에 대해 질문하세요
2. 예시: "해운대 근처 맛집 추천해줘", "돼지국밥 맛있는 곳 어디야?"
3. 뚜기가 구체적인 맛집 정보를 제공합니다

## 주의사항
- API 키를 안전하게 보관하세요
- 공개 저장소에 API 키를 올리지 마세요
- API 사용량에 따라 요금이 발생할 수 있습니다