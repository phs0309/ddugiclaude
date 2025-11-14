// Instagram DM Style - 부산 맛집 뚜기 챗봇

class InstagramStyleChatBot {
    constructor() {
        this.messagesContainer = document.getElementById('chatMessages');
        this.userInput = document.getElementById('userInput');
        this.sendButton = document.getElementById('sendButton');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.quickSuggestions = document.getElementById('quickSuggestions');
        
        // 세션 ID 관리
        this.sessionId = this.getOrCreateSessionId();
        this.userId = this.getUserId();
        
        console.log('🔑 세션 ID:', this.sessionId);
        
        this.initEventListeners();
        this.loadInitialRecommendations();
        this.updateTimestamps();
        this.checkLocationAndShowNearbyRestaurants();
    }

    // 세션 ID 생성 또는 가져오기
    getOrCreateSessionId() {
        let sessionId = sessionStorage.getItem('chatSessionId');
        if (!sessionId) {
            sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            sessionStorage.setItem('chatSessionId', sessionId);
        }
        return sessionId;
    }

    // 사용자 ID 가져오기 (로그인된 경우)
    getUserId() {
        // apiClient가 있다면 사용자 ID 반환
        if (typeof apiClient !== 'undefined' && apiClient.isLoggedIn()) {
            return apiClient.getCurrentUser()?.id || null;
        }
        return null;
    }

    // 새로운 대화 시작 (세션 ID 재생성)
    startNewConversation() {
        sessionStorage.removeItem('chatSessionId');
        this.sessionId = this.getOrCreateSessionId();
        console.log('🔄 새로운 대화 시작:', this.sessionId);
        
        // 채팅 메시지 초기화
        this.messagesContainer.innerHTML = '';
        this.loadInitialRecommendations();
    }

    initEventListeners() {
        // 전송 버튼 클릭
        this.sendButton.addEventListener('click', () => this.sendMessage());
        
        // Enter 키 입력
        this.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // 입력 필드 상태에 따른 전송 버튼 활성화
        this.userInput.addEventListener('input', () => {
            this.updateSendButton();
        });

        // 스크롤 관련 이벤트
        this.messagesContainer.addEventListener('scroll', () => {
            this.handleScroll();
        });

        // 입력 필드 포커스
        this.userInput.focus();
    }

    updateSendButton() {
        const hasText = this.userInput.value.trim().length > 0;
        this.sendButton.style.opacity = hasText ? '1' : '0.5';
        this.sendButton.disabled = !hasText;
    }

    async loadInitialRecommendations() {
        try {
            const response = await fetch('/api/random/3');
            const data = await response.json();
            
            if (data.restaurants && data.restaurants.length > 0) {
                // 초기 메시지에 모달 버튼 추가
                setTimeout(() => {
                    this.addModalButton(data.restaurants, '오늘의 추천 맛집');
                }, 1000);
            }
        } catch (error) {
            console.log('초기 추천 로드 실패:', error);
        }
    }

    async sendMessage() {
        const message = this.userInput.value.trim();
        if (!message) return;

        // 빠른 추천 숨기기
        this.hideQuickSuggestions();

        // 주변 맛집 요청인지 확인
        if (this.detectNearbyRequest(message)) {
            this.addMessage(message, 'user');
            this.userInput.value = '';
            this.updateSendButton();
            
            // 추천 시스템에 메시지 전달
            suggestionManager.onUserMessage(message);
            
            // 주변 맛집 검색 실행
            await this.handleNearbyRequest();
            return;
        }

        // 사용자 메시지 표시
        this.addMessage(message, 'user');
        this.userInput.value = '';
        this.updateSendButton();
        
        // 추천 시스템에 메시지 전달
        suggestionManager.onUserMessage(message);

        // 타이핑 인디케이터 표시
        this.showTypingIndicator();

        try {
            const response = await this.callChatAPI(message);
            this.hideTypingIndicator();
            
            // 디버깅을 위한 콘솔 로그
            console.log('📡 API 응답:', {
                message: message,
                hasRestaurants: !!(response.restaurants && response.restaurants.length > 0),
                restaurantCount: response.restaurants?.length || 0,
                analysis: response.analysis,
                type: response.type,
                debug: response.debug
            });
            
            // 디버그 정보가 있으면 상세 출력
            if (response.debug) {
                console.log('🔍 상세 디버그:', response.debug);
            }
            
            // 뚜기 응답 표시
            this.addMessage(response.message, 'bot');
            
            // 맛집 데이터가 있으면 모달 버튼과 모달 표시
            if (response.restaurants && response.restaurants.length > 0) {
                // 모달 버튼 추가
                setTimeout(() => {
                    // AI 추천 이유를 제목으로 사용
                    let title = response.analysis?.aiReasoning || '맛집 추천';
                    this.addModalButton(response.restaurants, title);
                }, 300);
                
                // AI가 맛집을 추천한 경우 자동으로 모달 표시
                if (this.detectRestaurantRequest(response)) {
                    // AI 추천 이유를 제목으로 사용
                    let title = response.analysis?.aiReasoning || '맛집 추천';
                    this.delayedShowArtifacts(response.restaurants, title);
                }
            } else if (response.type === 'recommendation' && response.restaurants.length === 0) {
                // AI가 맛집 요청으로 판단했지만 추천할 맛집이 없는 경우
                setTimeout(() => {
                    this.addMessage(`😅 요청하신 조건에 맞는 맛집 데이터가 없어요!\n다른 조건으로 검색해보세요.`, 'bot');
                }, 500);
            }
            
            // 분석 결과 로그
            if (response.analysis) {
                console.log('🔍 분석 결과:', response.analysis);
            }

            // Claude AI 응답 여부 표시
            if (response.aiGenerated) {
                console.log('🤖 Claude AI 응답 생성됨');
            } else {
                console.log('🔧 기본 응답 사용됨');
            }
            
        } catch (error) {
            this.hideTypingIndicator();
            console.error('API Error:', error);
            
            // 서버 에러 응답에서 실제 메시지 추출 시도
            if (error.response && error.response.message) {
                this.addMessage(error.response.message, 'bot');
            } else if (error.message && error.message.includes('HTTP error! status: 500')) {
                // 500 에러인 경우 서버에서 받은 응답 내용을 가져오려고 시도
                this.addMessage('서버에서 오류가 발생했습니다. 개발자 도구의 네트워크 탭에서 자세한 내용을 확인해주세요.', 'bot');
            } else {
                this.addMessage(`연결 오류: ${error.message}`, 'bot');
            }
        }
    }

    addMessage(content, sender) {
        const messageGroup = document.createElement('div');
        messageGroup.className = `message-group ${sender}-group`;
        
        // 아바타 (봇 메시지에만)
        if (sender === 'bot') {
            const messageAvatar = document.createElement('div');
            messageAvatar.className = 'message-avatar';
            const avatarImage = document.createElement('div');
            avatarImage.className = 'avatar-image';
            avatarImage.textContent = '🐧';
            messageAvatar.appendChild(avatarImage);
            messageGroup.appendChild(messageAvatar);
        }
        
        // 메시지 내용
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        const messageBubble = document.createElement('div');
        messageBubble.className = `message-bubble ${sender}-bubble`;
        
        // 메시지 텍스트 처리 (줄바꿈 지원)
        const lines = content.split('\n');
        lines.forEach((line, index) => {
            if (index > 0) {
                messageBubble.appendChild(document.createElement('br'));
            }
            const textNode = document.createTextNode(line);
            messageBubble.appendChild(textNode);
        });
        
        messageContent.appendChild(messageBubble);
        
        // 타임스탬프
        const messageTime = document.createElement('div');
        messageTime.className = 'message-time';
        messageTime.textContent = this.formatTime(new Date());
        messageContent.appendChild(messageTime);
        
        messageGroup.appendChild(messageContent);
        this.messagesContainer.appendChild(messageGroup);
        
        // 스크롤을 맨 아래로
        this.scrollToBottom();
        
        return messageContent;
    }

    displayRestaurantCards(restaurants, isInitial = false) {
        const cardsContainer = document.createElement('div');
        cardsContainer.className = 'restaurant-cards-container';
        
        const cardsWrapper = document.createElement('div');
        cardsWrapper.className = 'restaurant-cards-wrapper';
        
        restaurants.forEach(restaurant => {
            const card = this.createRestaurantCard(restaurant);
            cardsWrapper.appendChild(card);
        });
        
        cardsContainer.appendChild(cardsWrapper);
        
        if (isInitial) {
            // 초기 추천은 첫 번째 봇 메시지에 추가
            const firstBotMessage = this.messagesContainer.querySelector('.bot-group .message-content');
            if (firstBotMessage) {
                firstBotMessage.appendChild(cardsContainer);
            }
        } else {
            // 마지막 봇 메시지에 카드 추가
            const lastBotMessage = this.messagesContainer.querySelector('.bot-group:last-child .message-content');
            if (lastBotMessage) {
                lastBotMessage.appendChild(cardsContainer);
            }
        }
        
        this.scrollToBottom();
    }

