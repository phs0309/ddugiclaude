class ConversationAnalyzer {
    // 맛집 관련 키워드 체크
    isRestaurantRequest(message) {
        const lowerMessage = message.toLowerCase();
        
        // 맛집 관련 키워드
        const restaurantKeywords = [
            '맛집', '식당', '음식점', '추천', '소개',
            '먹을', '알려줘', '찾아줘', '어디', '가자',
            '먹고싶어', '먹을까', '어떨까', '가고싶어'
        ];
        
        // 음식 관련 키워드
        const foodKeywords = [
            '돼지국밥', '밀면', '회', '갈비', '치킨', '족발', '곱창',
            '국밥', '면', '파스타', '피자', '초밥', '삼겹살', '냉면',
            '커피', '카페', '디저트', '케이크', '떡볶이', '김밥',
            '점심', '저녁', '아침', '간식', '야식', '브런치'
        ];
        
        // 지역 + 음식 조합
        const areaKeywords = [
            '해운대', '센텀', '서면', '남포동', '광안리', '기장',
            '동래', '부산대', '장전동', '사직', '덕천'
        ];
        
        // 맛집 키워드 직접 포함
        if (restaurantKeywords.some(keyword => lowerMessage.includes(keyword))) {
            return true;
        }
        
        // 음식 키워드 포함
        if (foodKeywords.some(keyword => lowerMessage.includes(keyword))) {
            return true;
        }
        
        // 지역명 + 먹다/맛 조합
        if (areaKeywords.some(keyword => lowerMessage.includes(keyword)) && 
            (lowerMessage.includes('먹') || lowerMessage.includes('맛'))) {
            return true;
        }
        
        return false;
    }

    // 일반 대화 키워드 체크
    isCasualConversation(message) {
        const lowerMessage = message.toLowerCase();
        
        // 인사 키워드
        const greetingKeywords = [
            '안녕', '하이', '반가', '처음', '만나서'
        ];
        
        // 일상 대화 키워드
        const casualKeywords = [
            '어떻게', '뭐해', '뭐하고', '어때', '좋은', '나쁜',
            '기분', '날씨', '오늘', '어제', '내일', '감사', '고마',
            '미안', '죄송', '이름', '나이', '취미', '좋아해'
        ];
        
        // 질문 패턴
        const questionPatterns = [
            '뭐야', '누구야', '어디야', '왜', '언제', '어떻게'
        ];
        
        return greetingKeywords.some(keyword => lowerMessage.includes(keyword)) ||
               casualKeywords.some(keyword => lowerMessage.includes(keyword)) ||
               questionPatterns.some(pattern => lowerMessage.includes(pattern));
    }

    // 메시지 분석
    analyzeMessage(message) {
        const isRestaurant = this.isRestaurantRequest(message);
        const isCasual = this.isCasualConversation(message);
        
        return {
            type: isRestaurant ? 'restaurant' : 'casual',
            isRestaurantRequest: isRestaurant,
            isCasualConversation: isCasual,
            confidence: isRestaurant ? 0.9 : (isCasual ? 0.8 : 0.5)
        };
    }

    // Claude AI 프롬프트 생성 (맛집 추천용)
    generateRestaurantPrompt(message, restaurants) {
        const restaurantInfo = restaurants.slice(0, 6).map((r, idx) => 
            `${idx + 1}. ${r.name} (${r.area})\n   📍 ${r.address}\n   ⭐ ${r.rating}/5 (${r.reviewCount}개 리뷰)\n   🍽️ ${r.description}`
        ).join('\n\n');

        return `너는 뚜기야, 부산 현지인이고 맛집 전문가야. 부산 사투리를 조금 써서 친근하게 대답해줘.

사용자 요청: "${message}"

실제 부산 맛집 데이터:
${restaurantInfo}

위 맛집들을 바탕으로 2-3문장 정도로 간단하고 친근하게 추천해줘.
맛집 카드는 따로 보여주니까 구체적인 이름이나 주소는 반복하지 말고, 전체적인 소개만 해줘.
부산 사투리 ("~다이가", "~아이가", "~해봐라")를 자연스럽게 써서 친근하게 말해줘.`;
    }

    // Claude AI 프롬프트 생성 (일반 대화용)
    generateCasualPrompt(message) {
        return `너는 뚜기야, 부산 현지인이야. 부산 사투리를 조금 써서 친근하게 대화해줘.

사용자: "${message}"

부산 사투리 ("~다이가", "~아이가", "~해봐라")를 자연스럽게 써서 1-2문장으로 간단하게 대답해줘.
맛집과 관련 없는 일반 대화이니까 자연스럽게 응답해줘.`;
    }
}

module.exports = ConversationAnalyzer;