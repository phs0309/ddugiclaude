// 간단한 테스트 API
export default async function handler(req, res) {
    console.log('🧪 테스트 API 호출됨');
    
    // CORS 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const result = {
            success: true,
            message: '테스트 API가 정상 작동합니다',
            timestamp: new Date().toISOString(),
            method: req.method,
            query: req.query,
            body: req.body
        };

        console.log('🧪 테스트 응답:', result);
        return res.status(200).json(result);
    } catch (error) {
        console.error('🧪 테스트 API 오류:', error);
        return res.status(500).json({
            error: '테스트 API 오류',
            message: error.message
        });
    }
}