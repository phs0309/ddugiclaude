import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
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
        
        // 저장된 맛집 데이터 가져오기
        let savedRestaurants = [];
        if (userId) {
            try {
                // 실제 환경에서는 데이터베이스에서 가져와야 함
                // 여기서는 임시로 빈 배열 사용
                console.log('👤 [generate-itinerary] User ID provided:', userId);
            } catch (error) {
                console.warn('⚠️ [generate-itinerary] Could not fetch saved restaurants:', error.message);
            }
        }
        
        // restaurants.json에서 부산 맛집 데이터 로드
        const restaurantsPath = path.join(process.cwd(), 'restaurants.json');
        const restaurantsData = JSON.parse(fs.readFileSync(restaurantsPath, 'utf8'));
        const allRestaurants = restaurantsData.restaurants || restaurantsData;
        
        console.log('🍽️ [generate-itinerary] Total restaurants available:', allRestaurants.length);
        
        // Claude API 키 확인
        if (!process.env.claude_api_key) {
            console.error('❌ [generate-itinerary] Claude API key not found');
            return res.status(500).json({
                success: false,
                error: '서비스 설정 오류가 발생했습니다.'
            });
        }
        
        // Claude AI로 여행계획서 생성
        console.log('🤖 [generate-itinerary] Calling Claude API...');
        const anthropic = new Anthropic({
            apiKey: process.env.claude_api_key
        });
        
        // 맛집 데이터를 샘플링 (너무 많으면 API 제한에 걸림)
        const sampleRestaurants = allRestaurants
            .sort(() => Math.random() - 0.5)
            .slice(0, 50)
            .map(r => ({
                name: r.name,
                area: r.area,
                category: r.category,
                description: r.description || '',
                address: r.address || '',
                rating: r.rating || ''
            }));
        
        const message = await anthropic.messages.create({
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

사용 가능한 부산 맛집 정보:
${sampleRestaurants.map(r => 
    `- ${r.name} (${r.area}, ${r.category}): ${r.description}`
).join('\n')}

요청사항:
1. 각 날짜별로 오전/오후/저녁 일정 구성
2. 맛집은 위의 목록에서만 선택
3. 부산 대표 관광지 포함 (해운대, 감천문화마을, 자갈치시장 등)
4. 현실적인 이동 동선 고려
5. 숙소는 실제 부산 호텔/게스트하우스 추천
6. 부산 사투리로 친근하게 작성`
            }],
            temperature: 0.8
        });
        
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
                sampledRestaurants: sampleRestaurants.length,
                totalRestaurants: allRestaurants.length,
                htmlLength: finalHtml.length
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