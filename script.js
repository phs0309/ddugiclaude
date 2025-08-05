class BusanChatBot {
    constructor() {
        this.chatMessages = document.getElementById('chatMessages');
        this.userInput = document.getElementById('userInput');
        this.sendButton = document.getElementById('sendButton');
        
        // Menu elements
        this.menuButton = document.getElementById('menuButton');
        this.menuOverlay = document.getElementById('menuOverlay');
        this.menuClose = document.getElementById('menuClose');
        
        // Login elements
        this.loginModal = document.getElementById('loginModal');
        this.loginClose = document.getElementById('loginClose');
        this.googleLoginBtn = document.getElementById('googleLoginBtn');
        
        // User state
        this.currentUser = null;
        this.userLocation = null;
        
        this.initEventListeners();
        this.initMenuListeners();
        this.initLoginListeners();
        this.initGoogleAuth();
    }

    initEventListeners() {
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
        
        // 입력창 클릭 시 제안 버튼 숨기기
        this.userInput.addEventListener('focus', () => this.hideSuggestionButtons());
        
        // 제안 버튼 클릭 이벤트
        this.initSuggestionButtons();
    }
    
    initSuggestionButtons() {
        const suggestionButtons = document.querySelectorAll('.suggestion-btn');
        const randomFoodBtn = document.getElementById('randomFoodBtn');
        
        // 랜덤 음식 목록
        const randomFoods = ['돼지국밥', '밀면', '회', '곰장어', '충무김밥', '비빔당면', '씨앗호떡', '부산어묵', '동래파전', '해물찜'];
        
        suggestionButtons.forEach(button => {
            button.addEventListener('click', async () => {
                let message = button.dataset.message;
                
                // 주변 맛집 버튼인 경우 GPS 위치 가져오기
                if (button.textContent.includes('주변')) {
                    await this.getUserLocation();
                    if (this.userLocation) {
                        // GPS 위치를 직접 sendMessage에 전달하고 입력창에는 표시하지 않음
                        this.sendLocationBasedMessage(message);
                        this.hideSuggestionButtons();
                        return;
                    }
                }
                // 랜덤 음식 버튼인 경우 랜덤하게 음식 선택
                else if (button.id === 'randomFoodBtn') {
                    const randomFood = randomFoods[Math.floor(Math.random() * randomFoods.length)];
                    message = `${randomFood} 먹고싶어!`;
                }
                
                this.userInput.value = message;
                this.sendMessage();
                this.hideSuggestionButtons();
            });
        });
    }

    // GPS 위치 가져오기 함수
    async getUserLocation() {
        if (this.userLocation) return this.userLocation;

        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                alert('위치 서비스를 지원하지 않는 브라우저입니다.');
                resolve(null);
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.userLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    resolve(this.userLocation);
                },
                (error) => {
                    console.log('위치 정보를 가져올 수 없습니다:', error);
                    // 위치 거부 시 부산 중심부 좌표로 설정 (서면)
                    this.userLocation = { lat: 35.1579, lng: 129.0602 };
                    alert('위치 정보 접근이 거부되었습니다. 서면 지역 기준으로 추천해드릴게요!');
                    resolve(this.userLocation);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000 // 5분간 캐시
                }
            );
        });
    }

    // 두 GPS 좌표 간의 거리 계산 (Haversine formula)
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // 지구 반지름 (km)
        const dLat = this.toRadians(lat2 - lat1);
        const dLng = this.toRadians(lng2 - lng1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
            Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c; // 거리 (km)
    }

    toRadians(degrees) {
        return degrees * (Math.PI/180);
    }

    // 위치 기반 메시지 전송 (입력창에 GPS 좌표 표시하지 않음)
    async sendLocationBasedMessage(message) {
        // 사용자에게는 원본 메시지만 표시
        this.addMessage(message, 'user');
        this.userInput.value = '';
        this.sendButton.disabled = true;

        this.showTypingIndicator();

        try {
            // 서버에는 GPS 좌표 포함된 메시지 전송
            const messageWithLocation = `${message} (위도: ${this.userLocation.lat}, 경도: ${this.userLocation.lng})`;
            const responseData = await this.callClaudeAPI(messageWithLocation);
            this.hideTypingIndicator();
            
            if (responseData.isRecommendation && responseData.restaurants && responseData.restaurants.length > 0) {
                // 맛집 추천 응답인 경우 카드와 함께 표시
                this.addMessageWithRestaurants(responseData.response, responseData.restaurants);
            } else {
                // 일반 응답인 경우 텍스트만 표시
                this.addMessage(responseData.response || responseData, 'bot');
            }
        } catch (error) {
            console.error('Error:', error);
            this.hideTypingIndicator();
            this.addMessage('죄송합니다. 오류가 발생했습니다. 다시 시도해주세요.', 'bot');
        }

        this.sendButton.disabled = false;
    }
    
    hideSuggestionButtons() {
        const suggestionButtons = document.getElementById('suggestionButtons');
        if (suggestionButtons && !suggestionButtons.classList.contains('hidden')) {
            suggestionButtons.classList.add('hidden');
            // 완전히 숨긴 후 display none 처리
            setTimeout(() => {
                suggestionButtons.style.display = 'none';
            }, 300);
        }
    }

    initMenuListeners() {
        // Menu toggle
        this.menuButton.addEventListener('click', () => this.toggleMenu());
        this.menuClose.addEventListener('click', () => this.closeMenu());
        
        // Close menu when clicking overlay
        this.menuOverlay.addEventListener('click', (e) => {
            if (e.target === this.menuOverlay) {
                this.closeMenu();
            }
        });

        // Menu item listeners
        document.getElementById('loginMenu').addEventListener('click', (e) => {
            e.preventDefault();
            this.showLogin();
        });

        document.getElementById('historyMenu').addEventListener('click', (e) => {
            e.preventDefault();
            this.showHistory();
        });

        document.getElementById('savedMenu').addEventListener('click', (e) => {
            e.preventDefault();
            this.showSavedRestaurants();
        });

        document.getElementById('settingsMenu').addEventListener('click', (e) => {
            e.preventDefault();
            this.showSettings();
        });
    }

    toggleMenu() {
        this.menuOverlay.classList.toggle('active');
    }

    closeMenu() {
        this.menuOverlay.classList.remove('active');
    }

    showLogin() {
        this.closeMenu();
        if (this.currentUser) {
            this.showUserProfile();
        } else {
            this.loginModal.classList.add('active');
        }
    }

    initLoginListeners() {
        // Close login modal
        this.loginClose.addEventListener('click', () => this.closeLogin());
        
        // Close modal when clicking overlay
        this.loginModal.addEventListener('click', (e) => {
            if (e.target === this.loginModal) {
                this.closeLogin();
            }
        });

        // Google login button
        this.googleLoginBtn.addEventListener('click', () => this.handleGoogleLogin());
    }

    closeLogin() {
        this.loginModal.classList.remove('active');
    }

    initGoogleAuth() {
        // Google OAuth2 설정
        window.onload = () => {
            if (typeof google !== 'undefined') {
                google.accounts.id.initialize({
                    client_id: 'YOUR_GOOGLE_CLIENT_ID', // 여기에 실제 Google Client ID를 입력하세요
                    callback: this.handleCredentialResponse.bind(this)
                });
            }
        };
    }

    handleGoogleLogin() {
        if (typeof google !== 'undefined') {
            google.accounts.id.prompt();
        } else {
            alert('Google 로그인 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
        }
    }

    handleCredentialResponse(response) {
        // JWT 토큰을 디코딩하여 사용자 정보 추출
        const payload = this.parseJwt(response.credential);
        
        this.currentUser = {
            id: payload.sub,
            name: payload.name,
            email: payload.email,
            picture: payload.picture
        };

        // 로그인 성공 처리
        this.onLoginSuccess();
    }

    parseJwt(token) {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    }

    onLoginSuccess() {
        this.closeLogin();
        this.updateMenuForLoggedInUser();
        
        // 로그인 성공 메시지
        this.addMessage(`안녕하세요 ${this.currentUser.name}님! 🎉<br>이제 개인화된 맛집 추천을 받아보실 수 있어요!`, 'bot');
        
        // 로컬 스토리지에 사용자 정보 저장
        localStorage.setItem('ddugi_user', JSON.stringify(this.currentUser));
    }

    updateMenuForLoggedInUser() {
        const loginMenu = document.getElementById('loginMenu');
        if (this.currentUser) {
            loginMenu.innerHTML = `
                <span class="menu-icon">👤</span>
                ${this.currentUser.name}
            `;
        }
    }

    showUserProfile() {
        if (this.currentUser) {
            const confirmLogout = confirm(`${this.currentUser.name}님으로 로그인되어 있습니다.\n로그아웃하시겠습니까?`);
            if (confirmLogout) {
                this.logout();
            }
        }
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('ddugi_user');
        
        // 메뉴 업데이트
        const loginMenu = document.getElementById('loginMenu');
        loginMenu.innerHTML = `
            <span class="menu-icon">👤</span>
            로그인
        `;
        
        this.addMessage('로그아웃되었습니다. 언제든지 다시 로그인해주세요! 👋', 'bot');
    }

    // 페이지 로드 시 저장된 로그인 상태 복원
    restoreLoginState() {
        const savedUser = localStorage.getItem('ddugi_user');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            this.updateMenuForLoggedInUser();
        }
    }

    showHistory() {
        this.closeMenu();
        alert('이전 대화기록 기능은 준비 중입니다! 💬');
    }

    showSavedRestaurants() {
        this.closeMenu();
        alert('저장된 맛집 기능은 준비 중입니다! ❤️');
    }

    showSettings() {
        this.closeMenu();
        alert('설정 기능은 준비 중입니다! ⚙️');
    }

    async sendMessage() {
        const message = this.userInput.value.trim();
        if (!message) return;

        this.addMessage(message, 'user');
        this.userInput.value = '';
        this.sendButton.disabled = true;

        this.showTypingIndicator();

        try {
            const responseData = await this.callClaudeAPI(message);
            this.hideTypingIndicator();
            
            if (responseData.isRecommendation && responseData.restaurants && responseData.restaurants.length > 0) {
                // 맛집 추천 응답인 경우 카드와 함께 표시
                this.addMessageWithRestaurants(responseData.response, responseData.restaurants);
            } else {
                // 일반 응답인 경우 텍스트만 표시
                this.addMessage(responseData.response || responseData, 'bot');
            }
        } catch (error) {
            this.hideTypingIndicator();
            this.addMessage('죄송합니다. 잠시 문제가 발생했어요. 다시 시도해주세요! 🙏', 'bot');
        }

        this.sendButton.disabled = false;
    }

    addMessage(content, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.innerHTML = content.replace(/\n/g, '<br>');
        
        messageDiv.appendChild(contentDiv);
        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    addMessageWithRestaurants(content, restaurants) {
        // 먼저 텍스트 메시지 추가
        this.addMessage(content, 'bot');
        
        // 맛집 카드 컨테이너 생성
        const cardContainer = document.createElement('div');
        cardContainer.className = 'restaurant-cards-container';
        
        const cardsWrapper = document.createElement('div');
        cardsWrapper.className = 'restaurant-cards-wrapper';
        
        // 최대 3개의 맛집만 표시
        const restaurantsToShow = restaurants.slice(0, 3);
        
        restaurantsToShow.forEach(restaurant => {
            const card = this.createRestaurantCard(restaurant);
            cardsWrapper.appendChild(card);
        });
        
        cardContainer.appendChild(cardsWrapper);
        
        // 메시지 영역에 카드 컨테이너 추가
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot-message restaurant-cards-message';
        messageDiv.appendChild(cardContainer);
        
        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    createRestaurantCard(restaurant) {
        const card = document.createElement('div');
        card.className = 'restaurant-card';
        
        const savedRestaurants = this.getSavedRestaurants();
        const isSaved = savedRestaurants.includes(restaurant.id);
        const heartIcon = isSaved ? '♥' : '♡';
        const heartColor = isSaved ? '#ff4757' : '#666';
        const buttonTitle = isSaved ? '저장된 맛집' : '맛집 저장하기';
        
        card.innerHTML = `
            <div class="restaurant-card-header">
                <button class="heart-button" onclick="window.chatBot.toggleSaveRestaurant('${restaurant.id}', this)" 
                        title="${buttonTitle}">
                    <span class="heart-icon" style="color: ${heartColor}">${heartIcon}</span>
                </button>
            </div>
            <div class="restaurant-card-image">
                <img src="${restaurant.thumbnail}" alt="${restaurant.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04NSA2NUg2NVY4NUg4NVY2NVoiIGZpbGw9IiNEMUQ1REIiLz4KPHA+dGggZD0iTTEwNSA2MEw5MCA3NUwxMDUgOTBMMTIwIDc1TDEwNSA2MFoiIGZpbGw9IiNEMUQ1REIiLz4KPC9zdmc+'" />
            </div>
            <div class="restaurant-card-content">
                <h3 class="restaurant-card-title">${restaurant.name}</h3>
                <p class="restaurant-card-review">리뷰 요약: ${restaurant.reviewSummary}</p>
                <div class="restaurant-card-rating">
                    <span class="star-icon">★</span>
                    <span class="rating-score">4.5</span>
                </div>
                <div class="restaurant-card-info">
                    <span class="restaurant-card-price">${restaurant.priceRange}</span>
                </div>
                <a href="${restaurant.naverPlaceUrl}" target="_blank" class="restaurant-card-link">
                    지도에서 보기 →
                </a>
            </div>
        `;
        
        return card;
    }

    showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.id = 'typingIndicator';
        
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('div');
            dot.className = 'typing-dot';
            typingDiv.appendChild(dot);
        }
        
        this.chatMessages.appendChild(typingDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    async callClaudeAPI(userMessage) {
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: userMessage
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('API Error:', error);
            
            // Fallback responses when API is not available
            const fallbackResponses = [
                `안녕하세요! 뚜기입니다 🐧\n\n죄송하지만 지금 API 연결에 문제가 있어서 제대로 된 맛집 추천을 드리지 못하고 있어요.\n\n대신 부산의 대표 맛집 몇 곳을 추천드릴게요:\n\n🍜 **돼지국밥골목** (서면)\n- 부산의 대표 음식인 돼지국밥을 맛볼 수 있어요\n- 가격: 8,000원~10,000원\n\n🐟 **자갈치시장**\n- 신선한 횟감과 구이를 즐길 수 있어요\n- 부산 여행 필수 코스!\n\n🥘 **광안리 먹자골목**\n- 다양한 해산물 요리와 야경을 함께 즐겨보세요\n\nAPI 키를 설정하시면 더 자세한 맛집 정보를 드릴 수 있어요! 😊`,
                
                `뚜기가 잠깐 바빠서 답변이 늦었어요! 🐧\n\nAPI 설정이 필요하지만, 그래도 부산 맛집 하나 추천드릴게요:\n\n🍲 **밀면**\n- 부산의 대표 면요리예요\n- 시원하고 깔끔한 맛이 일품!\n- 여름에 특히 인기가 많아요\n\n더 많은 맛집 정보를 원하시면 Claude API 키를 설정해주세요! 😋`
            ];
            
            return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
        }
    }

    toggleSaveRestaurant(restaurantId, buttonElement) {
        const heartIcon = buttonElement.querySelector('.heart-icon');
        const savedRestaurants = this.getSavedRestaurants();
        
        if (savedRestaurants.includes(restaurantId)) {
            // 저장 취소
            const updatedSaved = savedRestaurants.filter(id => id !== restaurantId);
            localStorage.setItem('savedRestaurants', JSON.stringify(updatedSaved));
            heartIcon.textContent = '♡';
            heartIcon.style.color = '#666';
            buttonElement.title = '맛집 저장하기';
            
            // 간단한 피드백
            this.showSaveNotification('저장 취소했어요!', 'remove');
        } else {
            // 저장 추가
            savedRestaurants.push(restaurantId);
            localStorage.setItem('savedRestaurants', JSON.stringify(savedRestaurants));
            heartIcon.textContent = '♥';
            heartIcon.style.color = '#ff4757';
            buttonElement.title = '저장된 맛집';
            
            // 간단한 피드백
            this.showSaveNotification('맛집을 저장했어요!', 'add');
        }
    }

    getSavedRestaurants() {
        const saved = localStorage.getItem('savedRestaurants');
        return saved ? JSON.parse(saved) : [];
    }

    showSaveNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `save-notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // 애니메이션을 위한 약간의 지연
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // 3초 후 제거
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Initialize the chatbot when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.chatBot = new BusanChatBot();
    window.chatBot.restoreLoginState();
});