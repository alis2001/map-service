import React, { useState } from 'react';
// RIMUOVI questa riga: import './UserMarker.css';

const UserMarker = ({ user, onClick, isSelected }) => {
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  const getStatusColor = () => {
    if (user.isLive) {
      const timeDiff = new Date() - new Date(user.lastSeen);
      const minutesAgo = Math.floor(timeDiff / (1000 * 60));
      
      if (minutesAgo < 5) return '#22c55e'; // Verde - online ora
      if (minutesAgo < 15) return '#eab308'; // Giallo - online di recente
      return '#6b7280'; // Grigio - offline
    }
    return '#6b7280';
  };

  const getStatusText = () => {
    if (user.isLive) {
      const timeDiff = new Date() - new Date(user.lastSeen);
      const minutesAgo = Math.floor(timeDiff / (1000 * 60));
      
      if (minutesAgo < 5) return 'Online ora';
      if (minutesAgo < 15) return `${minutesAgo} min fa`;
      return 'Offline';
    }
    return 'Offline';
  };

  return (
    <div 
      className={`user-marker ${isSelected ? 'selected' : ''}`}
      onClick={() => onClick(user)}
      style={{ 
        '--status-color': getStatusColor(),
        '--distance': `${Math.round(user.distance)}m`
      }}
    >
      {/* Foto profilo */}
      <div className="user-avatar">
        {!imageError && user.profilePic ? (
          <img 
            src={user.profilePic} 
            alt={`${user.firstName} ${user.lastName}`}
            onError={handleImageError}
          />
        ) : (
          <div className="avatar-placeholder">
            {user.firstName.charAt(0)}{user.lastName?.charAt(0)}
          </div>
        )}
        
        {/* Indicatore stato online */}
        <div 
          className="status-indicator"
          title={getStatusText()}
        />
      </div>

      {/* Nome utente (appare al hover) */}
      <div className="user-name-tooltip">
        <div className="name">{user.firstName}</div>
        <div className="status">{getStatusText()}</div>
        <div className="distance">{Math.round(user.distance)}m</div>
      </div>

      {/* Pulse animation per utenti online */}
      {user.isLive && (
        <div className="pulse-ring" />
      )}
    </div>
  );
};

export default UserMarker;