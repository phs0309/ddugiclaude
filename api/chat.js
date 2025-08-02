export default function handler(req, res) {
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

    const { message } = req.body || {};

    if (!message) {
        return res.status(400).json({ error: '메시지가 필요합니다.' });
    }

    // 간단한 응답 생성
    const response = generateSimpleResponse(message);

    return res.status(200).json({
        response: response,
        success: true
    });
}

function generateSimpleResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    // 키워드별 간단한 응답
    if (lowerMessage.includes('돼지국밥')) {
        return `안녕하세요! 뚜기입니다 🐧

돼지국밥 맛집을 찾아드렸어요!

🍜 **서면 돼지국밥 골목**
📍 부산 부산진구 부전동 212-6
💰 8,000-12,000원
✨ 부산의 대표 음식 돼지국밥의 본고장, 진한 국물과 수육이 일품

부산에 오시면 꼭 한번 가보세요! 😋`;
    }
    
    if (lowerMessage.includes('해운대')) {
        return `안녕하세요! 뚜기입니다 🐧

해운대 맛집을 추천드릴게요!

🍜 **해운대암소갈비집**
📍 부산 해운대구 중동 1394-65
💰 30,000-50,000원
✨ 50년 전통의 숯불 갈비 전문점, 부드러운 한우갈비가 일품

바다와 함께 맛있는 갈비 어떠세요? 🏖️`;
    }
    
    if (lowerMessage.includes('회') || lowerMessage.includes('횟집')) {
        return `안녕하세요! 뚜기입니다 🐧

신선한 회 맛집 추천해드릴게요!

🐟 **자갈치시장 회센터**
📍 부산 중구 자갈치해안로 52
💰 20,000-40,000원
✨ 부산 최대 수산시장, 싱싱한 회와 해산물을 현장에서 바로

부산 와서 회 안 먹으면 섭하지 말입니더! 🐟`;
    }
    
    // 기본 응답
    return `안녕하세요! 뚜기입니다 🐧

부산 맛집에 대해 물어보세요!

예를 들어:
• "돼지국밥 맛집 알려줘"
• "해운대 근처 맛집"  
• "회 먹을 만한 곳"

뭘 찾고 계신가요? 😊`;
}