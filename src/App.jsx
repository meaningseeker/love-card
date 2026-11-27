import { useRef, useState } from 'react';
import './App.css';
import MeadowBlush from './components/MeadowBlush';

export default function App() {
  const audioRef = useRef(null);
  const [opened, setOpened] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [musicError, setMusicError] = useState(false);

  const openLetter = async () => {
    setOpened(true);

    if (!audioRef.current) return;

    audioRef.current.volume = 0.09;

    try {
      await audioRef.current.play();
      setMusicPlaying(true);
      setMusicError(false);
    } catch (error) {
      setMusicError(true);
    }
  };

  const toggleMusic = async () => {
    if (!audioRef.current) return;

    if (musicPlaying) {
      audioRef.current.pause();
      setMusicPlaying(false);
    } else {
      try {
        await audioRef.current.play();
        setMusicPlaying(true);
        setMusicError(false);
      } catch (error) {
        setMusicError(true);
      }
    }
  };

  return (
    <main className="love-page">
      <audio ref={audioRef} src="/love.mp3" loop preload="auto" />

      <div className="meadow-background">
        <MeadowBlush />
      </div>

      <div className="love-overlay">
        <section className={`letter-card ${opened ? 'opened' : ''}`}>
          <div className="card-top">
            <span>A LITTLE LETTER FOR YOU</span>
            <div className="heart">♥</div>
          </div>

          {!opened ? (
            <div className="closed-letter">
              <p className="small-intro">세상에서 가장 소중한 사람에게</p>

              <h1>예린누나</h1>

              <div className="gold-line" />

              <p className="preview">전하고 싶은 마음이 있어.</p>

              <button className="open-button" onClick={openLetter}>
                ♥ 편지 열어보기
              </button>

              <p className="hint">작은 편지에 마음을 담았어요</p>
            </div>
          ) : (
            <div className="opened-letter">
              <p className="small-intro reveal delay-1">TO. 예린누나</p>

              <h1 className="reveal delay-2">예린누나</h1>

              <div className="gold-line reveal delay-2" />

              <div className="message reveal delay-3">
                <p>내가</p>
                <p>너무너무</p>
                <p className="highlight">좋아해 !!</p>
              </div>

              <p className="english reveal delay-4">
                You make my little world brighter.
              </p>

              <div className="signature reveal delay-4">
                WITH LOVE <span>♥</span>
              </div>

              <button className="music-button" onClick={toggleMusic}>
                {musicPlaying ? '♫ 음악 잠시 멈추기' : '♫ 음악 다시 듣기'}
              </button>

              {musicError && (
                <p className="music-error">
                  음악을 재생할 수 없어요. 파일 이름과 위치를 확인해 주세요.
                </p>
              )}
            </div>
          )}
        </section>

        <p className="bottom-caption">
          SOME FEELINGS DESERVE A LITTLE MORE SPACE.
        </p>
      </div>

      <style>{`
        * {
          box-sizing: border-box;
        }

        .love-page {
          position: relative;
          width: 100%;
          min-height: 100svh;
          overflow: hidden;
          background: #e8d9c8;
          isolation: isolate;
        }

        .meadow-background {
          position: fixed;
          inset: 0;
          z-index: 0;
          overflow: hidden;
        }

        .meadow-background > * {
          width: 100%;
          height: 100%;
        }

        .love-overlay {
          position: relative;
          z-index: 1;
          min-height: 100svh;
          width: 100%;
          padding: 32px 18px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 20px;
          transform: translateY(-10px);
        }

        .letter-card {
          width: 100%;
          max-width: 440px;
          min-height: 520px;
          padding: 34px 28px;
          position: relative;
          display: flex;
          flex-direction: column;
          background:
            linear-gradient(145deg, #fffdf6, #f8efdf);
          border: 1px solid rgba(181, 146, 91, 0.55);
          border-radius: 5px;
          box-shadow:
            0 25px 70px rgba(57, 37, 28, 0.22),
            inset 0 0 0 7px rgba(255,255,255,0.45);
          color: #594638;
          transition: transform 0.7s ease;
        }

        .letter-card::before {
          content: "";
          position: absolute;
          inset: 13px;
          border: 1px solid rgba(190, 155, 103, 0.3);
          pointer-events: none;
          
        }

        .card-top {
          text-align: center;
          font-size: 10px;
          letter-spacing: 4px;
          color: #a58b65;
        }

        .heart {
          margin: 22px auto 8px;
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border: 1px solid #c7a878;
          border-radius: 50%;
          color: #bb7d76;
          font-size: 19px;
        }

        .closed-letter,
        .opened-letter {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .small-intro {
          color: #a58b65;
          font-size: 13px;
          letter-spacing: 2px;
          margin: 18px 0;
        }

        .letter-card h1 {
          font-family: Georgia, serif;
          font-size: clamp(38px, 10vw, 54px);
          font-weight: 400;
          letter-spacing: 4px;
          margin: 10px 0 24px;
          color: #604b3c;
        }

        .gold-line {
          width: 65px;
          height: 1px;
          background: #c7a878;
          margin: 0 auto 24px;
        }

        .preview {
          color: #8f7867;
          font-size: 15px;
          margin: 0 0 30px;
        }

        .open-button,
        .music-button {
  /* 여백 균형 맞추기 (상하 10px, 좌우 18px) */
  padding: 10px 18px;
  
  /* 세련된 톤온톤 컬러 매칭 */
  background-color: #7c624e;
  border: 1px solid #a68963;
  color: #fdfbf7;
  
  /* 폰트 및 모서리 정돈 */
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.5px;
  
  /* 은은한 입체감과 부드러운 전환 */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.2s ease;
}

/* 마우스를 올렸을 때의 반응 추가 */
.open-button:hover,
.music-button:hover {
  background-color: #695240;
  border-color: #c2a57c;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

/* 클릭했을 때 눌리는 느낌 */
.open-button:active,
.music-button:active {
  transform: translateY(0);
}

        .open-button:hover,
        .music-button:hover {
          background: #f697d0ff;
          transform: translateY(-2px);
        }

        .hint {
          margin-top: 20px;
          font-size: 11px;
          color: #b5a18c;
          letter-spacing: 1px;
        }

        .message {
          margin: 4px 0 20px;
          font-family: Georgia, serif;
          font-size: clamp(30px, 8vw, 43px);
          line-height: 1.5;
          letter-spacing: 2px;
          color: #705747;
        }

        .message p {
          margin: 0;
        }

        .message .highlight {
          color: #b77c76;
        }

        .english {
          color: #a58b75;
          font-family: Georgia, serif;
          font-style: italic;
          font-size: 13px;
          margin: 0 0 30px;
        }

        .signature {
          color: #ad946f;
          font-size: 10px;
          letter-spacing: 4px;
          margin-bottom: 24px;
        }

        .signature span {
          color: #bb7d76;
          margin-left: 5px;
        }

        .music-button {
          background: transparent;
          color: #927658;
          padding: 10px 20px;
          font-size: 12px;
        }

        .music-button:hover {
          color: white;
        }

        .music-error {
          color: #a45f59;
          font-size: 11px;
          margin-top: 12px;
        }

        .bottom-caption {
          font-size: 9px;
          letter-spacing: 3px;
          color: white;
          text-align: center;
          text-shadow: 0 1px 8px rgba(0,0,0,0.3);
        }

        .reveal {
          opacity: 0;
          animation: appear 0.9s ease forwards;
        }

        .delay-1 { animation-delay: 0.15s; }
        .delay-2 { animation-delay: 0.5s; }
        .delay-3 { animation-delay: 1s; }
        .delay-4 { animation-delay: 1.6s; }

        @keyframes appear {
          from {
            opacity: 0;
            transform: translateY(18px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 390px) {
          .love-overlay {
            padding: 20px 14px;
          }

          .letter-card {
            min-height: 490px;
            padding: 28px 20px;
          }

          .card-top {
            letter-spacing: 3px;
          }

          .letter-card h1 {
            font-size: 39px;
          }
        }

        @media (max-height: 650px) {
          .love-overlay {
            padding-top: 16px;
            padding-bottom: 16px;
          }

          .letter-card {
            min-height: 460px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </main>
  );
}
