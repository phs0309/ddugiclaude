// 지역 기억 기능 테스트 스크립트
import ConversationAnalyzer from './api/conversationAnalyzer.js';

const conversationAnalyzer = new ConversationAnalyzer();

async function testLocationMemory() {
    console.log('🧪 지역 기억 기능 테스트 시작\n');

    // 첫 번째 대화: 해운대 맛집 질문
    const sessionData = {
        messages: [],
        userPreferences: {
            preferredAreas: [],
            preferredCategories: [],
            priceRange: null,
            lastVisitedArea: null
        }
    };

    console.log('1️⃣ 첫 번째 질문: "해운대 맛집 추천해줘"');
    
    const firstMessage = "해운대 맛집 추천해줘";
    
    // 사용자 선호도 업데이트 시뮬레이션
    if (firstMessage.includes('해운대')) {
        sessionData.userPreferences.preferredAreas.push('해운대');
        sessionData.userPreferences.lastVisitedArea = '해운대';
    }
    
    sessionData.messages.push({ role: 'user', content: firstMessage });
    sessionData.messages.push({ role: 'assistant', content: '해운대 맛집들을 추천해드렸습니다' });

    console.log('첫 질문 후 선호도:', sessionData.userPreferences);

    // 두 번째 대화: 양식 맛집 질문 (지역 미언급)
    console.log('\n2️⃣ 두 번째 질문: "양식 맛집 어떤 곳 있어?"');
    
    const secondMessage = "양식 맛집 어떤 곳 있어?";
    
    try {
        const analysis = await conversationAnalyzer.analyzeConversation(
            secondMessage,
            sessionData.messages,
            sessionData.userPreferences
        );

        console.log('\n📊 AI 분석 결과:');
        console.log('- 추출된 지역:', analysis.extractedInfo?.preferredArea);
        console.log('- 추출된 카테고리:', analysis.extractedInfo?.foodCategory);
        console.log('- 의도:', analysis.intent);
        console.log('- 신뢰도:', analysis.confidence);

        // 검색 조건 생성 시뮬레이션
        const searchCriteria = buildSearchCriteriaFromAnalysis(analysis, sessionData.userPreferences);
        console.log('\n🔍 생성된 검색 조건:');
        console.log(searchCriteria);

        // 기대값 확인
        const expected = {
            area: '해운대',
            category: '양식'
        };

        console.log('\n✅ 테스트 결과:');
        console.log(`지역 기억: ${searchCriteria.area === expected.area ? '성공' : '실패'} (기대: ${expected.area}, 실제: ${searchCriteria.area})`);
        console.log(`카테고리 추출: ${searchCriteria.category === expected.category ? '성공' : '실패'} (기대: ${expected.category}, 실제: ${searchCriteria.category})`);

    } catch (error) {
        console.log('❌ AI 분석 실패:', error.message);
        console.log('Fallback 분석 사용');
        
        // Fallback 로직 테스트
        const fallbackAnalysis = conversationAnalyzer.fallbackAnalysis(
            secondMessage,
            sessionData.messages,
            sessionData.userPreferences
        );
        
        console.log('Fallback 분석 결과:', fallbackAnalysis.extractedInfo);
    }
}

// buildSearchCriteriaFromAnalysis 함수 복사 (테스트용)
function buildSearchCriteriaFromAnalysis(analysis, userPreferences) {
    const criteria = {};
    const extractedInfo = analysis.extractedInfo || {};
    const context = analysis.context || {};
    
    // 지역 정보
    if (extractedInfo.preferredArea) {
        criteria.area = extractedInfo.preferredArea;
    } else if (userPreferences.lastVisitedArea && 
               (context.locationIntent === 'flexible' || 
                context.locationIntent === 'unknown' || 
                !context.locationIntent)) {
        criteria.area = userPreferences.lastVisitedArea;
    }
    
    // 음식 카테고리
    if (extractedInfo.foodCategory) {
        criteria.category = extractedInfo.foodCategory;
    } else if (userPreferences.preferredCategories.length > 0) {
        criteria.category = userPreferences.preferredCategories[0];
    }
    
    return criteria;
}

// 테스트 실행
testLocationMemory().catch(console.error);