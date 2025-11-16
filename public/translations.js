// ============ Multilingual Translation System ============

const translations = {
    ko: {
        // Header
        'profile.name': '뚜기',
        'profile.status': '맛집 가이드',
        'login': '로그인',
        'logout': '로그아웃',
        'guest': '게스트',
        
        // Side Menu
        'menu.newChat': '새 대화',
        'menu.searchConversations': '대화 검색...',
        'menu.savedRestaurants': '저장된 맛집',
        'menu.settings': '설정',
        
        // Input Area
        'input.placeholder': '메시지 보내기...',
        'input.send': '보내기',
        
        // Quick Suggestions
        'suggestion.haeundae': '해운대 맛집',
        'suggestion.porkSoup': '돼지국밥',
        'suggestion.sashimi': '회 맛집',
        'suggestion.seomyeon': '서면 저렴한 곳',
        'suggestion.cafe': '카페 추천',
        
        // Welcome Message
        'welcome.greeting': '마! 뚜기다이가! 🐧',
        'welcome.intro': '부산 토박이 맛집 가이드 뚜기입니다!',
        'welcome.question': '어떤 맛있는 거 찾고 있노? 😊',
        
        // Artifacts/Modal
        'artifacts.title': '맛집 추천',
        'map.placeholder': '맛집 위치',
        
        // User Menu
        'dropdown.savedRestaurants': '저장된 맛집',
        'dropdown.settings': '설정',
        'dropdown.logout': '로그아웃',
        'dropdown.login': '로그인',
        
        // Logout Modal
        'logout.title': '로그아웃 확인',
        'logout.question': '정말 로그아웃 하시겠습니까?',
        'logout.warning': '저장된 대화는 계정에 연결되어 있어 다시 로그인하면 복구됩니다.',
        'logout.cancel': '취소',
        'logout.confirm': '로그아웃',
        
        // Delete Conversation
        'delete.title': '대화 삭제',
        'delete.cancel': '취소',
        'delete.confirm': '삭제',
        
        // Loading
        'loading.conversations': '대화 목록 로딩 중...',
        
        // Common
        'close': '닫기',
        'save': '저장',
        'cancel': '취소',
        'confirm': '확인',
    },
    
    en: {
        // Header
        'profile.name': 'Ddugi',
        'profile.status': 'Food Guide',
        'login': 'Login',
        'logout': 'Logout',
        'guest': 'Guest',
        
        // Side Menu
        'menu.newChat': 'New Chat',
        'menu.searchConversations': 'Search conversations...',
        'menu.savedRestaurants': 'Saved Restaurants',
        'menu.settings': 'Settings',
        
        // Input Area
        'input.placeholder': 'Type a message...',
        'input.send': 'Send',
        
        // Quick Suggestions
        'suggestion.haeundae': 'Haeundae Restaurants',
        'suggestion.porkSoup': 'Pork Soup',
        'suggestion.sashimi': 'Sashimi',
        'suggestion.seomyeon': 'Cheap Seomyeon',
        'suggestion.cafe': 'Cafe Recommendation',
        
        // Welcome Message
        'welcome.greeting': 'Hello! I\'m Ddugi! 🐧',
        'welcome.intro': 'I\'m Ddugi, your Busan local food guide!',
        'welcome.question': 'What delicious food are you looking for? 😊',
        
        // Artifacts/Modal
        'artifacts.title': 'Restaurant Recommendations',
        'map.placeholder': 'Restaurant Location',
        
        // User Menu
        'dropdown.savedRestaurants': 'Saved Restaurants',
        'dropdown.settings': 'Settings',
        'dropdown.logout': 'Logout',
        'dropdown.login': 'Login',
        
        // Logout Modal
        'logout.title': 'Logout Confirmation',
        'logout.question': 'Are you sure you want to logout?',
        'logout.warning': 'Your saved conversations are linked to your account and will be restored when you log in again.',
        'logout.cancel': 'Cancel',
        'logout.confirm': 'Logout',
        
        // Delete Conversation
        'delete.title': 'Delete Conversation',
        'delete.cancel': 'Cancel',
        'delete.confirm': 'Delete',
        
        // Loading
        'loading.conversations': 'Loading conversations...',
        
        // Common
        'close': 'Close',
        'save': 'Save',
        'cancel': 'Cancel',
        'confirm': 'Confirm',
    },
    
    zh: {
        // Header
        'profile.name': '뚜기',
        'profile.status': '美食向导',
        'login': '登录',
        'logout': '退出',
        'guest': '游客',
        
        // Side Menu
        'menu.newChat': '新对话',
        'menu.searchConversations': '搜索对话...',
        'menu.savedRestaurants': '收藏餐厅',
        'menu.settings': '设置',
        
        // Input Area
        'input.placeholder': '输入信息...',
        'input.send': '发送',
        
        // Quick Suggestions
        'suggestion.haeundae': '海云台餐厅',
        'suggestion.porkSoup': '猪肉汤',
        'suggestion.sashimi': '生鱼片',
        'suggestion.seomyeon': '西面便宜店',
        'suggestion.cafe': '咖啡厅推荐',
        
        // Welcome Message
        'welcome.greeting': '你好！我是뚜기！🐧',
        'welcome.intro': '我是釜山本地美食向导뚜기！',
        'welcome.question': '您在寻找什么美食呢？😊',
        
        // Artifacts/Modal
        'artifacts.title': '餐厅推荐',
        'map.placeholder': '餐厅位置',
        
        // User Menu
        'dropdown.savedRestaurants': '收藏餐厅',
        'dropdown.settings': '设置',
        'dropdown.logout': '退出',
        'dropdown.login': '登录',
        
        // Logout Modal
        'logout.title': '退出确认',
        'logout.question': '确定要退出吗？',
        'logout.warning': '您保存的对话与账户关联，重新登录后可以恢复。',
        'logout.cancel': '取消',
        'logout.confirm': '退出',
        
        // Delete Conversation
        'delete.title': '删除对话',
        'delete.cancel': '取消',
        'delete.confirm': '删除',
        
        // Loading
        'loading.conversations': '加载对话中...',
        
        // Common
        'close': '关闭',
        'save': '保存',
        'cancel': '取消',
        'confirm': '确认',
    },
    
    ja: {
        // Header
        'profile.name': 'トゥギ',
        'profile.status': 'グルメガイド',
        'login': 'ログイン',
        'logout': 'ログアウト',
        'guest': 'ゲスト',
        
        // Side Menu
        'menu.newChat': '新しい会話',
        'menu.searchConversations': '会話を検索...',
        'menu.savedRestaurants': '保存したレストラン',
        'menu.settings': '設定',
        
        // Input Area
        'input.placeholder': 'メッセージを入力...',
        'input.send': '送信',
        
        // Quick Suggestions
        'suggestion.haeundae': '海雲台レストラン',
        'suggestion.porkSoup': '豚汁',
        'suggestion.sashimi': '刺身',
        'suggestion.seomyeon': '西面安い店',
        'suggestion.cafe': 'カフェ推薦',
        
        // Welcome Message
        'welcome.greeting': 'こんにちは！トゥギです！🐧',
        'welcome.intro': '釜山地元グルメガイドのトゥギです！',
        'welcome.question': 'どんな美味しいものをお探しですか？😊',
        
        // Artifacts/Modal
        'artifacts.title': 'レストラン推薦',
        'map.placeholder': 'レストランの位置',
        
        // User Menu
        'dropdown.savedRestaurants': '保存したレストラン',
        'dropdown.settings': '設定',
        'dropdown.logout': 'ログアウト',
        'dropdown.login': 'ログイン',
        
        // Logout Modal
        'logout.title': 'ログアウト確認',
        'logout.question': '本当にログアウトしますか？',
        'logout.warning': '保存された会話はアカウントに紐付けられており、再ログイン時に復元されます。',
        'logout.cancel': 'キャンセル',
        'logout.confirm': 'ログアウト',
        
        // Delete Conversation
        'delete.title': '会話削除',
        'delete.cancel': 'キャンセル',
        'delete.confirm': '削除',
        
        // Loading
        'loading.conversations': '会話読み込み中...',
        
        // Common
        'close': '閉じる',
        'save': '保存',
        'cancel': 'キャンセル',
        'confirm': '確認',
    }
};

