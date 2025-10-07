import visitBusanService from './visitBusanService.js';
import AIConversationManager from './aiConversationManager.js';

// Rate limiting
const requestCounts = new Map();
const RATE_LIMIT = 10;
const WINDOW_MS = 60 * 1000;

// AI 대화 관리자 초기화
const aiManager = new AIConversationManager();

function checkRateLimit(ip) {
    const now = Date.now();
    const windowStart = now - WINDOW_MS;
    
    if (!requestCounts.has(ip)) {
        requestCounts.set(ip, []);
    }
    
    const requests = requestCounts.get(ip);
    const recentRequests = requests.filter(time => time > windowStart);
    
    if (recentRequests.length >= RATE_LIMIT) {
        return false;
    }
    
    recentRequests.push(now);
    requestCounts.set(ip, recentRequests);
    return true;
}

export default async function handler(req, res) {
    // CORS 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Rate limiting
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    if (!checkRateLimit(clientIP)) {
        return res.status(429).json({ 
            error: '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.',
            retryAfter: 60
        });
    }

    const { message, sessionId = 'anonymous_' + Date.now() } = req.body || {};

    if (!message) {
        return res.status(400).json({ error: '메시지가 필요합니다.' });
    }

    // 메모리 정리 (확률적으로)
    if (Math.random() < 0.1) {
        aiManager.cleanupMemory();
    }

    console.log(`💬 새로운 메시지: "${message}" (세션: ${sessionId})`);

    try {
        // 1단계: AI가 먼저 대화를 처리하고 맛집 데이터가 필요한지 판단
        let initialResponse = await aiManager.handleConversation(message, sessionId, []);
        
        console.log('🤖 AI 1차 응답:', {
            conversationType: initialResponse.conversationType,
            needsRestaurantData: initialResponse.needsRestaurantData,
            searchQuery: initialResponse.searchQuery
        });

        // 2단계: AI가 맛집 데이터를 요청했다면 검색해서 다시 처리
        if (initialResponse.needsRestaurantData && initialResponse.searchQuery) {
            console.log('🔍 맛집 검색 시작:', initialResponse.searchQuery);
            
            // 검색 조건에 맞는 맛집 데이터 가져오기
            const restaurantData = findRestaurantsForAI(initialResponse.searchQuery);
            console.log(`📍 찾은 맛집 수: ${restaurantData.length}개`);
            
            // 맛집 데이터와 함께 AI가 최종 응답 생성
            const finalResponse = await aiManager.handleConversation(
                message, 
                sessionId + '_final', // 별도 세션으로 처리
                restaurantData
            );
            
            return res.status(200).json({
                response: finalResponse.response,
                restaurants: finalResponse.restaurants || restaurantData.slice(0, 6),
                conversationType: finalResponse.conversationType,
                currentTime: finalResponse.currentTime,
                success: true,
                source: 'ai_with_restaurant_data'
            });
        }

        // 3단계: 일반 대화인 경우 그대로 반환
        return res.status(200).json({
            response: initialResponse.response,
            restaurants: [],
            conversationType: initialResponse.conversationType,
            currentTime: initialResponse.currentTime,
            success: true,
            source: 'ai_conversation'
        });

    } catch (error) {
        console.error('AI 대화 처리 오류:', error);
        
        return res.status(200).json({
            response: `마! 미안하다... 😅\n\n잠깐 머리가 하얘졌네. 다시 말해봐라!`,
            restaurants: [],
            conversationType: 'error',
            success: true,
            source: 'error_fallback'
        });
    }
}

// AI 검색 쿼리를 실제 맛집 검색으로 변환
function findRestaurantsForAI(searchQuery) {
    try {
        // visitBusanService를 사용해서 맛집 검색
        const criteria = {
            timeHour: new Date().getHours()
        };
        
        if (searchQuery.area) {
            criteria.area = searchQuery.area;
        }
        
        if (searchQuery.category) {
            criteria.category = searchQuery.category;
        }
        
        if (searchQuery.keyword) {
            criteria.keyword = searchQuery.keyword;
        }
        
        // 기본적으로 평점 있는 맛집만
        criteria.minRating = 3.5;
        
        console.log('🔍 실제 검색 조건:', criteria);
        
        const results = visitBusanService.findRestaurants(criteria);
        return results.slice(0, 20); // 최대 20개
        
    } catch (error) {
        console.error('맛집 검색 오류:', error);
        return [];
    }
}