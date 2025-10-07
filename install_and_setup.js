/**
 * SQLite 설정 및 데이터 가져오기 자동화 스크립트
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const DatabaseSetup = require('./setup_database');
const CSVImporter = require('./import_csv_to_sqlite');

async function installDependencies() {
    return new Promise((resolve, reject) => {
        console.log('📦 필요한 패키지 설치 중...');
        exec('npm install', (error, stdout, stderr) => {
            if (error) {
                console.error('패키지 설치 실패:', error);
                reject(error);
                return;
            }
            console.log('✅ 패키지 설치 완료');
            resolve();
        });
    });
}

async function setupDatabase() {
    console.log('🗄️ SQLite 데이터베이스 설정 중...');
    const dbSetup = new DatabaseSetup();
    
    try {
        await dbSetup.createTables();
        await dbSetup.checkDatabase();
        console.log('✅ 데이터베이스 설정 완료');
        return true;
    } catch (error) {
        console.error('❌ 데이터베이스 설정 실패:', error);
        return false;
    } finally {
        dbSetup.close();
    }
}

async function importCSVData() {
    console.log('📥 CSV 데이터 가져오기 중...');
    const importer = new CSVImporter();
    
    // 사용 가능한 CSV 파일 찾기
    const csvFiles = [
        '부산_음식점_최종.csv',
        '부산_음식점_구글API_50개샘플.csv',
        '부산_음식점_좌표이름매칭_200m범위_구글좌표포함_50개샘플_성공률14.0프로.csv',
        '부산_음식점_개선된매칭_결과.csv'
    ];

    const existingFiles = csvFiles.filter(file => fs.existsSync(file));
    
    if (existingFiles.length === 0) {
        console.log('⚠️ CSV 파일을 찾을 수 없습니다. 수동으로 데이터를 추가해주세요.');
        return false;
    }

    try {
        const totalImported = await importer.importMultipleCSVs(existingFiles);
        console.log(`✅ CSV 데이터 가져오기 완료: ${totalImported}개 음식점`);
        return true;
    } catch (error) {
        console.error('❌ CSV 데이터 가져오기 실패:', error);
        return false;
    } finally {
        importer.close();
    }
}

async function startServer() {
    return new Promise((resolve, reject) => {
        console.log('🚀 서버 시작 중...');
        const serverProcess = exec('npm start', (error, stdout, stderr) => {
            if (error) {
                console.error('서버 시작 실패:', error);
                reject(error);
                return;
            }
        });

        serverProcess.stdout.on('data', (data) => {
            console.log(data.toString());
            if (data.includes('서버가')) {
                resolve(serverProcess);
            }
        });

        serverProcess.stderr.on('data', (data) => {
            console.error(data.toString());
        });
    });
}

async function testAPI() {
    console.log('🧪 API 테스트 중...');
    
    const testEndpoints = [
        'http://localhost:3000/api/statistics',
        'http://localhost:3000/api/restaurants?limit=5',
        'http://localhost:3000/api/restaurants/recommended?limit=3'
    ];

    for (const endpoint of testEndpoints) {
        try {
            const response = await fetch(endpoint);
            if (response.ok) {
                const data = await response.json();
                console.log(`✅ ${endpoint.split('/').pop()} 테스트 성공`);
            } else {
                console.log(`⚠️ ${endpoint.split('/').pop()} 테스트 실패: ${response.status}`);
            }
        } catch (error) {
            console.log(`⚠️ ${endpoint.split('/').pop()} 테스트 불가: ${error.message}`);
        }
    }
}

async function main() {
    console.log('🎯 SQLite 기반 부산 음식점 추천 시스템 설정을 시작합니다...\n');

    try {
        // 1. 패키지 설치
        await installDependencies();
        
        // 2. 데이터베이스 설정
        const dbSuccess = await setupDatabase();
        if (!dbSuccess) {
            throw new Error('데이터베이스 설정 실패');
        }

        // 3. CSV 데이터 가져오기 (선택적)
        await importCSVData();

        console.log('\n🎉 설정 완료! 이제 다음 명령어로 서버를 시작할 수 있습니다:');
        console.log('npm start');
        console.log('\n📚 사용 가능한 API 엔드포인트:');
        console.log('- GET /api/restaurants - 전체 음식점 조회');
        console.log('- GET /api/restaurants/search?q=검색어 - 음식점 검색');
        console.log('- GET /api/restaurants/nearby?lat=위도&lng=경도 - 주변 음식점');
        console.log('- GET /api/restaurants/recommended - 추천 음식점');
        console.log('- GET /api/restaurants/category/한식 - 카테고리별 조회');
        console.log('- GET /api/restaurants/area/해운대 - 지역별 조회');
        console.log('- GET /api/statistics - 통계 정보');

    } catch (error) {
        console.error('\n❌ 설정 중 오류 발생:', error.message);
        console.log('\n💡 문제 해결 방법:');
        console.log('1. Node.js와 npm이 설치되어 있는지 확인');
        console.log('2. 관리자 권한으로 실행해보기');
        console.log('3. CSV 파일이 프로젝트 폴더에 있는지 확인');
        process.exit(1);
    }
}

// 직접 실행 시
if (require.main === module) {
    main();
}

module.exports = {
    installDependencies,
    setupDatabase,
    importCSVData,
    startServer,
    testAPI
};