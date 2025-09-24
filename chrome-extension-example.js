// Chrome Extension popup.js - NestJS OAuth 연동 예시

// 사용자 정보 저장
function saveUserInfo(userData) {
  try {
    chrome.storage.local.set({ userInfo: userData }, () => {
      console.log('✅ User info saved:', userData);
    });
    return true;
  } catch (error) {
    console.error('❌ Failed to save user info:', error);
    return false;
  }
}

// 사용자 정보 로드
function loadUserInfo() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['userInfo'], (result) => {
      resolve(result.userInfo || null);
    });
  });
}

// 상태 업데이트
function updateStatus(message) {
  const statusElement = document.getElementById('status');
  if (statusElement) {
    statusElement.textContent = message;
  }
  console.log('Status:', message);
}

// 사용자 섹션 표시
function showUserSection(userData) {
  const loginSection = document.getElementById('login-section');
  const userSection = document.getElementById('user-section');
  
  if (loginSection) loginSection.style.display = 'none';
  if (userSection) {
    userSection.style.display = 'block';
    
    const userNameElement = document.getElementById('user-name');
    const userEmailElement = document.getElementById('user-email');
    const userPictureElement = document.getElementById('user-picture');
    
    if (userNameElement) userNameElement.textContent = userData.name;
    if (userEmailElement) userEmailElement.textContent = userData.email;
    if (userPictureElement) userPictureElement.src = userData.picture;
  }
}

// 최근 이미지 로드
function loadRecentImages() {
  // 여기에 최근 이미지 로드 로직 추가
  console.log('Loading recent images...');
}

// Google OAuth 로그인 처리
async function handleLogin() {
  try {
    updateStatus('Google 로그인 준비 중...');
    
    // NestJS 서버의 OAuth 엔드포인트 사용
    const authUrl = 'https://lincclip-proxy-server.koyeb.app/auth/google';
    
    // 새 탭에서 로그인 열기
    chrome.tabs.create({
      url: authUrl,
      active: true
    }, (tab) => {
      // 메시지 리스너 등록
      const messageListener = (message, sender, sendResponse) => {
        if (message.type === 'AUTH_SUCCESS') {
          console.log('✅ Auth success via NestJS server');
          
          // 사용자 정보 저장
          const userData = {
            id: message.user.id,
            email: message.user.email,
            name: message.user.name,
            picture: message.user.picture,
            access_token: message.access_token,
            refresh_token: message.refresh_token,
            expires_in: message.expires_in,
            loginTime: new Date().toISOString()
          };
          
          if (saveUserInfo(userData)) {
            showUserSection(userData);
            loadRecentImages();
            updateStatus('Google 로그인 성공!');
          }
          
          // 탭 닫기
          chrome.tabs.remove(tab.id);
          
          // 리스너 제거
          chrome.tabs.onMessage.removeListener(messageListener);
        }
      };
      
      // 탭에서 메시지 수신
      chrome.tabs.onMessage.addListener(messageListener);
    });
    
  } catch (error) {
    console.error('Login failed:', error);
    updateStatus('로그인 실패: ' + error.message);
  }
}

// 로그아웃 처리
async function handleLogout() {
  try {
    chrome.storage.local.remove(['userInfo'], () => {
      console.log('✅ User logged out');
      
      const loginSection = document.getElementById('login-section');
      const userSection = document.getElementById('user-section');
      
      if (loginSection) loginSection.style.display = 'block';
      if (userSection) userSection.style.display = 'none';
      
      updateStatus('로그아웃 완료');
    });
  } catch (error) {
    console.error('Logout failed:', error);
    updateStatus('로그아웃 실패: ' + error.message);
  }
}

// 토큰 검증
async function validateToken(token) {
  try {
    const response = await fetch(`https://lincclip-proxy-server.koyeb.app/auth/status?token=${token}`);
    const result = await response.json();
    return result.valid;
  } catch (error) {
    console.error('Token validation failed:', error);
    return false;
  }
}

// 초기화
async function initialize() {
  const userInfo = await loadUserInfo();
  
  if (userInfo) {
    // 토큰 유효성 검사
    const isValid = await validateToken(userInfo.access_token);
    
    if (isValid) {
      showUserSection(userInfo);
      loadRecentImages();
      updateStatus('이미 로그인되어 있습니다.');
    } else {
      // 토큰이 만료된 경우 로그아웃
      handleLogout();
    }
  } else {
    updateStatus('로그인이 필요합니다.');
  }
}

// 이벤트 리스너 등록
document.addEventListener('DOMContentLoaded', () => {
  initialize();
  
  // 로그인 버튼
  const loginButton = document.getElementById('login-button');
  if (loginButton) {
    loginButton.addEventListener('click', handleLogin);
  }
  
  // 로그아웃 버튼
  const logoutButton = document.getElementById('logout-button');
  if (logoutButton) {
    logoutButton.addEventListener('click', handleLogout);
  }
});

// HTML 예시:
/*
<!DOCTYPE html>
<html>
<head>
  <title>Chrome Extension</title>
  <style>
    body { width: 300px; padding: 20px; }
    .section { margin-bottom: 20px; }
    #user-section { display: none; }
    .user-info { display: flex; align-items: center; }
    .user-picture { width: 40px; height: 40px; border-radius: 50%; margin-right: 10px; }
    button { width: 100%; padding: 10px; margin: 5px 0; }
  </style>
</head>
<body>
  <div id="login-section" class="section">
    <h3>로그인</h3>
    <button id="login-button">Google로 로그인</button>
  </div>
  
  <div id="user-section" class="section">
    <h3>사용자 정보</h3>
    <div class="user-info">
      <img id="user-picture" class="user-picture" src="" alt="Profile">
      <div>
        <div id="user-name"></div>
        <div id="user-email"></div>
      </div>
    </div>
    <button id="logout-button">로그아웃</button>
  </div>
  
  <div id="status"></div>
  
  <script src="popup.js"></script>
</body>
</html>
*/
