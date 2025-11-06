// Vercel Serverless Function for Naver Maps API
export default async function handler(req, res) {
    // CORS 헤더 설정
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // 환경변수에서 네이버 Client ID 가져오기 (Vercel에 naver_client_id로 저장됨)
        const clientId = process.env.naver_client_id;
        
        console.log('Naver Client ID 환경변수 확인:', clientId ? `설정됨 (${clientId.substring(0, 8)}...)` : '설정 안됨');
        
        if (!clientId) {
            return res.status(500).json({ 
                error: 'Naver Maps Client ID not configured',
                fallback: true 
            });
        }

        // 네이버 지도 API 스크립트 URL 반환
        const naverMapsConfig = {
            clientId: clientId,
            scriptUrl: `https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${clientId}`,
            mapOptions: {
                center: {
                    lat: 35.1796,  // 부산 중심 좌표
                    lng: 129.0756
                },
                zoom: 11,
                mapTypeControl: true,
                zoomControl: true
            }
        };

        res.status(200).json(naverMapsConfig);

    } catch (error) {
        console.error('Naver Maps API Error:', error);
        res.status(500).json({ 
            error: 'Failed to load Naver Maps configuration',
            fallback: true 
        });
    }
}