// 리뷰 분석 및 감성 분석 에이전트
class ReviewAnalysisAgent {
    constructor() {
        this.name = "리뷰 분석 에이전트";
        this.description = "사용자 리뷰 분석 및 감성 평가";
        
        // 감성 사전
        this.positiveWords = [
            '맛있', '좋', '최고', '훌륭', '추천', '만족', '굿', '대박', '친절',
            '깨끗', '신선', '푸짐', '저렴', '가성비', '분위기', '예쁘', '편안',
            '부드럽', '고소', '달콤', '짭조름', '쫄깃', '바삭', '든든', '감동'
        ];
        
        this.negativeWords = [
            '별로', '실망', '최악', '불친절', '비싸', '더럽', '느리', '차갑',
            '싱겁', '짜', '맵', '질기', '눅눅', '오래', '작', '적', '퍽퍽',
            '비추', '그냥', '애매', '아쉽', '부족'
        ];
        
        // 부산 사투리 감성 사전
        this.busanPositive = [
            '억수로', '겁나', '마이', '쫀득', '뽀대', '가가', '찐', '개이득'
        ];
        
        this.busanNegative = [
            '거시기', '영 아니', '쪼매', '구리', '시답잖'
        ];
    }
    
    /**
     * 리뷰 감성 분석
     */
    analyzeSentiment(text) {
        if (!text) return { sentiment: 'neutral', score: 0 };
        
        const lowerText = text.toLowerCase();
        let positiveCount = 0;
        let negativeCount = 0;
        
        // 긍정 단어 카운트
        [...this.positiveWords, ...this.busanPositive].forEach(word => {
            const matches = lowerText.match(new RegExp(word, 'g'));
            if (matches) positiveCount += matches.length;
        });
        
        // 부정 단어 카운트
        [...this.negativeWords, ...this.busanNegative].forEach(word => {
            const matches = lowerText.match(new RegExp(word, 'g'));
            if (matches) negativeCount += matches.length;
        });
        
        // 감성 점수 계산
        const score = positiveCount - negativeCount;
        let sentiment;
        
        if (score > 2) sentiment = 'very_positive';
        else if (score > 0) sentiment = 'positive';
        else if (score < -2) sentiment = 'very_negative';
        else if (score < 0) sentiment = 'negative';
        else sentiment = 'neutral';
        
        return {
            sentiment,
            score,
            positiveCount,
            negativeCount,
            confidence: Math.min(Math.abs(score) / 10, 1)
        };
    }
    
    /**
     * 리뷰 키워드 추출
     */
    extractKeywords(text) {
        if (!text) return [];
        
        const keywords = [];
        const lowerText = text.toLowerCase();
        
        // 음식 관련 키워드
        const foodKeywords = [
            '맛', '양', '가격', '서비스', '분위기', '청결', '재료', '신선도',
            '온도', '식감', '향', '비주얼', '플레이팅'
        ];
        
        foodKeywords.forEach(keyword => {
            if (lowerText.includes(keyword)) {
                keywords.push(keyword);
            }
        });
        
        // 메뉴 추출
        const menuPattern = /(돼지국밥|밀면|회|비빔밥|김밥|라면|짜장면|짬뽕|삼겹살|갈비|치킨|피자|파스타|스테이크|초밥|우동|돈가스)/g;
        const menus = lowerText.match(menuPattern);
        if (menus) {
            keywords.push(...new Set(menus));
        }
        
        return keywords;
    }
    
    /**
     * 리뷰 요약
     */
    summarizeReview(review) {
        const sentiment = this.analyzeSentiment(review.text);
        const keywords = this.extractKeywords(review.text);
        
        return {
            rating: review.rating,
            sentiment: sentiment.sentiment,
            sentimentScore: sentiment.score,
            keywords,
            date: review.date,
            helpful: review.helpful || 0
        };
    }
    
