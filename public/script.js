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
                // 초기 메시지에 레스토랑 카드 추가
                setTimeout(() => {
                    this.displayRestaurantCards(data.restaurants, true);
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
            
            // 맛집 카드 표시
            if (response.restaurants && response.restaurants.length > 0) {
                // 채팅창에 카드 표시
                setTimeout(() => {
                    this.displayRestaurantCards(response.restaurants);
                }, 300);
                
                // 위치 키워드가 포함된 경우 추가로 Artifacts 모달 표시
                if (this.detectLocationRequest(message)) {
                    // 사용자가 채팅을 읽을 시간을 주고 자연스럽게 모달 표시
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
        
        displayRestaurants.forEach((restaurant, index) => {
            const card = this.createArtifactsCard(restaurant, index);
            cardsSlider.appendChild(card);
            
            // 슬라이더 점 생성
            const dot = document.createElement('div');
            dot.className = `artifacts-dot ${index === 0 ? 'active' : ''}`;
            dot.addEventListener('click', () => this.goToSlide(index));
            sliderDots.appendChild(dot);
        });
        
        // 슬라이더 초기화
        this.currentSlide = 0;
        this.totalSlides = displayRestaurants.length;
        this.updateSliderPosition();
        
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
        
        card.innerHTML = `
            <div class="artifacts-card-image">
                ${emoji}
            </div>
            <div class="artifacts-card-content">
                <h3>${restaurant.name}</h3>
                <p class="artifacts-card-location">
                    <i class="fas fa-map-marker-alt"></i>
                    ${restaurant.area} · ${restaurant.category}
                </p>
                <p class="artifacts-card-description">${restaurant.description}</p>
                <div class="artifacts-card-rating">
                    <div class="rating-stars">
                        ${'★'.repeat(Math.floor(restaurant.rating))}${'☆'.repeat(5 - Math.floor(restaurant.rating))}
                    </div>
                    <span>${restaurant.rating}</span>
                    <span>(${restaurant.reviewCount}개)</span>
                </div>
                <div class="artifacts-card-price">₩${restaurant.priceRange}</div>
            </div>
        `;
        
        return card;
    }

    goToSlide(slideIndex) {
        this.currentSlide = slideIndex;
        this.updateSliderPosition();
        this.updateSliderDots();
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
    }
}

function prevSlide() {
    const chatBot = window.instagramChatBot;
    if (chatBot && chatBot.totalSlides) {
        chatBot.currentSlide = (chatBot.currentSlide - 1 + chatBot.totalSlides) % chatBot.totalSlides;
        chatBot.updateSliderPosition();
        chatBot.updateSliderDots();
    }
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