// 번역 함수
function t(key, lang = null) {
    const currentLang = lang || (window.getCurrentLanguage ? window.getCurrentLanguage() : 'ko');
    
    if (translations[currentLang] && translations[currentLang][key]) {
        return translations[currentLang][key];
    }
    
    // 기본값으로 한국어 사용
    if (translations.ko[key]) {
        return translations.ko[key];
    }
    
    // 키를 찾지 못한 경우 키 자체 반환
    console.warn(`Translation not found for key: ${key} in language: ${currentLang}`);
    return key;
}

// 전역 함수로 등록
window.t = t;

// 모든 UI 업데이트
function updateAllUIText(language) {
    console.log('🌐 UI 언어 업데이트:', language);
    
    // 데이터 속성을 가진 모든 요소 업데이트
    const elementsWithTranslations = document.querySelectorAll('[data-translate]');
    elementsWithTranslations.forEach(element => {
        const key = element.getAttribute('data-translate');
        const translatedText = t(key, language);
        
        // 입력창의 경우 placeholder 업데이트
        if (element.tagName === 'INPUT' && element.type === 'text') {
            element.placeholder = translatedText;
        } else {
            element.textContent = translatedText;
        }
    });
    
    // 특별한 케이스들 개별 처리
    updateWelcomeMessage(language);
    updateQuickSuggestions(language);
    updateUserDropdown(language);
}

