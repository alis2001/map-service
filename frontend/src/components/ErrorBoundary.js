// components/ErrorBoundary.js
// Location: /map-service/frontend/src/components/ErrorBoundary.js

import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚨 Error caught by boundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });

    // Log error to external service if available
    if (process.env.REACT_APP_DEBUG_MODE === 'true') {
      console.log('Error details:', {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      });
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-content">
            <div className="error-animation">
              <div className="error-icon">🗺️💥</div>
              <div className="error-waves">
                <div className="wave"></div>
                <div className="wave"></div>
                <div className="wave"></div>
              </div>
            </div>

            <div className="error-text">
              <h1>Oops! Qualcosa è andato storto</h1>
              <p>
                Si è verificato un errore imprevisto nell'applicazione mappa. 
                Non preoccuparti, i tuoi dati sono al sicuro.
              </p>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="error-details">
                  <summary>Dettagli tecnici (sviluppo)</summary>
                  <pre className="error-stack">
                    {this.state.error.message}
                    {'\n\n'}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>

            <div className="error-actions">
              <button 
                className="btn-apple-base btn-primary"
                onClick={this.handleReload}
              >
                🔄 Ricarica Applicazione
              </button>
              
              <button 
                className="btn-apple-base btn-secondary"
                onClick={() => window.history.back()}
              >
                ← Torna Indietro
              </button>
            </div>

            <div className="error-help">
              <p>
                💡 Se il problema persiste, prova a:
              </p>
              <ul>
                <li>Aggiornare il browser</li>
                <li>Cancellare la cache del browser</li>
                <li>Verificare la connessione internet</li>
                <li>Controllare che JavaScript sia abilitato</li>
              </ul>
            </div>
          </div>

          <style jsx>{`
            .error-boundary {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: 
                radial-gradient(circle at 20% 20%, rgba(239, 68, 68, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 80% 80%, rgba(245, 158, 11, 0.1) 0%, transparent 50%),
                linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 10000;
              padding: 20px;
            }

            .error-content {
              background: rgba(255, 255, 255, 0.95);
              backdrop-filter: blur(20px);
              border: 1px solid rgba(255, 255, 255, 0.3);
              border-radius: 24px;
              padding: 40px;
              max-width: 500px;
              width: 100%;
              text-align: center;
              box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
              animation: errorSlideIn 0.5s ease-out;
            }

            @keyframes errorSlideIn {
              from {
                opacity: 0;
                transform: translateY(30px) scale(0.9);
              }
              to {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }

            .error-animation {
              position: relative;
              margin-bottom: 32px;
              display: flex;
              align-items: center;
              justify-content: center;
            }

            .error-icon {
              font-size: 64px;
              animation: errorShake 2s ease-in-out infinite;
              z-index: 2;
              position: relative;
            }

            @keyframes errorShake {
              0%, 100% { transform: rotate(-2deg); }
              25% { transform: rotate(2deg); }
              50% { transform: rotate(-1deg); }
              75% { transform: rotate(1deg); }
            }

            .error-waves {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
            }

            .wave {
              position: absolute;
              border: 2px solid rgba(239, 68, 68, 0.3);
              border-radius: 50%;
              animation: waveExpand 2s ease-out infinite;
            }

            .wave:nth-child(1) {
              width: 60px;
              height: 60px;
              margin: -30px 0 0 -30px;
              animation-delay: 0s;
            }

            .wave:nth-child(2) {
              width: 80px;
              height: 80px;
              margin: -40px 0 0 -40px;
              animation-delay: 0.3s;
            }

            .wave:nth-child(3) {
              width: 100px;
              height: 100px;
              margin: -50px 0 0 -50px;
              animation-delay: 0.6s;
            }

            @keyframes waveExpand {
              0% {
                transform: scale(0.8);
                opacity: 1;
              }
              100% {
                transform: scale(1.4);
                opacity: 0;
              }
            }

            .error-text h1 {
              font-size: 24px;
              font-weight: 700;
              color: #1F2937;
              margin-bottom: 16px;
              background: linear-gradient(135deg, #EF4444, #F59E0B);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
            }

            .error-text p {
              font-size: 16px;
              color: #6B7280;
              line-height: 1.6;
              margin-bottom: 24px;
            }

            .error-details {
              text-align: left;
              margin: 20px 0;
              background: rgba(0, 0, 0, 0.05);
              border-radius: 12px;
              padding: 16px;
            }

            .error-details summary {
              cursor: pointer;
              font-weight: 600;
              color: #374151;
              margin-bottom: 12px;
            }

            .error-stack {
              font-family: 'Monaco', 'Consolas', monospace;
              font-size: 12px;
              color: #EF4444;
              background: rgba(239, 68, 68, 0.05);
              padding: 12px;
              border-radius: 8px;
              overflow-x: auto;
              white-space: pre-wrap;
              word-break: break-word;
            }

            .error-actions {
              display: flex;
              gap: 12px;
              justify-content: center;
              margin-bottom: 24px;
              flex-wrap: wrap;
            }

            .error-help {
              text-align: left;
              background: rgba(59, 130, 246, 0.05);
              border: 1px solid rgba(59, 130, 246, 0.1);
              border-radius: 12px;
              padding: 16px;
            }

            .error-help p {
              font-size: 14px;
              font-weight: 600;
              color: #1F2937;
              margin-bottom: 8px;
            }

            .error-help ul {
              list-style: none;
              padding: 0;
              margin: 0;
            }

            .error-help li {
              font-size: 14px;
              color: #6B7280;
              padding: 4px 0;
              padding-left: 20px;
              position: relative;
            }

            .error-help li::before {
              content: '•';
              color: #3B82F6;
              font-weight: bold;
              position: absolute;
              left: 8px;
            }

            @media (max-width: 480px) {
              .error-content {
                padding: 24px 20px;
                margin: 16px;
              }

              .error-icon {
                font-size: 48px;
              }

              .error-text h1 {
                font-size: 20px;
              }

              .error-actions {
                flex-direction: column;
              }

              .btn-apple-base {
                width: 100%;
              }
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

// MapLoadingOverlay Component
const MapLoadingOverlay = ({ loading, mapLoaded, cafesCount }) => {
  if (!loading && mapLoaded) return null;

  const getLoadingMessage = () => {
    if (!mapLoaded) return "Inizializzazione mappa...";
    if (loading && cafesCount === 0) return "Ricerca caffè...";
    if (loading) return "Aggiornamento dati...";
    return "Caricamento...";
  };

  const getLoadingIcon = () => {
    if (!mapLoaded) return "🗺️";
    if (loading && cafesCount === 0) return "☕";
    if (loading) return "🔄";
    return "⏳";
  };

  return (
    <div className="map-loading-overlay">
      <div className="map-loading-content">
        <div className="map-loading-animation">
          <div className="loading-icon">
            {getLoadingIcon()}
          </div>
          <div className="loading-ripples">
            <div className="ripple"></div>
            <div className="ripple"></div>
            <div className="ripple"></div>
          </div>
        </div>
        
        <div className="map-loading-text">
          <h3>{getLoadingMessage()}</h3>
          <p>Un momento per favore...</p>
        </div>

        <div className="map-loading-progress">
          <div className="progress-bar">
            <div className="progress-fill"></div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .map-loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .map-loading-content {
          text-align: center;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 20px;
          padding: 32px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
          max-width: 280px;
          animation: slideUp 0.5s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .map-loading-animation {
          position: relative;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .loading-icon {
          font-size: 48px;
          animation: iconFloat 2s ease-in-out infinite;
          z-index: 2;
          position: relative;
        }

        @keyframes iconFloat {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(5deg); }
        }

        .loading-ripples {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }

        .ripple {
          position: absolute;
          border: 2px solid rgba(79, 70, 229, 0.3);
          border-radius: 50%;
          animation: rippleExpand 2s ease-out infinite;
        }

        .ripple:nth-child(1) {
          width: 40px;
          height: 40px;
          margin: -20px 0 0 -20px;
          animation-delay: 0s;
        }

        .ripple:nth-child(2) {
          width: 60px;
          height: 60px;
          margin: -30px 0 0 -30px;
          animation-delay: 0.4s;
        }

        .ripple:nth-child(3) {
          width: 80px;
          height: 80px;
          margin: -40px 0 0 -40px;
          animation-delay: 0.8s;
        }

        @keyframes rippleExpand {
          0% {
            transform: scale(0.8);
            opacity: 1;
          }
          100% {
            transform: scale(1.2);
            opacity: 0;
          }
        }

        .map-loading-text h3 {
          font-size: 18px;
          font-weight: 600;
          color: #1F2937;
          margin-bottom: 8px;
        }

        .map-loading-text p {
          font-size: 14px;
          color: #6B7280;
          margin-bottom: 20px;
        }

        .map-loading-progress {
          width: 100%;
        }

        .progress-bar {
          width: 100%;
          height: 4px;
          background: rgba(79, 70, 229, 0.1);
          border-radius: 2px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #4F46E5, #7C3AED);
          border-radius: 2px;
          animation: progressMove 1.5s ease-in-out infinite;
        }

        @keyframes progressMove {
          0% {
            width: 0%;
            transform: translateX(-100%);
          }
          50% {
            width: 80%;
            transform: translateX(0%);
          }
          100% {
            width: 100%;
            transform: translateX(100%);
          }
        }

        @media (max-width: 480px) {
          .map-loading-content {
            padding: 24px 20px;
            margin: 16px;
            max-width: calc(100% - 32px);
          }

          .loading-icon {
            font-size: 40px;
          }

          .map-loading-text h3 {
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  );
};

export { ErrorBoundary, MapLoadingOverlay };