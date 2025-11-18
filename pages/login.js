import Head from 'next/head'
import { useEffect } from 'react'

export default function Login() {
  useEffect(() => {
    // 로그인 관련 JavaScript 로직
    const loginScript = document.createElement('script')
    loginScript.src = '/api-client.js'
    loginScript.async = true
    document.body.appendChild(loginScript)

    return () => {
      document.body.removeChild(loginScript)
    }
  }, [])

  return (
    <>
      <Head>
        <title>로그인 - 뚜기의 부산 맛집</title>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="stylesheet" href="/style.css" />
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet" />
      </Head>

      <div className="container">
        <header className="header">
          <a href="/" className="back-button">
            <i className="fas fa-arrow-left"></i>
          </a>
          <h1>로그인</h1>
        </header>

        <div className="login-container">
          <div className="login-card">
            <h2>뚜기의 부산 맛집에 오신 것을 환영합니다!</h2>
            <p>로그인하여 맛집을 저장하고 개인화된 추천을 받아보세요.</p>
            
            <button className="google-login-btn" onClick={() => loginWithGoogle()}>
              <i className="fab fa-google"></i>
              Google로 로그인
            </button>
            
            <button className="guest-mode-btn" onClick={() => useGuestMode()}>
              <i className="fas fa-user-circle"></i>
              게스트로 계속하기
            </button>
          </div>
        </div>
      </div>
    </>
  )
}