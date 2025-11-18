// Vercel Serverless Function for Random Restaurant Recommendations
const RestaurantAI = require('../restaurantAI');

export default async function handler(req, res) {
    // CORS 헤더 설정
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // URL 경로에서 count 추출 (예: /api/random/3)
        const pathParts = req.url.split('/');
        const countParam = pathParts[pathParts.length - 1];
        const count = parseInt(countParam) || 3;

        // Restaurant AI 초기화 및 랜덤 추천
        const restaurantAI = new RestaurantAI();
        const restaurants = restaurantAI.getRandomRecommendations(count);
        
        res.status(200).json({
            restaurants,
            count: restaurants.length
        });

    } catch (error) {
        console.error('Random recommendations error:', error);
        res.status(500).json({ 
            error: 'Failed to get restaurant recommendations',
            message: error.message 
        });
    }
}