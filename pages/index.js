import Head from 'next/head'
import { useEffect } from 'react'

export default function Home() {
  useEffect(() => {
    // 기존 JavaScript 로직을 여기에 이식
    const script = document.createElement('script')
    script.src = '/script.js'
    script.async = true
    document.body.appendChild(script)

    const apiScript = document.createElement('script')
    apiScript.src = '/api-client.js'
    apiScript.async = true
    document.body.appendChild(apiScript)

    return () => {
      // cleanup
      document.body.removeChild(script)
      document.body.removeChild(apiScript)
    }
  }, [])

  return (
    <>
      <Head>
        <title>뚜기의 부산 맛집</title>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="/style.css" />
        <link rel="stylesheet" href="/user-menu.css" />
        <link rel="stylesheet" href="/language-selector.css" />
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      {/* Side Menu Overlay */}
      <div className="side-menu-overlay" id="sideMenuOverlay" onClick={() => closeSideMenu()}></div>
      
      {/* Simplified Side Menu */}
      <div className="side-menu" id="sideMenu">
        <div className="side-menu-header">
          <div className="side-menu-profile">
            <div className="side-menu-avatar">🐧</div>
            <div className="side-menu-info">
              <h3 data-translate="profile.name">뚜기 AI</h3>
              <p data-translate="profile.status">맛집 가이드</p>
            </div>
          </div>
          <button className="side-menu-close" onClick={() => closeSideMenu()}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="side-menu-content">
          {/* 통합된 사이드 메뉴 */}
          <nav className="side-menu-nav">
            {/* 새 대화 버튼 */}
            <button className="side-menu-item new-chat-item" onClick={() => startNewConversation()}>
              <i className="fas fa-plus"></i>
              <span data-translate="menu.newChat">새 대화</span>
            </button>
            
            {/* 대화 검색 */}
            <div className="conversation-search-item">
              <div className="chat-search-container">
                <input type="text" placeholder="대화 검색..." id="conversationSearch" onKeyUp={() => searchConversations()} data-translate="menu.searchConversations" />
                <i className="fas fa-search"></i>
              </div>
            </div>
            
            {/* 대화 목록 (동적으로 여기에 추가됩니다) */}
            <div className="conversation-list" id="conversationList"></div>
            
            {/* 구분선 */}
            <div className="side-menu-divider"></div>
            
            {/* 일반 메뉴 항목들 */}
            <a href="/saved" className="side-menu-item">
              <i className="fas fa-heart"></i>
              <span data-translate="menu.favorites">저장된 맛집</span>
            </a>
            <a href="/settings" className="side-menu-item">
              <i className="fas fa-cog"></i>
              <span data-translate="menu.settings">설정</span>
            </a>
          </nav>
          
          {/* 하단 정보 */}
          <div className="side-menu-footer">
            <div className="user-menu-container">
              <div className="user-display" id="userDisplay">
                <div className="user-avatar" id="userAvatar">
                  <i className="fas fa-user"></i>
                </div>
                <div className="user-info" id="userInfo">
                  <span className="user-name" id="userName" data-translate="auth.guest">게스트</span>
                  <span className="user-status" id="userStatus" data-translate="auth.notLoggedIn">로그인하지 않음</span>
                </div>
                <div className="user-menu-toggle" id="userMenuToggle">
                  <i className="fas fa-chevron-down"></i>
                </div>
              </div>
              
              {/* 사용자 메뉴 */}
              <div className="user-menu" id="userMenu">
                <div className="user-menu-item" id="loginItem" onClick={() => loginOrOut()}>
                  <i className="fas fa-sign-in-alt" id="loginIcon"></i>
                  <span id="loginText" data-translate="auth.login">로그인</span>
                </div>
                <div className="user-menu-item" onClick={() => guestMode()}>
                  <i className="fas fa-user-circle"></i>
                  <span data-translate="auth.guestMode">게스트 모드</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container">
        {/* Header with Menu Button */}
        <header className="header">
          <button className="menu-button" id="menuButton" onClick={() => openSideMenu()}>
            <i className="fas fa-bars"></i>
          </button>
          <h1 className="title" data-translate="title">뚜기의 부산 맛집</h1>
          
          {/* Language Selector */}
          <div className="language-selector">
            <button className="language-button" id="languageButton" onClick={() => toggleLanguageMenu()}>
              <i className="fas fa-globe"></i>
              <span id="currentLanguage">KO</span>
              <i className="fas fa-chevron-down"></i>
            </button>
            <div className="language-menu" id="languageMenu">
              <div className="language-option" onClick={() => setLanguage('ko')}>
                <span>🇰🇷</span>
                <span>한국어</span>
              </div>
              <div className="language-option" onClick={() => setLanguage('en')}>
                <span>🇺🇸</span>
                <span>English</span>
              </div>
              <div className="language-option" onClick={() => setLanguage('ja')}>
                <span>🇯🇵</span>
                <span>日本語</span>
              </div>
              <div className="language-option" onClick={() => setLanguage('zh')}>
                <span>🇨🇳</span>
                <span>中文</span>
              </div>
            </div>
          </div>
          
          {/* Travel Itinerary Button */}
          <div className="travel-button-container">
            <button className="travel-button" id="travelButton" onClick={() => openTravelModal()}>
              <i className="fas fa-map-marked-alt"></i>
              <span data-translate="travel.button">여행 일정</span>
            </button>
          </div>
        </header>

        {/* Chat Container */}
        <div className="chat-container" id="chatContainer">
          {/* Chat Messages Area */}
          <div className="chat-messages" id="chatMessages">
            {/* Welcome Message */}
            <div className="message ai-message" id="welcomeMessage">
              <div className="message-avatar">🐧</div>
              <div className="message-content">
                <p data-translate="welcome.message">안녕하세요! 저는 뚜기예요 🐧<br/>부산의 맛집을 찾아드릴게요!</p>
                <div className="quick-actions">
                  <button className="quick-action-btn" onClick={() => sendMessage('해운대 맛집 추천해줘')}>
                    <i className="fas fa-utensils"></i>
                    <span data-translate="quickAction.haeundae">해운대 맛집</span>
                  </button>
                  <button className="quick-action-btn" onClick={() => sendMessage('서면 술집 추천해줘')}>
                    <i className="fas fa-glass-cheers"></i>
                    <span data-translate="quickAction.seomyeon">서면 술집</span>
                  </button>
                  <button className="quick-action-btn" onClick={() => sendMessage('광안리 카페 추천해줘')}>
                    <i className="fas fa-coffee"></i>
                    <span data-translate="quickAction.gwangalli">광안리 카페</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Chat Input Area */}
          <div className="chat-input-container">
            <div className="chat-input-wrapper">
              <div className="attachment-container">
                <button className="attachment-button" onClick={() => toggleLocationModal()}>
                  <i className="fas fa-map-marker-alt"></i>
                </button>
              </div>
              <input 
                type="text" 
                id="messageInput" 
                placeholder="어떤 맛집을 찾아드릴까요?" 
                data-translate="input.placeholder"
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              />
              <button className="send-button" id="sendButton" onClick={() => sendMessage()}>
                <i className="fas fa-paper-plane"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Location Modal */}
      <div className="modal-overlay" id="locationModalOverlay" onClick={() => closeLocationModal()}></div>
      <div className="location-modal" id="locationModal">
        <div className="location-modal-header">
          <h3 data-translate="location.title">내 위치 설정</h3>
          <button className="location-modal-close" onClick={() => closeLocationModal()}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="location-modal-content">
          <div className="location-options">
            <button className="location-option" onClick={() => getCurrentLocation()}>
              <i className="fas fa-crosshairs"></i>
              <span data-translate="location.current">현재 위치 사용</span>
            </button>
            <div className="location-search">
              <input 
                type="text" 
                id="locationSearchInput" 
                placeholder="주소나 장소명 검색" 
                data-translate="location.search"
                onKeyPress={(e) => e.key === 'Enter' && searchLocation()}
              />
              <button onClick={() => searchLocation()}>
                <i className="fas fa-search"></i>
              </button>
            </div>
          </div>
          <div className="location-map" id="locationMap"></div>
        </div>
      </div>

      {/* Travel Itinerary Modal */}
      <div className="modal-overlay" id="travelModalOverlay" onClick={() => closeTravelModal()}></div>
      <div className="travel-modal" id="travelModal">
        <div className="travel-modal-header">
          <h3 data-translate="travel.title">부산 여행 일정 생성</h3>
          <button className="travel-modal-close" onClick={() => closeTravelModal()}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="travel-modal-content">
          <form id="travelForm">
            <div className="travel-form-group">
              <label data-translate="travel.days">여행 일수:</label>
              <select id="travelDays">
                <option value="1">1일</option>
                <option value="2" selected>2일</option>
                <option value="3">3일</option>
                <option value="4">4일</option>
                <option value="5">5일</option>
              </select>
            </div>
            
            <div className="travel-form-group">
              <label data-translate="travel.companions">동행자:</label>
              <select id="travelCompanions">
                <option value="혼자" data-translate="travel.alone">혼자</option>
                <option value="커플" data-translate="travel.couple" selected>커플</option>
                <option value="가족" data-translate="travel.family">가족</option>
                <option value="친구들" data-translate="travel.friends">친구들</option>
              </select>
            </div>
            
            <div className="travel-form-group">
              <label data-translate="travel.budget">예산대:</label>
              <select id="travelBudget">
                <option value="저렴" data-translate="travel.budget.low">저렴 (1인 5만원 이하/일)</option>
                <option value="보통" data-translate="travel.budget.medium" selected>보통 (1인 5-10만원/일)</option>
                <option value="고급" data-translate="travel.budget.high">고급 (1인 10만원 이상/일)</option>
              </select>
            </div>
            
            <div className="travel-form-group">
              <label data-translate="travel.preferences">선호 음식:</label>
              <div className="travel-preferences">
                <label><input type="checkbox" value="해산물" checked /> <span data-translate="food.seafood">해산물</span></label>
                <label><input type="checkbox" value="돼지국밥" /> <span data-translate="food.pork.soup">돼지국밥</span></label>
                <label><input type="checkbox" value="밀면" /> <span data-translate="food.milmyeon">밀면</span></label>
                <label><input type="checkbox" value="한식" /> <span data-translate="food.korean">한식</span></label>
                <label><input type="checkbox" value="카페" /> <span data-translate="food.cafe">카페</span></label>
                <label><input type="checkbox" value="술집" /> <span data-translate="food.bar">술집</span></label>
              </div>
            </div>
            
            <button type="button" className="travel-generate-button" onClick={() => generateItinerary()}>
              <i className="fas fa-magic"></i>
              <span data-translate="travel.generate">일정 생성하기</span>
            </button>
          </form>
          
          <div className="travel-result" id="travelResult" style={{display: 'none'}}>
            <h4 data-translate="travel.result.title">생성된 여행 일정</h4>
            <div id="travelItinerary"></div>
            <div className="travel-actions">
              <button className="travel-save-button" onClick={() => saveTravelItinerary()}>
                <i className="fas fa-save"></i>
                <span data-translate="travel.save">일정 저장</span>
              </button>
              <button className="travel-share-button" onClick={() => shareTravelItinerary()}>
                <i className="fas fa-share"></i>
                <span data-translate="travel.share">일정 공유</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      <div className="loading-overlay" id="loadingOverlay" style={{display: 'none'}}>
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p data-translate="loading.generating">여행 일정을 생성하고 있습니다...</p>
        </div>
      </div>

      {/* Floating Travel Button */}
      <div className="floating-travel-button" id="floatingTravelButton" onClick={() => openTravelModal()}>
        <i className="fas fa-route"></i>
        <div className="floating-tooltip">
          <span data-translate="travel.floating.tooltip">여행 일정 생성</span>
        </div>
      </div>
    </>
  )
}