// 환영 메시지 업데이트
function updateWelcomeMessage(language) {
    // 초기 환영 메시지가 있는지 확인하고 업데이트
    const welcomeMessages = document.querySelectorAll('.bot-bubble p');
    if (welcomeMessages.length >= 3) {
        welcomeMessages[0].textContent = t('welcome.greeting', language);
        welcomeMessages[1].textContent = t('welcome.intro', language);
        welcomeMessages[2].textContent = t('welcome.question', language);
    }
}

// 빠른 제안 업데이트
function updateQuickSuggestions(language) {
    const suggestions = [
        { selector: '[onclick*="해운대"]', key: 'suggestion.haeundae' },
        { selector: '[onclick*="돼지국밥"]', key: 'suggestion.porkSoup' },
        { selector: '[onclick*="회"]', key: 'suggestion.sashimi' },
        { selector: '[onclick*="서면"]', key: 'suggestion.seomyeon' },
        { selector: '[onclick*="카페"]', key: 'suggestion.cafe' }
    ];
    
    suggestions.forEach(({ selector, key }) => {
        const element = document.querySelector(selector);
        if (element) {
            const textSpan = element.querySelector('span:not(.fas)');
            if (textSpan) {
                textSpan.textContent = t(key, language);
            }
        }
    });
}

// 사용자 드롭다운 메뉴 업데이트
function updateUserDropdown(language) {
    const dropdownItems = [
        { selector: '[onclick*="navigateToSavedRestaurants"]', key: 'dropdown.savedRestaurants' },
        { selector: '[onclick*="showSettings"]', key: 'dropdown.settings' }
    ];
    
    dropdownItems.forEach(({ selector, key }) => {
        const element = document.querySelector(selector + ' span');
        if (element) {
            element.textContent = t(key, language);
        }
    });
}

// 언어 변경 시 호출될 함수
window.onLanguageChange = function(language) {
    updateAllUIText(language);
    
    // 입력창 플레이스홀더도 별도로 업데이트
    const input = document.getElementById('userInput');
    if (input) {
        input.placeholder = t('input.placeholder', language);
    }
};

// 전역 함수 등록
window.updateAllUIText = updateAllUIText;
window.translations = translations;