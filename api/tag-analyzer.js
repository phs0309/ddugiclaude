const TagRestaurantMatcher = require('../tag-restaurant-matcher');

// Vercel 서버리스 함수
module.exports = async (req, res) => {
    // CORS 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const matcher = new TagRestaurantMatcher();

        if (req.method === 'POST') {
            const { hashtags, action = 'analyze' } = req.body;

            if (!hashtags || !Array.isArray(hashtags)) {
                return res.status(400).json({ 
                    error: '해시태그 배열이 필요합니다' 
                });
            }

            switch (action) {
                case 'analyze':
                    const analysisResult = matcher.findRestaurantsByTags(hashtags);
                    res.json(analysisResult);
                    break;

                case 'route':
                    const routeResult = matcher.suggestFoodRoute(hashtags);
                    res.json(routeResult);
                    break;

                case 'statistics':
                    const statsResult = matcher.getHashtagStatistics(hashtags);
                    res.json(statsResult);
                    break;

                default:
                    res.status(400).json({ error: '지원하지 않는 action입니다' });
            }

        } else if (req.method === 'GET') {
            const { action } = req.query;

            switch (action) {
                case 'popular':
                    const popularResult = matcher.getRestaurantsByPopularTags();
                    res.json(popularResult);
                    break;

                case 'trending':
                    const trendingResult = matcher.getTrendingRestaurants();
                    res.json(trendingResult);
                    break;

                case 'tags':
                    const tagsResult = matcher.tagAnalyzer.getPopularBusanTags();
                    res.json(tagsResult);
                    break;

                default:
                    res.json({
                        message: '부산 맛집 인스타그램 태그 분석기',
                        endpoints: {
                            'POST /': '해시태그 분석 및 맛집 추천',
                            'GET /?action=popular': '인기 태그별 맛집',
                            'GET /?action=trending': '트렌딩 태그 분석',
                            'GET /?action=tags': '인기 부산 맛집 태그'
                        }
                    });
            }

        } else {
            res.status(405).json({ error: '지원하지 않는 HTTP 메서드입니다' });
        }

    } catch (error) {
        console.error('Tag Analyzer Error:', error);
        res.status(500).json({ 
            error: '서버 내부 오류가 발생했습니다',
            details: error.message 
        });
    }
};