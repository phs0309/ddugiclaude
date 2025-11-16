// ============ Language Selector Functions ============

// 현재 선택된 언어 (기본값: 한국어)
let currentLanguage = 'ko';

// 전역 함수로 등록
window.getCurrentLanguage = function() {
    return currentLanguage;
};

// 언어 선택기 토글
window.toggleLanguageDropdown = function() {
    const dropdown = document.getElementById('languageDropdown');
    if (!dropdown) {
        console.error('언어 드롭다운을 찾을 수 없습니다');
        return;
    }
    
    const isVisible = dropdown.style.display === 'block';
    console.log('🔄 드롭다운 토글:', !isVisible);
    
    if (isVisible) {
        closeLanguageDropdown();
    } else {
        showLanguageDropdown();
    }
};

// 언어 드롭다운 표시
function showLanguageDropdown() {
    const dropdown = document.getElementById('languageDropdown');
    if (!dropdown) return;
    
    updateLanguageOptions();
    
    dropdown.style.display = 'block';
    setTimeout(() => {
        dropdown.classList.add('show');
    }, 10);
    
    // 외부 클릭 시 드롭다운 닫기
    document.addEventListener('click', handleLanguageOutsideClick);
}

// 언어 드롭다운 닫기
function closeLanguageDropdown() {
    const dropdown = document.getElementById('languageDropdown');
    if (!dropdown) return;
    
    dropdown.classList.remove('show');
    
    setTimeout(() => {
        dropdown.style.display = 'none';
    }, 200);
    
    document.removeEventListener('click', handleLanguageOutsideClick);
}

// 외부 클릭 핸들러
function handleLanguageOutsideClick(event) {
    const dropdown = document.getElementById('languageDropdown');
    const button = document.getElementById('languageBtn');
    
    if (dropdown && button && 
        !dropdown.contains(event.target) && 
        !button.contains(event.target)) {
        closeLanguageDropdown();
    }
}

// 언어 선택
window.selectLanguage = function(langCode, flag, name) {
    currentLanguage = langCode;
    console.log('🌍 언어 선택:', name, `(${langCode})`);
    
    // 플레이스홀더 업데이트
    updateInputPlaceholder(langCode);
    
    // 모든 UI 텍스트 업데이트
    if (window.updateAllUIText) {
        window.updateAllUIText(langCode);
    }
    
    // 언어 변경 이벤트 발생
    if (window.onLanguageChange) {
        window.onLanguageChange(langCode);
    }
    
    // 드롭다운 닫기
    closeLanguageDropdown();
    
    // 선택된 언어 저장 (로컬 스토리지)
    localStorage.setItem('selectedLanguage', langCode);
};

// 언어 옵션 활성 상태 업데이트
function updateLanguageOptions() {
    const options = document.querySelectorAll('.language-option');
    options.forEach(option => {
        const langCode = option.getAttribute('data-lang');
        if (langCode === currentLanguage) {
            option.classList.add('active');
        } else {
            option.classList.remove('active');
        }
    });
}

// 입력창 플레이스홀더 업데이트
function updateInputPlaceholder(langCode) {
    const input = document.getElementById('userInput');
    if (!input) return;
    
    const placeholders = {
        'ko': '메시지 보내기...',
        'en': 'Type a message...',
        'zh': '输入信息...',
        'ja': 'メッセージを入力...'
    };
    
    input.placeholder = placeholders[langCode] || placeholders['ko'];
}

// 언어 선택기 초기화
function initializeLanguageSelector() {
    console.log('🚀 언어 선택기 초기화 시작');
    
    // 언어 버튼 이벤트 리스너 추가
    const languageBtn = document.getElementById('languageBtn');
    if (languageBtn) {
        console.log('✅ 언어 버튼 찾음');
        languageBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🖱️ 언어 버튼 클릭됨');
            window.toggleLanguageDropdown();
        });
    } else {
        console.error('❌ 언어 버튼을 찾을 수 없습니다');
    }
    
    // 언어 옵션 이벤트 리스너 추가
    const languageOptions = document.querySelectorAll('.language-option');
    console.log('📝 언어 옵션 개수:', languageOptions.length);
    
    languageOptions.forEach(option => {
        option.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const langCode = this.getAttribute('data-lang');
            const flag = this.querySelector('.option-flag').textContent;
            const name = this.querySelector('.option-name').textContent;
            
            console.log('🎯 언어 옵션 클릭:', langCode, name);
            window.selectLanguage(langCode, flag, name);
        });
    });
    
    // 저장된 언어 불러오기
    const savedLanguage = localStorage.getItem('selectedLanguage');
    if (savedLanguage) {
        console.log('💾 저장된 언어:', savedLanguage);
        currentLanguage = savedLanguage;
        updateInputPlaceholder(savedLanguage);
        updateLanguageOptions();
        
        // 저장된 언어로 UI 업데이트
        if (window.updateAllUIText) {
            setTimeout(() => {
                window.updateAllUIText(savedLanguage);
            }, 200);
        }
    }
    
    console.log('✅ 언어 선택기 초기화 완료. 현재 언어:', currentLanguage);
}

// 페이지 로드 시 언어 선택기 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM 로드 완료, 언어 선택기 초기화 중...');
    setTimeout(initializeLanguageSelector, 100); // 약간의 지연을 두어 안정성 확보
});