    createRestaurantCard(restaurant) {
        const card = document.createElement('div');
        card.className = 'restaurant-card';
        
        // 카테고리에 따른 이모지
        const categoryEmojis = {
            '한식': '🍲',
            '해산물': '🦐',
            '간식': '🍡',
            '카페': '☕'
        };
        
        const emoji = categoryEmojis[restaurant.category] || '🍽️';
        
        card.innerHTML = `
            <div class="restaurant-card-image">
                ${emoji}
            </div>
            <div class="restaurant-card-content">
                <h3 class="restaurant-name">${restaurant.name}</h3>
                <p class="restaurant-area">
                    <i class="fas fa-map-marker-alt"></i>
                    ${restaurant.area} · ${restaurant.category}
                </p>
                <p class="restaurant-description">${restaurant.description}</p>
                ${restaurant.specialties && restaurant.specialties.length > 0 ? `
                    <div class="restaurant-specialties">
                        ${restaurant.specialties.slice(0, 3).map(specialty => 
                            `<span class="specialty-tag">${specialty}</span>`
                        ).join('')}
                    </div>
                ` : ''}
                <div class="restaurant-rating">
                    <i class="fas fa-star"></i>
                    <span>${restaurant.rating}</span>
                    <span>(${restaurant.reviewCount}개 리뷰)</span>
                    <span style="margin-left: 8px; color: #4caf50; font-size: 12px;">₩${restaurant.priceRange}</span>
                </div>
            </div>
        `;
        
        // 카드 클릭 시 상세 정보 표시
        card.addEventListener('click', () => {
            this.showRestaurantDetail(restaurant);
        });
        
        // 카드 hover 효과 개선
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-4px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0) scale(1)';
        });
        
        return card;
    }

    showRestaurantDetail(restaurant) {
        const detail = `📍 ${restaurant.name}

🏠 ${restaurant.address}
📞 ${restaurant.phone}
⏰ ${restaurant.hours}
💰 ${restaurant.priceRange}원
⭐ ${restaurant.rating}/5 (${restaurant.reviewCount}개 리뷰)

${restaurant.description}`;
        
        this.addMessage(detail, 'bot');
    }

    async callChatAPI(message) {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                message,
                sessionId: this.sessionId,
                userId: this.userId
            })
        });

        if (!response.ok) {
            // 에러 응답의 내용을 파싱해서 실제 에러 메시지 추출
            try {
                const errorData = await response.json();
                const error = new Error(`HTTP error! status: ${response.status}`);
                error.response = errorData;
                throw error;
            } catch (parseError) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        }

        return await response.json();
    }

    showTypingIndicator() {
        this.typingIndicator.style.display = 'block';
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        this.typingIndicator.style.display = 'none';
    }

    hideQuickSuggestions() {
        if (this.quickSuggestions) {
            this.quickSuggestions.style.opacity = '0';
            this.quickSuggestions.style.transform = 'translateY(10px)';
            setTimeout(() => {
                this.quickSuggestions.style.display = 'none';
            }, 200);
        }
    }

    scrollToBottom() {
        setTimeout(() => {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }, 100);
    }

    handleScroll() {
        // 스크롤 관련 추가 기능 (읽음 표시 등)
        const isAtBottom = this.messagesContainer.scrollTop + this.messagesContainer.clientHeight >= this.messagesContainer.scrollHeight - 10;
        
        if (isAtBottom) {
            // 메시지 읽음 처리 등
        }
    }

    formatTime(date) {
        const now = new Date();
        const diffMinutes = Math.floor((now - date) / 1000 / 60);
        
        if (diffMinutes < 1) return '방금 전';
        if (diffMinutes < 60) return `${diffMinutes}분 전`;
        if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}시간 전`;
        
        return date.toLocaleDateString('ko-KR', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    updateTimestamps() {
        // 5분마다 타임스탬프 업데이트
        setInterval(() => {
            const timeElements = document.querySelectorAll('.message-time');
            timeElements.forEach(element => {
                const messageTime = element.getAttribute('data-time');
                if (messageTime) {
                    element.textContent = this.formatTime(new Date(messageTime));
                }
            });
        }, 300000); // 5분
    }

    // GPS 위치 확인 및 주변 맛집 추천
    async checkLocationAndShowNearbyRestaurants() {
        // 이미 위치 권한을 요청했는지 확인
        if (localStorage.getItem('locationChecked')) {
            return;
        }

        // 위치 서비스 지원 여부 확인
        if (!navigator.geolocation) {
            console.log('이 브라우저는 위치 서비스를 지원하지 않습니다');
            return;
        }

        // 사용자에게 위치 권한 요청 전 안내 메시지
        setTimeout(() => {
            this.addMessage('현재 위치 기반으로 주변 맛집을 추천해드릴까요? 📍\n위치 권한을 허용해주시면 더 정확한 추천이 가능해요!', 'bot');
            
            // 위치 권한 요청 카드 추가
            this.addLocationPermissionCard();
        }, 2000); // 초기 메시지 후 2초 뒤
    }

    // 위치 권한 요청 카드 추가
    addLocationPermissionCard() {
        const cardContainer = document.createElement('div');
        cardContainer.className = 'location-permission-container';
        
        const card = document.createElement('div');
        card.className = 'location-permission-card';
        card.innerHTML = `
            <div class="location-card-content">
                <div class="location-icon">📍</div>
                <h3>주변 맛집 추천</h3>
                <p>현재 위치를 기반으로<br>가까운 부산 맛집을 찾아드릴게요!</p>
                <div class="location-actions">
                    <button class="location-btn allow" onclick="window.instagramChatBot.requestLocation()">
                        <i class="fas fa-location-arrow"></i>
                        위치 허용하기
                    </button>
                    <button class="location-btn deny" onclick="window.instagramChatBot.denyLocation()">
                        <i class="fas fa-times"></i>
                        나중에
                    </button>
                </div>
            </div>
        `;
        
        cardContainer.appendChild(card);
        
        // 마지막 봇 메시지에 카드 추가
        const lastBotMessage = this.messagesContainer.querySelector('.bot-group:last-child .message-content');
        if (lastBotMessage) {
            lastBotMessage.appendChild(cardContainer);
        }
        
        this.scrollToBottom();
    }

    // 위치 권한 허용 처리
    async requestLocation() {
        try {
            // 위치 권한 카드 제거
            const locationCard = document.querySelector('.location-permission-container');
            if (locationCard) {
                locationCard.remove();
            }

            this.addMessage('위치를 확인하는 중...', 'user');
            this.showTyping();

            const position = await this.getCurrentPosition();
            const { latitude, longitude } = position.coords;

            console.log('사용자 위치:', latitude, longitude);

            // 주변 맛집 검색
            const response = await fetch(`/api/nearby-restaurants?lat=${latitude}&lng=${longitude}&radius=3`);
            const data = await response.json();

            this.hideTyping();

            if (data.success && data.restaurants.length > 0) {
                this.addMessage(`현재 위치 주변 ${data.searchRadius}km 내에서 ${data.count}곳의 맛집을 찾았어요! 🎯`, 'bot');
                
                // 주변 맛집 카드 표시
                setTimeout(() => {
                    this.displayRestaurantCards(data.restaurants);
                    this.delayedShowArtifacts(data.restaurants, '주변 맛집');
                }, 500);
                
            } else if (data.isOutsideBusan) {
                this.addMessage('현재 위치가 부산을 벗어나 있네요! 🌊\n부산 전체 맛집을 추천해드릴게요!', 'bot');
                this.loadInitialRecommendations();
                
            } else {
                this.addMessage(`주변 ${data.searchRadius}km 내에는 등록된 맛집이 없어요 😅\n부산 전체 맛집을 둘러보시는 건 어떨까요?`, 'bot');
                this.loadInitialRecommendations();
            }

            // 위치 확인 완료 표시
            localStorage.setItem('locationChecked', 'true');
            localStorage.setItem('userLocation', JSON.stringify({ lat: latitude, lng: longitude }));

        } catch (error) {
            this.hideTyping();
            console.error('위치 확인 오류:', error);
            
            if (error.code === error.PERMISSION_DENIED) {
                this.addMessage('위치 권한이 거부되었어요 😊\n괜찮아요! 부산 전체 맛집을 추천해드릴게요!', 'bot');
            } else if (error.code === error.POSITION_UNAVAILABLE) {
                this.addMessage('현재 위치를 확인할 수 없어요 📍\n부산 전체 맛집을 추천해드릴게요!', 'bot');
            } else {
                this.addMessage('위치 확인 중 문제가 발생했어요 😅\n부산 전체 맛집을 추천해드릴게요!', 'bot');
            }
            
            this.loadInitialRecommendations();
            localStorage.setItem('locationChecked', 'true');
        }
    }

    // 위치 권한 거부 처리
    denyLocation() {
        const locationCard = document.querySelector('.location-permission-container');
        if (locationCard) {
            locationCard.remove();
        }
        
        this.addMessage('나중에 할게요', 'user');
        this.addMessage('알겠어요! 언제든지 위치 기반 추천이 필요하시면 "주변 맛집" 이라고 말해주세요! 😊', 'bot');
        
        localStorage.setItem('locationChecked', 'true');
    }

    // GPS 위치 가져오기 (Promise 래퍼)
    getCurrentPosition() {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000 // 5분간 캐시 사용
            });
        });
    }

    // 주변 맛집 요청 처리
    async handleNearbyRequest() {
        this.showTyping();

        try {
            // 저장된 위치가 있는지 확인
            const savedLocation = localStorage.getItem('userLocation');
            let position = null;

            if (savedLocation) {
                const location = JSON.parse(savedLocation);
                position = { coords: { latitude: location.lat, longitude: location.lng } };
                console.log('저장된 위치 사용:', location);
            } else {
                // 새로 위치 요청
                try {
                    position = await this.getCurrentPosition();
                    const { latitude, longitude } = position.coords;
                    localStorage.setItem('userLocation', JSON.stringify({ lat: latitude, lng: longitude }));
                    console.log('새 위치 확인:', latitude, longitude);
                } catch (error) {
                    this.hideTyping();
                    console.error('위치 확인 실패:', error);
                    this.addMessage('위치 정보를 가져올 수 없어요 😅\n대신 부산 전체 맛집을 추천해드릴게요!', 'bot');
                    this.loadInitialRecommendations();
                    return;
                }
            }

            const { latitude, longitude } = position.coords;

            // 주변 맛집 검색
            const response = await fetch(`/api/nearby-restaurants?lat=${latitude}&lng=${longitude}&radius=3`);
            const data = await response.json();

            this.hideTyping();

            if (data.success && data.restaurants.length > 0) {
                this.addMessage(`현재 위치 주변에서 ${data.count}곳의 맛집을 찾았어요! 🎯`, 'bot');
                
                // 주변 맛집 카드 표시
                setTimeout(() => {
                    this.displayRestaurantCards(data.restaurants);
                    this.delayedShowArtifacts(data.restaurants, '주변 맛집');
                }, 500);
                
            } else if (data.isOutsideBusan) {
                this.addMessage('현재 위치가 부산을 벗어나 있어서 주변 맛집을 찾을 수 없어요! 🌊\n부산 전체 맛집을 추천해드릴게요!', 'bot');
                this.loadInitialRecommendations();
                
            } else {
                this.addMessage(`주변에는 등록된 맛집이 없어요 😅\n조금 더 넓은 범위에서 찾아볼까요?`, 'bot');
                
                // 더 넓은 범위로 재검색
                const widerResponse = await fetch(`/api/nearby-restaurants?lat=${latitude}&lng=${longitude}&radius=5`);
                const widerData = await widerResponse.json();
                
                if (widerData.success && widerData.restaurants.length > 0) {
                    this.addMessage(`5km 내에서 ${widerData.count}곳을 찾았어요! 🎯`, 'bot');
                    setTimeout(() => {
                        this.displayRestaurantCards(widerData.restaurants);
                        this.delayedShowArtifacts(widerData.restaurants, '주변 맛집 (5km)');
                    }, 500);
                } else {
                    this.addMessage('부산 전체 맛집을 추천해드릴게요!', 'bot');
                    this.loadInitialRecommendations();
                }
            }

        } catch (error) {
            this.hideTyping();
            console.error('주변 맛집 검색 오류:', error);
            this.addMessage('주변 맛집 검색 중 오류가 발생했어요 😅\n부산 전체 맛집을 추천해드릴게요!', 'bot');
            this.loadInitialRecommendations();
        }
    }

    // AI가 맛집 요청 여부를 판단하므로 키워드 감지 불필요
    detectRestaurantRequest(response) {
        // API 응답에서 맛집 데이터 유무로 판단
        return response.restaurants && response.restaurants.length > 0;
    }

    // 주변 맛집 요청 감지
    detectNearbyRequest(message) {
        const nearbyKeywords = [
            '주변', '근처', '가까운', '현재 위치', '여기서', '이 근처'
        ];
        
        const foodKeywords = [
            '맛집', '식당', '음식', '밥', '먹을', '추천'
        ];
        
        return nearbyKeywords.some(keyword => message.includes(keyword)) && 
               foodKeywords.some(keyword => message.includes(keyword));
    }

    showArtifacts(restaurants, location) {
        const overlay = document.getElementById('artifactsOverlay');
        const locationTitle = document.getElementById('artifactsLocation');
        const cardsSlider = document.getElementById('artifactsCardsSlider');
        const sliderDots = document.getElementById('artifactsSliderDots');
        
        if (!overlay || !cardsSlider) return;
        
        // 제목 설정 - {지역} 맛집 {개수}곳 형식
        if (locationTitle) {
            const count = restaurants?.length || 0;
            if (location && location !== '맛집 추천') {
                locationTitle.textContent = `${location} 맛집 ${count}곳`;
            } else {
                locationTitle.textContent = `맛집 추천 ${count}곳`;
            }
        }
        
        // 기존 카드들 제거
        cardsSlider.innerHTML = '';
        sliderDots.innerHTML = '';
        
        // 최대 5개 레스토랑만 표시
        const displayRestaurants = restaurants.slice(0, 5);
        
        // 모든 카드를 한 번에 생성
        displayRestaurants.forEach((restaurant, index) => {
            // 카드 생성 및 추가
            const card = this.createArtifactsCard(restaurant, index);
            if (card) {
                cardsSlider.appendChild(card);
                
                // 슬라이더 점 생성
                const dot = document.createElement('div');
                dot.className = `artifacts-dot ${index === 0 ? 'active' : ''}`;
                dot.addEventListener('click', () => this.goToSlide(index));
                sliderDots.appendChild(dot);
            }
        });
        
        console.log(`모달에 ${displayRestaurants.length}개 음식점 카드 생성`);
        
        // 슬라이더 초기화
        this.currentSlide = 0;
        this.totalSlides = displayRestaurants.length;
        this.updateSliderPosition();
        
        // 지도 초기화
        this.initializeMap(displayRestaurants);
        
        // 터치 스와이프 기능 추가
        this.addTouchSwipe(cardsSlider);
        
        // 저장된 맛집 상태 복원
        if (apiClient.isLoggedIn()) {
            setTimeout(() => {
                restoreSavedRestaurants();
            }, 100);
        }
        
        // 모달 표시
        overlay.style.display = 'flex';
        setTimeout(() => {
            overlay.style.opacity = '1';
        }, 10);
    }

    createArtifactsCard(restaurant, index) {
        const card = document.createElement('div');
        card.className = 'artifacts-card';
        
        const categoryEmojis = {
            '한식': '🍲',
            '해산물': '🦐',
            '간식': '🍡',
            '카페': '☕'
        };
        
        const emoji = categoryEmojis[restaurant.category] || '🍽️';
        
        // 이미지 URL 처리 - 다중 fallback 전략
        let imageUrl = '';
        let fallbackUrls = [];
        
        if (restaurant.image && restaurant.image.length > 0) {
            // visitbusan.net 이미지는 프록시를 통해 접근
            if (restaurant.image.includes('visitbusan.net')) {
                imageUrl = `/api/image_proxy?url=${encodeURIComponent(restaurant.image)}`;
                fallbackUrls = [
                    restaurant.image, // 원본 URL도 시도
                    `https://source.unsplash.com/400x300/?${encodeURIComponent(restaurant.category + ',korean,food')}`,
                    `https://source.unsplash.com/400x300/?${encodeURIComponent('restaurant,busan,food')}`,
                    `https://source.unsplash.com/400x300/?korean,food`
                ];
            } else {
                imageUrl = restaurant.image;
                fallbackUrls = [
                    `https://source.unsplash.com/400x300/?${encodeURIComponent(restaurant.category + ',korean,food')}`,
                    `https://source.unsplash.com/400x300/?${encodeURIComponent('restaurant,busan,food')}`,
                    `https://source.unsplash.com/400x300/?korean,food`
                ];
            }
        } else {
            // 기본 이미지 URL들
            imageUrl = `https://source.unsplash.com/400x300/?${encodeURIComponent(restaurant.category + ',korean,food')}`;
            fallbackUrls = [
                `https://source.unsplash.com/400x300/?${encodeURIComponent('restaurant,busan,food')}`,
                `https://source.unsplash.com/400x300/?korean,food`
            ];
        }
        
        console.log(`카드 생성 - ${restaurant.name}: ${imageUrl}`);
        
        card.innerHTML = `
            <div class="artifacts-card-image">
                <div class="image-container">
                    <img class="restaurant-image" 
                         src="${imageUrl}" 
                         alt="${restaurant.name}"
                         data-fallback-urls='${JSON.stringify(fallbackUrls)}'
                         data-restaurant-name="${restaurant.name}"
                         style="display: none;">
                    <div class="image-loading">
                        <div class="loading-spinner"></div>
                        <p>이미지 로딩 중...</p>
                    </div>
                    <div class="emoji-fallback" style="display: none;">
                        <div class="emoji-icon">${emoji}</div>
                        <h3>${restaurant.name}</h3>
                        <p>${restaurant.area} · ${restaurant.category}</p>
                    </div>
                </div>
                <button class="heart-btn" onclick="toggleSaveRestaurant(event, ${JSON.stringify(restaurant).replace(/"/g, '&quot;')})" aria-label="맛집 저장">
                    <i class="far fa-heart"></i>
                </button>
                <div class="image-overlay">
                    <div class="overlay-content">
                        <h3>${restaurant.name}</h3>
                        <p class="artifacts-card-location">
                            <i class="fas fa-map-marker-alt"></i>
                            ${restaurant.area} · ${restaurant.category}
                        </p>
                    </div>
                </div>
            </div>
            <div class="artifacts-card-content">
                <p class="artifacts-card-description">${restaurant.description}</p>
                <div class="artifacts-card-rating">
                    <div class="rating-stars">
                        ${'★'.repeat(Math.floor(restaurant.rating))}${'☆'.repeat(5 - Math.floor(restaurant.rating))}
                    </div>
                    <span>${restaurant.rating}</span>
                    <span>(${restaurant.reviewCount}개)</span>
                </div>
                <div class="artifacts-card-price">₩${restaurant.priceRange}</div>
                <div class="artifacts-card-address">
                    <i class="fas fa-location-dot"></i>
                    ${restaurant.address}
                </div>
                <div class="artifacts-card-phone">
                    <i class="fas fa-phone"></i>
                    ${restaurant.phone}
                </div>
            </div>
        `;
        
        // 이미지 로딩 로직 설정
        this.setupImageLoading(card);
        
        return card;
    }

    setupImageLoading(card) {
        const img = card.querySelector('.restaurant-image');
        const loading = card.querySelector('.image-loading');
        const emojiFallback = card.querySelector('.emoji-fallback');
        
        if (!img || !loading || !emojiFallback) return;
        
        let currentFallbackIndex = 0;
        const fallbackUrls = JSON.parse(img.dataset.fallbackUrls || '[]');
        const restaurantName = img.dataset.restaurantName;
        
        const tryNextImage = () => {
            if (currentFallbackIndex < fallbackUrls.length) {
                console.log(`${restaurantName}: 대체 이미지 ${currentFallbackIndex + 1} 시도 중...`);
                img.src = fallbackUrls[currentFallbackIndex];
                currentFallbackIndex++;
            } else {
                // 모든 이미지 실패 시 이모지 fallback 표시
                console.log(`${restaurantName}: 모든 이미지 로드 실패, 이모지 fallback 사용`);
                loading.style.display = 'none';
                emojiFallback.style.display = 'flex';
            }
        };
        
        const onImageLoad = () => {
            console.log(`${restaurantName}: 이미지 로드 성공`);
            loading.style.display = 'none';
            img.style.display = 'block';
            img.style.opacity = '0';
            setTimeout(() => {
                img.style.transition = 'opacity 0.3s ease';
                img.style.opacity = '1';
            }, 10);
        };
        
        const onImageError = () => {
            console.log(`${restaurantName}: 이미지 로드 실패, 다음 옵션 시도 중...`);
            tryNextImage();
        };
        
        // 이미지 로드 이벤트 설정
        img.addEventListener('load', onImageLoad);
        img.addEventListener('error', onImageError);
        
        // 5초 타임아웃 설정
        setTimeout(() => {
            if (img.style.display === 'none' && emojiFallback.style.display === 'none') {
                console.log(`${restaurantName}: 이미지 로드 타임아웃, 이모지 fallback 사용`);
                loading.style.display = 'none';
                emojiFallback.style.display = 'flex';
            }
        }, 5000);
    }

    goToSlide(slideIndex) {
        this.currentSlide = slideIndex;
        this.updateSliderPosition();
        this.updateSliderDots();
        this.highlightMapMarker(slideIndex);
    }

    updateSliderPosition() {
        const cardsSlider = document.getElementById('artifactsCardsSlider');
        if (cardsSlider) {
            const translateX = -this.currentSlide * 100;
            cardsSlider.style.transform = `translateX(${translateX}%)`;
        }
    }

    updateSliderDots() {
        const dots = document.querySelectorAll('.artifacts-dot');
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === this.currentSlide);
        });
    }

    addTouchSwipe(cardsSlider) {
        if (!cardsSlider) return;
        
        let startX = 0;
        let startY = 0;
        let isDragging = false;
        let startTime = 0;
        
        // 터치 시작
        const handleTouchStart = (e) => {
            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            startTime = Date.now();
            isDragging = true;
            
            // 스와이프 중에는 기본 스크롤 방지
            cardsSlider.style.transition = 'none';
        };
        
        // 터치 움직임
        const handleTouchMove = (e) => {
            if (!isDragging) return;
            
            const touch = e.touches[0];
            const deltaX = touch.clientX - startX;
            const deltaY = touch.clientY - startY;
            
            // 수직 스크롤보다 수평 스와이프가 더 크면 기본 동작 방지
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                e.preventDefault();
            }
        };
        
        // 터치 종료
        const handleTouchEnd = (e) => {
            if (!isDragging) return;
            isDragging = false;
            
            const touch = e.changedTouches[0];
            const deltaX = touch.clientX - startX;
            const deltaY = touch.clientY - startY;
            const deltaTime = Date.now() - startTime;
            
            // 스와이프 감지 기준
            const minSwipeDistance = 50; // 최소 스와이프 거리
            const maxSwipeTime = 500; // 최대 스와이프 시간
            
            cardsSlider.style.transition = 'transform 0.3s ease';
            
            // 수평 스와이프가 수직보다 크고, 충분한 거리와 시간 내에서 발생했는지 확인
            if (Math.abs(deltaX) > Math.abs(deltaY) && 
                Math.abs(deltaX) > minSwipeDistance && 
                deltaTime < maxSwipeTime) {
                
                if (deltaX > 0) {
                    // 오른쪽 스와이프 - 이전 슬라이드
                    this.currentSlide = Math.max(0, this.currentSlide - 1);
                } else {
                    // 왼쪽 스와이프 - 다음 슬라이드
                    this.currentSlide = Math.min(this.totalSlides - 1, this.currentSlide + 1);
                }
                
                this.updateSliderPosition();
                this.updateSliderDots();
                this.highlightMapMarker(this.currentSlide);
            }
        };
        
        // 이벤트 리스너 정리 (기존 것이 있다면 제거)
        cardsSlider.removeEventListener('touchstart', handleTouchStart);
        cardsSlider.removeEventListener('touchmove', handleTouchMove);
        cardsSlider.removeEventListener('touchend', handleTouchEnd);
        
        // 새 이벤트 리스너 추가
        cardsSlider.addEventListener('touchstart', handleTouchStart, { passive: false });
        cardsSlider.addEventListener('touchmove', handleTouchMove, { passive: false });
        cardsSlider.addEventListener('touchend', handleTouchEnd, { passive: true });
    }

    delayedShowArtifacts(restaurants, location) {
        // 카드가 표시된 후 사용자가 읽을 시간을 주고 모달 표시
        let delay = 500; // 기본 0.5초로 단축
        
        // 응답 메시지 길이에 따라 읽기 시간 조정
        const lastMessage = this.messagesContainer.querySelector('.bot-group:last-child .message-bubble');
        if (lastMessage) {
            const messageLength = lastMessage.textContent.length;
            // 글자 수에 따라 읽기 시간 조정 (더 짧게)
            delay = Math.max(500, Math.min(1000, messageLength * 30));
        }
        
        // 자동 모달 팝업 제거 - 사용자가 필요할 때만 수동으로 열도록
        // setTimeout(() => {
        //     if (document.hasFocus() && this.isScrollNearBottom()) {
        //         this.showArtifacts(restaurants, location);
        //     }
        // }, delay);
    }

    isScrollNearBottom() {
        const container = this.messagesContainer;
        const threshold = 100; // 하단에서 100px 이내
        return container.scrollTop + container.clientHeight >= container.scrollHeight - threshold;
    }

    addModalButton(restaurants, location) {
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'modal-button-container';
        
        // 카드 스타일 버튼 생성
        const card = document.createElement('div');
        card.className = 'map-view-card';
        
        // 첫 번째 음식점의 썸네일 사용
        const firstRestaurant = restaurants[0];
        const thumbnailUrl = firstRestaurant.image || '/api/placeholder/400/300';
        
        card.innerHTML = `
            <div class="map-card-image">
                <img src="${thumbnailUrl}" alt="${firstRestaurant.name}" />
                <div class="map-card-overlay">
                    <i class="fas fa-map-marked-alt"></i>
                </div>
            </div>
            <div class="map-card-content">
                <div class="map-card-title">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>맛집 지도 보기</span>
                </div>
                <div class="map-card-subtitle">
                    ${restaurants.length}개 맛집 위치 확인
                </div>
                <div class="map-card-preview">
                    ${restaurants.slice(0, 3).map(r => `
                        <span class="preview-restaurant">• ${r.name}</span>
                    `).join('')}
                    ${restaurants.length > 3 ? `<span class="preview-more">외 ${restaurants.length - 3}곳</span>` : ''}
                </div>
            </div>
        `;
        
        card.addEventListener('click', () => {
            this.showArtifacts(restaurants, location);
        });
        
        buttonContainer.appendChild(card);
        
        // 마지막 봇 메시지에 버튼 추가
        const lastBotMessage = this.messagesContainer.querySelector('.bot-group:last-child .message-content');
        if (lastBotMessage) {
            lastBotMessage.appendChild(buttonContainer);
        }
        
        this.scrollToBottom();
    }

    initializeMap(restaurants) {
        const mapContainer = document.getElementById('artifactsMap');
        if (!mapContainer) return;
        
        // 지도 컨테이너 초기화
        mapContainer.innerHTML = '';
        
        // 좌표 정보가 있는 레스토랑들만 필터링
        const validRestaurants = restaurants.filter(r => 
            r.coordinates && r.coordinates.lat && r.coordinates.lng
        );
        
        if (validRestaurants.length === 0) {
            mapContainer.innerHTML = `
                <div class="map-placeholder">
                    <i class="fas fa-map-marked-alt"></i>
                    <p>좌표 정보 없음</p>
                </div>
            `;
            return;
        }
        
        // 네이버 지도 컨테이너 생성
        const naverMapDiv = document.createElement('div');
        naverMapDiv.id = 'naverMap';
        naverMapDiv.style.width = '100%';
        naverMapDiv.style.height = '200px';
        naverMapDiv.style.borderRadius = '12px';
        mapContainer.appendChild(naverMapDiv);
        
        // 현재 레스토랑 데이터를 전역에 저장
        window.currentRestaurants = validRestaurants;
        window.currentChatBot = this;
        
        // 네이버 지도 초기화
        this.createNaverMap(validRestaurants, naverMapDiv);
    }

    async createNaverMap(restaurants, container) {
        // 네이버 지도 API가 로드되었는지 확인
        if (typeof naver === 'undefined' || !naver.maps) {
            // API가 아직 로드되지 않은 경우 로딩 표시
            container.innerHTML = `
                <div class="map-loading">
                    <i class="fas fa-map"></i>
                    <p>지도를 불러오는 중...</p>
                    <div class="loading-spinner"></div>
                </div>
            `;
            
            // 테스트용으로 직접 네이버 지도 스크립트 로드 (임시)
            try {
                console.log('네이버 지도 로드 시작...');
                
                // 테스트용 스크립트 URL (실제로는 사용하지 않음)
                const testScriptUrl = null;
                
                container.innerHTML = `
                    <div class="map-loading">
                        <i class="fas fa-map"></i>
                        <p>네이버 지도를 불러오는 중...</p>
                        <div class="loading-spinner"></div>
                        <p style="font-size: 11px; color: #666; margin-top: 8px;">
                            API 키가 설정되지 않은 경우 테스트 모드로 실행됩니다.
                        </p>
                    </div>
                `;
                
                // Vercel 함수 시도
                try {
                    const response = await fetch('/api/naver_map_api');
                    const config = await response.json();
                    
                    if (config.clientId && config.scriptUrl) {
                        console.log('Vercel 함수 응답:', config);
                        console.log('Client ID 확인:', config.clientId.substring(0, 10) + '...');
                        console.log('Script URL:', config.scriptUrl);
                        await this.loadNaverMapsScript(config.scriptUrl);
                    } else if (config.error) {
                        throw new Error(config.error);
                    } else {
                        throw new Error('Vercel 함수 응답 오류');
                    }
                } catch (vercelError) {
                    console.error('Vercel 함수 오류:', vercelError);
                    // API 키가 없으면 fallback 처리
                    throw new Error('Naver Maps API 키가 설정되지 않았습니다');
                }
                
                // 지도 생성
                if (typeof naver !== 'undefined' && naver.maps) {
                    console.log('네이버 지도 API 로드 성공, 지도 생성 중...');
                    this.createNaverMapInstance(restaurants, container);
                } else {
                    throw new Error('네이버 지도 API 로드 실패');
                }
                
            } catch (error) {
                console.error('네이버 지도 로드 전체 실패:', error);
                this.createFallbackMap(restaurants, container);
            }
            return;
        }
        
        // API가 이미 로드된 경우 바로 지도 생성
        this.createNaverMapInstance(restaurants, container);
    }

    loadNaverMapsScript(scriptUrl) {
        return new Promise((resolve, reject) => {
            if (typeof naver !== 'undefined' && naver.maps) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = scriptUrl;
            script.onload = () => {
                console.log('네이버 지도 API 스크립트 로드 성공');
                // API 로드 확인
                if (typeof naver !== 'undefined' && naver.maps) {
                    console.log('네이버 지도 API 사용 준비 완료');
                    resolve();
                } else {
                    console.error('네이버 지도 API 객체가 없습니다');
                    reject(new Error('Naver Maps API object not found'));
                }
            };
            script.onerror = (error) => {
                console.error('네이버 지도 API 스크립트 로드 실패:', error);
                console.error('Script URL:', scriptUrl);
                reject(new Error('Failed to load Naver Maps script - 인증 오류 또는 잘못된 Client ID'));
            };
            document.head.appendChild(script);
        });
    }

    createNaverMapInstance(restaurants, container) {
        // 로딩 화면 제거
        container.innerHTML = '';
        
        // 중심 좌표 계산 (부산 중심으로)
        const centerLat = restaurants.reduce((sum, r) => sum + r.coordinates.lat, 0) / restaurants.length;
        const centerLng = restaurants.reduce((sum, r) => sum + r.coordinates.lng, 0) / restaurants.length;
        
        // 지도 생성
        const map = new naver.maps.Map(container, {
            center: new naver.maps.LatLng(centerLat, centerLng),
            zoom: 11,
            mapTypeControl: true,
            mapTypeControlOptions: {
                style: naver.maps.MapTypeControlStyle.BUTTON,
                position: naver.maps.Position.TOP_RIGHT
            },
            zoomControl: true,
            zoomControlOptions: {
                style: naver.maps.ZoomControlStyle.SMALL,
                position: naver.maps.Position.TOP_LEFT
            }
        });
        
        // 마커 생성 - 모든 레스토랑에 대해
        const markers = [];
        restaurants.forEach((restaurant, index) => {
            const marker = new naver.maps.Marker({
                position: new naver.maps.LatLng(restaurant.coordinates.lat, restaurant.coordinates.lng),
                map: map,
                title: restaurant.name,
                icon: {
                    content: `
                        <div style="
                            width: 32px; 
                            height: 32px; 
                            background: #0095f6; 
                            border: 2px solid white; 
                            border-radius: 50%; 
                            display: flex; 
                            align-items: center; 
                            justify-content: center; 
                            color: white; 
                            font-weight: bold; 
                            font-size: 12px;
                            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                        ">
                            ${index + 1}
                        </div>
                    `,
                    size: new naver.maps.Size(32, 32),
                    anchor: new naver.maps.Point(16, 16)
                }
            });
            
            // 정보창 생성
            const infoWindow = new naver.maps.InfoWindow({
                content: `
                    <div style="color: #000; padding: 12px; max-width: 250px; font-family: 'Inter', sans-serif;">
                        <h4 style="margin: 0 0 8px 0; color: #0095f6; font-size: 14px;">${restaurant.name}</h4>
                        <p style="margin: 4px 0; font-size: 12px; color: #333;">${restaurant.area} · ${restaurant.category}</p>
                        <p style="margin: 4px 0; font-size: 11px; color: #666;">${restaurant.address}</p>
                        <p style="margin: 6px 0; font-size: 11px; color: #888;">📞 ${restaurant.phone}</p>
                        <div style="margin-top: 8px;">
                            <button onclick="window.currentChatBot.goToSlide(${index})" 
                                    style="background: #0095f6; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 11px; cursor: pointer; font-weight: 600;">
                                📋 카드 보기
                            </button>
                        </div>
                    </div>
                `,
                maxWidth: 280,
                backgroundColor: "#fff",
                borderColor: "#0095f6",
                borderWidth: 2,
                anchorSize: new naver.maps.Size(30, 30),
                anchorSkew: true,
                anchorColor: "#0095f6"
            });
            
            // 마커 클릭 이벤트
            naver.maps.Event.addListener(marker, 'click', () => {
                // 모든 정보창 닫기
                markers.forEach(m => m.infoWindow && m.infoWindow.close());
                // 현재 정보창 열기
                infoWindow.open(map, marker);
                // 슬라이더와 연동
                this.goToSlide(index);
            });
            
            marker.infoWindow = infoWindow;
            markers.push(marker);
        });
        
        // 전역에 마커 저장
        window.currentMarkers = markers;
        window.currentMap = map;
        window.currentInfoWindows = markers.map(m => m.infoWindow);
        
        console.log(`🗺️ 네이버 지도에 ${restaurants.length}개 맛집 마커 생성 완료`);
    }

    createFallbackMap(restaurants, container) {
        console.log('Fallback 지도 표시 중...');
        
        const centerLat = restaurants.reduce((sum, r) => sum + r.coordinates.lat, 0) / restaurants.length;
        const centerLng = restaurants.reduce((sum, r) => sum + r.coordinates.lng, 0) / restaurants.length;
        
        container.innerHTML = `
            <div class="map-fallback">
                <div class="map-header">
                    <i class="fas fa-map"></i>
                    <span>부산 맛집 위치 (${restaurants.length}곳)</span>
                </div>
                <div class="map-center">
                    <p><strong>중심 좌표:</strong> ${centerLat.toFixed(4)}, ${centerLng.toFixed(4)}</p>
                    <p><strong>표시 맛집:</strong> ${restaurants.length}개</p>
                    <div style="margin: 12px 0; padding: 8px; background: #333; border-radius: 4px;">
                        <p style="font-size: 11px; color: #ccc; margin: 0;">
                            💡 네이버 지도 API 설정이 필요합니다.<br>
                            Vercel 환경변수에 NAVER_MAP_CLIENT_ID를 설정하세요.
                        </p>
                    </div>
                </div>
                <button class="map-action-btn" onclick="openGoogleMaps('${centerLat}', '${centerLng}')">
                    <i class="fas fa-external-link-alt"></i>
                    네이버 지도에서 보기
                </button>
                <div style="margin-top: 8px;">
                    <button class="map-action-btn" style="background: #ff6b6b;" onclick="window.currentChatBot.showRestaurantList(window.currentRestaurants)">
                        <i class="fas fa-list"></i>
                        맛집 목록 보기
                    </button>
                </div>
            </div>
        `;
    }

    showRestaurantList(restaurants) {
        const container = document.getElementById('artifactsMap');
        if (!container || !restaurants) return;
        
        container.innerHTML = `
            <div style="height: 200px; overflow-y: auto; padding: 8px;">
                <div style="margin-bottom: 12px; text-align: center;">
                    <h4 style="color: #0095f6; margin: 0;">📍 맛집 목록 (${restaurants.length}곳)</h4>
                </div>
                ${restaurants.map((restaurant, index) => `
                    <div class="restaurant-list-item" style="
                        background: #2c2c2c; 
                        border: 1px solid #3c3c3c; 
                        border-radius: 8px; 
                        padding: 8px; 
                        margin: 4px 0; 
                        cursor: pointer;
                        transition: all 0.2s ease;
                    " onclick="window.currentChatBot.goToSlide(${index})">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="
                                background: #0095f6; 
                                color: white; 
                                width: 20px; 
                                height: 20px; 
                                border-radius: 50%; 
                                display: flex; 
                                align-items: center; 
                                justify-content: center; 
                                font-size: 10px; 
                                font-weight: bold;
                            ">${index + 1}</span>
                            <div style="flex: 1;">
                                <div style="color: #fff; font-weight: 600; font-size: 12px;">${restaurant.name}</div>
                                <div style="color: #888; font-size: 10px;">${restaurant.area} · ${restaurant.category}</div>
                            </div>
                            <div style="color: #0095f6; font-size: 10px;">
                                ${restaurant.coordinates.lat.toFixed(3)}, ${restaurant.coordinates.lng.toFixed(3)}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        // 호버 효과 추가
        const items = container.querySelectorAll('.restaurant-list-item');
        items.forEach(item => {
            item.addEventListener('mouseenter', () => {
                item.style.borderColor = '#0095f6';
                item.style.transform = 'translateX(2px)';
            });
            item.addEventListener('mouseleave', () => {
                item.style.borderColor = '#3c3c3c';
                item.style.transform = 'translateX(0)';
            });
        });
    }

    highlightMapMarker(index) {
        // 네이버 지도 마커가 있는 경우
        if (window.currentMarkers && window.currentMarkers[index]) {
            // 모든 정보창 닫기
            window.currentMarkers.forEach(marker => {
                if (marker.infoWindow) {
                    marker.infoWindow.close();
                }
            });
            
            // 현재 마커의 정보창 열기
            const currentMarker = window.currentMarkers[index];
            if (currentMarker && currentMarker.infoWindow && window.currentMap) {
                currentMarker.infoWindow.open(window.currentMap, currentMarker);
                
                // 지도 중심을 해당 마커로 이동 (네이버 지도 방식)
                window.currentMap.panTo(currentMarker.getPosition());
            }
        }
        
        // Fallback 지도의 경우
        const markers = document.querySelectorAll('.map-marker');
        markers.forEach((marker, i) => {
            marker.classList.toggle('active', i === index);
        });
    }
}

