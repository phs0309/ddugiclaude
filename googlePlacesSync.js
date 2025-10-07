const fs = require('fs');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const { Client } = require('@googlemaps/google-maps-services-js');
const axios = require('axios');

// Google Places API 클라이언트
const client = new Client({});

// 환경변수 로드
require('dotenv').config();

// Google Places API 키 (환경변수에서 가져오기)
const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY || 'YOUR_GOOGLE_PLACES_API_KEY';

if (!GOOGLE_API_KEY || GOOGLE_API_KEY === 'YOUR_GOOGLE_PLACES_API_KEY') {
    console.error('❌ Google Places API 키가 설정되지 않았습니다!');
    console.log('💡 .env 파일에 GOOGLE_PLACES_API_KEY=your_api_key 를 추가하세요.');
    process.exit(1);
}

// 지연 함수 (API 레이트 리미트 준수)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Google Places에서 맛집 검색
async function findPlaceByNameAndLocation(name, lat, lng, address) {
    try {
        // 1. Text Search로 맛집 검색
        const searchQuery = `${name} ${address}`;
        console.log(`🔍 검색 중: ${searchQuery}`);
        
        const textSearchResponse = await client.textSearch({
            params: {
                query: searchQuery,
                location: { lat: parseFloat(lat), lng: parseFloat(lng) },
                radius: 1000, // 1km 반경
                type: 'restaurant',
                key: GOOGLE_API_KEY,
                language: 'ko'
            }
        });

        if (!textSearchResponse.data.results || textSearchResponse.data.results.length === 0) {
            console.log(`❌ 검색 결과 없음: ${name}`);
            return null;
        }

        // 가장 가까운 결과 선택
        const place = textSearchResponse.data.results[0];
        const placeId = place.place_id;
        
        console.log(`✅ 발견: ${place.name} (${place.rating || 'N/A'}★)`);
        
        // 2. Place Details로 상세 정보 및 리뷰 가져오기
        await delay(100); // API 제한 준수
        
        const detailsResponse = await client.placeDetails({
            params: {
                place_id: placeId,
                fields: 'name,rating,user_ratings_total,reviews,formatted_address,geometry',
                reviews_sort: 'newest',
                key: GOOGLE_API_KEY,
                language: 'ko'
            }
        });

        const placeDetails = detailsResponse.data.result;
        
        // 리뷰 5개 추출
        const reviews = placeDetails.reviews ? placeDetails.reviews.slice(0, 5).map(review => ({
            author: review.author_name,
            rating: review.rating,
            text: review.text,
            time: new Date(review.time * 1000).toLocaleDateString('ko-KR')
        })) : [];

        return {
            google_place_id: placeId,
            google_name: placeDetails.name,
            google_rating: placeDetails.rating || 0,
            google_review_count: placeDetails.user_ratings_total || 0,
            google_address: placeDetails.formatted_address,
            google_lat: placeDetails.geometry?.location?.lat,
            google_lng: placeDetails.geometry?.location?.lng,
            reviews: reviews
        };

    } catch (error) {
        console.error(`❌ API 오류 (${name}):`, error.message);
        return null;
    }
}

