# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Development:**
- `npm install` - Install dependencies
- `npm start` - Start production server on port 3000
- `npm run dev` - Start development server with auto-restart (nodemon)
- `npm run build` - Build command (currently echo placeholder)

**Server Management:**
- Server runs on `http://localhost:3000`
- Stop server with `Ctrl + C`

## Architecture Overview

This is a Korean chatbot web application ("뚜기") that recommends Busan restaurants using Claude AI. The project supports both local Express.js development and Vercel serverless deployment.

**Dual Architecture:**
1. **Local Development**: Express.js server (`server.js`) for local testing
2. **Production Deployment**: Vercel serverless functions (`/api/`) for cloud deployment

**Frontend (Vanilla JS/HTML/CSS):**
- `index.html` / `public/index.html` - Chat interface with Korean UI  
- `style.css` / `public/style.css` - Modern chat styling with gradients and animations
- `script.js` / `public/script.js` - Chat functionality, sends requests to `/api/chat`

**Backend (Dual Structure):**
- `server.js` - Express.js server for local development
- `api/chat.js` - Vercel serverless function (production endpoint)
- `restaurantService.js` / `api/restaurantService.js` - Restaurant search and filtering logic
- `restaurantData.js` / `api/restaurantData.js` - Static database of 20 Busan restaurants

**Key Backend Flow:**
1. User message → `restaurantService.analyzeUserQuery()` extracts search criteria (area, category, keywords, price)
2. `restaurantService.findRestaurants()` filters restaurant database based on criteria
3. Filtered restaurants are formatted and passed to Claude AI as context
4. Claude AI responds as "뚜기" character using only provided restaurant data
5. Response includes both AI text and structured restaurant data

**Restaurant Data Structure:**
Each restaurant has: `id`, `name`, `address`, `description`, `priceRange`, `category`, `area`, `specialties[]`

**Search Capabilities:**
- Area-based (해운대, 서면, 남포동, etc.)
- Category-based (한식, 해산물, 분식, etc.)  
- Keyword-based (돼지국밥, 밀면, 회, etc.)
- Price-based (저렴/가성비 → ≤15,000원)

**Claude API Integration:**
- Model: `claude-3-5-sonnet-20241022`
- API key stored in `server.js` (line 17)
- Character: Friendly Busan restaurant guide named "뚜기"
- Responses limited to provided restaurant data only

**Deployment Configuration:**
- `vercel.json` - Vercel deployment settings with 30s timeout for chat API
- Environment variable `CLAUDE_API_KEY` required for Claude AI integration
- Rate limiting implemented in serverless function (10 requests/minute per IP)

**Critical Notes:**
- API key must be configured via `CLAUDE_API_KEY` environment variable
- Fallback responses provided when API key not available  
- All restaurant recommendations limited to 20 entries in `restaurantData.js`
- Claude AI responds as "뚜기" character using Busan dialect
- Korean language interface and responses throughout
- Duplicate file structure supports both local development and Vercel deployment

**Live Demo:**
- Production URL: https://ddugiclaude.vercel.app