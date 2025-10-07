const { InstagramHashtagAnalyzer } = require('../instagram-hashtag-analyzer');

// Vercel serverless function
module.exports = async (req, res) => {
    // CORS 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const analyzer = new InstagramHashtagAnalyzer();
        
        if (req.method === 'GET') {
            // 기본 분석 실행
            const results = await analyzer.analyzeAllHashtags();
            
            return res.status(200).json({
                success: true,
                data: results,
                message: '인스타그램 해시태그 분석이 완료되었습니다.',
                timestamp: new Date().toISOString()
            });
        }

        if (req.method === 'POST') {
            const { hashtags, limit } = req.body;
            
            if (hashtags && Array.isArray(hashtags)) {
                // 사용자 지정 해시태그 분석
                analyzer.busanHashtags = hashtags;
            }

            const results = await analyzer.analyzeAllHashtags();
            
            if (limit && typeof limit === 'number') {
                results.topRestaurants = results.topRestaurants.slice(0, limit);
            }

            return res.status(200).json({
                success: true,
                data: results,
                message: `${hashtags?.length || '기본'} 해시태그 분석이 완료되었습니다.`,
                timestamp: new Date().toISOString()
            });
        }

    } catch (error) {
        console.error('Instagram analysis error:', error);
        return res.status(500).json({
            success: false,
            error: 'Instagram 해시태그 분석 중 오류가 발생했습니다.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};