// 비짓부산 데이터와 Google Places 동기화
async function syncWithGooglePlaces() {
    const inputFile = './R_data/비짓부산_438_backup.csv';
    const outputFile = './R_data/비짓부산_with_google_reviews.csv';
    
    const restaurants = [];
    let processedCount = 0;
    
    console.log('📖 비짓부산 데이터 읽는 중...');
    
    return new Promise((resolve, reject) => {
        const stream = fs.createReadStream(inputFile, { encoding: 'utf8' })
            .pipe(csv())
            .on('data', (row) => {
                restaurants.push(row);
            })
            .on('end', async () => {
                console.log(`📊 총 ${restaurants.length}개 맛집 처리 시작`);
                
                const enrichedData = [];
                
                for (const restaurant of restaurants) {
                    processedCount++;
                    console.log(`\n[${processedCount}/${restaurants.length}] 처리 중: ${restaurant.MAIN_TITLE}`);
                    
                    // Google Places에서 정보 검색
                    const googleData = await findPlaceByNameAndLocation(
                        restaurant.MAIN_TITLE,
                        restaurant.LAT,
                        restaurant.LNG,
                        restaurant.ADDR1
                    );
                    
                    // 기존 데이터에 Google 정보 추가
                    const enrichedRestaurant = {
                        ...restaurant,
                        google_place_id: googleData?.google_place_id || '',
                        google_name: googleData?.google_name || '',
                        google_rating: googleData?.google_rating || 0,
                        google_review_count: googleData?.google_review_count || 0,
                        google_address: googleData?.google_address || '',
                        google_lat: googleData?.google_lat || '',
                        google_lng: googleData?.google_lng || '',
                        review_1_author: googleData?.reviews[0]?.author || '',
                        review_1_rating: googleData?.reviews[0]?.rating || 0,
                        review_1_text: googleData?.reviews[0]?.text || '',
                        review_1_time: googleData?.reviews[0]?.time || '',
                        review_2_author: googleData?.reviews[1]?.author || '',
                        review_2_rating: googleData?.reviews[1]?.rating || 0,
                        review_2_text: googleData?.reviews[1]?.text || '',
                        review_2_time: googleData?.reviews[1]?.time || '',
                        review_3_author: googleData?.reviews[2]?.author || '',
                        review_3_rating: googleData?.reviews[2]?.rating || 0,
                        review_3_text: googleData?.reviews[2]?.text || '',
                        review_3_time: googleData?.reviews[2]?.time || '',
                        review_4_author: googleData?.reviews[3]?.author || '',
                        review_4_rating: googleData?.reviews[3]?.rating || 0,
                        review_4_text: googleData?.reviews[3]?.text || '',
                        review_4_time: googleData?.reviews[3]?.time || '',
                        review_5_author: googleData?.reviews[4]?.author || '',
                        review_5_rating: googleData?.reviews[4]?.rating || 0,
                        review_5_text: googleData?.reviews[4]?.text || '',
                        review_5_time: googleData?.reviews[4]?.time || ''
                    };
                    
                    enrichedData.push(enrichedRestaurant);
                    
                    // API 제한 준수를 위한 지연
                    await delay(200);
                    
                    // 중간 저장 (10개마다)
                    if (processedCount % 10 === 0) {
                        console.log(`💾 중간 저장 중... (${processedCount}/${restaurants.length})`);
                        await saveToCSV(enrichedData, `./R_data/temp_sync_${processedCount}.csv`);
                    }
                }
                
                // 최종 저장
                console.log('\n💾 최종 결과 저장 중...');
                await saveToCSV(enrichedData, outputFile);
                
                console.log(`\n🎉 동기화 완료!`);
                console.log(`📄 저장 위치: ${outputFile}`);
                console.log(`📊 처리된 맛집: ${enrichedData.length}개`);
                
                // 통계 출력
                const withReviews = enrichedData.filter(r => r.google_rating > 0).length;
                console.log(`⭐ Google 리뷰 데이터 확보: ${withReviews}개 (${Math.round(withReviews/enrichedData.length*100)}%)`);
                
                resolve();
            })
            .on('error', reject);
    });
}

// CSV 저장 함수
async function saveToCSV(data, filename) {
    if (!data || data.length === 0) return;
    
    const headers = Object.keys(data[0]).map(key => ({id: key, title: key}));
    
    const csvWriter = createCsvWriter({
        path: filename,
        header: headers,
        encoding: 'utf8'
    });
    
    await csvWriter.writeRecords(data);
}

// 실행
if (require.main === module) {
    syncWithGooglePlaces()
        .then(() => {
            console.log('✅ 모든 작업 완료!');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ 오류 발생:', error);
            process.exit(1);
        });
}

module.exports = { syncWithGooglePlaces };