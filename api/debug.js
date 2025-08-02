export default async function handler(req, res) {
    // CORS 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const apiKey = process.env.CLAUDE_API_KEY;
    
    // API 키 존재 여부와 형식 확인
    const keyInfo = {
        exists: !!apiKey,
        format: apiKey ? `${apiKey.substring(0, 10)}...` : 'none',
        length: apiKey ? apiKey.length : 0,
        startsWithSk: apiKey ? apiKey.startsWith('sk-') : false,
        environment: process.env.NODE_ENV || 'development'
    };

    // 간단한 Claude API 테스트
    let apiTest = {
        status: 'not_tested',
        error: null
    };

    if (apiKey) {
        try {
            const https = require('https');
            const testData = JSON.stringify({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 10,
                messages: [{
                    role: 'user',
                    content: 'Hi'
                }]
            });

            apiTest = await new Promise((resolve) => {
                const options = {
                    hostname: 'api.anthropic.com',
                    port: 443,
                    path: '/v1/messages',
                    method: 'POST',
                    timeout: 10000,
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': apiKey,
                        'anthropic-version': '2023-06-01',
                        'Content-Length': Buffer.byteLength(testData)
                    }
                };

                const req = https.request(options, (res) => {
                    let data = '';
                    res.on('data', (chunk) => data += chunk);
                    res.on('end', () => {
                        resolve({
                            status: 'tested',
                            statusCode: res.statusCode,
                            success: res.statusCode === 200,
                            response: data.substring(0, 200) + '...',
                            error: null
                        });
                    });
                });

                req.on('timeout', () => {
                    req.destroy();
                    resolve({
                        status: 'timeout',
                        error: 'Request timeout'
                    });
                });

                req.on('error', (error) => {
                    resolve({
                        status: 'error',
                        error: error.message
                    });
                });

                req.write(testData);
                req.end();
            });

        } catch (error) {
            apiTest = {
                status: 'error',
                error: error.message
            };
        }
    }

    return res.status(200).json({
        timestamp: new Date().toISOString(),
        vercel_region: process.env.VERCEL_REGION || 'unknown',
        api_key: keyInfo,
        api_test: apiTest,
        debug_info: {
            user_agent: req.headers['user-agent'],
            origin: req.headers.origin,
            referer: req.headers.referer
        }
    });
}