// 빠른 메시지 전송 (전역 함수)
function sendQuickMessage(message) {
    const chatBot = window.instagramChatBot;
    if (chatBot) {
        chatBot.userInput.value = message;
        chatBot.sendMessage();
        
        // 추천 시스템에 메시지 전달
        suggestionManager.onUserMessage(message);
    }
}

// Artifacts 모달 닫기 (전역 함수)
function closeArtifacts() {
    const overlay = document.getElementById('artifactsOverlay');
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300);
    }
}

// 슬라이더 내비게이션 (전역 함수)
function nextSlide() {
    const chatBot = window.instagramChatBot;
    if (chatBot && chatBot.totalSlides) {
        chatBot.currentSlide = (chatBot.currentSlide + 1) % chatBot.totalSlides;
        chatBot.updateSliderPosition();
        chatBot.updateSliderDots();
        chatBot.highlightMapMarker(chatBot.currentSlide);
    }
}

function prevSlide() {
    const chatBot = window.instagramChatBot;
    if (chatBot && chatBot.totalSlides) {
        chatBot.currentSlide = (chatBot.currentSlide - 1 + chatBot.totalSlides) % chatBot.totalSlides;
        chatBot.updateSliderPosition();
        chatBot.updateSliderDots();
        chatBot.highlightMapMarker(chatBot.currentSlide);
    }
}

