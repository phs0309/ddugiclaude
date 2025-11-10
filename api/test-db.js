// 데이터베이스 연결 테스트 API
const { sql } = require('@vercel/postgres');

module.exports = async function handler(req, res) {
    console.log('🔗 데이터베이스 연결 테스트 시작');
    
    // CORS 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // 환경변수 확인
        const envCheck = {
            POSTGRES_URL: !!process.env.POSTGRES_URL,
            DATABASE_URL: !!process.env.DATABASE_URL,
            POSTGRES_PRISMA_URL: !!process.env.POSTGRES_PRISMA_URL,
            POSTGRES_URL_NON_POOLING: !!process.env.POSTGRES_URL_NON_POOLING
        };
        
        console.log('🔍 환경변수 상태:', envCheck);

        if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL && !process.env.POSTGRES_PRISMA_URL) {
            return res.status(500).json({
                success: false,
                error: '환경변수 없음',
                message: 'PostgreSQL 환경변수가 설정되지 않았습니다',
                envCheck
            });
        }

        console.log('🔗 데이터베이스 연결 시도...');
        
        // 간단한 쿼리 테스트
        const result = await sql`SELECT 1 as test`;
        console.log('✅ 데이터베이스 연결 성공:', result);

        return res.status(200).json({
            success: true,
            message: '데이터베이스 연결 성공',
            testResult: result.rows[0],
            envCheck,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ 데이터베이스 연결 실패:', {
            name: error.name,
            message: error.message,
            code: error.code,
            stack: error.stack?.substring(0, 300)
        });

        return res.status(500).json({
            success: false,
            error: '데이터베이스 연결 실패',
            message: error.message,
            errorName: error.name,
            errorCode: error.code,
            timestamp: new Date().toISOString()
        });
    }
}