    /**
     * 여러 리뷰 종합 분석
     */
    analyzeMultipleReviews(reviews) {
        if (!reviews || reviews.length === 0) {
            return {
                averageRating: 0,
                totalReviews: 0,
                sentimentDistribution: {},
                topKeywords: [],
                summary: '리뷰가 없습니다.'
            };
        }
        
        const summaries = reviews.map(r => this.summarizeReview(r));
        
        // 평균 평점
        const averageRating = summaries.reduce((sum, s) => sum + (s.rating || 0), 0) / summaries.length;
        
        // 감성 분포
        const sentimentDistribution = {};
        summaries.forEach(s => {
            sentimentDistribution[s.sentiment] = (sentimentDistribution[s.sentiment] || 0) + 1;
        });
        
        // 키워드 빈도
        const keywordCount = {};
        summaries.forEach(s => {
            s.keywords.forEach(k => {
                keywordCount[k] = (keywordCount[k] || 0) + 1;
            });
        });
        
        // 상위 키워드
        const topKeywords = Object.entries(keywordCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([keyword, count]) => ({ keyword, count }));
        
        // 종합 요약 생성
        const summary = this.generateSummary(sentimentDistribution, topKeywords, averageRating);
        
        return {
            averageRating: averageRating.toFixed(1),
            totalReviews: reviews.length,
            sentimentDistribution,
            topKeywords,
            summary
        };
    }
    
    /**
     * 종합 요약 생성
     */
    generateSummary(sentimentDist, topKeywords, avgRating) {
        const totalSentiments = Object.values(sentimentDist).reduce((a, b) => a + b, 0);
        const positivePct = ((sentimentDist.very_positive || 0) + (sentimentDist.positive || 0)) / totalSentiments * 100;
        
        let summary = '';
        
        if (avgRating >= 4.5) {
            summary += '⭐ 매우 높은 평점의 맛집입니다. ';
        } else if (avgRating >= 4.0) {
            summary += '👍 평점이 좋은 맛집입니다. ';
        } else if (avgRating >= 3.5) {
            summary += '😊 평균적인 평점의 맛집입니다. ';
        } else {
            summary += '⚠️ 평점이 낮은 편입니다. ';
        }
        
        if (positivePct >= 70) {
            summary += '대부분의 손님이 만족한 곳이네요! ';
        } else if (positivePct >= 50) {
            summary += '긍정적인 평가가 많습니다. ';
        } else {
            summary += '평가가 엇갈리는 편입니다. ';
        }
        
        if (topKeywords.length > 0) {
            const top3 = topKeywords.slice(0, 3).map(k => k.keyword).join(', ');
            summary += `특히 ${top3}에 대한 언급이 많습니다.`;
        }
        
        return summary;
    }
    
    /**
     * 리뷰 신뢰도 평가
     */
    evaluateReviewCredibility(review) {
        let credibilityScore = 50; // 기본 점수
        
        // 리뷰 길이
        const textLength = review.text?.length || 0;
        if (textLength > 200) credibilityScore += 20;
        else if (textLength > 100) credibilityScore += 10;
        else if (textLength < 20) credibilityScore -= 20;
        
        // 구체적인 메뉴 언급
        const keywords = this.extractKeywords(review.text);
        if (keywords.length > 3) credibilityScore += 15;
        
        // 사진 첨부
        if (review.hasPhoto) credibilityScore += 15;
        
        // 리뷰어 신뢰도 (가정)
        if (review.reviewerLevel && review.reviewerLevel > 5) {
            credibilityScore += 10;
        }
        
        // 도움이 됨 수
        if (review.helpful > 10) credibilityScore += 10;
        
        return {
            score: Math.min(100, Math.max(0, credibilityScore)),
            level: credibilityScore >= 80 ? 'high' : credibilityScore >= 50 ? 'medium' : 'low'
        };
    }
    
