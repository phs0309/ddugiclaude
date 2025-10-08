# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## 프로젝트 개요

부산 맛집 추천 챗봇 "뚜기"
- `R_data/비짓부산_cleaned_reviews.csv` 데이터만 사용
- Claude API를 통한 자연스러운 대화
- 실제 존재하는 부산 맛집만 추천

## 명령어

- `npm start` - 서버 시작
- `npm run dev` - 개발 서버 (nodemon)

## 중요 사항

⚠️ **절대 가짜 맛집 정보를 생성하지 마라**
- 오직 `비짓부산_cleaned_reviews.csv` 데이터만 사용
- 데이터에 없는 맛집은 절대 추천하지 않음
- 실제 주소, 평점, 리뷰만 제공

## 파일 구조

```
/
├── .env                     # API 키 (보존됨)
├── R_data/                  # 맛집 데이터 (보존됨)
│   └── 비짓부산_cleaned_reviews.csv
├── package.json
├── vercel.json
├── index.html              # 메인 페이지
├── server.js               # 로컬 개발 서버
├── public/                 # 정적 파일
│   ├── index.html
│   ├── style.css
│   └── script.js
└── api/                    # Vercel 서버리스 함수
    └── chat.js
```

## 개발 원칙

1. **단순함 유지** - 복잡한 AI 대화 관리 시스템 금지
2. **데이터 신뢰성** - 실제 데이터만 사용
3. **빠른 응답** - 키워드 기반 빠른 매칭
4. **Vercel 호환** - 서버리스 환경 고려