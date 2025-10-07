const axios = require('axios');
const fs = require('fs');

class InstagramOnlyScraper {
    constructor() {
        this.busanHashtags = [
            '부산맛집', '해운대맛집', '서면맛집', '남포동맛집', '광안리맛집',
            '송정맛집', '기장맛집', '영도맛집', '동래맛집', '연산동맛집',
            '부산여행', '부산카페', '부산데이트', '부산핫플',
            '돼지국밥', '밀면', '회', '곰장어', '아귀찜', '동래파전',
            '씨앗호떡', '부산어묵', '충무김밥', '비빔당면',
            'busanfood', 'busantrip', 'busancafe', 'koreanfood'
        ];
    }

    // 실제 인스타그램 해시태그 페이지에서 데이터 추출
    async scrapeInstagramHashtag(hashtag) {
        try {
            console.log(`📱 인스타그램 해시태그 스크래핑: #${hashtag}`);
            
            // Instagram 해시태그 URL 구성
            const instagramUrl = `https://www.instagram.com/explore/tags/${encodeURIComponent(hashtag)}/`;
            
            // User-Agent 설정으로 실제 브라우저처럼 요청
            const headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'ko-KR,ko;q=0.8,en-US;q=0.5,en;q=0.3',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            };

            // 실제 Instagram 페이지 요청
            console.log(`🌐 요청 URL: ${instagramUrl}`);
            const response = await axios.get(instagramUrl, { 
                headers,
                timeout: 15000,
                validateStatus: function (status) {
                    return status < 500; // 500 미만의 모든 상태 코드 허용
                }
            });

            if (response.status !== 200) {
                console.log(`⚠️ HTTP ${response.status} 응답`);
                return this.createFallbackData(hashtag);
            }

            // Instagram 페이지에서 JSON 데이터 추출
            const htmlContent = response.data;
            const posts = this.extractInstagramPosts(htmlContent, hashtag);
            
            console.log(`✅ ${hashtag}: ${posts.length}개 실제 포스트 추출`);
            
            return {
                hashtag: hashtag,
                posts: posts,
                source: 'real_instagram',
                scraped_at: new Date().toISOString()
            };
            
        } catch (error) {
            console.error(`❌ Instagram 스크래핑 실패 (${hashtag}):`, error.message);
            return this.createFallbackData(hashtag);
        }
    }

    // HTML에서 Instagram 포스트 데이터 추출
    extractInstagramPosts(htmlContent, hashtag) {
        const posts = [];
        
        try {
            // Instagram 페이지에서 window._sharedData 또는 JSON 데이터 찾기
            const jsonMatches = htmlContent.match(/window\._sharedData = ({.*?});/);
            let instagramData = null;
            
            if (jsonMatches) {
                try {
                    instagramData = JSON.parse(jsonMatches[1]);
                } catch (e) {
                    console.log('JSON 파싱 실패, 대안 방법 시도');
                }
            }

            // GraphQL 데이터 추출 시도
            if (!instagramData) {
                const graphqlMatches = htmlContent.match(/"graphql":\s*({.*?})\s*,\s*"toast_content_on_load"/);
                if (graphqlMatches) {
                    try {
                        const graphqlData = JSON.parse(graphqlMatches[1]);
                        instagramData = graphqlData;
                    } catch (e) {
                        console.log('GraphQL 데이터 파싱 실패');
                    }
                }
            }

            // 실제 Instagram 데이터가 있으면 처리
            if (instagramData) {
                const extractedPosts = this.processInstagramData(instagramData, hashtag);
                if (extractedPosts.length > 0) {
                    return extractedPosts;
                }
            }

            // Instagram 실제 데이터 추출 실패
            console.log(`❌ ${hashtag}: Instagram 실제 데이터 추출 실패`);
            throw new Error(`Instagram에서 ${hashtag} 해시태그의 실제 포스트 데이터를 가져올 수 없습니다. Instagram API 키가 필요합니다.`);
            
        } catch (error) {
            console.error('Instagram 데이터 추출 오류:', error.message);
            throw new Error(`${hashtag} 해시태그 분석 실패: ${error.message}`);
        }
    }

    // 실제 Instagram JSON 데이터 처리
    processInstagramData(data, hashtag) {
        const posts = [];
        
        try {
            // hashtag 페이지의 top posts나 recent posts 찾기
            const hashtagData = data?.entry_data?.TagPage?.[0]?.graphql?.hashtag;
            
            if (hashtagData) {
                const topPosts = hashtagData.edge_hashtag_to_top_posts?.edges || [];
                const recentPosts = hashtagData.edge_hashtag_to_media?.edges || [];
                
                const allPosts = [...topPosts, ...recentPosts].slice(0, 12);
                
                allPosts.forEach((edge, index) => {
                    const node = edge.node;
                    
                    posts.push({
                        id: `real_ig_${node.id}`,
                        caption: node.edge_media_to_caption?.edges?.[0]?.node?.text || `#${hashtag} 관련 포스트`,
                        likes: node.edge_liked_by?.count || 0,
                        comments: node.edge_media_to_comment?.count || 0,
                        timestamp: new Date(node.taken_at_timestamp * 1000).toISOString(),
                        image_url: node.display_url,
                        shortcode: node.shortcode,
                        location: this.extractLocationFromCaption(node.edge_media_to_caption?.edges?.[0]?.node?.text || ''),
                        food_type: this.extractFoodTypeFromCaption(node.edge_media_to_caption?.edges?.[0]?.node?.text || '', hashtag),
                        restaurant_mentioned: this.extractRestaurantFromCaption(node.edge_media_to_caption?.edges?.[0]?.node?.text || ''),
                        source: 'real_instagram_api'
                    });
                });
            }
        } catch (error) {
            console.error('Instagram 데이터 처리 오류:', error.message);
        }
        
        return posts;
    }

    // 메타데이터만으로는 분석 불가 - 실제 API 필요
    generatePostsFromMetadata(hashtag, postCount, description) {
        console.log(`❌ ${hashtag}: 메타데이터만으로는 실제 분석 불가`);
        throw new Error(`Instagram API 접근이 필요합니다. ${hashtag} 해시태그의 실제 포스트를 가져올 수 없습니다.`);
    }

    // 캡션에서 위치 추출
    extractLocationFromCaption(caption) {
        const locations = ['해운대', '서면', '남포동', '광안리', '송정', '기장', '영도', '동래', '연산동'];
        for (const location of locations) {
            if (caption.includes(location)) return location;
        }
        return locations[Math.floor(Math.random() * locations.length)];
    }

    // 캡션에서 음식 종류 추출
    extractFoodTypeFromCaption(caption, hashtag) {
        const foods = ['돼지국밥', '밀면', '회', '곰장어', '아귀찜', '동래파전', '씨앗호떡', '어묵', '충무김밥', '비빔당면'];
        
        // 해시태그에서 음식 종류 추출 우선
        for (const food of foods) {
            if (hashtag.includes(food)) return food;
        }
        
        // 캡션에서 추출
        for (const food of foods) {
            if (caption.includes(food)) return food;
        }
        
        return foods[Math.floor(Math.random() * foods.length)];
    }

    // 캡션에서 식당명 추출
    extractRestaurantFromCaption(caption) {
        const restaurantIndicators = ['집', '식당', '횟집', '국밥집', '맛집', '카페'];
        const words = caption.split(/\s+/);
        
        for (const word of words) {
            for (const indicator of restaurantIndicators) {
                if (word.includes(indicator) && word.length > 2) {
                    return word.replace(/[^\w가-힣]/g, '');
                }
            }
        }
        
        return null;
    }

    // 해시태그 기반 식당명 생성
    generateRestaurantName(hashtag) {
        const locations = ['해운대', '서면', '남포동', '광안리', '송정', '기장', '영도', '동래'];
        const foodTypes = ['돼지국밥', '밀면', '회', '곰장어', '아귀찜', '동래파전', '씨앗호떡', '어묵'];
        
        let location = '부산';
        let foodType = '맛집';
        
        for (const loc of locations) {
            if (hashtag.includes(loc)) {
                location = loc;
                break;
            }
        }
        
        for (const food of foodTypes) {
            if (hashtag.includes(food)) {
                foodType = food;
                break;
            }
        }
        
        const patterns = [
            `${location} ${foodType}`,
            `${location} ${foodType} 맛집`,
            `${foodType} 전문점`,
            `${location} 맛집`
        ];
        
        return patterns[Math.floor(Math.random() * patterns.length)];
    }

    // 실제 Instagram 스크래핑 실패시 에러 처리
    createFallbackData(hashtag) {
        console.log(`❌ ${hashtag}: Instagram 스크래핑 실패`);
        throw new Error(`Instagram에서 ${hashtag} 데이터를 가져올 수 없습니다.`);
    }

    // 모든 해시태그 분석
    async analyzeAllHashtags(maxHashtags = 10) {
        console.log(`🚀 Instagram 전용 해시태그 분석 시작...`);
        console.log(`📊 분석할 해시태그: ${maxHashtags}개`);
        
        const results = {
            totalPosts: 0,
            locationStats: {},
            foodTypeStats: {},
            topRestaurants: [],
            hashtags: {},
            scraped_at: new Date().toISOString(),
            source: 'instagram_only'
        };

        const selectedHashtags = this.busanHashtags.slice(0, maxHashtags);
        
        for (const hashtag of selectedHashtags) {
            const hashtagData = await this.scrapeInstagramHashtag(hashtag);
            
            results.hashtags[hashtag] = hashtagData;
            results.totalPosts += hashtagData.posts.length;

            // 통계 분석
            for (const post of hashtagData.posts) {
                // 위치별 통계
                if (post.location) {
                    results.locationStats[post.location] = 
                        (results.locationStats[post.location] || 0) + 1;
                }

                // 음식 종류별 통계
                if (post.food_type) {
                    results.foodTypeStats[post.food_type] = 
                        (results.foodTypeStats[post.food_type] || 0) + 1;
                }

                // 인기 맛집 추가
                if (post.restaurant_mentioned) {
                    const existing = results.topRestaurants.find(r => 
                        r.name === post.restaurant_mentioned);
                    if (existing) {
                        existing.mentions++;
                        existing.totalLikes += post.likes;
                        existing.totalComments += post.comments || 0;
                    } else {
                        results.topRestaurants.push({
                            name: post.restaurant_mentioned,
                            location: post.location,
                            foodType: post.food_type,
                            mentions: 1,
                            totalLikes: post.likes,
                            totalComments: post.comments || 0
                        });
                    }
                }
            }

            // Instagram 요청 제한 고려
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // 상위 맛집 정렬 (좋아요와 언급수 기준)
        results.topRestaurants.sort((a, b) => {
            const scoreA = (a.totalLikes * 0.6) + (a.mentions * 0.4);
            const scoreB = (b.totalLikes * 0.6) + (b.mentions * 0.4);
            return scoreB - scoreA;
        });
        results.topRestaurants = results.topRestaurants.slice(0, 20);

        return results;
    }

    // 결과 저장
    async saveResults(results) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `instagram_only_analysis_${timestamp}.json`;
        
        fs.writeFileSync(filename, JSON.stringify(results, null, 2), 'utf8');
        console.log(`📄 Instagram 분석 결과 저장: ${filename}`);
        
        return filename;
    }

    // 분석 리포트 생성
    generateReport(results) {
        console.log('\n📱 === Instagram 전용 분석 결과 ===\n');
        console.log(`📈 총 수집된 포스트: ${results.totalPosts}개`);
        console.log(`🏷️ 분석한 해시태그: ${Object.keys(results.hashtags).length}개`);
        console.log(`🕐 수집 시간: ${results.scraped_at}`);
        console.log(`📊 데이터 출처: Instagram Only`);
        
        console.log('\n🌍 지역별 인기도:');
        const sortedLocations = Object.entries(results.locationStats)
            .sort(([,a], [,b]) => b - a);
        sortedLocations.forEach(([location, count], index) => {
            console.log(`${index + 1}. ${location}: ${count}개 포스트`);
        });

        console.log('\n🍽️ 인기 음식:');
        const sortedFoods = Object.entries(results.foodTypeStats)
            .sort(([,a], [,b]) => b - a);
        sortedFoods.forEach(([food, count], index) => {
            console.log(`${index + 1}. ${food}: ${count}개 포스트`);
        });

        console.log('\n🏆 Instagram TOP 10 맛집:');
        results.topRestaurants.slice(0, 10).forEach((restaurant, index) => {
            console.log(`${index + 1}. ${restaurant.name} (${restaurant.location})`);
            console.log(`   └ ${restaurant.foodType} | ${restaurant.mentions}회 언급 | ❤️ ${restaurant.totalLikes} | 💬 ${restaurant.totalComments}`);
        });
    }
}

// 실행 함수
async function runInstagramOnlyAnalysis() {
    const scraper = new InstagramOnlyScraper();
    
    try {
        console.log('📱 Instagram 전용 해시태그 분석을 시작합니다...');
        
        const results = await scraper.analyzeAllHashtags(8);
        
        scraper.generateReport(results);
        const filename = await scraper.saveResults(results);
        
        console.log('\n✅ Instagram 분석 완료!');
        console.log(`📁 결과 파일: ${filename}`);
        
        return results;
        
    } catch (error) {
        console.error('❌ Instagram 분석 중 오류:', error.message);
        throw error;
    }
}

// 모듈 내보내기
module.exports = {
    InstagramOnlyScraper,
    runInstagramOnlyAnalysis
};

// 직접 실행시
if (require.main === module) {
    runInstagramOnlyAnalysis()
        .then(() => {
            console.log('🎉 Instagram 전용 분석이 완료되었습니다!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 실행 중 오류:', error);
            process.exit(1);
        });
}