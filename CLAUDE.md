# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

부산 맛집 추천 AI - JSON 데이터 기반 Claude AI 맛집 추천 시스템
- `restaurants.json` 파일의 실제 맛집 데이터만 사용
- Claude API 연동으로 자연스러운 부산 사투리 응답
- Vercel 서버리스 배포 환경

## Environment

**🚨 CRITICAL: ALL WORK MUST TARGET VERCEL PRODUCTION ENVIRONMENT 🚨**

This project operates exclusively in Vercel serverless environment:
- **NO LOCAL DEVELOPMENT**: All testing and development work should be done against Vercel deployment
- **NO LOCAL SERVERS**: Do not run `npm start` or local Express servers
- **VERCEL-ONLY TESTING**: Use deployed Vercel functions for all API testing
- **PRODUCTION-FIRST**: All changes should be committed and pushed to trigger Vercel deployment

### Deployment Environment
- **Platform**: Vercel serverless functions
- **Region**: Seoul (icn1) for optimal latency
- **Functions**: All APIs in `api/` directory are serverless functions
- **Environment Variables**: 
  - `claude_api_key`: Claude AI API key
  - `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL  
  - `SUPABASE_SERVICE_ROLE_KEY`: Supabase service key

## Architecture

### Core Data Layer
- **restaurants.json**: 437개 부산 맛집 데이터 (실제 크롤링된 데이터)
- **R_data/**: 원시 데이터 파일들 (노포, 모범음식점, 비짓부산 등 CSV)
- **Supabase**: 사용자 계정, 저장된 맛집 데이터베이스

### Authentication & User Management
- **Google OAuth**: `api/basic-auth.js`를 통한 Google 로그인
- **Guest Mode**: 임시 사용자 기능
- **JWT Tokens**: Base64 인코딩된 사용자 정보
- **ApiClient**: `public/api-client.js`에서 인증 상태 관리

### Restaurant Management
- **User Saved Restaurants**: `api/user-restaurants.js` - Supabase users.saved_restaurant_ids 컬럼 기반
- **Column-based Storage**: 별도 테이블 대신 users 테이블의 TEXT[] 컬럼 사용
- **NO localStorage**: 모든 저장은 서버 데이터베이스만 사용

### AI & Search Engine
- **RestaurantAI Class**: JSON 데이터 기반 검색 및 필터링
- **Claude API Integration**: 부산 사투리 자연어 응답 생성
- **Smart Agents**: `agents/` 폴더의 특화된 추천 에이전트들

### Frontend Pages
- **index.html**: 메인 맛집 추천 페이지
- **saved.html**: 저장된 맛집 관리
- **login.html**: 로그인 페이지
- **admin.html**: 관리자 도구
- **settings.html**: 사용자 설정

### Production Structure  
- **Production Only**: Vercel serverless functions in `api/`
- **Database**: Supabase PostgreSQL (Seoul region)
- **Frontend**: Static files served from `public/`

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

## Context Engineering Guidelines

### Always Update CLAUDE.md
- **CRITICAL**: Before starting any task, read this CLAUDE.md file
- **REQUIRED**: Update this file whenever you make architectural changes
- **MANDATORY**: Document new patterns, APIs, or significant code changes here

### Development Patterns
- **API Response Format**: Always use `{success: boolean, data/error: any, message: string}`
- **Error Handling**: Comprehensive try-catch with user-friendly messages
- **Authentication**: Check `apiClient.isLoggedIn()` before protected operations
- **Data Validation**: Validate all inputs, especially restaurant data

### Code Quality Standards
- **No localStorage for User Data**: All user data must be stored in Supabase
- **Consistent Logging**: Use structured console.log with emojis for visual clarity
- **API Format Consistency**: New APIs must return `restaurantIds` arrays, not full objects
- **Database Schema**: Use column-based storage (users.saved_restaurant_ids) over separate tables

### Common Debugging Patterns
- **Supabase Errors**: Check replica identity settings: `ALTER TABLE users REPLICA IDENTITY FULL;`
- **API Format Mismatches**: Ensure frontend expects `restaurantIds` not `restaurants`  
- **Vercel Deployment**: All testing must be done against live Vercel endpoints
- **Authentication Issues**: Verify Base64 token parsing in API endpoints

### Work Progress Tracking
- **Use TodoWrite Tool**: Always use todo list for multi-step tasks
- **Mark Tasks Complete**: Update todos immediately after completion
- **Document Blockers**: Add new todos for discovered issues

## File Structure

```
/
├── restaurants.json          # 437개 맛집 데이터 (크롤링된 실제 데이터)  
├── R_data/                  # 원시 데이터 CSV 파일들
├── agents/                  # AI 추천 에이전트들
├── api/ (PRODUCTION SERVERLESS FUNCTIONS)
│   ├── chat.js             # Claude AI 챗봇 (Vercel Function)
│   ├── basic-auth.js       # Google OAuth 인증 (Vercel Function)
│   ├── user-restaurants.js # 저장된 맛집 관리 (Vercel Function + Supabase)
│   └── [other APIs]        # 기타 Vercel 서버리스 함수들
├── public/ (STATIC FRONTEND)
│   ├── index.html          # 메인 맛집 추천 페이지
│   ├── saved.html          # 저장된 맛집 페이지
│   ├── login.html          # 로그인 페이지
│   ├── api-client.js       # 프론트엔드 API 클라이언트
│   ├── script.js           # 메인 프론트엔드 로직
│   └── style.css           # 스타일시트
├── vercel.json             # Vercel 배포 설정 (Seoul region)
├── server.js               # DEPRECATED - Not used in production
└── restaurantAI.js         # DEPRECATED - Functionality moved to api/chat.js
```