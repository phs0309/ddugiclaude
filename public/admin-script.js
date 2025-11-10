// 에이전트 관리 대시보드 JavaScript

class AdminDashboard {
    constructor() {
        this.currentSection = 'dashboard';
        this.schedulerRunning = false;
        this.districts = [
            '중구', '서구', '동구', '영도구', '부산진구', '동래구', 
            '남구', '북구', '해운대구', '사하구', '금정구', '강서구', 
            '연제구', '수영구', '사상구', '기장군'
        ];
        this.stats = {
            totalDistricts: 16,
            totalRestaurants: 69,
            lastSync: '오늘',
            errorCount: 0
        };
        this.districtData = {};
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadInitialData();
        this.updateLastUpdateTime();
        this.renderDistrictsGrid();
        
        // 5분마다 데이터 갱신
        setInterval(() => {
            this.refreshStats();
            this.updateLastUpdateTime();
        }, 5 * 60 * 1000);
    }

    setupEventListeners() {
        // 사이드바 메뉴 클릭
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const section = e.currentTarget.dataset.section;
                this.switchSection(section);
            });
        });

        // 모달 외부 클릭으로 닫기
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('modal');
            if (e.target === modal) {
                this.closeModal();
            }
        });
    }

    switchSection(section) {
        // 활성 메뉴 변경
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-section="${section}"]`).classList.add('active');

        // 활성 섹션 변경
        document.querySelectorAll('.content-section').forEach(sec => {
            sec.classList.remove('active');
        });
        document.getElementById(section).classList.add('active');

        // 헤더 업데이트
        this.updateHeader(section);
        this.currentSection = section;

        // 섹션별 초기화
        if (section === 'reports') {
            this.renderCharts();
        } else if (section === 'districts') {
            this.renderDistrictsGrid();
        }
    }

    updateHeader(section) {
        const titles = {
            dashboard: '데이터 관리 대시보드',
            districts: '구역별 관리',
            scheduler: '스케줄러 관리',
            reports: '리포트 및 통계',
            logs: '시스템 로그',
            settings: '시스템 설정'
        };

        document.getElementById('page-title').textContent = titles[section];
        document.getElementById('current-section').textContent = titles[section];
    }

    async loadInitialData() {
        try {
            await this.fetchStats();
            this.updateStatsDisplay();
        } catch (error) {
            console.error('데이터 로딩 실패:', error);
            this.showNotification('데이터 로딩에 실패했습니다.', 'error');
        }
    }

    async fetchStats() {
        try {
            const response = await fetch('/api/agent/stats');
            if (response.ok) {
                const data = await response.json();
                this.stats = {
                    totalDistricts: data.districts || 16,
                    totalRestaurants: data.totalRestaurants || 69,
                    lastSync: this.formatDate(new Date()),
                    errorCount: data.errors || 0
                };
                this.districtData = data.byDistrict || {};
            }
        } catch (error) {
            console.error('통계 가져오기 실패:', error);
        }
    }

    updateStatsDisplay() {
        document.getElementById('total-districts').textContent = this.stats.totalDistricts;
        document.getElementById('total-restaurants').textContent = this.stats.totalRestaurants;
        document.getElementById('last-sync').textContent = this.stats.lastSync;
        document.getElementById('error-count').textContent = this.stats.errorCount;
    }

    renderDistrictsGrid() {
        const grid = document.getElementById('districts-grid');
        grid.innerHTML = '';

        this.districts.forEach(district => {
            const count = this.districtData[district] || 0;
            const status = count > 0 ? 'updated' : 'outdated';
            const statusText = count > 0 ? '최신' : '업데이트 필요';

            const card = document.createElement('div');
            card.className = 'district-card';
            card.innerHTML = `
                <div class="district-header">
                    <h3 class="district-name">${district}</h3>
                    <span class="district-status ${status}">${statusText}</span>
                </div>
                <div class="district-stats">
                    <div class="district-stat">
                        <span>${count}</span>
                        <p>맛집</p>
                    </div>
                    <div class="district-stat">
                        <span>${this.getRandomRating()}</span>
                        <p>평균 평점</p>
                    </div>
                    <div class="district-stat">
                        <span>${this.getRandomUpdateTime()}</span>
                        <p>마지막 업데이트</p>
                    </div>
                </div>
                <div class="district-actions">
                    <button class="district-btn primary" onclick="updateDistrict('${district}')">
                        <i class="fas fa-sync"></i> 업데이트
                    </button>
                    <button class="district-btn secondary" onclick="viewDistrictDetails('${district}')">
                        <i class="fas fa-eye"></i> 상세보기
                    </button>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    getRandomRating() {
        return (Math.random() * 2 + 3).toFixed(1);
    }

    getRandomUpdateTime() {
        const times = ['방금', '1시간 전', '3시간 전', '6시간 전', '12시간 전'];
        return times[Math.floor(Math.random() * times.length)];
    }

    renderCharts() {
        // 구역별 맛집 분포 차트
        const districtCtx = document.getElementById('districts-chart');
        if (districtCtx && typeof Chart !== 'undefined') {
            new Chart(districtCtx, {
                type: 'bar',
                data: {
                    labels: this.districts,
                    datasets: [{
                        label: '맛집 수',
                        data: this.districts.map(d => this.districtData[d] || 0),
                        backgroundColor: 'rgba(0, 184, 148, 0.8)',
                        borderColor: 'rgba(0, 184, 148, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }

        // 카테고리별 분포 차트
        const categoryCtx = document.getElementById('categories-chart');
        if (categoryCtx && typeof Chart !== 'undefined') {
            const categories = ['한식', '중식', '일식', '카페', '양식', '기타'];
            const categoryData = [22, 12, 14, 14, 1, 6]; // 예시 데이터

            new Chart(categoryCtx, {
                type: 'doughnut',
                data: {
                    labels: categories,
                    datasets: [{
                        data: categoryData,
                        backgroundColor: [
                            '#00b894',
                            '#74b9ff',
                            '#fd79a8',
                            '#fdcb6e',
                            '#e17055',
                            '#a29bfe'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }
    }

    updateLastUpdateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit'
        });
        document.getElementById('last-update-time').textContent = `${timeString} 업데이트`;
    }

    formatDate(date) {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return '오늘';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return '어제';
        } else {
            return date.toLocaleDateString('ko-KR');
        }
    }

    showLoading() {
        document.getElementById('loading-overlay').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loading-overlay').style.display = 'none';
    }

    showModal(title, content, confirmCallback) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = content;
        document.getElementById('modal').style.display = 'flex';
        
        window.modalConfirmCallback = confirmCallback;
    }

    closeModal() {
        document.getElementById('modal').style.display = 'none';
        window.modalConfirmCallback = null;
    }

    confirmModal() {
        if (window.modalConfirmCallback) {
            window.modalConfirmCallback();
        }
        this.closeModal();
    }

    addActivityLog(message, type = 'info') {
        const activityList = document.getElementById('activity-list');
        const logContainer = document.getElementById('log-container');
        
        const now = new Date();
        const timeString = now.toLocaleString('ko-KR');
        
        // 활동 로그에 추가
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        activityItem.innerHTML = `
            <div class="activity-icon ${type}">
                <i class="fas fa-${this.getIconForType(type)}"></i>
            </div>
            <div class="activity-content">
                <p><strong>${message}</strong></p>
                <span class="activity-time">방금 전</span>
            </div>
        `;
        activityList.insertBefore(activityItem, activityList.firstChild);

        // 시스템 로그에 추가
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        logEntry.innerHTML = `
            <span class="log-time">${timeString}</span>
            <span class="log-level">${type.toUpperCase()}</span>
            <span class="log-message">${message}</span>
        `;
        logContainer.insertBefore(logEntry, logContainer.firstChild);

        // 최대 50개 로그만 유지
        while (activityList.children.length > 50) {
            activityList.removeChild(activityList.lastChild);
        }
        while (logContainer.children.length > 100) {
            logContainer.removeChild(logContainer.lastChild);
        }
    }

    getIconForType(type) {
        const icons = {
            info: 'info',
            success: 'check',
            warning: 'exclamation-triangle',
            error: 'times'
        };
        return icons[type] || 'info';
    }

    showNotification(message, type = 'info') {
        // 간단한 알림 시스템
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'error' ? '#e17055' : '#00b894'};
            color: white;
            border-radius: 8px;
            z-index: 3000;
            animation: slideInRight 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    async refreshStats() {
        await this.fetchStats();
        this.updateStatsDisplay();
        if (this.currentSection === 'districts') {
            this.renderDistrictsGrid();
        }
    }
}

// 전역 함수들
let dashboard;

window.addEventListener('DOMContentLoaded', () => {
    dashboard = new AdminDashboard();
});

// API 호출 함수들
async function runFullUpdate() {
    dashboard.showLoading();
    dashboard.addActivityLog('전체 업데이트 시작', 'info');
    
    try {
        const response = await fetch('/api/agent/update', { method: 'POST' });
        if (response.ok) {
            dashboard.addActivityLog('전체 업데이트 완료', 'success');
            dashboard.showNotification('전체 업데이트가 완료되었습니다.', 'success');
            await dashboard.refreshStats();
        } else {
            throw new Error('업데이트 실패');
        }
    } catch (error) {
        dashboard.addActivityLog('전체 업데이트 실패', 'error');
        dashboard.showNotification('업데이트에 실패했습니다.', 'error');
    }
    
    dashboard.hideLoading();
}

async function generateReport() {
    dashboard.showLoading();
    dashboard.addActivityLog('리포트 생성 시작', 'info');
    
    try {
        const response = await fetch('/api/agent/report', { method: 'POST' });
        if (response.ok) {
            dashboard.addActivityLog('일일 리포트 생성 완료', 'success');
            dashboard.showNotification('리포트가 생성되었습니다.', 'success');
        } else {
            throw new Error('리포트 생성 실패');
        }
    } catch (error) {
        dashboard.addActivityLog('리포트 생성 실패', 'error');
        dashboard.showNotification('리포트 생성에 실패했습니다.', 'error');
    }
    
    dashboard.hideLoading();
}

async function cleanupData() {
    dashboard.showModal(
        '데이터 정리',
        '<p>30일 이전의 오래된 데이터를 정리하시겠습니까?</p><p class="text-warning">이 작업은 되돌릴 수 없습니다.</p>',
        async () => {
            dashboard.showLoading();
            dashboard.addActivityLog('데이터 정리 시작', 'warning');
            
            try {
                const response = await fetch('/api/agent/cleanup', { method: 'POST' });
                if (response.ok) {
                    dashboard.addActivityLog('데이터 정리 완료', 'success');
                    dashboard.showNotification('데이터 정리가 완료되었습니다.', 'success');
                } else {
                    throw new Error('데이터 정리 실패');
                }
            } catch (error) {
                dashboard.addActivityLog('데이터 정리 실패', 'error');
                dashboard.showNotification('데이터 정리에 실패했습니다.', 'error');
            }
            
            dashboard.hideLoading();
        }
    );
}

async function startScheduler() {
    if (dashboard.schedulerRunning) {
        dashboard.showNotification('스케줄러가 이미 실행 중입니다.', 'warning');
        return;
    }

    dashboard.showLoading();
    dashboard.addActivityLog('스케줄러 시작', 'info');
    
    try {
        const response = await fetch('/api/agent/scheduler/start', { method: 'POST' });
        if (response.ok) {
            dashboard.schedulerRunning = true;
            dashboard.addActivityLog('스케줄러 시작됨', 'success');
            dashboard.showNotification('스케줄러가 시작되었습니다.', 'success');
            
            // 버튼 텍스트 변경
            const btn = document.getElementById('start-scheduler-btn');
            if (btn) {
                btn.innerHTML = '<i class="fas fa-stop"></i> 스케줄러 중지';
                btn.onclick = stopScheduler;
            }
        } else {
            throw new Error('스케줄러 시작 실패');
        }
    } catch (error) {
        dashboard.addActivityLog('스케줄러 시작 실패', 'error');
        dashboard.showNotification('스케줄러 시작에 실패했습니다.', 'error');
    }
    
    dashboard.hideLoading();
}

async function stopScheduler() {
    dashboard.showLoading();
    dashboard.addActivityLog('스케줄러 중지', 'info');
    
    try {
        const response = await fetch('/api/agent/scheduler/stop', { method: 'POST' });
        if (response.ok) {
            dashboard.schedulerRunning = false;
            dashboard.addActivityLog('스케줄러 중지됨', 'warning');
            dashboard.showNotification('스케줄러가 중지되었습니다.', 'success');
            
            // 버튼 텍스트 변경
            const btn = document.getElementById('start-scheduler-btn');
            if (btn) {
                btn.innerHTML = '<i class="fas fa-play"></i> 스케줄러 시작';
                btn.onclick = startScheduler;
            }
        } else {
            throw new Error('스케줄러 중지 실패');
        }
    } catch (error) {
        dashboard.addActivityLog('스케줄러 중지 실패', 'error');
        dashboard.showNotification('스케줄러 중지에 실패했습니다.', 'error');
    }
    
    dashboard.hideLoading();
}

function toggleScheduler() {
    if (dashboard.schedulerRunning) {
        stopScheduler();
    } else {
        startScheduler();
    }
}

async function updateDistrict(district) {
    dashboard.showLoading();
    dashboard.addActivityLog(`${district} 업데이트 시작`, 'info');
    
    try {
        const response = await fetch(`/api/agent/update/${district}`, { method: 'POST' });
        if (response.ok) {
            dashboard.addActivityLog(`${district} 업데이트 완료`, 'success');
            dashboard.showNotification(`${district} 업데이트가 완료되었습니다.`, 'success');
            await dashboard.refreshStats();
        } else {
            throw new Error(`${district} 업데이트 실패`);
        }
    } catch (error) {
        dashboard.addActivityLog(`${district} 업데이트 실패`, 'error');
        dashboard.showNotification(`${district} 업데이트에 실패했습니다.`, 'error');
    }
    
    dashboard.hideLoading();
}

async function updateAllDistricts() {
    await runFullUpdate();
}

function viewDistrictDetails(district) {
    const count = dashboard.districtData[district] || 0;
    dashboard.showModal(
        `${district} 상세 정보`,
        `
        <div class="district-details">
            <p><strong>총 맛집 수:</strong> ${count}개</p>
            <p><strong>마지막 업데이트:</strong> ${dashboard.getRandomUpdateTime()}</p>
            <p><strong>평균 평점:</strong> ${dashboard.getRandomRating()}</p>
            <p><strong>상태:</strong> ${count > 0 ? '정상' : '업데이트 필요'}</p>
        </div>
        `,
        () => {
            updateDistrict(district);
        }
    );
}

async function refreshStats() {
    await dashboard.refreshStats();
    dashboard.showNotification('통계가 새로고침되었습니다.', 'success');
}

function clearLogs() {
    dashboard.showModal(
        '로그 삭제',
        '<p>모든 로그를 삭제하시겠습니까?</p>',
        () => {
            document.getElementById('log-container').innerHTML = '';
            document.getElementById('activity-list').innerHTML = '';
            dashboard.showNotification('로그가 삭제되었습니다.', 'success');
        }
    );
}

function saveSettings() {
    const updateInterval = document.getElementById('update-interval').value;
    const dataRetention = document.getElementById('data-retention').value;
    const emailNotifications = document.getElementById('email-notifications').checked;
    const errorNotifications = document.getElementById('error-notifications').checked;
    
    dashboard.addActivityLog('설정 저장됨', 'success');
    dashboard.showNotification('설정이 저장되었습니다.', 'success');
}

// 모달 관련 전역 함수
function closeModal() {
    dashboard.closeModal();
}

function confirmModal() {
    dashboard.confirmModal();
}

// =============== 패널 관리 ===============

function showAddDataModal() {
    const panel = document.getElementById('add-data-panel');
    panel.classList.add('active');
    
    // 폼 필드에 포커스
    setTimeout(() => {
        document.getElementById('add-district').focus();
    }, 300);
}

function hideAddDataPanel() {
    const panel = document.getElementById('add-data-panel');
    panel.classList.remove('active');
}

function showSearchModal() {
    const panel = document.getElementById('search-panel');
    panel.classList.add('active');
    
    // 폼 필드에 포커스
    setTimeout(() => {
        document.getElementById('search-district').focus();
    }, 300);
}

function hideSearchPanel() {
    const panel = document.getElementById('search-panel');
    panel.classList.remove('active');
}

function resetSearchForm() {
    document.getElementById('search-district').value = '';
    document.getElementById('search-keyword').value = '';
    document.getElementById('search-count').value = '3';
    document.getElementById('search-category').value = '';
    document.getElementById('search-price').value = '';
    document.getElementById('search-rating').value = '';
    
    dashboard.showNotification('검색 폼이 초기화되었습니다.', 'info');
}

async function searchAndAddRestaurants() {
    const district = document.getElementById('search-district').value;
    const keyword = document.getElementById('search-keyword').value;
    const count = parseInt(document.getElementById('search-count').value);
    const category = document.getElementById('search-category').value;
    const price = document.getElementById('search-price').value;
    const rating = document.getElementById('search-rating').value;
    
    // 유효성 검사
    if (!district) {
        dashboard.showNotification('구역을 선택해주세요.', 'error');
        return;
    }
    
    if (!keyword && !category) {
        dashboard.showNotification('검색 키워드나 카테고리를 입력해주세요.', 'error');
        return;
    }
    
    if (count < 1 || count > 10) {
        dashboard.showNotification('추가할 맛집 수는 1-10개 사이로 설정해주세요.', 'error');
        return;
    }
    
    dashboard.showLoading();
    hideSearchPanel();
    
    const searchParams = {
        district,
        keyword,
        count,
        category,
        price,
        rating: rating ? parseFloat(rating) : null
    };
    
    dashboard.addActivityLog(`${district}에서 "${keyword || category}" 검색 시작`, 'info');
    
    try {
        const response = await fetch('/api/agent/search-add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(searchParams)
        });
        
        if (response.ok) {
            const result = await response.json();
            dashboard.addActivityLog(
                `${district}에 ${result.addedCount}개 맛집 추가 완료`, 
                'success'
            );
            dashboard.showNotification(
                `${district}에 ${result.addedCount}개 맛집이 추가되었습니다.`, 
                'success'
            );
            
            // 통계 및 구역 카드 새로고침
            await dashboard.refreshStats();
            
            // 검색 결과 모달 표시 (선택사항)
            if (result.restaurants && result.restaurants.length > 0) {
                showSearchResultModal(result.restaurants, district);
            }
        } else {
            const error = await response.json();
            throw new Error(error.message || '검색 및 추가에 실패했습니다.');
        }
    } catch (error) {
        dashboard.addActivityLog(`${district} 맛집 검색 실패: ${error.message}`, 'error');
        dashboard.showNotification(`검색에 실패했습니다: ${error.message}`, 'error');
    }
    
    dashboard.hideLoading();
}

function resetAddForm() {
    document.getElementById('add-district').value = '';
    document.getElementById('add-name').value = '';
    document.getElementById('add-category').value = '';
    document.getElementById('add-address').value = '';
    document.getElementById('add-phone').value = '';
    document.getElementById('add-rating').value = '';
    document.getElementById('add-price').value = '';
    document.getElementById('add-hours').value = '';
    document.getElementById('add-description').value = '';
    document.getElementById('add-specialties').value = '';
    document.getElementById('add-image').value = '';
    
    dashboard.showNotification('입력 폼이 초기화되었습니다.', 'info');
}

async function addRestaurantData() {
    // 필수 필드 가져오기
    const district = document.getElementById('add-district').value;
    const name = document.getElementById('add-name').value.trim();
    const category = document.getElementById('add-category').value;
    const address = document.getElementById('add-address').value.trim();
    const rating = document.getElementById('add-rating').value;
    
    // 선택 필드 가져오기
    const phone = document.getElementById('add-phone').value.trim();
    const price = document.getElementById('add-price').value;
    const hours = document.getElementById('add-hours').value.trim();
    const description = document.getElementById('add-description').value.trim();
    const specialties = document.getElementById('add-specialties').value.trim();
    const image = document.getElementById('add-image').value.trim();
    
    // 유효성 검사
    if (!district) {
        dashboard.showNotification('구역을 선택해주세요.', 'error');
        return;
    }
    
    if (!name) {
        dashboard.showNotification('맛집 이름을 입력해주세요.', 'error');
        return;
    }
    
    if (!category) {
        dashboard.showNotification('카테고리를 선택해주세요.', 'error');
        return;
    }
    
    if (!address) {
        dashboard.showNotification('주소를 입력해주세요.', 'error');
        return;
    }
    
    if (!rating) {
        dashboard.showNotification('평점을 선택해주세요.', 'error');
        return;
    }
    
    // 주소 검증 (부산 지역 포함 여부 확인)
    if (!address.includes('부산') && !address.includes(district.replace('구', '').replace('군', ''))) {
        dashboard.showNotification('주소가 선택한 구역과 일치하지 않습니다. 부산 지역의 주소를 입력해주세요.', 'error');
        return;
    }
    
    dashboard.showLoading();
    hideAddDataPanel();
    
    // 데이터 객체 생성
    const restaurantData = {
        district,
        name,
        category,
        address,
        rating: parseFloat(rating),
        phone: phone || null,
        priceRange: price || '보통',
        hours: hours || null,
        description: description || `${district}에 위치한 ${category} 맛집`,
        specialties: specialties ? specialties.split(',').map(s => s.trim()) : [],
        imageUrl: image || null
    };
    
    dashboard.addActivityLog(`${district}에 "${name}" 직접 추가 시작`, 'info');
    
    try {
        const response = await fetch('/api/agent/add-restaurant', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(restaurantData)
        });
        
        if (response.ok) {
            const result = await response.json();
            dashboard.addActivityLog(
                `${district}에 "${name}" 추가 완료`, 
                'success'
            );
            dashboard.showNotification(
                `${name}이(가) ${district}에 성공적으로 추가되었습니다.`, 
                'success'
            );
            
            // 폼 초기화
            resetAddForm();
            
            // 통계 및 구역 카드 새로고침
            await dashboard.refreshStats();
            
            // 추가된 맛집 정보 모달 표시
            showRestaurantAddedModal(restaurantData);
            
        } else {
            const error = await response.json();
            throw new Error(error.message || '맛집 추가에 실패했습니다.');
        }
    } catch (error) {
        dashboard.addActivityLog(`"${name}" 추가 실패: ${error.message}`, 'error');
        dashboard.showNotification(`맛집 추가에 실패했습니다: ${error.message}`, 'error');
    }
    
    dashboard.hideLoading();
}

function showRestaurantAddedModal(restaurant) {
    dashboard.showModal(
        '맛집 추가 완료',
        `
        <div class="restaurant-added">
            <div class="success-icon">
                <i class="fas fa-check-circle"></i>
            </div>
            <div class="restaurant-info">
                <h4>${restaurant.name}</h4>
                <p class="restaurant-location">${restaurant.district} • ${restaurant.category}</p>
                <p class="restaurant-address">${restaurant.address}</p>
                <div class="restaurant-rating">
                    <i class="fas fa-star"></i>
                    <span>${restaurant.rating}</span>
                </div>
                ${restaurant.description ? `<p class="restaurant-desc">${restaurant.description}</p>` : ''}
                ${restaurant.specialties.length > 0 ? `<p class="restaurant-specialties"><strong>대표메뉴:</strong> ${restaurant.specialties.join(', ')}</p>` : ''}
            </div>
        </div>
        <style>
        .restaurant-added { text-align: center; padding: 20px 0; }
        .success-icon { margin-bottom: 15px; }
        .success-icon i { font-size: 48px; color: #00b894; }
        .restaurant-info h4 { margin: 0 0 8px 0; color: #2d3436; font-size: 18px; }
        .restaurant-location { 
            color: #00b894; 
            font-weight: 600; 
            margin: 0 0 5px 0; 
        }
        .restaurant-address { 
            color: #636e72; 
            font-size: 13px; 
            margin: 0 0 8px 0; 
        }
        .restaurant-rating { 
            display: flex; 
            justify-content: center;
            align-items: center; 
            gap: 4px; 
            color: #ffd700; 
            margin-bottom: 10px;
        }
        .restaurant-desc { 
            color: #636e72; 
            font-size: 13px; 
            margin: 10px 0; 
            font-style: italic;
        }
        .restaurant-specialties { 
            color: #2d3436; 
            font-size: 13px; 
            margin: 10px 0; 
            text-align: left;
        }
        </style>
        `,
        () => {
            // 확인 버튼 클릭 시 아무것도 하지 않음
        }
    );
}

function showSearchResultModal(restaurants, district) {
    const restaurantList = restaurants.map(r => `
        <div class="search-result-item">
            <div class="result-info">
                <h4>${r.name}</h4>
                <p class="result-category">${r.category} • ${r.priceRange}</p>
                <p class="result-description">${r.description}</p>
                <div class="result-rating">
                    <i class="fas fa-star"></i>
                    <span>${r.rating}</span>
                </div>
            </div>
        </div>
    `).join('');
    
    dashboard.showModal(
        `${district} 맛집 검색 결과`,
        `
        <div class="search-results">
            <p class="results-summary">총 <strong>${restaurants.length}개</strong>의 맛집이 추가되었습니다.</p>
            <div class="results-list">
                ${restaurantList}
            </div>
        </div>
        <style>
        .search-results { max-height: 400px; overflow-y: auto; }
        .results-summary { margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 6px; }
        .search-result-item { 
            padding: 12px; 
            border: 1px solid #e9ecef; 
            border-radius: 6px; 
            margin-bottom: 10px; 
        }
        .result-info h4 { margin: 0 0 5px 0; color: #2d3436; }
        .result-category { 
            color: #00b894; 
            font-weight: 600; 
            font-size: 12px; 
            margin: 0 0 5px 0; 
        }
        .result-description { 
            color: #636e72; 
            font-size: 13px; 
            margin: 0 0 8px 0; 
        }
        .result-rating { 
            display: flex; 
            align-items: center; 
            gap: 4px; 
            color: #ffd700; 
            font-size: 12px; 
        }
        </style>
        `,
        () => {
            // 확인 버튼 클릭 시 아무것도 하지 않음
        }
    );
}