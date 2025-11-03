class BusanRestaurantAI {
    constructor() {
        this.chatMessages = document.getElementById('chatMessages');
        this.userInput = document.getElementById('userInput');
        this.sendButton = document.getElementById('sendButton');
        this.typingIndicator = document.getElementById('typingIndicator');
        
        this.initEventListeners();
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

        // 입력 필드 포커스
        this.userInput.focus();
    }

    async loadInitialRecommendations() {
        try {
            const response = await fetch('/api/random/3');
            const data = await response.json();
            
            if (data.restaurants && data.restaurants.length > 0) {
                this.displayRestaurantCards(data.restaurants, true);
            }
        } catch (error) {
            console.log('초기 추천 로드 실패:', error);
        }
    }

    async sendMessage() {
        const message = this.userInput.value.trim();
        if (!message) return;

        // 사용자 메시지 표시
        this.addMessage(message, 'user');
        this.userInput.value = '';
        this.sendButton.disabled = true;

        // 타이핑 인디케이터 표시
        this.showTypingIndicator();

        try {
            const response = await this.callChatAPI(message);
            this.hideTypingIndicator();
            
            // AI 응답 표시
            this.addMessage(response.message, 'bot');
            
            // 맛집 카드 표시
            if (response.restaurants && response.restaurants.length > 0) {
                this.displayRestaurantCards(response.restaurants);
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
            this.addMessage('죄송합니다. 오류가 발생했어요. 다시 시도해주세요! 🙏', 'bot');
        }

        this.sendButton.disabled = false;
    }

    addMessage(content, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        if (sender === 'bot') {
            const avatar = document.createElement('div');
            avatar.className = 'bot-avatar';
            avatar.textContent = '🤖';
            messageContent.appendChild(avatar);
        }
        
        const textContent = document.createElement('div');
        textContent.className = 'text-content';
        textContent.innerHTML = content.replace(/\n/g, '<br>');
        messageContent.appendChild(textContent);
        
        messageDiv.appendChild(messageContent);
        this.chatMessages.appendChild(messageDiv);
        
        // 스크롤을 맨 아래로
        this.scrollToBottom();

        return textContent; // 카드 추가를 위해 반환
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
            const firstBotMessage = this.chatMessages.querySelector('.bot-message .text-content');
            if (firstBotMessage) {
                firstBotMessage.appendChild(cardsContainer);
            }
        } else {
            // 마지막 봇 메시지에 카드 추가
            const lastBotMessage = this.chatMessages.querySelector('.bot-message:last-child .text-content');
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
                    <span style="margin-left: 10px; color: #4caf50;">₩${restaurant.priceRange}</span>
                </div>
            </div>
        `;
        
        // 카드 클릭 시 상세 정보 표시
        card.addEventListener('click', () => {
            this.showRestaurantDetail(restaurant);
        });
        
        return card;
    }

    showRestaurantDetail(restaurant) {
        const detail = `
            🏪 ${restaurant.name}
            📍 ${restaurant.address}
            📞 ${restaurant.phone}
            ⏰ ${restaurant.hours}
            💰 ${restaurant.priceRange}원
            ⭐ ${restaurant.rating}/5 (${restaurant.reviewCount}개 리뷰)
            
            ${restaurant.description}
        `;
        
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
        this.typingIndicator.style.display = 'flex';
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        this.typingIndicator.style.display = 'none';
    }

    scrollToBottom() {
        setTimeout(() => {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }, 100);
    }
}

// 빠른 메시지 전송
function sendQuickMessage(message) {
    const ai = window.restaurantAI;
    ai.userInput.value = message;
    ai.sendMessage();
}

// 카테고리별 검색
async function searchByCategory(category) {
    try {
        const response = await fetch(`/api/category/${category}`);
        const data = await response.json();
        
        const ai = window.restaurantAI;
        ai.addMessage(`${category} 맛집 ${data.count}곳을 찾았어요! 🍽️`, 'bot');
        
        if (data.restaurants.length > 0) {
            ai.displayRestaurantCards(data.restaurants);
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
        
        const ai = window.restaurantAI;
        ai.addMessage(`${area} 지역 맛집 ${data.count}곳을 찾았어요! 📍`, 'bot');
        
        if (data.restaurants.length > 0) {
            ai.displayRestaurantCards(data.restaurants);
        }
    } catch (error) {
        console.error('지역 검색 실패:', error);
    }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    window.restaurantAI = new BusanRestaurantAI();
});