import React, { useState } from 'react';

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

  const handleSendInvite = () => {
    if (!selectedUser || !selectedPlace) return;
    
    onSendInvite({
      user: selectedUser,
      place: selectedPlace,
      message: message.trim(),
      suggestedTime: suggestedTime || null
    });
    
    // Reset form
    setMessage('');
    setSuggestedTime('');
    setIsSelectingPlace(false);
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

  if (!visible || !selectedUser) return null;

  return (
    <div className="invite-modal-overlay">
      <div className="invite-modal">
        <div className="invite-modal-header">
          <h3>☕ Invita {selectedUser.firstName} per un caffè</h3>
          <button className="btn-close-modal" onClick={onClose}>✕</button>
        </div>

        <div className="invite-modal-content">
          {/* Informazioni utente */}
          <div className="invite-user-info">
            <div className="invite-user-avatar">
              {selectedUser.profilePic ? (
                <img src={selectedUser.profilePic} alt={selectedUser.firstName} />
              ) : (
                <div className="avatar-placeholder">
                  {selectedUser.firstName.charAt(0)}{selectedUser.lastName?.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <div className="invite-user-name">{selectedUser.firstName} {selectedUser.lastName}</div>
              <div className="invite-user-distance">📍 {Math.round(selectedUser.distance)}m di distanza</div>
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
                <div className="place-name">{selectedPlace.name}</div>
                <div className="place-address">{selectedPlace.address}</div>
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
            />
            <div className="character-count">{message.length}/200</div>
          </div>
        </div>

        <div className="invite-modal-actions">
          <button className="btn-cancel" onClick={onClose}>
            Annulla
          </button>
          <button 
            className="btn-send-invite" 
            onClick={handleSendInvite}
            disabled={!selectedPlace}
          >
            🚀 Invia invito
          </button>
        </div>
      </div>
    </div>
  );
};

export default InviteModal;