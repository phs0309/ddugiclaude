// 간단한 in-memory rate limiting (프로덕션에서는 Redis 사용 권장)
const requestCounts = new Map();
const RATE_LIMIT = 10; // 분당 10회
const WINDOW_MS = 60 * 1000; // 1분

function checkRateLimit(ip) {
    const now = Date.now();
    const windowStart = now - WINDOW_MS;
    
    if (!requestCounts.has(ip)) {
        requestCounts.set(ip, []);
    }
    
    const requests = requestCounts.get(ip);
    // 오래된 요청 제거
    const recentRequests = requests.filter(time => time > windowStart);
    
    if (recentRequests.length >= RATE_LIMIT) {
        return false; // Rate limit 초과
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

    // Rate limiting 체크
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    if (!checkRateLimit(clientIP)) {
        return res.status(429).json({ 
            error: '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.',
            retryAfter: 60
        });
    }

    const { message } = req.body || {};

    if (!message) {
        return res.status(400).json({ error: '메시지가 필요합니다.' });
    }

    // Claude API 사용 시도 (더 세심한 에러 처리)
    try {
        const claudeResponse = await callClaudeAPI(message);
        return res.status(200).json({
            response: claudeResponse,
            success: true,
            source: 'claude'
        });
    } catch (error) {
        console.log('Claude API 실패:', error.message);
        
        // Rate limit 에러 체크
        if (error.message.includes('429') || error.message.includes('rate')) {
            console.log('Rate limit 감지됨');
        }
        
        // Billing 에러 체크  
        if (error.message.includes('400') || error.message.includes('credit')) {
            console.log('Billing 문제 감지됨');
        }
        
        // 실패시 기본 응답 사용
        const fallbackResponse = generateSimpleResponse(message);
        return res.status(200).json({
            response: fallbackResponse,
            success: true,
            source: 'fallback',
            error: error.message
        });
    }
}

async function callClaudeAPI(message, retryCount = 0) {
    const apiKey = process.env.CLAUDE_API_KEY;
    
    if (!apiKey) {
        throw new Error('Claude API 키가 설정되지 않았습니다.');
    }

    // Vercel 환경에서 호환성을 위해 https 모듈 사용  
    const { default: https } = await import('https');
    const postData = JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        messages: [{
            role: 'user',
            content: `너 이름은 뚜기야, 부산 현지인이야.

특징:
- 부산의 로컬 맛집과 숨은 맛집들을 잘 알고 있어
- 부산 사투리를 조금 써 
- 상남자 스타일이야
- ~~ 아이가?, 있다이가 ~~, ~~ 해봐라 같은 문장을 써줘
- ~~노, ~~카이 같은 문장은 쓰지마

대화 방식:
- 자연스러운 대화를 통해 사용자의 취향과 상황을 파악해
- 맛집을 추천할 때는 대화 흐름에 맞춰서 적절한 시점에 추천해
- 사용자가 지역이나 음식 종류를 언급하면 그에 맞는 맛집을 자연스럽게 추천해

응답 규칙:
- 항상 한국어로 답변하세요
- 말을 시작할 때 마! 라고 시작하고 항상 반말로 대화해
- 자연스러운 대화 흐름 속에서 맛집을 소개하세요

사용자 질문: ${message}`
        }]
    });

    const options = {
        hostname: 'api.anthropic.com',
        port: 443,
        path: '/v1/messages',
        method: 'POST',
        timeout: 15000, // 15초 타임아웃
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Length': Buffer.byteLength(postData),
            'User-Agent': 'Claude-Dduki-Bot/1.0',
            'Accept': 'application/json'
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
                    console.log(`Claude API 응답 상태: ${res.statusCode}`);
                    
                    if (res.statusCode === 429) {
                        // Rate limit - 잠시 후 재시도
                        if (retryCount < 2) {
                            console.log(`Rate limit 감지, ${retryCount + 1}번째 재시도...`);
                            setTimeout(() => {
                                callClaudeAPI(message, retryCount + 1)
                                    .then(resolve)
                                    .catch(reject);
                            }, 2000 * (retryCount + 1)); // 점진적 백오프
                            return;
                        }
                        reject(new Error(`Rate limit 초과: ${data}`));
                        return;
                    }
                    
                    if (res.statusCode === 400) {
                        console.log('API 키 또는 billing 문제 가능성:', data);
                        reject(new Error(`Billing/API 키 문제: ${data}`));
                        return;
                    }
                    
                    if (res.statusCode !== 200) {
                        reject(new Error(`Claude API 오류: ${res.statusCode} - ${data}`));
                        return;
                    }
                    
                    const response = JSON.parse(data);
                    console.log('Claude API 성공!');
                    resolve(response.content[0].text);
                } catch (error) {
                    reject(new Error(`응답 파싱 오류: ${error.message}`));
                }
            });
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('요청 타임아웃'));
        });

        req.on('error', (error) => {
            reject(new Error(`네트워크 오류: ${error.message}`));
        });

        req.write(postData);
        req.end();
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