    /**
     * 시간대별 리뷰 트렌드 분석
     */
    analyzeTrends(reviews) {
        if (!reviews || reviews.length === 0) return null;
        
        // 월별 그룹화
        const monthlyReviews = {};
        
        reviews.forEach(review => {
            const date = new Date(review.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthlyReviews[monthKey]) {
                monthlyReviews[monthKey] = [];
            }
            
            monthlyReviews[monthKey].push(review);
        });
        
        // 월별 평균 계산
        const trends = Object.entries(monthlyReviews).map(([month, monthReviews]) => {
            const avgRating = monthReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / monthReviews.length;
            const sentiments = monthReviews.map(r => this.analyzeSentiment(r.text));
            const avgSentiment = sentiments.reduce((sum, s) => sum + s.score, 0) / sentiments.length;
            
            return {
                month,
                averageRating: avgRating.toFixed(1),
                averageSentiment: avgSentiment.toFixed(1),
                reviewCount: monthReviews.length
            };
        });
        
        // 최근 순 정렬
        trends.sort((a, b) => b.month.localeCompare(a.month));
        
        // 트렌드 판단
        let trend = 'stable';
        if (trends.length >= 3) {
            const recent = trends.slice(0, 3);
            const older = trends.slice(3, 6);
            
            if (recent.length && older.length) {
                const recentAvg = recent.reduce((sum, t) => sum + parseFloat(t.averageRating), 0) / recent.length;
                const olderAvg = older.reduce((sum, t) => sum + parseFloat(t.averageRating), 0) / older.length;
                
                if (recentAvg > olderAvg + 0.2) trend = 'improving';
                else if (recentAvg < olderAvg - 0.2) trend = 'declining';
            }
        }
        
        return {
            monthlyTrends: trends.slice(0, 12),
            overallTrend: trend
        };
    }
    
    /**
     * 메뉴별 리뷰 분석
     */
    analyzeByMenu(reviews, menuName) {
        const menuReviews = reviews.filter(r => 
            r.text && r.text.toLowerCase().includes(menuName.toLowerCase())
        );
        
        if (menuReviews.length === 0) {
            return {
                menu: menuName,
                mentionCount: 0,
                averageRating: 0,
                sentiment: 'unknown',
                summary: `${menuName}에 대한 리뷰가 없습니다.`
            };
        }
        
        const analysis = this.analyzeMultipleReviews(menuReviews);
        
        return {
            menu: menuName,
            mentionCount: menuReviews.length,
            averageRating: analysis.averageRating,
            sentiment: this.getOverallSentiment(analysis.sentimentDistribution),
            topKeywords: analysis.topKeywords,
            summary: `${menuName}은(는) ${menuReviews.length}개 리뷰에서 언급되었으며, 평균 ${analysis.averageRating}점을 받았습니다.`
        };
    }
    
    /**
     * 전반적인 감성 판단
     */
    getOverallSentiment(distribution) {
        const positive = (distribution.very_positive || 0) + (distribution.positive || 0);
        const negative = (distribution.very_negative || 0) + (distribution.negative || 0);
        const neutral = distribution.neutral || 0;
        
        if (positive > negative && positive > neutral) return 'positive';
        if (negative > positive && negative > neutral) return 'negative';
        return 'neutral';
    }
    
    /**
     * AI 추천 코멘트 생성
     */
    generateAIComment(restaurant, reviews) {
        const analysis = reviews ? this.analyzeMultipleReviews(reviews) : null;
        
        let comment = `🐧 뚜기가 분석했어요!\n\n`;
        
        // 평점 기반 코멘트
        if (restaurant.rating >= 4.5) {
            comment += `"${restaurant.name}"은(는) 정말 인기 많은 맛집이네요! `;
        } else if (restaurant.rating >= 4.0) {
            comment += `"${restaurant.name}"은(는) 많은 분들이 좋아하는 곳이에요. `;
        } else {
            comment += `"${restaurant.name}"을(를) 소개합니다. `;
        }
        
        // 특징 기반 코멘트
        if (restaurant.features) {
            const features = restaurant.features.slice(0, 2).join(', ');
            comment += `${features}이(가) 특징이에요. `;
        }
        
        // 리뷰 분석 기반 코멘트
        if (analysis && analysis.topKeywords.length > 0) {
            const keyword = analysis.topKeywords[0].keyword;
            comment += `특히 ${keyword}이(가) 좋다는 평이 많네요! `;
        }
        
        // 추천 문구
        if (restaurant.specialty) {
            comment += `\n\n🍴 추천 메뉴: ${restaurant.specialty}`;
        }
        
        if (restaurant.priceRange) {
            comment += `\n💰 가격대: ${restaurant.priceRange}`;
        }
        
        return comment;
    }
}

module.exports = ReviewAnalysisAgent;