// Google Maps 열기 (전역 함수)
function openGoogleMaps(lat, lng) {
    const url = `https://www.google.com/maps/@${lat},${lng},15z`;
    window.open(url, '_blank');
}

// 카테고리별 검색
async function searchByCategory(category) {
    try {
        const response = await fetch(`/api/category/${category}`);
        const data = await response.json();
        
        const chatBot = window.instagramChatBot;
        if (chatBot) {
            chatBot.addMessage(`${category} 맛집 ${data.count}곳을 찾았어요! 🍽️`, 'bot');
            
            if (data.restaurants.length > 0) {
                setTimeout(() => {
                    chatBot.displayRestaurantCards(data.restaurants);
                }, 300);
            }
        }
    } catch (error) {
        console.error('카테고리 검색 실패:', error);
    }
}

// 지역별 검색
async function searchByArea(area) {
    try {
        const response = await fetch(`/api/area/${area}`);
        const data = await response.json();
        
        const chatBot = window.instagramChatBot;
        if (chatBot) {
            chatBot.addMessage(`${area} 지역 맛집 ${data.count}곳을 찾았어요! 📍`, 'bot');
            
            if (data.restaurants.length > 0) {
                setTimeout(() => {
                    chatBot.displayRestaurantCards(data.restaurants);
                }, 300);
            }
        }
    } catch (error) {
        console.error('지역 검색 실패:', error);
    }
}

