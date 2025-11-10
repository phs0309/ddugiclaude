// 환경변수 디버깅 API
module.exports = async function handler(req, res) {
    console.log('🔍 환경변수 디버깅 API 호출');
    
    // CORS 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const envInfo = {
            // PostgreSQL 환경변수들
            POSTGRES_URL: !!process.env.POSTGRES_URL,
            DATABASE_URL: !!process.env.DATABASE_URL,
            POSTGRES_PRISMA_URL: !!process.env.POSTGRES_PRISMA_URL,
            POSTGRES_URL_NON_POOLING: !!process.env.POSTGRES_URL_NON_POOLING,
            
            // 환경변수 개수 확인
            totalEnvVars: Object.keys(process.env).length,
            
            // Node.js 환경 정보
            nodeVersion: process.version,
            platform: process.platform,
            
            // Vercel 관련
            VERCEL: !!process.env.VERCEL,
            VERCEL_ENV: process.env.VERCEL_ENV,
            VERCEL_REGION: process.env.VERCEL_REGION,
            
            // 시간 정보
            timestamp: new Date().toISOString()
        };

        console.log('📊 환경변수 정보:', envInfo);

        return res.status(200).json({
            success: true,
            environment: envInfo,
            message: '환경변수 정보가 성공적으로 조회되었습니다'
        });

    } catch (error) {
        console.error('❌ 환경변수 디버깅 오류:', error);
        return res.status(500).json({
            error: '환경변수 조회 중 오류 발생',
            message: error.message
        });
    }
}