// API 클라이언트 유틸리티 - Vercel 데이터베이스와 통신
class ApiClient {
    constructor() {
        this.baseUrl = window.location.origin;
        this.token = localStorage.getItem('authToken') || null;
        
        // 토큰 변경시 자동 업데이트
        window.addEventListener('storage', (e) => {
            if (e.key === 'authToken') {
                this.token = e.newValue;
            }
        });
    }

    // 인증 헤더 설정
    getAuthHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (this.token) {
            headers.Authorization = `Bearer ${this.token}`;
        }
        
        return headers;
    }

    // API 요청 공통 메소드
    async request(endpoint, options = {}) {
        try {
            const url = `${this.baseUrl}${endpoint}`;
            const config = {
                ...options,
                headers: {
                    ...this.getAuthHeaders(),
                    ...options.headers
                }
            };

            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API 요청 실패:', error);
            throw error;
        }
    }

    // === 인증 관련 API ===

    // Google 로그인
    async loginWithGoogle(idToken) {
        const data = await this.request('/api/auth?action=google-login', {
            method: 'POST',
            body: JSON.stringify({ idToken })
        });

        if (data.success) {
            this.token = data.token;
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('userInfo', JSON.stringify(data.user));
        }

        return data;
    }

    // 게스트 로그인
    async loginAsGuest() {
        const data = await this.request('/api/auth?action=guest-login', {
            method: 'POST'
        });

        if (data.success) {
            this.token = data.token;
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('userInfo', JSON.stringify(data.user));
        }

        return data;
    }

    // 간단한 토큰 검증 (Base64 디코딩)
    verifyToken() {
        if (!this.token) {
            return { valid: false, error: '토큰이 없습니다' };
        }

        try {
            const payload = JSON.parse(atob(this.token));
            
            // 만료 시간 확인
            if (payload.exp && Date.now() > payload.exp) {
                this.logout();
                return { valid: false, error: '토큰이 만료되었습니다' };
            }

            return { valid: true, user: payload };
        } catch (error) {
            this.logout();
            return { valid: false, error: '유효하지 않은 토큰입니다' };
        }
    }

    // 로그아웃
    async logout() {
        try {
            if (this.token) {
                await this.request('/api/auth?action=logout', {
                    method: 'POST'
                });
            }
        } catch (error) {
            console.error('로그아웃 API 호출 실패:', error);
        }

        this.token = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('userInfo');
        localStorage.removeItem('savedRestaurants'); // 로컬 저장소 정리
    }

    // 사용자 프로필 조회
    async getProfile() {
        return await this.request('/api/auth?action=profile');
    }

    // === 저장된 맛집 관련 API ===

    // 저장된 맛집 목록 조회
    async getSavedRestaurants() {
        try {
            const data = await this.request('/api/user-restaurants');
            
            // 게스트 사용자는 localStorage 사용
            if (data.isGuest) {
                const localSaved = JSON.parse(localStorage.getItem('savedRestaurants') || '[]');
                return {
                    restaurants: localSaved,
                    count: localSaved.length,
                    isGuest: true
                };
            }

            return data;
        } catch (error) {
            console.error('저장된 맛집 조회 실패:', error);
            // 오류시 localStorage 폴백
            const localSaved = JSON.parse(localStorage.getItem('savedRestaurants') || '[]');
            return {
                restaurants: localSaved,
                count: localSaved.length,
                isGuest: true,
                fallback: true
            };
        }
    }

    // 맛집 저장
    async saveRestaurant(restaurant) {
        try {
            const data = await this.request('/api/user-restaurants', {
                method: 'POST',
                body: JSON.stringify({ restaurant })
            });

            // 게스트 사용자는 localStorage 사용
            if (data.isGuest) {
                const savedRestaurants = JSON.parse(localStorage.getItem('savedRestaurants') || '[]');
                const restaurantToSave = {
                    ...restaurant,
                    savedAt: new Date().toISOString()
                };
                
                if (!savedRestaurants.some(saved => saved.id === restaurant.id)) {
                    savedRestaurants.push(restaurantToSave);
                    localStorage.setItem('savedRestaurants', JSON.stringify(savedRestaurants));
                }
                
                return {
                    success: true,
                    message: `"${restaurant.name}"을(를) 저장했습니다`,
                    restaurant: restaurantToSave,
                    isGuest: true
                };
            }

            return data;
        } catch (error) {
            console.error('맛집 저장 실패:', error);
            
            // 오류시 localStorage 폴백
            const savedRestaurants = JSON.parse(localStorage.getItem('savedRestaurants') || '[]');
            if (!savedRestaurants.some(saved => saved.id === restaurant.id)) {
                const restaurantToSave = {
                    ...restaurant,
                    savedAt: new Date().toISOString()
                };
                savedRestaurants.push(restaurantToSave);
                localStorage.setItem('savedRestaurants', JSON.stringify(savedRestaurants));
                
                return {
                    success: true,
                    message: `"${restaurant.name}"을(를) 저장했습니다 (로컬)`,
                    restaurant: restaurantToSave,
                    fallback: true
                };
            }
            
            throw error;
        }
    }

    // 맛집 저장 해제
    async unsaveRestaurant(restaurantId) {
        try {
            const data = await this.request(`/api/user-restaurants?restaurantId=${restaurantId}`, {
                method: 'DELETE'
            });

            // 게스트 사용자는 localStorage 사용
            if (data.isGuest) {
                const savedRestaurants = JSON.parse(localStorage.getItem('savedRestaurants') || '[]');
                const filteredRestaurants = savedRestaurants.filter(saved => saved.id !== restaurantId);
                localStorage.setItem('savedRestaurants', JSON.stringify(filteredRestaurants));
                
                return {
                    success: true,
                    message: '맛집을 저장 목록에서 제거했습니다',
                    restaurantId: restaurantId,
                    isGuest: true
                };
            }

            return data;
        } catch (error) {
            console.error('맛집 저장 해제 실패:', error);
            
            // 오류시 localStorage 폴백
            const savedRestaurants = JSON.parse(localStorage.getItem('savedRestaurants') || '[]');
            const filteredRestaurants = savedRestaurants.filter(saved => saved.id !== restaurantId);
            localStorage.setItem('savedRestaurants', JSON.stringify(filteredRestaurants));
            
            return {
                success: true,
                message: '맛집을 저장 목록에서 제거했습니다 (로컬)',
                restaurantId: restaurantId,
                fallback: true
            };
        }
    }

    // === 유틸리티 메소드 ===

    // 현재 사용자 정보 가져오기
    getCurrentUser() {
        const userInfo = localStorage.getItem('userInfo');
        return userInfo ? JSON.parse(userInfo) : null;
    }

    // 로그인 여부 확인
    isLoggedIn() {
        return !!this.token;
    }

    // 게스트 여부 확인
    isGuest() {
        const user = this.getCurrentUser();
        return user?.isGuest || false;
    }
}

// 전역 API 클라이언트 인스턴스
window.apiClient = new ApiClient();