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
        
        // Mode selector elements
        this.modeButton = document.getElementById('modeButton');
        this.modeDropdown = document.getElementById('modeDropdown');
        this.modeText = document.getElementById('modeText');
        
        // User state
        this.currentUser = null;
        this.currentMode = 'authentic'; // 기본값: 찐 맛집
        
        // Session ID for conversation memory
        this.sessionId = this.generateSessionId();
        
        this.initEventListeners();
        this.initMenuListeners();
        this.initLoginListeners();
        this.initModeSelector();
        this.initGoogleAuth();
    }

    initEventListeners() {
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
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

    initModeSelector() {
        // Mode button click event
        this.modeButton.addEventListener('click', () => {
            this.toggleModeDropdown();
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.modeButton.contains(e.target) && !this.modeDropdown.contains(e.target)) {
                this.closeModeDropdown();
            }
        });

        // Mode option click events
        const modeOptions = document.querySelectorAll('.mode-option');
        modeOptions.forEach(option => {
            option.addEventListener('click', () => {
                const mode = option.getAttribute('data-mode');
                this.selectMode(mode);
            });
        });

        // Set initial selected mode
        this.updateModeSelection();
    }

    toggleModeDropdown() {
        const isOpen = this.modeDropdown.classList.contains('open');
        if (isOpen) {
            this.closeModeDropdown();
        } else {
            this.openModeDropdown();
        }
    }

    openModeDropdown() {
        this.modeDropdown.classList.add('open');
        this.modeButton.classList.add('open');
    }

    closeModeDropdown() {
        this.modeDropdown.classList.remove('open');
        this.modeButton.classList.remove('open');
    }

    selectMode(mode) {
        this.currentMode = mode;
        this.updateModeSelection();
        this.closeModeDropdown();
        
        // Add chat message when mode changes
        this.addModeChangeMessage(mode);
        
        // Save mode to localStorage
        localStorage.setItem('ddugi_mode', mode);
    }

    updateModeSelection() {
        // Update button text
        const modeTexts = {
            'authentic': '찐 맛집',
            'budget': '가성비',
            'date': '데이트 맛집'
        };
        this.modeText.textContent = modeTexts[this.currentMode];

        // Update selected option
        const modeOptions = document.querySelectorAll('.mode-option');
        modeOptions.forEach(option => {
            const mode = option.getAttribute('data-mode');
            if (mode === this.currentMode) {
                option.classList.add('selected');
            } else {
                option.classList.remove('selected');
            }
        });
    }

    addModeChangeMessage(mode) {
        const modeMessages = {
            'authentic': '안녕하소! 찐 맛집 모드로 바꿨네예! 이제 진짜 유명하고 전통있는 맛집들 위주로 찾아드릴게예~',
            'budget': '안녕하소! 가성비 맛집 모드로 바꿨네예! 이제 맛있으면서도 가격 착한 맛집들 위주로 찾아드릴게예~',
            'date': '안녕하소! 데이트 맛집 모드로 바꿨네예! 이제 분위기 좋고 특별한 날에 딱 맞는 맛집들 위주로 찾아드릴게예~'
        };
        
        const message = modeMessages[mode] || '모드가 변경되었습니다!';
        this.addMessage(message, 'bot');
    }

    restoreMode() {
        // Restore saved mode from localStorage
        const savedMode = localStorage.getItem('ddugi_mode');
        if (savedMode && ['authentic', 'budget', 'date'].includes(savedMode)) {
            this.currentMode = savedMode;
            this.updateModeSelection();
        }
    }

    // 세션 ID 생성 (대화 기억용)
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    async sendMessage() {
        const message = this.userInput.value.trim();
        if (!message) return;

        this.addMessage(message, 'user');
        this.userInput.value = '';
        this.sendButton.disabled = true;

        this.showTypingIndicator();

        try {
            const response = await this.callClaudeAPI(message);
            this.hideTypingIndicator();
            this.addMessage(response, 'bot');
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
                    message: userMessage,
                    mode: this.currentMode,
                    sessionId: this.sessionId
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            // 맛집 카드 표시 (맛집 추천 요청이고 데이터가 있는 경우에만)
            if (data.isRecommendation && data.restaurants && data.restaurants.length > 0) {
                this.displayRestaurantCards(data.restaurants);
            }
            
            return data.response;
        } catch (error) {
            console.error('API Error:', error);
            
            // Fallback responses when API is not available - NO FAKE RESTAURANTS
            const fallbackResponses = [
                `마! 뚜기다이가! 🐧\n\n지금 시스템에 문제가 있어서 제대로 된 맛집 추천을 못 해주고 있어...\n\n구체적인 맛집 추천을 받으려면:\n- 어느 동네인지 말해봐라 (해운대, 서면, 남포동 등)\n- 뭘 먹고 싶은지 말해봐라 (돼지국밥, 회, 갈비 등)\n\n시스템이 정상화되면 실제 데이터로 정확한 맛집을 알려줄게!`,
                
                `마! 잠깐 시스템이 꼬였네... 😅\n\n뚜기가 지금 제대로 된 맛집 데이터를 못 가져오고 있어.\n\n정확한 맛집 추천을 받으려면 다시 한 번 말해봐라!\n- 지역이랑 음식 종류를 구체적으로!\n\n가짜 정보는 안 알려줄 거니까 조금만 기다려봐라! 🐧`
            ];
            
            return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
        }
    }

    displayRestaurantCards(restaurants) {
        // 최대 5개로 제한
        const limitedRestaurants = restaurants.slice(0, 5);
        
        const cardsContainer = document.createElement('div');
        cardsContainer.className = 'restaurant-cards-container';
        
        // 네비게이션 버튼 생성
        const prevBtn = document.createElement('button');
        prevBtn.className = 'slide-nav slide-nav-prev';
        prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevBtn.disabled = true;
        
        const nextBtn = document.createElement('button');
        nextBtn.className = 'slide-nav slide-nav-next';
        nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
        
        // 카드 래퍼 생성
        const cardsWrapper = document.createElement('div');
        cardsWrapper.className = 'restaurant-cards-wrapper';
        
        limitedRestaurants.forEach(restaurant => {
            const card = this.createRestaurantCard(restaurant);
            cardsWrapper.appendChild(card);
        });
        
        // 슬라이드 네비게이션 이벤트
        prevBtn.addEventListener('click', () => {
            cardsWrapper.scrollBy({ left: -300, behavior: 'smooth' });
        });
        
        nextBtn.addEventListener('click', () => {
            cardsWrapper.scrollBy({ left: 300, behavior: 'smooth' });
        });
        
        // 스크롤 이벤트로 버튼 상태 업데이트
        cardsWrapper.addEventListener('scroll', () => {
            prevBtn.disabled = cardsWrapper.scrollLeft <= 0;
            nextBtn.disabled = cardsWrapper.scrollLeft >= cardsWrapper.scrollWidth - cardsWrapper.clientWidth;
        });
        
        // 초기 버튼 상태 설정
        setTimeout(() => {
            nextBtn.disabled = cardsWrapper.scrollWidth <= cardsWrapper.clientWidth;
        }, 100);
        
        cardsContainer.appendChild(prevBtn);
        cardsContainer.appendChild(cardsWrapper);
        cardsContainer.appendChild(nextBtn);
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot-message';
        messageDiv.appendChild(cardsContainer);
        
        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    createRestaurantCard(restaurant) {
        const card = document.createElement('div');
        card.className = 'restaurant-card';
        
        // 이미지 URL 설정 및 유효성 검사
        let imageUrl = '/images/placeholder-restaurant.svg'; // 기본 플레이스홀더
        
        if (restaurant.image && restaurant.image.trim() !== '') {
            // URL 형식 검사 및 정리
            let cleanUrl = restaurant.image.trim();
            if (cleanUrl.startsWith('https://') || cleanUrl.startsWith('http://')) {
                imageUrl = cleanUrl;
            }
        }
        
        card.innerHTML = `
            <div class="restaurant-card-image">
                <div class="image-placeholder">
                    <i class="fas fa-utensils"></i>
                    <span>이미지 로딩중...</span>
                </div>
                <img src="${imageUrl}" alt="${restaurant.name}" 
                     onload="this.style.display='block'; this.previousElementSibling.style.display='none';"
                     onerror="this.style.display='none'; this.previousElementSibling.style.display='flex'; this.previousElementSibling.innerHTML='<i class=\\"fas fa-image\\"></i><span>이미지 없음</span>';"
                     style="display: none;">
                <button class="bookmark-btn" onclick="window.chatBot.toggleBookmark('${restaurant.id}', this)">
                    <i class="far fa-bookmark"></i>
                </button>
            </div>
            <div class="restaurant-card-content">
                <h3 class="restaurant-name">${restaurant.name}</h3>
                <p class="restaurant-area">
                    <i class="fas fa-map-marker-alt"></i>
                    ${restaurant.area}
                </p>
                <p class="restaurant-description">${restaurant.description}</p>
                ${restaurant.specialties && restaurant.specialties.length > 0 ? `
                    <div class="restaurant-specialties">
                        ${restaurant.specialties.map(specialty => 
                            `<span class="specialty-tag">${specialty}</span>`
                        ).join('')}
                    </div>
                ` : ''}
                <div class="restaurant-google-review">
                    <span class="google-label">구글리뷰</span>
                    <span class="google-rating">${restaurant.googleRating && restaurant.googleRating > 0 ? restaurant.googleRating.toFixed(1) : 'N/A'}</span>
                    <span class="google-count">(${restaurant.googleReviewCount || 0}개)</span>
                </div>
                <div class="restaurant-card-actions">
                    <button class="action-btn save-btn" onclick="window.chatBot.saveRestaurant('${restaurant.id}')">
                        <i class="far fa-heart"></i>
                    </button>
                    <button class="action-btn share-btn" onclick="window.chatBot.shareRestaurant('${restaurant.id}')">
                        <i class="fas fa-share"></i>
                    </button>
                    <button class="action-btn directions-btn" onclick="window.chatBot.getDirections(${restaurant.coordinates.lat}, ${restaurant.coordinates.lng})">
                        <i class="fas fa-directions"></i>
                    </button>
                </div>
            </div>
        `;
        
        return card;
    }

    saveRestaurant(restaurantId) {
        console.log('맛집 저장:', restaurantId);
        // TODO: 로컬 스토리지 또는 서버에 저장
    }

    shareRestaurant(restaurantId) {
        console.log('맛집 공유:', restaurantId);
        if (navigator.share) {
            navigator.share({
                title: '부산 맛집 추천',
                text: '뚜기가 추천하는 부산 맛집',
                url: window.location.href
            });
        }
    }

    getDirections(lat, lng) {
        const url = `https://map.kakao.com/link/to/맛집,${lat},${lng}`;
        window.open(url, '_blank');
    }

    toggleBookmark(restaurantId, buttonElement) {
        const icon = buttonElement.querySelector('i');
        const isBookmarked = icon.classList.contains('fas');
        
        if (isBookmarked) {
            // 북마크 해제
            icon.classList.remove('fas');
            icon.classList.add('far');
            buttonElement.classList.remove('bookmarked');
            this.removeFromBookmarks(restaurantId);
        } else {
            // 북마크 추가
            icon.classList.remove('far');
            icon.classList.add('fas');
            buttonElement.classList.add('bookmarked');
            this.addToBookmarks(restaurantId);
        }
    }

    addToBookmarks(restaurantId) {
        const bookmarks = this.getBookmarks();
        if (!bookmarks.includes(restaurantId)) {
            bookmarks.push(restaurantId);
            localStorage.setItem('ddugi_bookmarks', JSON.stringify(bookmarks));
        }
    }

    removeFromBookmarks(restaurantId) {
        const bookmarks = this.getBookmarks();
        const index = bookmarks.indexOf(restaurantId);
        if (index > -1) {
            bookmarks.splice(index, 1);
            localStorage.setItem('ddugi_bookmarks', JSON.stringify(bookmarks));
        }
    }

    getBookmarks() {
        const bookmarks = localStorage.getItem('ddugi_bookmarks');
        return bookmarks ? JSON.parse(bookmarks) : [];
    }
}

// Initialize the chatbot when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.chatBot = new BusanChatBot();
    window.chatBot.restoreLoginState();
    window.chatBot.restoreMode();
});