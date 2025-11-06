// Instagram DM Style - 부산 맛집 뚜기 챗봇

class InstagramStyleChatBot {
    constructor() {
        this.messagesContainer = document.getElementById('chatMessages');
        this.userInput = document.getElementById('userInput');
        this.sendButton = document.getElementById('sendButton');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.quickSuggestions = document.getElementById('quickSuggestions');
        
        this.initEventListeners();
        this.loadInitialRecommendations();
        this.updateTimestamps();
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

        // 사용자 메시지 표시
        this.addMessage(message, 'user');
        this.userInput.value = '';
        this.updateSendButton();

        // 타이핑 인디케이터 표시
        this.showTypingIndicator();

        try {
            const response = await this.callChatAPI(message);
            this.hideTypingIndicator();
            
            // 뚜기 응답 표시
            this.addMessage(response.message, 'bot');
            
            // 맛집 데이터가 있으면 모달 버튼과 모달 표시
            if (response.restaurants && response.restaurants.length > 0) {
                // 모달 버튼 추가
                setTimeout(() => {
                    this.addModalButton(response.restaurants, response.analysis?.location || '맛집 추천');
                }, 300);
                
                // 위치 키워드가 포함된 경우 자동으로 모달 표시
                if (this.detectLocationRequest(message)) {
                    this.delayedShowArtifacts(response.restaurants, response.analysis?.location || '맛집 추천');
                }
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
            this.addMessage('죄송합니다. 잠시 문제가 발생했어요. 다시 시도해주세요! 🙏', 'bot');
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
            body: JSON.stringify({ message })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
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

    detectLocationRequest(message) {
        const locationKeywords = [
            '해운대', '서면', '광안리', '남포동', '부산역', '송도', '태종대', '자갈치',
            '맛집', '추천', '어디', '지도', '위치', '가볼만한', '먹을만한'
        ];
        
        return locationKeywords.some(keyword => message.includes(keyword));
    }

    showArtifacts(restaurants, location) {
        const overlay = document.getElementById('artifactsOverlay');
        const locationTitle = document.getElementById('artifactsLocation');
        const cardsSlider = document.getElementById('artifactsCardsSlider');
        const sliderDots = document.getElementById('artifactsSliderDots');
        
        if (!overlay || !cardsSlider) return;
        
        // 제목 설정
        if (locationTitle) {
            locationTitle.textContent = location;
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

    delayedShowArtifacts(restaurants, location) {
        // 카드가 표시된 후 사용자가 읽을 시간을 주고 모달 표시
        let delay = 1500; // 기본 1.5초
        
        // 응답 메시지 길이에 따라 읽기 시간 조정
        const lastMessage = this.messagesContainer.querySelector('.bot-group:last-child .message-bubble');
        if (lastMessage) {
            const messageLength = lastMessage.textContent.length;
            // 글자 수에 따라 읽기 시간 조정 (1초당 약 10글자 읽기 가정)
            delay = Math.max(1500, Math.min(3000, messageLength * 100));
        }
        
        setTimeout(() => {
            // 사용자가 여전히 페이지에 있고 스크롤이 하단 근처에 있는 경우에만 모달 표시
            if (document.hasFocus() && this.isScrollNearBottom()) {
                this.showArtifacts(restaurants, location);
            }
        }, delay);
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