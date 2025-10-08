class BusanChatBot {
    constructor() {
        this.chatMessages = document.getElementById('chatMessages');
        this.userInput = document.getElementById('userInput');
        this.sendButton = document.getElementById('sendButton');
        this.typingIndicator = document.getElementById('typingIndicator');
        
        this.initEventListeners();
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
            
            // 봇 응답 표시
            this.addMessage(response.response, 'bot');
            
            // 맛집 카드 표시 (맛집 추천인 경우)
            if (response.type === 'restaurant' && response.restaurants && response.restaurants.length > 0) {
                this.displayRestaurantCards(response.restaurants);
            }
            
        } catch (error) {
            this.hideTypingIndicator();
            console.error('API Error:', error);
            this.addMessage('죄송합니다. 잠시 문제가 발생했어요. 다시 시도해주세요! 🙏', 'bot');
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
            avatar.textContent = '🐧';
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
    }

    displayRestaurantCards(restaurants) {
        const cardsContainer = document.createElement('div');
        cardsContainer.className = 'restaurant-cards-container';
        
        const cardsWrapper = document.createElement('div');
        cardsWrapper.className = 'restaurant-cards-wrapper';
        
        restaurants.slice(0, 6).forEach(restaurant => {
            const card = this.createRestaurantCard(restaurant);
            cardsWrapper.appendChild(card);
        });
        
        cardsContainer.appendChild(cardsWrapper);
        
        // 마지막 봇 메시지에 카드 추가
        const lastBotMessage = this.chatMessages.querySelector('.bot-message:last-child .text-content');
        if (lastBotMessage) {
            lastBotMessage.appendChild(cardsContainer);
        }
        
        this.scrollToBottom();
    }

    createRestaurantCard(restaurant) {
        const card = document.createElement('div');
        card.className = 'restaurant-card';
        
        card.innerHTML = `
            <div class="restaurant-card-image">
                🍽️
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
                <div class="restaurant-rating">
                    <i class="fas fa-star"></i>
                    <span>${restaurant.rating > 0 ? restaurant.rating.toFixed(1) : 'N/A'}</span>
                    <span>(${restaurant.reviewCount || 0}개 리뷰)</span>
                </div>
            </div>
        `;
        
        // 카드 클릭 시 지도 열기
        card.addEventListener('click', () => {
            if (restaurant.coordinates && restaurant.coordinates.lat && restaurant.coordinates.lng) {
                const url = `https://map.kakao.com/link/to/${restaurant.name},${restaurant.coordinates.lat},${restaurant.coordinates.lng}`;
                window.open(url, '_blank');
            } else {
                // 좌표가 없으면 검색으로 대체
                const searchUrl = `https://map.kakao.com/link/search/${restaurant.name} ${restaurant.area}`;
                window.open(searchUrl, '_blank');
            }
        });
        
        return card;
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

    scrollToBottom() {
        setTimeout(() => {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }, 100);
    }
}

// 빠른 메시지 전송
function sendQuickMessage(message) {
    const chatBot = window.chatBot;
    chatBot.userInput.value = message;
    chatBot.sendMessage();
}

// 채팅 기록 지우기
function clearChat() {
    const chatMessages = document.getElementById('chatMessages');
    // 첫 번째 환영 메시지만 남기고 모두 삭제
    const welcomeMessage = chatMessages.querySelector('.message.bot-message');
    chatMessages.innerHTML = '';
    if (welcomeMessage) {
        chatMessages.appendChild(welcomeMessage);
    }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    window.chatBot = new BusanChatBot();
});