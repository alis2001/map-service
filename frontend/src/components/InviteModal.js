// components/InviteModal.js - Modal per Inviti Caffè
// Location: /frontend/src/components/InviteModal.js

import React, { useState, useEffect } from 'react';

const InviteModal = ({ 
  visible, 
  selectedUser, 
  selectedPlace, 
  onClose, 
  onSendInvite, 
  onSelectPlace 
}) => {
  const [message, setMessage] = useState('');
  const [suggestedTime, setSuggestedTime] = useState('');
  const [isSelectingPlace, setIsSelectingPlace] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Gestisci animazioni apertura/chiusura
  useEffect(() => {
    if (visible) {
      setIsAnimating(true);
    } else {
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  // Reset form quando il modal si chiude
  useEffect(() => {
    if (!visible) {
      setMessage('');
      setSuggestedTime('');
      setIsSelectingPlace(false);
    }
  }, [visible]);

  const handleSendInvite = () => {
    if (!selectedUser || !selectedPlace) return;
    
    onSendInvite({
      user: selectedUser,
      place: selectedPlace,
      message: message.trim(),
      suggestedTime: suggestedTime || null
    });
  };

  const handleSelectPlace = () => {
    setIsSelectingPlace(true);
    onSelectPlace();
  };

  const getDefaultTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30); // 30 minuti da ora
    return now.toISOString().slice(0, 16); // Format per datetime-local
  };

  const getUserStatusColor = () => {
    if (!selectedUser?.isLive) return '#6b7280';
    
    const timeDiff = new Date() - new Date(selectedUser.lastSeen);
    const minutesAgo = Math.floor(timeDiff / (1000 * 60));
    
    if (minutesAgo < 5) return '#22c55e'; // Verde - online ora
    if (minutesAgo < 15) return '#eab308'; // Giallo - online di recente
    return '#6b7280'; // Grigio - offline
  };

  const getUserStatusText = () => {
    if (!selectedUser?.isLive) return 'Offline';
    
    const timeDiff = new Date() - new Date(selectedUser.lastSeen);
    const minutesAgo = Math.floor(timeDiff / (1000 * 60));
    
    if (minutesAgo < 5) return 'Online ora';
    if (minutesAgo < 15) return `Attivo ${minutesAgo} min fa`;
    return 'Offline';
  };

  if (!visible && !isAnimating) return null;

  return (
    <div 
      className="invite-modal-overlay"
      style={{
        opacity: visible ? 1 : 0,
        visibility: visible ? 'visible' : 'hidden',
        transition: 'opacity 0.3s ease, visibility 0.3s ease'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="invite-modal"
        style={{
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(50px) scale(0.95)',
          opacity: visible ? 1 : 0,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        {/* Header */}
        <div className="invite-modal-header">
          <h3>☕ Invita {selectedUser?.firstName} per un caffè</h3>
          <button className="btn-close-modal" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="invite-modal-content">
          {/* Informazioni utente */}
          <div className="invite-user-info">
            <div className="invite-user-avatar">
              {selectedUser?.profilePic ? (
                <img src={selectedUser.profilePic} alt={selectedUser.firstName} />
              ) : (
                <div className="avatar-placeholder">
                  {selectedUser?.firstName?.charAt(0)}{selectedUser?.lastName?.charAt(0)}
                </div>
              )}
              {/* Indicatore stato */}
              <div 
                className="status-indicator"
                style={{ backgroundColor: getUserStatusColor() }}
                title={getUserStatusText()}
              />
            </div>
            <div>
              <div className="invite-user-name">
                {selectedUser?.firstName} {selectedUser?.lastName}
              </div>
              <div 
                className="invite-user-status"
                style={{ color: getUserStatusColor() }}
              >
                {getUserStatusText()}
              </div>
              <div className="invite-user-distance">
                📍 {selectedUser?.distance ? Math.round(selectedUser.distance) : '---'}m di distanza
              </div>
            </div>
          </div>

          {/* Selezione posto */}
          <div className="invite-place-section">
            <h4>📍 Luogo dell'incontro</h4>
            {!selectedPlace ? (
              <button 
                className="btn-select-place" 
                onClick={handleSelectPlace}
                disabled={isSelectingPlace}
              >
                {isSelectingPlace ? '🗺️ Seleziona un posto sulla mappa...' : '📍 Scegli un posto'}
              </button>
            ) : (
              <div className="selected-place-info">
                <div className="place-header">
                  <span className="place-emoji">
                    {selectedPlace.type === 'restaurant' ? '🍽️' : '☕'}
                  </span>
                  <div>
                    <div className="place-name">{selectedPlace.name}</div>
                    <div className="place-address">{selectedPlace.address}</div>
                  </div>
                </div>
                <button 
                  className="btn-change-place" 
                  onClick={handleSelectPlace}
                >
                  Cambia posto
                </button>
              </div>
            )}
          </div>

          {/* Orario suggerito */}
          <div className="invite-time-section">
            <h4>🕒 Quando? (opzionale)</h4>
            <input
              type="datetime-local"
              value={suggestedTime}
              onChange={(e) => setSuggestedTime(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="time-input"
              placeholder="Scegli un orario"
            />
          </div>

          {/* Messaggio personalizzato */}
          <div className="invite-message-section">
            <h4>💬 Messaggio (opzionale)</h4>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Scrivi un messaggio per il tuo invito..."
              className="message-textarea"
              maxLength={200}
              rows={3}
            />
            <div className="character-count">{message.length}/200</div>
          </div>
        </div>

        {/* Azioni */}
        <div className="invite-modal-actions">
          <button className="btn-cancel" onClick={onClose}>
            Annulla
          </button>
          <button 
            className="btn-send-invite" 
            onClick={handleSendInvite}
            disabled={!selectedPlace || !selectedUser?.isLive}
          >
            {selectedUser?.isLive ? '🚀 Invia invito' : '⚫ Utente offline'}
          </button>
        </div>

        {/* Stili CSS inline per semplicità */}
        <style jsx>{`
          .invite-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(8px);
            z-index: 2000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }

          .invite-modal {
            background: rgba(255, 255, 255, 0.98);
            backdrop-filter: blur(20px);
            border-radius: 24px;
            overflow: hidden;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
            max-width: 480px;
            width: 100%;
            max-height: 90vh;
          }

          .invite-modal-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }

          .invite-modal-header h3 {
            margin: 0;
            font-size: 18px;
            font-weight: 700;
          }

          .btn-close-modal {
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            width: 32px;
            height: 32px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            transition: all 0.3s ease;
          }

          .btn-close-modal:hover {
            background: rgba(255, 255, 255, 0.3);
          }

          .invite-modal-content {
            padding: 24px;
            max-height: 60vh;
            overflow-y: auto;
          }

          .invite-user-info {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 16px;
            background: rgba(102, 126, 234, 0.05);
            border-radius: 16px;
            margin-bottom: 24px;
          }

          .invite-user-avatar {
            position: relative;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            overflow: hidden;
            border: 3px solid rgba(102, 126, 234, 0.2);
          }

          .invite-user-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .avatar-placeholder {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            font-weight: 600;
            font-size: 16px;
          }

          .status-indicator {
            position: absolute;
            bottom: 2px;
            right: 2px;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }

          .invite-user-name {
            font-weight: 700;
            font-size: 16px;
            color: #1f2937;
            margin-bottom: 4px;
          }

          .invite-user-status {
            font-size: 13px;
            font-weight: 500;
            margin-bottom: 2px;
          }

          .invite-user-distance {
            font-size: 12px;
            color: #6b7280;
          }

          .invite-place-section,
          .invite-time-section,
          .invite-message-section {
            margin-bottom: 24px;
          }

          .invite-place-section h4,
          .invite-time-section h4,
          .invite-message-section h4 {
            font-size: 14px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 12px;
          }

          .btn-select-place {
            width: 100%;
            padding: 16px;
            border: 2px dashed #d1d5db;
            border-radius: 12px;
            background: rgba(249, 250, 251, 0.8);
            color: #6b7280;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 14px;
          }

          .btn-select-place:hover:not(:disabled) {
            border-color: #667eea;
            background: rgba(102, 126, 234, 0.05);
            color: #667eea;
          }

          .btn-select-place:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .selected-place-info {
            background: rgba(34, 197, 94, 0.05);
            border: 1px solid rgba(34, 197, 94, 0.2);
            border-radius: 12px;
            padding: 16px;
          }

          .place-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
          }

          .place-emoji {
            font-size: 24px;
          }

          .place-name {
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 4px;
          }

          .place-address {
            font-size: 13px;
            color: #6b7280;
          }

          .btn-change-place {
            background: rgba(102, 126, 234, 0.1);
            color: #667eea;
            border: none;
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
          }

          .btn-change-place:hover {
            background: rgba(102, 126, 234, 0.2);
          }

          .time-input {
            width: 100%;
            padding: 12px 16px;
            border: 1px solid #d1d5db;
            border-radius: 12px;
            font-size: 14px;
            background: rgba(255, 255, 255, 0.8);
            transition: all 0.3s ease;
          }

          .time-input:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
          }

          .message-textarea {
            width: 100%;
            padding: 12px 16px;
            border: 1px solid #d1d5db;
            border-radius: 12px;
            font-size: 14px;
            font-family: inherit;
            background: rgba(255, 255, 255, 0.8);
            resize: vertical;
            transition: all 0.3s ease;
          }

          .message-textarea:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
          }

          .character-count {
            text-align: right;
            font-size: 12px;
            color: #9ca3af;
            margin-top: 4px;
          }

          .invite-modal-actions {
            padding: 20px 24px;
            background: rgba(249, 250, 251, 0.8);
            border-top: 1px solid rgba(229, 231, 235, 0.5);
            display: flex;
            gap: 12px;
            justify-content: flex-end;
          }

          .btn-cancel {
            padding: 12px 24px;
            border: 1px solid #d1d5db;
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.8);
            color: #6b7280;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
          }

          .btn-cancel:hover {
            background: rgba(243, 244, 246, 0.8);
            border-color: #9ca3af;
          }

          .btn-send-invite {
            padding: 12px 24px;
            border: none;
            border-radius: 12px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .btn-send-invite:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
          }

          .btn-send-invite:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
            background: #9ca3af;
          }

          /* Responsive */
          @media (max-width: 768px) {
            .invite-modal {
              margin: 10px;
              max-width: none;
              border-radius: 20px;
            }
            
            .invite-modal-header {
              padding: 16px 20px;
            }
            
            .invite-modal-content {
              padding: 20px;
            }
            
            .invite-modal-actions {
              padding: 16px 20px;
              flex-direction: column;
            }
            
            .btn-cancel,
            .btn-send-invite {
              width: 100%;
              justify-content: center;
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default InviteModal;