require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const restaurantService = require('./restaurantService');
const ConversationAnalyzer = require('./conversationAnalyzer');

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 대화 분석기 초기화
const analyzer = new ConversationAnalyzer();

// 메인 페이지
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 채팅 API
app.post('/api/chat', async (req, res) => {
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ error: '메시지가 필요합니다.' });
    }

    console.log(`💬 사용자 메시지: "${message}"`);

    try {
        // 메시지 분석
        const analysis = analyzer.analyzeMessage(message);
        console.log('🔍 메시지 분석:', analysis);

        if (analysis.isRestaurantRequest) {
            // 맛집 추천 처리
            const criteria = restaurantService.analyzeUserQuery(message);
            let restaurants = restaurantService.findRestaurants(criteria);
            
            // 검색 결과가 없으면 랜덤 추천
            if (restaurants.length === 0) {
                restaurants = restaurantService.getRandomRestaurants(5);
            }
            
            console.log(`📍 찾은 맛집 수: ${restaurants.length}개`);

            // Claude AI로 응답 생성
            const aiResponse = await generateClaudeResponse(
                analyzer.generateRestaurantPrompt(message, restaurants)
            );

            return res.json({
                response: aiResponse || generateFallbackRestaurantResponse(restaurants),
                restaurants: restaurants.slice(0, 6),
                type: 'restaurant',
                success: true
            });

        } else {
            // 일반 대화 처리
            const aiResponse = await generateClaudeResponse(
                analyzer.generateCasualPrompt(message)
            );

            return res.json({
                response: aiResponse || generateFallbackCasualResponse(message),
                restaurants: [],
                type: 'casual',
                success: true
            });
        }

    } catch (error) {
        console.error('💥 채팅 처리 오류:', error);
        
        return res.json({
            response: `마! 미안하다... 😅 잠깐 머리가 하얘졌네. 다시 말해봐라!`,
            restaurants: [],
            type: 'error',
            success: false
        });
    }
});

// Claude AI API 호출
async function generateClaudeResponse(prompt) {
    const apiKey = process.env.CLAUDE_API_KEY;
    
    if (!apiKey) {
        console.log('⚠️ Claude API 키가 없어서 fallback 응답 사용');
        return null;
    }

    try {
        const https = require('https');
        
        const postData = JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 500,
            messages: [{
                role: 'user',
                content: prompt
            }]
        });

        const options = {
            hostname: 'api.anthropic.com',
            port: 443,
            path: '/v1/messages',
            method: 'POST',
            timeout: 15000,
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        if (res.statusCode !== 200) {
                            console.log('⚠️ Claude API 오류, fallback 사용');
                            resolve(null);
                            return;
                        }
                        
                        const response = JSON.parse(data);
                        const aiText = response.content[0].text;
                        console.log('🤖 Claude AI 응답:', aiText.substring(0, 100) + '...');
                        resolve(aiText);
                        
                    } catch (error) {
                        console.log('⚠️ 응답 파싱 오류, fallback 사용');
                        resolve(null);
                    }
                });
            });

            req.on('timeout', () => {
                req.destroy();
                console.log('⚠️ Claude API 타임아웃, fallback 사용');
                resolve(null);
            });

            req.on('error', () => {
                console.log('⚠️ Claude API 네트워크 오류, fallback 사용');
                resolve(null);
            });

            req.write(postData);
            req.end();
        });

    } catch (error) {
        console.log('⚠️ Claude API 호출 실패, fallback 사용:', error.message);
        return null;
    }
}

// Fallback 맛집 응답
function generateFallbackRestaurantResponse(restaurants) {
    if (restaurants.length === 0) {
        return `마! 조건에 맞는 맛집을 못 찾겠네... 😅\n\n다른 지역이나 음식으로 다시 말해봐라!`;
    }
    
    const topRestaurant = restaurants[0];
    return `마! 좋은 맛집들 찾았다이가! 🐧\n\n특히 ${topRestaurant.area}에 있는 ${topRestaurant.name} 같은 곳들이 맛있어! 아래 카드들 확인해봐라~`;
}

// Fallback 일반 대화 응답
function generateFallbackCasualResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('안녕') || lowerMessage.includes('하이')) {
        return `마! 뚜기다이가! 🐧 반갑다!`;
    }
    
    if (lowerMessage.includes('고마') || lowerMessage.includes('감사')) {
        return `마! 뭘 고마워하노! 😊`;
    }
    
    if (lowerMessage.includes('어떻게') || lowerMessage.includes('어때')) {
        return `마! 좋다이가! 😄 또 뭔 얘기할까?`;
    }
    
    return `마! 뚜기다이가! 🐧 뭔 얘기할까?`;
}

// 서버 시작
app.listen(PORT, () => {
    console.log(`🚀 서버가 http://localhost:${PORT}에서 실행 중입니다`);
    console.log(`📊 로드된 맛집 수: ${restaurantService.getAllRestaurants().length}개`);
});