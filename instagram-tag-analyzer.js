const express = require('express');
const cors = require('cors');

class InstagramTagAnalyzer {
    constructor() {
        this.busanRestaurantTags = [
            '부산맛집', '부산음식', '부산여행맛집', '해운대맛집', '서면맛집', '남포동맛집',
            '광안리맛집', '송도맛집', '기장맛집', '사하구맛집', '영도맛집',
            '돼지국밥', '부산밀면', '부산회', '꼼장어', '부산어묵', '씨앗호떡',
            '부산갈비', '부산곰장어', '부산물회', '부산순대', '부산족발'
        ];
        
        this.areaKeywords = {
            '해운대': ['해운대해수욕장', '해운대맛집', '해운대동백섬', '해운대센텀시티'],
            '서면': ['서면맛집', '서면술집', '서면카페', '서면쇼핑'],
            '남포동': ['남포동맛집', '자갈치시장', '국제시장', '보수동책방골목'],
            '광안리': ['광안리해수욕장', '광안대교', '광안리맛집', '광안리카페'],
            '송도': ['송도해수욕장', '송도케이블카', '송도맛집'],
            '기장': ['기장시장', '기장멸치', '기장대게', '기장맛집']
        };
        
        this.foodCategories = {
            '돼지국밥': ['돼지국밥', '국밥', '부산국밥', '24시간국밥'],
            '밀면': ['밀면', '부산밀면', '냉면', '비빔밀면'],
            '회': ['회', '생선회', '부산회', '물회', '회센터'],
            '어묵': ['어묵', '부산어묵', '오뎅', '어묵바'],
            '해산물': ['꼼장어', '곰장어', '대게', '멸치', '조개구이'],
            '분식': ['씨앗호떡', '부산떡볶이', '김밥', '순대']
        };
    }

    // 해시태그에서 부산 맛집 정보 추출
    analyzeHashtags(hashtags) {
        if (!Array.isArray(hashtags)) {
            hashtags = hashtags.split(/[#\s,]+/).filter(tag => tag.length > 0);
        }

        const analysis = {
            busanRelated: [],
            areas: [],
            foodTypes: [],
            restaurants: [],
            recommendations: []
        };

        hashtags.forEach(tag => {
            const cleanTag = tag.replace('#', '').toLowerCase();
            
            // 부산 관련 태그 확인
            if (this.busanRestaurantTags.some(busanTag => 
                cleanTag.includes(busanTag.toLowerCase()) || busanTag.toLowerCase().includes(cleanTag)
            )) {
                analysis.busanRelated.push(tag);
            }

            // 지역 분석
            Object.entries(this.areaKeywords).forEach(([area, keywords]) => {
                if (keywords.some(keyword => 
                    cleanTag.includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(cleanTag)
                )) {
                    if (!analysis.areas.includes(area)) {
                        analysis.areas.push(area);
                    }
                }
            });

            // 음식 카테고리 분석
            Object.entries(this.foodCategories).forEach(([category, keywords]) => {
                if (keywords.some(keyword => 
                    cleanTag.includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(cleanTag)
                )) {
                    if (!analysis.foodTypes.includes(category)) {
                        analysis.foodTypes.push(category);
                    }
                }
            });

            // 맛집 이름 추정 (한글이 포함된 긴 태그)
            if (/[가-힣]/.test(cleanTag) && cleanTag.length >= 3 && cleanTag.length <= 10) {
                if (!cleanTag.includes('맛집') && !cleanTag.includes('음식') && 
                    !cleanTag.includes('여행') && !cleanTag.includes('카페')) {
                    analysis.restaurants.push(tag);
                }
            }
        });

        // 추천 생성
        this.generateRecommendations(analysis);
        
        return analysis;
    }

    // 분석 결과를 바탕으로 추천 생성
    generateRecommendations(analysis) {
        if (analysis.areas.length > 0 && analysis.foodTypes.length > 0) {
            analysis.areas.forEach(area => {
                analysis.foodTypes.forEach(food => {
                    analysis.recommendations.push(`${area}에서 ${food} 맛집을 찾아보세요`);
                });
            });
        }

        if (analysis.areas.length > 0 && analysis.foodTypes.length === 0) {
            analysis.areas.forEach(area => {
                analysis.recommendations.push(`${area} 지역 맛집을 탐방해보세요`);
            });
        }

        if (analysis.foodTypes.length > 0 && analysis.areas.length === 0) {
            analysis.foodTypes.forEach(food => {
                analysis.recommendations.push(`부산에서 유명한 ${food} 맛집을 찾아보세요`);
            });
        }

        if (analysis.recommendations.length === 0) {
            analysis.recommendations.push('부산 대표 맛집들을 탐방해보세요');
        }
    }

    // 유사한 태그 제안
    suggestSimilarTags(inputTag) {
        const suggestions = [];
        const cleanInput = inputTag.replace('#', '').toLowerCase();

        // 부산 관련 태그 제안
        this.busanRestaurantTags.forEach(tag => {
            if (tag.toLowerCase().includes(cleanInput) || cleanInput.includes(tag.toLowerCase())) {
                suggestions.push(`#${tag}`);
            }
        });

        // 지역별 태그 제안
        Object.values(this.areaKeywords).flat().forEach(tag => {
            if (tag.toLowerCase().includes(cleanInput) || cleanInput.includes(tag.toLowerCase())) {
                suggestions.push(`#${tag}`);
            }
        });

        // 음식 카테고리 태그 제안
        Object.values(this.foodCategories).flat().forEach(tag => {
            if (tag.toLowerCase().includes(cleanInput) || cleanInput.includes(tag.toLowerCase())) {
                suggestions.push(`#${tag}`);
            }
        });

        return [...new Set(suggestions)].slice(0, 10);
    }

    // 인기 부산 맛집 태그 반환
    getPopularBusanTags() {
        return {
            areas: Object.keys(this.areaKeywords).map(area => `#${area}맛집`),
            foods: Object.keys(this.foodCategories).map(food => `#${food}`),
            general: this.busanRestaurantTags.map(tag => `#${tag}`).slice(0, 10)
        };
    }

    // 태그 트렌드 분석 (시뮬레이션)
    getTrendingTags() {
        const trending = [
            { tag: '#해운대맛집', count: 1520, trend: '+15%' },
            { tag: '#부산돼지국밥', count: 890, trend: '+8%' },
            { tag: '#광안리카페', count: 756, trend: '+12%' },
            { tag: '#서면술집', count: 634, trend: '+5%' },
            { tag: '#부산밀면', count: 512, trend: '+20%' },
            { tag: '#자갈치시장', count: 445, trend: '+3%' },
            { tag: '#부산여행맛집', count: 389, trend: '+18%' },
            { tag: '#남포동맛집', count: 334, trend: '+7%' }
        ];
        
        return trending;
    }
}

module.exports = InstagramTagAnalyzer;