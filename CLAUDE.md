# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

부산 맛집 추천 AI - JSON 데이터 기반 Claude AI 맛집 추천 시스템
- `restaurants.json` 파일의 실제 맛집 데이터만 사용
- Claude API 연동으로 자연스러운 부산 사투리 응답
- Vercel 서버리스 배포 환경

## Commands

### Local Development
- `npm start` - Start local Express server on port 3000
- `npm run dev` - Start development server with nodemon

### Deployment
- Vercel 배포용 serverless function: `api/chat.js`
- 환경변수: `claude_api_key` (기존 Vercel 설정에 맞춤)

## Architecture

### Data Source
- **restaurants.json**: 10개 부산 맛집 데이터 (절대 변경 금지)
- 해운대 돼지국밥, 광안리 회센터, 서면 밀면골목 등 실제 맛집만 포함

### AI Engine
- **RestaurantAI Class**: JSON 데이터 기반 검색 및 필터링
- **Claude API Integration**: 부산 사투리 자연어 응답 생성
- **Fallback System**: API 실패 시 기본 응답 제공

### Deployment Structure
- **Local**: `server.js` - Express 서버
- **Production**: `api/chat.js` - Vercel serverless function
- **Frontend**: `public/` - 정적 파일들

## Key Features

### Smart Filtering
- 지역별: 해운대, 서면, 광안리, 남포동 등
- 카테고리별: 한식, 해산물, 간식, 카페
- 음식별: 돼지국밥, 밀면, 회, 아구찜 등
- 가격대: 저렴/고급 필터링
- 평점: 4.0 이상 고평점 맛집

### Claude AI Response
- 부산 사투리 응답 ("~다이가", "~아이가", "~해봐라")
- 자연스러운 맛집 소개
- 실제 데이터 기반 정확한 정보

## Critical Rules

⚠️ **절대 절대 절대 가짜 맛집 데이터 생성 금지!!!**
- **NEVER EVER generate fake restaurant data**
- **NO fallback data generation - 폴백 데이터 생성 절대 금지**
- **NO mock data - 모의 데이터 생성 절대 금지**
- **NO invented names or addresses - 임의로 만든 이름이나 주소 절대 금지**
- Only use restaurants from actual web scraping or existing JSON files
- Return empty results rather than inventing restaurants
- All information must be from actual data sources
- 웹 스크래핑이 실패하면 빈 배열 반환할 것
- 데이터가 없으면 "데이터 없음"이라고 정직하게 말할 것

⚠️ **Environment Variables**
- Use `claude_api_key` (not CLAUDE_API_KEY)
- Matches existing Vercel configuration

## File Structure

```
/
├── restaurants.json          # 맛집 데이터 (10개)
├── restaurantAI.js          # AI 엔진 (로컬용)
├── server.js                # 로컬 Express 서버
├── api/
│   └── chat.js             # Vercel 서버리스 함수
├── public/
│   ├── index.html          # 메인 페이지
│   ├── style.css           # 스타일
│   └── script.js           # 프론트엔드 로직
└── vercel.json             # Vercel 배포 설정
```