// 스크롤 관련 유틸리티
function smoothScrollToTop() {
    const messagesContainer = document.getElementById('chatMessages');
    messagesContainer.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

function smoothScrollToBottom() {
    const messagesContainer = document.getElementById('chatMessages');
    messagesContainer.scrollTo({
        top: messagesContainer.scrollHeight,
        behavior: 'smooth'
    });
}

// 네이버 지도 초기화 확인
function checkNaverMaps() {
    if (typeof naver !== 'undefined' && naver.maps) {
        console.log('네이버 지도 API 로드 완료');
        window.naverMapsLoaded = true;
        return true;
    }
    return false;
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    window.instagramChatBot = new InstagramStyleChatBot();
    
    // 추천 시스템 초기화
    suggestionManager.init();
    
    // 추가 Instagram 스타일 효과
    addInstagramEffects();
});

// Instagram 스타일 추가 효과
function addInstagramEffects() {
    // 메시지 입력 시 플레이스홀더 효과
    const userInput = document.getElementById('userInput');
    if (userInput) {
        userInput.addEventListener('focus', () => {
            userInput.parentElement.style.borderColor = '#0095f6';
        });
        
        userInput.addEventListener('blur', () => {
            userInput.parentElement.style.borderColor = '#3c3c3c';
        });
    }
    
    // 버튼 클릭 효과
    document.querySelectorAll('button').forEach(button => {
        button.addEventListener('click', function(e) {
            // 리플 효과
            const ripple = document.createElement('span');
            const rect = button.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.classList.add('ripple');
            
            button.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
}

// CSS 리플 효과를 위한 스타일 추가
const rippleStyle = document.createElement('style');
rippleStyle.textContent = `
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.2);
        transform: scale(0);
        animation: ripple-animation 0.6s linear;
        pointer-events: none;
    }
    
    @keyframes ripple-animation {
        to {
            transform: scale(2);
            opacity: 0;
        }
    }
`;
document.head.appendChild(rippleStyle);

// Side Menu Functions
function toggleSideMenu() {
    const sideMenu = document.getElementById('sideMenu');
    const overlay = document.getElementById('sideMenuOverlay');
    
    if (sideMenu && overlay) {
        const isActive = sideMenu.classList.contains('active');
        
        if (isActive) {
            closeSideMenu();
        } else {
            openSideMenu();
        }
    }
}

function openSideMenu() {
    const sideMenu = document.getElementById('sideMenu');
    const overlay = document.getElementById('sideMenuOverlay');
    
    if (sideMenu && overlay) {
        sideMenu.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeSideMenu() {
    const sideMenu = document.getElementById('sideMenu');
    const overlay = document.getElementById('sideMenuOverlay');
    
    if (sideMenu && overlay) {
        sideMenu.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Side Menu Item Actions (replaced by newer versions at end of file)

function showSettings() {
    closeSideMenu();
    
    // 설정 페이지로 이동
    window.location.href = 'settings.html';
}

// localStorage 함수들 제거됨 - 데이터베이스만 사용

// ESC 키로 사이드 메뉴 닫기
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeSideMenu();
    }
});

// Restaurant Save Functionality (Database-backed)
async function toggleSaveRestaurant(event, restaurant) {
    event.preventDefault();
    event.stopPropagation();
    
    const heartBtn = event.currentTarget;
    const heartIcon = heartBtn.querySelector('i');
    
    try {
        // 현재 저장 상태 확인
        const savedData = await apiClient.getSavedRestaurants();
        const savedIds = savedData.restaurantIds || [];
        const isAlreadySaved = savedIds.includes(restaurant.id);
        
        if (isAlreadySaved) {
            // 저장 해제
            await apiClient.unsaveRestaurant(restaurant.id);
            
            // UI 업데이트
            heartBtn.classList.remove('saved');
            heartIcon.classList.remove('fas');
            heartIcon.classList.add('far');
            
            showToast(`"${restaurant.name}"을(를) 저장 목록에서 제거했습니다`, 'info');
            
        } else {
            // 저장
            await apiClient.saveRestaurant(restaurant);
            
            // UI 업데이트
            heartBtn.classList.add('saved', 'animate');
            heartIcon.classList.remove('far');
            heartIcon.classList.add('fas');
            
            showToast(`"${restaurant.name}"을(를) 저장했습니다! ❤️`, 'success');
            
            // 애니메이션 제거
            setTimeout(() => {
                heartBtn.classList.remove('animate');
            }, 600);
        }
    } catch (error) {
        console.error('맛집 저장/해제 실패:', error);
        showToast('저장 처리 중 오류가 발생했습니다', 'error');
    }
}

// localStorage 폴백 함수 제거됨

function showToast(message, type = 'info') {
    // 기존 토스트 제거
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // 토스트 생성
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        info: 'fas fa-info-circle'
    };
    
    toast.innerHTML = `
        <i class="${icons[type] || icons.info}"></i>
        <span>${message}</span>
    `;
    
    // 스타일 추가
    if (!document.querySelector('#toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            .toast {
                position: fixed;
                bottom: 80px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 12px 16px;
                border-radius: 8px;
                display: flex;
                align-items: center;
                gap: 8px;
                z-index: 9999;
                animation: toastSlideUp 0.3s ease;
                backdrop-filter: blur(8px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                font-size: 14px;
                max-width: 90%;
                text-align: center;
            }
            
            .toast-success {
                background: rgba(76, 175, 80, 0.9);
            }
            
            .toast-error {
                background: rgba(244, 67, 54, 0.9);
            }
            
            .toast-info {
                background: rgba(33, 150, 243, 0.9);
            }
            
            @keyframes toastSlideUp {
                from {
                    transform: translateX(-50%) translateY(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(-50%) translateY(0);
                    opacity: 1;
                }
            }
            
            @keyframes toastSlideDown {
                from {
                    transform: translateX(-50%) translateY(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(-50%) translateY(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(toast);
    
    // 3초 후 자동 제거
    setTimeout(() => {
        toast.style.animation = 'toastSlideDown 0.3s ease';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// 페이지 로드시 저장된 맛집 상태 복원 (Database-backed)
async function restoreSavedRestaurants() {
    try {
        // 데이터베이스에서 저장된 맛집 ID 목록 가져오기
        const savedData = await apiClient.getSavedRestaurants();
        const savedIds = savedData.restaurantIds || [];
        
        // 모든 하트 버튼에 대해 저장 상태 확인
        document.querySelectorAll('.heart-btn').forEach(btn => {
            const onclickAttr = btn.getAttribute('onclick');
            if (onclickAttr) {
                // onclick에서 레스토랑 ID 추출
                const match = onclickAttr.match(/"id":"([^"]+)"/);
                if (match && savedIds.includes(match[1])) {
                    btn.classList.add('saved');
                    const icon = btn.querySelector('i');
                    if (icon) {
                        icon.classList.remove('far');
                        icon.classList.add('fas');
                    }
                } else {
                    // 저장되지 않은 맛집은 상태 초기화
                    btn.classList.remove('saved');
                    const icon = btn.querySelector('i');
                    if (icon) {
                        icon.classList.remove('fas');
                        icon.classList.add('far');
                    }
                }
            }
        });
    } catch (error) {
        console.error('저장 상태 복원 실패:', error);
    }
}

// 사이드 메뉴의 저장된 맛집 기능 (Database-backed)
async function showSavedRestaurants() {
    closeSideMenu();
    
    const chatBot = window.instagramChatBot;
    if (!chatBot) return;
    
    try {
        // 데이터베이스에서 저장된 맛집 ID 목록 가져오기
        const savedData = await apiClient.getSavedRestaurants();
        const savedIds = savedData.restaurantIds || [];
        
        if (savedIds.length > 0) {
            // 저장된 ID로 실제 맛집 데이터 찾기
            const allRestaurants = window.allRestaurants || [];
            const savedRestaurants = allRestaurants.filter(restaurant => 
                savedIds.includes(restaurant.id)
            );
            
            chatBot.addMessage(`저장된 맛집 ${savedIds.length}곳을 찾았습니다! ❤️`, 'bot');
            
            // 저장된 맛집을 카드 형태로 표시
            if (savedRestaurants.length > 0) {
                setTimeout(() => {
                    chatBot.displayRestaurantCards(savedRestaurants, '저장된 맛집');
                }, 500);
            } else {
                chatBot.addMessage('저장된 맛집 정보를 불러올 수 없습니다. 맛집 데이터를 먼저 로드해주세요.', 'bot');
            }
        } else {
            chatBot.addMessage('아직 저장된 맛집이 없습니다.\n\n맛집 카드의 ❤️ 버튼을 눌러 마음에 드는 맛집을 저장해보세요! 💫', 'bot');
        }
        
        // 저장 상태 복원
        setTimeout(() => {
            restoreSavedRestaurants();
        }, 1000);
        
    } catch (error) {
        console.error('저장된 맛집 조회 실패:', error);
        chatBot.addMessage('저장된 맛집을 불러오는 중 오류가 발생했습니다. 로그인 상태를 확인해주세요.', 'bot');
    }
}

// MutationObserver로 새로 생성된 카드의 저장 상태 복원
const cardObserver = new MutationObserver(() => {
    restoreSavedRestaurants();
});

// 메뉴 업데이트 함수
function updateMenuForLoggedInUser() {
    const loginMenuItem = document.getElementById('loginMenuItem');
    const loginMenuText = document.getElementById('loginMenuText');
    
    if (!loginMenuItem || !loginMenuText) return;
    
    if (apiClient.isLoggedIn()) {
        const user = apiClient.getCurrentUser();
        if (user) {
            // 사용자 이름 또는 이메일 표시
            const displayName = user.name || user.email || '사용자';
            loginMenuText.textContent = displayName;
            
            // 아이콘을 로그아웃 아이콘으로 변경
            const icon = loginMenuItem.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-sign-out-alt';
            }
        }
    } else {
        // 로그인되지 않은 경우 기본 상태로 복원
        loginMenuText.textContent = '로그인';
        const icon = loginMenuItem.querySelector('i');
        if (icon) {
            icon.className = 'fas fa-user';
        }
    }
}

// handleLogin 함수 업데이트
function handleLogin() {
    closeSideMenu();
    
    if (apiClient.isLoggedIn()) {
        // 이미 로그인된 경우 로그아웃 확인
        if (confirm('로그아웃 하시겠습니까?')) {
            apiClient.logout();
            updateMenuForLoggedInUser();
            location.reload(); // 페이지 새로고침으로 상태 업데이트
        }
    } else {
        // 로그인 페이지로 이동
        window.location.href = 'login.html';
    }
}

// 저장된 맛집 페이지로 이동하는 함수
function navigateToSavedRestaurants() {
    closeSideMenu();
    
    // 로그인 확인
    if (!apiClient.isLoggedIn()) {
        if (confirm('저장된 맛집을 보려면 로그인이 필요합니다.\n로그인 페이지로 이동하시겠습니까?')) {
            window.location.href = 'login.html';
        }
        return;
    }
    
    // 저장된 맛집 페이지로 이동
    window.location.href = 'saved.html';
}

// DOM 변경 감시 시작
document.addEventListener('DOMContentLoaded', () => {
    // 카드 관찰자 시작
    cardObserver.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // 메뉴 상태 업데이트
    updateMenuForLoggedInUser();
    
    // 저장된 맛집 상태 복원 (로그인한 경우에만)
    if (apiClient.isLoggedIn()) {
        setTimeout(() => {
            restoreSavedRestaurants();
        }, 1000);
    }
    
    // 대화 관리 시스템 초기화
    initializeConversationSystem();
});

// ==================== 대화 관리 시스템 ==================== 

// 전역 변수들
let conversationManager = null;
let currentConversationId = null;
let conversations = [];
let isLoadingConversations = false;

// 대화 관리 시스템 초기화
function initializeConversationSystem() {
    conversationManager = new ConversationManager();
    
    // 대화 목록 로드
    loadConversations();
    
    // 사용자 정보 업데이트
    updateSidebarUserInfo();
}

// 대화 관리자 클래스
class ConversationManager {
    constructor() {
        this.conversations = [];
        this.currentConversationId = null;
        this.searchTerm = '';
    }

    // 대화 목록 로드
    async loadConversations() {
        if (!apiClient.isLoggedIn()) {
            this.showNoConversationsState();
            return;
        }

        const conversationList = document.getElementById('conversationList');
        conversationList.innerHTML = `
            <div class="loading-conversations">
                <i class="fas fa-spinner fa-spin"></i>
                <span>대화 목록 로딩 중...</span>
            </div>
        `;

        try {
            const response = await fetch('/api/conversations', {
                method: 'GET',
                headers: getAuthHeaders()
            });

            const data = await response.json();
            
            if (data.success) {
                this.conversations = data.sessions;
                this.renderConversations();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('대화 목록 로드 실패:', error);
            this.showNoConversationsState();
        }
    }

    // 대화 목록 렌더링
    renderConversations() {
        const conversationList = document.getElementById('conversationList');
        
        if (!this.conversations || this.hasNoConversations()) {
            this.showNoConversationsState();
            return;
        }

        let html = '';
        
        // 날짜별 그룹핑된 대화들 렌더링
        const groups = [
            { key: 'today', title: '오늘', conversations: this.conversations.today || [] },
            { key: 'yesterday', title: '어제', conversations: this.conversations.yesterday || [] },
            { key: 'thisWeek', title: '이번 주', conversations: this.conversations.thisWeek || [] },
            { key: 'older', title: '오래된 대화', conversations: this.conversations.older || [] }
        ];

        groups.forEach(group => {
            if (group.conversations.length > 0) {
                html += `<div class="conversation-group">`;
                html += `<div class="conversation-group-title">${group.title}</div>`;
                
                group.conversations.forEach(conv => {
                    html += this.renderConversationItem(conv);
                });
                
                html += `</div>`;
            }
        });

        conversationList.innerHTML = html;
    }

    // 개별 대화 아이템 렌더링
    renderConversationItem(conversation) {
        const isActive = this.currentConversationId === conversation.session_id;
        const time = this.formatTime(new Date(conversation.last_message_at));
        const preview = this.generatePreview(conversation.title);
        
        return `
            <button class="side-menu-item conversation-item ${isActive ? 'active' : ''}" 
                    onclick="loadConversation('${conversation.session_id}')" 
                    data-session-id="${conversation.session_id}">
                <i class="fas fa-comments conversation-icon"></i>
                <div class="conversation-content">
                    <div class="conversation-title">${conversation.title}</div>
                    <div class="conversation-preview">${preview} • ${time}</div>
                </div>
                <div class="conversation-actions">
                    <button class="conversation-action-btn ${conversation.is_favorite ? 'favorite' : ''}" 
                            onclick="event.stopPropagation(); toggleFavorite('${conversation.session_id}')"
                            title="즐겨찾기">
                        <i class="fas fa-star"></i>
                    </button>
                    <button class="conversation-action-btn" 
                            onclick="event.stopPropagation(); deleteConversation('${conversation.session_id}')"
                            title="삭제">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </button>
        `;
    }

    // 시간 포맷팅
    formatTime(date) {
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return '방금전';
        if (diff < 3600000) return `${Math.floor(diff/60000)}분전`;
        if (diff < 86400000) return `${Math.floor(diff/3600000)}시간전`;
        
        return date.toLocaleDateString();
    }

    // 미리보기 텍스트 생성
    generatePreview(title) {
        const previews = {
            '해운대 맛집': '해운대 지역 맛집 추천',
            '서면 카페': '서면 카페 추천',
            '부산 여행': '부산 여행 맛집 가이드',
            '새 대화': '새로운 대화'
        };
        
        return previews[title] || `${title} 관련 대화`;
    }

    // 대화가 없는 상태 표시
    showNoConversationsState() {
        const conversationList = document.getElementById('conversationList');
        conversationList.innerHTML = `
            <div class="no-conversations">
                <i class="fas fa-comments"></i>
                <h3>대화가 없습니다</h3>
                <p>새 대화를 시작해서<br>부산 맛집을 추천받아보세요!</p>
            </div>
        `;
    }

    // 대화가 비어있는지 확인
    hasNoConversations() {
        if (!this.conversations) return true;
        return (this.conversations.today?.length || 0) + 
               (this.conversations.yesterday?.length || 0) + 
               (this.conversations.thisWeek?.length || 0) + 
               (this.conversations.older?.length || 0) === 0;
    }

    // 대화 검색
    searchConversations(term) {
        this.searchTerm = term.toLowerCase();
        
        if (!this.searchTerm) {
            this.renderConversations();
            return;
        }

        // 검색된 대화만 필터링하여 표시
        const filteredConversations = this.filterConversationsBySearch(this.conversations);
        this.renderFilteredConversations(filteredConversations);
    }

    // 검색어로 대화 필터링
    filterConversationsBySearch(conversations) {
        const filtered = {
            today: [],
            yesterday: [],
            thisWeek: [],
            older: []
        };

        Object.keys(conversations).forEach(period => {
            if (conversations[period]) {
                filtered[period] = conversations[period].filter(conv => 
                    conv.title.toLowerCase().includes(this.searchTerm) ||
                    this.generatePreview(conv.title).toLowerCase().includes(this.searchTerm)
                );
            }
        });

        return filtered;
    }

    // 필터링된 대화 목록 렌더링
    renderFilteredConversations(filteredConversations) {
        const conversationList = document.getElementById('conversationList');
        
        if (this.hasNoConversations.call({ conversations: filteredConversations })) {
            conversationList.innerHTML = `
                <div class="no-conversations">
                    <i class="fas fa-search"></i>
                    <h3>검색 결과가 없습니다</h3>
                    <p>'${this.searchTerm}' 과 일치하는<br>대화를 찾을 수 없습니다.</p>
                </div>
            `;
            return;
        }

        let html = '';
        
        // 검색 결과 표시
        const groups = [
            { key: 'today', title: '오늘', conversations: filteredConversations.today || [] },
            { key: 'yesterday', title: '어제', conversations: filteredConversations.yesterday || [] },
            { key: 'thisWeek', title: '이번 주', conversations: filteredConversations.thisWeek || [] },
            { key: 'older', title: '오래된 대화', conversations: filteredConversations.older || [] }
        ];

        // 검색 결과 헤더
        const totalResults = groups.reduce((sum, group) => sum + group.conversations.length, 0);
        html += `
            <div class="search-results-header">
                <div class="search-results-title">
                    <i class="fas fa-search"></i>
                    검색 결과 ${totalResults}개
                </div>
                <button class="clear-search-btn" onclick="clearSearch()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        groups.forEach(group => {
            if (group.conversations.length > 0) {
                html += `<div class="conversation-group">`;
                html += `<div class="conversation-group-title">${group.title}</div>`;
                
                group.conversations.forEach(conv => {
                    html += this.renderConversationItem(conv);
                });
                
                html += `</div>`;
            }
        });

        conversationList.innerHTML = html;
    }
}

// 새 대화 시작
async function startNewConversation() {
    try {
        if (!apiClient.isLoggedIn()) {
            // 게스트 모드에서는 기존 방식 사용
            if (window.instagramChatBot) {
                window.instagramChatBot.startNewConversation();
            }
            return;
        }

        const response = await fetch('/api/conversations', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ title: '새 대화' })
        });

        const data = await response.json();
        
        if (data.success) {
            // 새 세션 ID 설정
            const newSessionId = data.session.session_id;
            sessionStorage.setItem('chatSessionId', newSessionId);
            
            // 기존 채팅 인스턴스 업데이트
            if (window.instagramChatBot) {
                window.instagramChatBot.sessionId = newSessionId;
                window.instagramChatBot.startNewConversation();
            }
            
            // 대화 목록 새로고침
            conversationManager.currentConversationId = newSessionId;
            await conversationManager.loadConversations();
            
            console.log('🔄 새 대화 시작:', newSessionId);
        }
    } catch (error) {
        console.error('새 대화 생성 실패:', error);
    }
}

// 기존 대화 로드
async function loadConversation(sessionId) {
    try {
        if (!apiClient.isLoggedIn()) return;
        
        // 활성 대화 표시 업데이트
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const clickedItem = document.querySelector(`[data-session-id="${sessionId}"]`);
        if (clickedItem) {
            clickedItem.classList.add('active');
        }

        // 세션 ID 업데이트
        sessionStorage.setItem('chatSessionId', sessionId);
        conversationManager.currentConversationId = sessionId;
        
        if (window.instagramChatBot) {
            window.instagramChatBot.sessionId = sessionId;
        }

        // 메시지 로드
        const response = await fetch(`/api/conversations?sessionId=${sessionId}`, {
            method: 'GET',
            headers: getAuthHeaders()
        });

        const data = await response.json();
        
        if (data.success && data.messages) {
            // 채팅창 클리어
            const messagesContainer = document.getElementById('chatMessages');
            messagesContainer.innerHTML = '';
            
            // 메시지 복원
            data.messages.forEach(message => {
                if (window.instagramChatBot) {
                    window.instagramChatBot.addMessage(message.content, message.role);
                }
            });
        }
    } catch (error) {
        console.error('대화 로드 실패:', error);
    }
}

// 즐겨찾기 토글
async function toggleFavorite(sessionId) {
    try {
        const conversation = findConversationById(sessionId);
        const newFavoriteStatus = !conversation?.is_favorite;

        const response = await fetch(`/api/conversations?sessionId=${sessionId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ is_favorite: newFavoriteStatus })
        });

        const data = await response.json();
        
        if (data.success) {
            // 즐겨찾기 상태 업데이트
            await conversationManager.loadConversations();
        }
    } catch (error) {
        console.error('즐겨찾기 업데이트 실패:', error);
    }
}

// 대화 제목 수정
function editConversation(sessionId, currentTitle) {
    const newTitle = prompt('새 제목을 입력하세요:', currentTitle);
    
    if (newTitle && newTitle.trim() && newTitle !== currentTitle) {
        updateConversationTitle(sessionId, newTitle.trim());
    }
}

// 대화 제목 업데이트
async function updateConversationTitle(sessionId, newTitle) {
    try {
        const response = await fetch(`/api/conversations?sessionId=${sessionId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ title: newTitle })
        });

        const data = await response.json();
        
        if (data.success) {
            await conversationManager.loadConversations();
        }
    } catch (error) {
        console.error('제목 업데이트 실패:', error);
    }
}

// 대화 삭제
async function deleteConversation(sessionId) {
    if (!confirm('이 대화를 삭제하시겠습니까?')) {
        return;
    }

    try {
        const response = await fetch(`/api/conversations?sessionId=${sessionId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        const data = await response.json();
        
        if (data.success) {
            // 현재 대화가 삭제된 대화면 새 대화 시작
            if (conversationManager.currentConversationId === sessionId) {
                startNewConversation();
            } else {
                await conversationManager.loadConversations();
            }
        }
    } catch (error) {
        console.error('대화 삭제 실패:', error);
    }
}

// 대화 검색
function searchConversations() {
    const searchInput = document.getElementById('conversationSearch');
    const term = searchInput.value;
    
    if (conversationManager) {
        conversationManager.searchConversations(term);
    }
}

// 검색 클리어
function clearSearch() {
    const searchInput = document.getElementById('conversationSearch');
    searchInput.value = '';
    
    if (conversationManager) {
        conversationManager.searchTerm = '';
        conversationManager.renderConversations();
    }
}

// 사이드바 토글
function toggleSidebar() {
    const sidebar = document.getElementById('conversationSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (window.innerWidth <= 768) {
        // 모바일에서는 오버레이 모드
        sidebar.classList.toggle('open');
        overlay.classList.toggle('show');
    } else {
        // 데스크톱에서는 숨김/보임 토글
        sidebar.style.display = sidebar.style.display === 'none' ? 'flex' : 'none';
    }
}

// 사이드바 닫기
function closeSidebar() {
    const sidebar = document.getElementById('conversationSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
}

// 대화 목록 로드 (전역 함수)
async function loadConversations() {
    if (conversationManager) {
        await conversationManager.loadConversations();
    }
}

// 사이드바 사용자 정보 업데이트
function updateSidebarUserInfo() {
    const userNameElement = document.getElementById('sidebarUserName');
    const loginActionBtn = document.getElementById('loginActionBtn');
    
    if (apiClient.isLoggedIn()) {
        const user = apiClient.getCurrentUser();
        if (userNameElement) {
            userNameElement.textContent = user.name || user.email || '사용자';
        }
        if (loginActionBtn) {
            loginActionBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i>';
            loginActionBtn.title = '로그아웃';
        }
    } else {
        if (userNameElement) {
            userNameElement.textContent = '게스트';
        }
        if (loginActionBtn) {
            loginActionBtn.innerHTML = '<i class="fas fa-user"></i>';
            loginActionBtn.title = '로그인';
        }
    }
}

// 유틸리티 함수들
function findConversationById(sessionId) {
    if (!conversationManager.conversations) return null;
    
    const allConversations = [
        ...(conversationManager.conversations.today || []),
        ...(conversationManager.conversations.yesterday || []),
        ...(conversationManager.conversations.thisWeek || []),
        ...(conversationManager.conversations.older || [])
    ];
    
    return allConversations.find(conv => conv.session_id === sessionId);
}

// ============ Suggestion Management ============

// 상황별 추천 목록 관리
class SuggestionManager {
    constructor() {
        this.container = null;
        this.currentContext = 'initial';
        this.lastQuery = '';
        this.messageCount = 0;
        
        // 상황별 추천 세트
        this.suggestions = {
            initial: [
                { text: '해운대 맛집 추천해줘', icon: 'fa-map-marker-alt' },
                { text: '돼지국밥 맛집 알려줘', icon: 'fa-bowl-hot' },
                { text: '회 먹을 만한 곳', icon: 'fa-fish' },
                { text: '서면 저렴한 맛집', icon: 'fa-won-sign' },
                { text: '카페 추천해줘', icon: 'fa-coffee' }
            ],
            afterLocation: [
                { text: '여기서 가까운 곳', icon: 'fa-location-arrow' },
                { text: '주차 편한 곳', icon: 'fa-parking' },
                { text: '혼밥 가능한 곳', icon: 'fa-user' },
                { text: '가성비 좋은 곳', icon: 'fa-dollar-sign' },
                { text: '현지인 맛집', icon: 'fa-star' }
            ],
            afterFood: [
                { text: '비슷한 다른 맛집', icon: 'fa-utensils' },
                { text: '디저트 맛집', icon: 'fa-ice-cream' },
                { text: '술집 추천', icon: 'fa-beer' },
                { text: '근처 카페', icon: 'fa-coffee' },
                { text: '영업시간 알려줘', icon: 'fa-clock' }
            ],
            morning: [
                { text: '브런치 맛집', icon: 'fa-bacon' },
                { text: '아침식사 좋은 곳', icon: 'fa-egg' },
                { text: '24시간 맛집', icon: 'fa-clock' },
                { text: '해장국 맛집', icon: 'fa-bowl-hot' },
                { text: '카페 추천', icon: 'fa-coffee' }
            ],
            evening: [
                { text: '회 맛집', icon: 'fa-fish' },
                { text: '고기 맛집', icon: 'fa-drumstick-bite' },
                { text: '술집 추천', icon: 'fa-beer' },
                { text: '야식 배달', icon: 'fa-moon' },
                { text: '포장마차', icon: 'fa-store' }
            ]
        };
    }
    
    init() {
        this.container = document.getElementById('suggestionsContainer');
        this.updateSuggestions();
        
        // 시간대별 자동 업데이트
        setInterval(() => this.updateByTimeOfDay(), 60000); // 1분마다 체크
    }
    
    updateSuggestions(context = null) {
        if (!this.container) return;
        
        // 컨텍스트 결정
        if (!context) {
            context = this.determineContext();
        }
        
        this.currentContext = context;
        const suggestionsList = this.suggestions[context] || this.suggestions.initial;
        
        // HTML 생성
        this.container.innerHTML = suggestionsList.map(suggestion => `
            <button class="suggestion-pill" onclick="sendQuickMessage('${suggestion.text}')">
                <i class="fas ${suggestion.icon}"></i>
                ${suggestion.text}
            </button>
        `).join('');
    }
    
    determineContext() {
        const hour = new Date().getHours();
        
        // 시간대별 추천
        if (hour >= 6 && hour < 11) {
            return 'morning';
        } else if (hour >= 17 && hour < 22) {
            return 'evening';
        }
        
        // 최근 메시지 분석
        if (this.lastQuery.includes('해운대') || this.lastQuery.includes('서면') || 
            this.lastQuery.includes('광안리') || this.lastQuery.includes('남포동')) {
            return 'afterLocation';
        }
        
        if (this.lastQuery.includes('국밥') || this.lastQuery.includes('회') || 
            this.lastQuery.includes('치킨') || this.lastQuery.includes('피자')) {
            return 'afterFood';
        }
        
        return 'initial';
    }
    
    updateByTimeOfDay() {
        const newContext = this.determineContext();
        if (newContext !== this.currentContext) {
            this.updateSuggestions(newContext);
        }
    }
    
    onUserMessage(message) {
        this.lastQuery = message;
        this.messageCount++;
        
        // 메시지 후 추천 업데이트
        setTimeout(() => {
            this.updateSuggestions();
        }, 500);
    }
}

// 전역 추천 매니저 인스턴스
const suggestionManager = new SuggestionManager();

// ============ API Helper Functions ============

// 공통 헤더 생성 함수
function getAuthHeaders() {
    const user = apiClient.getCurrentUser();
    return {
        'Content-Type': 'application/json',
        'X-User-Id': user?.id || user?.userId,
        'X-User-Email': user?.email
    };
}

// ============ User Profile & Logout Functions ============

// 사용자 프로필 표시 및 업데이트
function updateUserProfile() {
    const userProfileBtn = document.getElementById('userProfileBtn');
    const userProfileIcon = document.getElementById('userProfileIcon');
    const userProfileImage = document.getElementById('userProfileImage');
    
    if (apiClient.isLoggedIn()) {
        const user = apiClient.getCurrentUser();
        
        if (user.picture) {
            // 구글 프로필 이미지가 있는 경우
            userProfileIcon.style.display = 'none';
            userProfileImage.style.display = 'block';
            userProfileImage.src = user.picture;
        } else {
            // 프로필 이미지가 없는 경우 아이콘 사용
            userProfileIcon.style.display = 'block';
            userProfileImage.style.display = 'none';
        }
        
        // 툴팁 업데이트
        userProfileBtn.title = user.name || user.email || '사용자 프로필';
    } else {
        // 로그인되지 않은 경우
        userProfileIcon.style.display = 'block';
        userProfileImage.style.display = 'none';
        userProfileBtn.title = '로그인';
    }
}

// 사용자 프로필 버튼 클릭
function showUserProfile() {
    if (apiClient.isLoggedIn()) {
        // 로그인된 경우 로그아웃 모달 표시
        showLogoutModal();
    } else {
        // 로그인되지 않은 경우 로그인 페이지로 이동
        handleLogin();
    }
}

// 로그아웃 모달 표시
function showLogoutModal() {
    const user = apiClient.getCurrentUser();
    const overlay = document.getElementById('logoutModalOverlay');
    const userImage = document.getElementById('logoutUserImage');
    const userName = document.getElementById('logoutUserName');
    const userEmail = document.getElementById('logoutUserEmail');
    
    // 사용자 정보 채우기
    if (user.picture) {
        userImage.src = user.picture;
        userImage.style.display = 'block';
    } else {
        userImage.style.display = 'none';
    }
    
    userName.textContent = user.name || '사용자';
    userEmail.textContent = user.email || '';
    
    // 모달 표시
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// 로그아웃 모달 숨기기
function hideLogoutModal() {
    const overlay = document.getElementById('logoutModalOverlay');
    overlay.style.display = 'none';
    document.body.style.overflow = '';
}

// 로그아웃 확인
async function confirmLogout() {
    try {
        // API를 통한 로그아웃 처리
        await apiClient.logout();
        
        // 모달 숨기기
        hideLogoutModal();
        
        // 페이지 새로고침하여 상태 업데이트
        window.location.reload();
    } catch (error) {
        console.error('로그아웃 실패:', error);
        alert('로그아웃 중 오류가 발생했습니다.');
    }
}

// 초기화 시 프로필 업데이트
document.addEventListener('DOMContentLoaded', function() {
    updateUserProfile();
});

// 로그인 상태 변경 시 프로필 업데이트
document.addEventListener('loginStateChanged', function() {
    updateUserProfile();
});