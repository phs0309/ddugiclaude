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
        
        this.initEventListeners();
        this.initMenuListeners();
        this.initLoginListeners();
        this.initModeSelector();
        this.initGoogleAuth();
        this.setTheme(this.currentMode);
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
        this.setTheme(mode);
        this.updateModeSelection();
        this.closeModeDropdown();
        
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

    setTheme(mode) {
        // Remove all theme classes
        document.body.classList.remove('theme-authentic', 'theme-budget', 'theme-date');
        
        // Add the selected theme class
        document.body.classList.add(`theme-${mode}`);
    }

    restoreMode() {
        // Restore saved mode from localStorage
        const savedMode = localStorage.getItem('ddugi_mode');
        if (savedMode && ['authentic', 'budget', 'date'].includes(savedMode)) {
            this.currentMode = savedMode;
            this.setTheme(savedMode);
            this.updateModeSelection();
        }
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
                    mode: this.currentMode
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.response;
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
}

// Initialize the chatbot when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const chatBot = new BusanChatBot();
    chatBot.restoreLoginState();
    chatBot.restoreMode();
});