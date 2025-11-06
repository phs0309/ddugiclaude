// Vercel Serverless Function for Naver Maps API
export default async function handler(req, res) {
    // CORS 헤더 설정 (Naver Maps API용)
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-NCP-APIGW-API-KEY-ID, X-NCP-APIGW-API-KEY');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // 환경변수에서 네이버 Maps Key ID 가져오기
        // 신규 Maps API는 ncpKeyId를 사용 (기존 ncpClientId 대체)
        // Vercel 환경변수: naver_client_id (기존 호환성 유지)
        const clientId = process.env.naver_client_id || process.env.NAVER_MAPS_KEY_ID;
        
        // 디버깅용 로그
        console.log('Naver Maps API 요청 처리 중...');
        console.log('Client ID 상태:', clientId ? `설정됨 (길이: ${clientId.length}자)` : '설정 안됨');
        console.log('요청 도메인:', req.headers.origin || 'Unknown');
        
        if (!clientId) {
            return res.status(500).json({ 
                error: 'Naver Maps Client ID not configured',
                fallback: true 
            });
        }

        // 네이버 지도 API 스크립트 URL 반환 (신규 API 형식)
        // ncpKeyId 파라미터 사용 (기존 ncpClientId 대체)
        const naverMapsConfig = {
            clientId: clientId,
            scriptUrl: `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}&submodules=geocoder`,
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