const Anthropic = require('@anthropic-ai/sdk').default;
const fs = require('fs');
const path = require('path');

module.exports = async function handler(req, res) {
    console.log('🗺️ [generate-itinerary] Request received:', req.method);
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
    
    try {
        const { startDate, endDate, userId } = req.body;
        
        if (!startDate || !endDate) {
            return res.status(400).json({ 
                success: false, 
                error: '여행 날짜를 모두 입력해주세요.' 
            });
        }
        
        // 날짜 유효성 검사
        const start = new Date(startDate);
        const end = new Date(endDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (start < today) {
            return res.status(400).json({
                success: false,
                error: '여행 시작일은 오늘 이후로 선택해주세요.'
            });
        }
        
        if (end <= start) {
            return res.status(400).json({
                success: false,
                error: '도착일은 출발일 이후로 선택해주세요.'
            });
        }
        
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        
        console.log(`📅 [generate-itinerary] Travel period: ${days} days (${startDate} ~ ${endDate})`);
        
        // restaurants.json에서 부산 맛집 데이터 로드
        let allRestaurants = [];
        try {
            const restaurantsPath = path.join(process.cwd(), 'restaurants.json');
            console.log('📁 [generate-itinerary] Loading restaurants from:', restaurantsPath);
            
            if (!fs.existsSync(restaurantsPath)) {
                throw new Error('restaurants.json 파일을 찾을 수 없습니다');
            }
            
            const restaurantsData = JSON.parse(fs.readFileSync(restaurantsPath, 'utf8'));
            allRestaurants = restaurantsData.restaurants || restaurantsData;
            
            if (!Array.isArray(allRestaurants)) {
                throw new Error('맛집 데이터 형식이 올바르지 않습니다');
            }
        } catch (fileError) {
            console.error('❌ [generate-itinerary] File loading error:', fileError.message);
            return res.status(500).json({
                success: false,
                error: '맛집 데이터를 로드할 수 없습니다.'
            });
        }
        
        console.log('🍽️ [generate-itinerary] Total restaurants available:', allRestaurants.length);
        
        // 저장된 맛집 데이터 가져오기
        let savedRestaurants = [];
        let savedRestaurantIds = [];
        
        if (userId) {
            try {
                console.log('👤 [generate-itinerary] User ID provided:', userId);
                
                // user-restaurants API 호출하여 저장된 맛집 ID들 가져오기
                const userRestaurantsModule = require('./user-restaurants.js');
                
                // 모의 request 객체 생성
                const mockReq = {
                    method: 'GET',
                    headers: {
                        authorization: `Bearer ${Buffer.from(JSON.stringify({ email: userId, name: '사용자' })).toString('base64')}`
                    }
                };
                
                // 모의 response 객체 생성
                let savedData = null;
                const mockRes = {
                    setHeader: () => {},
                    status: (code) => ({
                        json: (data) => { savedData = data; return { end: () => {} }; },
                        end: () => {}
                    })
                };
                
                // user-restaurants API 호출
                await userRestaurantsModule(mockReq, mockRes);
                
                if (savedData && savedData.success && savedData.restaurantIds) {
                    savedRestaurantIds = savedData.restaurantIds;
                    console.log('📋 [generate-itinerary] Found saved restaurant IDs:', savedRestaurantIds.length);
                    
                    // 저장된 ID들에 해당하는 맛집 정보 찾기
                    savedRestaurants = allRestaurants.filter(restaurant => 
                        savedRestaurantIds.includes(restaurant.id) || 
                        savedRestaurantIds.includes(String(restaurant.id))
                    );
                    
                    console.log('🍽️ [generate-itinerary] Found saved restaurants:', savedRestaurants.length);
                } else {
                    console.log('📋 [generate-itinerary] No saved restaurants found or user not logged in');
                }
            } catch (error) {
                console.warn('⚠️ [generate-itinerary] Could not fetch saved restaurants:', error.message);
            }
        } else {
            console.log('👤 [generate-itinerary] No user ID provided - guest user');
        }
        
        // Claude API 키 확인
        const apiKey = process.env.claude_api_key || process.env.CLAUDE_API_KEY;
        if (!apiKey) {
            console.error('❌ [generate-itinerary] Claude API key not found');
            console.error('Available env vars:', Object.keys(process.env).filter(k => k.toLowerCase().includes('claude')));
            return res.status(500).json({
                success: false,
                error: '서비스 설정 오류가 발생했습니다.'
            });
        }
        
        console.log('✅ [generate-itinerary] Claude API key found');
        
        // Claude AI로 여행계획서 생성
        console.log('🤖 [generate-itinerary] Calling Claude API...');
        
        let anthropic;
        try {
            anthropic = new Anthropic({
                apiKey: apiKey
            });
        } catch (initError) {
            console.error('❌ [generate-itinerary] Anthropic initialization error:', initError.message);
            return res.status(500).json({
                success: false,
                error: 'AI 서비스 초기화에 실패했습니다.'
            });
        }
        
        // 저장된 맛집과 추천 맛집 조합
        let restaurantsForPrompt = [];
        
        // 1. 저장된 맛집 우선 포함 (최대 20개)
        const savedForPrompt = savedRestaurants.slice(0, 20).map(r => ({
            name: r.name || '이름 없음',
            area: r.area || '지역 불명',
            category: r.category || '기타',
            description: r.description || '',
            address: r.address || '',
            rating: r.rating || '',
            isSaved: true
        }));
        restaurantsForPrompt = [...savedForPrompt];
        
        console.log('⭐ [generate-itinerary] Saved restaurants for prompt:', savedForPrompt.length);
        
        // 2. 추가로 랜덤 맛집 포함 (총 50개까지)
        const remainingSlots = 50 - restaurantsForPrompt.length;
        if (remainingSlots > 0) {
            const additionalRestaurants = allRestaurants
                .filter(r => !savedRestaurantIds.includes(r.id) && !savedRestaurantIds.includes(String(r.id)))
                .sort(() => Math.random() - 0.5)
                .slice(0, remainingSlots)
                .map(r => ({
                    name: r.name || '이름 없음',
                    area: r.area || '지역 불명',
                    category: r.category || '기타',
                    description: r.description || '',
                    address: r.address || '',
                    rating: r.rating || '',
                    isSaved: false
                }));
            restaurantsForPrompt = [...restaurantsForPrompt, ...additionalRestaurants];
        }
        
        console.log('🔄 [generate-itinerary] Total restaurants for prompt:', restaurantsForPrompt.length);
        
        let message;
        try {
            message = await anthropic.messages.create({
            model: 'claude-3-5-haiku-20241022',
            max_tokens: 4000,
            system: `당신은 부산 여행 전문가입니다. 사용자가 제공한 여행 기간에 맞춰 완벽한 부산 여행계획서를 HTML로 작성해주세요.

반드시 다음 규칙을 따라주세요:
1. 완전한 HTML 문서로 작성 (<!DOCTYPE html>부터 </html>까지)
2. 반응형 디자인 적용 (모바일 친화적)
3. 아름다운 디자인과 색상 조합 사용
4. 일정을 날짜별로 명확히 구분
5. 각 날짜마다 오전/오후/저녁으로 세분화
6. 실제 부산 맛집과 관광지 정보만 사용
7. 맛집은 제공된 데이터에서 선택
8. 숙소는 부산의 실제 숙소 추천 (호텔, 게스트하우스 등)
9. 이동 동선과 시간을 고려한 현실적인 일정
10. 부산 사투리로 친근한 설명 추가
11. 인라인 CSS 스타일 사용
12. 이모지를 활용한 시각적 표현

주의사항:
- 절대 가짜 정보를 생성하지 마세요
- 제공된 맛집 데이터에서만 선택하세요
- 실제 부산 지역의 이동 시간을 고려하세요
- 각 날짜별로 현실적인 일정을 구성하세요`,
            messages: [{
                role: 'user',
                content: `${days}일 부산 여행계획서를 만들어주세요.

여행 기간: ${startDate} ~ ${endDate} (${days}일)

${savedForPrompt.length > 0 ? `⭐ 사용자가 저장한 맛집 (우선 포함해주세요):
${savedForPrompt.map(r => 
    `★ ${r.name} (${r.area}, ${r.category}): ${r.description}`
).join('\n')}

` : ''}사용 가능한 부산 맛집 정보:
${restaurantsForPrompt.map(r => 
    `${r.isSaved ? '★' : '-'} ${r.name} (${r.area}, ${r.category}): ${r.description}`
).join('\n')}

요청사항:
1. 각 날짜별로 오전/오후/저녁 일정 구성
2. ${savedForPrompt.length > 0 ? '★표시된 저장된 맛집들을 최대한 우선적으로 포함해주세요' : '위의 목록에서만 맛집을 선택해주세요'}
3. 부산 대표 관광지 포함 (해운대, 감천문화마을, 자갈치시장 등)
4. 현실적인 이동 동선 고려
5. 숙소는 실제 부산 호텔/게스트하우스 추천
6. 부산 사투리로 친근하게 작성
${savedForPrompt.length > 0 ? '7. 저장된 맛집들(★표시)을 여행 일정에 최우선으로 배치해주세요' : ''}`
            }],
            temperature: 0.8
        });
        
        if (!message || !message.content || !message.content[0] || !message.content[0].text) {
            throw new Error('Claude API에서 올바른 응답을 받지 못했습니다');
        }
        
        } catch (apiError) {
            console.error('❌ [generate-itinerary] Claude API error:', apiError.message);
            return res.status(500).json({
                success: false,
                error: 'AI 여행계획서 생성에 실패했습니다.',
                details: apiError.message
            });
        }
        
        const htmlContent = message.content[0].text;
        console.log('📄 [generate-itinerary] Raw Claude response length:', htmlContent.length);
        
        // HTML만 추출
        const htmlMatch = htmlContent.match(/<!DOCTYPE html>[\s\S]*<\/html>/i);
        const finalHtml = htmlMatch ? htmlMatch[0] : htmlContent;
        
        console.log('✅ [generate-itinerary] Itinerary generated successfully');
        console.log('📏 [generate-itinerary] Final HTML length:', finalHtml.length);
        
        return res.status(200).json({
            success: true,
            html: finalHtml,
            message: '여행계획서가 생성되었습니다!',
            debug: {
                days,
                savedRestaurants: savedRestaurants.length,
                totalRestaurantsForPrompt: restaurantsForPrompt.length,
                totalRestaurants: allRestaurants.length,
                htmlLength: finalHtml.length,
                userId: userId || 'guest'
            }
        });
        
    } catch (error) {
        console.error('❌ [generate-itinerary] Error:', error);
        return res.status(500).json({
            success: false,
            error: '여행계획서 생성 중 오류가 발생했습니다.',
            details: error.message
        });
    }
}