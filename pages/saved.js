import Head from 'next/head'
import { useEffect } from 'react'

export default function Saved() {
  useEffect(() => {
    // 저장된 맛집 관련 JavaScript 로직
    const savedScript = document.createElement('script')
    savedScript.innerHTML = `
      // 저장된 맛집 페이지 로직을 여기에 구현
      window.addEventListener('DOMContentLoaded', function() {
        console.log('Saved restaurants page loaded');
        // 기존 저장된 맛집 로직을 이식
      });
    `
    document.body.appendChild(savedScript)

    return () => {
      document.body.removeChild(savedScript)
    }
  }, [])

  return (
    <>
      <Head>
        <title>저장된 맛집 - 뚜기의 부산 맛집</title>
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
          <h1>저장된 맛집</h1>
        </header>

        <div className="saved-restaurants" id="savedRestaurants">
          <div className="loading">맛집 목록을 불러오는 중...</div>
        </div>
      </div>
    </>
  )
}