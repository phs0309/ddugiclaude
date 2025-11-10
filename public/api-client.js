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

            console.log('🔍 API 요청:', {
                url,
                method: config.method || 'GET',
                hasAuth: !!this.token,
                userInfo: this.getCurrentUser()
            });

            const response = await fetch(url, config);
            
            // 응답이 JSON이 아닌 경우 처리
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('🚨 Non-JSON response:', {
                    status: response.status,
                    contentType,
                    text: text.substring(0, 200) + '...'
                });
                throw new Error(`Server returned non-JSON response: ${response.status} - ${text.substring(0, 100)}`);
            }
            
            const data = await response.json();

            if (!response.ok) {
                console.error('🚨 API 오류 응답:', { status: response.status, data });
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            console.log('✅ API 응답 성공:', { endpoint, data });
            return data;
        } catch (error) {
            console.error('API 요청 실패:', error);
            throw error;
        }
    }

    // === 인증 관련 API ===

    // Google 로그인
    async loginWithGoogle(idToken) {
        const data = await this.request('/api/basic-auth?action=google-login', {
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
        const data = await this.request('/api/basic-auth?action=guest-login', {
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
    }

    // 사용자 프로필 조회
    async getProfile() {
        return await this.request('/api/auth?action=profile');
    }

    // === 저장된 맛집 관련 API ===

    // 저장된 맛집 목록 조회
    async getSavedRestaurants() {
        console.log('📋 저장된 맛집 조회 시작:', {
            isLoggedIn: this.isLoggedIn(),
            isGuest: this.isGuest(),
            currentUser: this.getCurrentUser()
        });

        const data = await this.request('/api/user-restaurants');
        console.log('📋 API 응답:', data);
        
        return data;
    }

    // 맛집 저장
    async saveRestaurant(restaurant) {
        console.log('💾 맛집 저장 시작:', {
            restaurantId: restaurant.id,
            restaurantName: restaurant.name,
            isLoggedIn: this.isLoggedIn(),
            isGuest: this.isGuest()
        });

        const data = await this.request('/api/user-restaurants', {
            method: 'POST',
            body: JSON.stringify({ restaurant })
        });

        console.log('💾 저장 API 응답:', data);
        return data;
    }

    // 맛집 저장 해제
    async unsaveRestaurant(restaurantId) {
        const data = await this.request(`/api/user-restaurants?restaurantId=${restaurantId}`, {
            method: 'DELETE'
        });

        return data;
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