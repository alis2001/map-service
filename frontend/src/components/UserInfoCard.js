import React, { useState } from 'react';

const UserInfoCard = ({ user, onClose, onInvite, visible = false }) => {
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  const getStatusInfo = () => {
    if (user.isLive) {
      const timeDiff = new Date() - new Date(user.lastSeen);
      const minutesAgo = Math.floor(timeDiff / (1000 * 60));
      
      if (minutesAgo < 5) {
        return { text: 'Online ora', color: '#22c55e', isLive: true };
      }
      if (minutesAgo < 15) {
        return { text: `Attivo ${minutesAgo} min fa`, color: '#eab308', isLive: true };
      }
      return { text: 'Offline', color: '#6b7280', isLive: false };
    }
    return { text: 'Offline', color: '#6b7280', isLive: false };
  };

  const statusInfo = getStatusInfo();

  const handleInviteClick = () => {
    if (onInvite) {
      onInvite(user);
    }
  };

  const formatDistance = (distance) => {
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    }
    return `${(distance / 1000).toFixed(1)}km`;
  };

  const getAge = () => {
    if (user.ageRange) {
      try {
        const ageData = typeof user.ageRange === 'string' 
          ? JSON.parse(user.ageRange) 
          : user.ageRange;
        return ageData.min && ageData.max 
          ? `${ageData.min}-${ageData.max} anni`
          : null;
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  const parseInterests = (interests) => {
    if (!interests) return [];
    try {
      return typeof interests === 'string' ? JSON.parse(interests) : interests;
    } catch (e) {
      return [];
    }
  };

  const userInterests = parseInterests(user.interests);
  const commonInterests = user.commonInterests || [];

  return (
    <div className={`user-info-card ${visible ? 'visible' : ''}`}>
      {/* Header con foto e info base */}
      <div className="user-card-header">
        <div className="user-card-avatar">
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
        </div>
        
        <div className="user-card-info">
          <h3>
            {user.firstName} {user.lastName}
            {statusInfo.isLive && <span className="status-dot-card" style={{backgroundColor: statusInfo.color}}></span>}
          </h3>
          <div className="username">@{user.username}</div>
          <div className={statusInfo.isLive ? 'status-live' : 'status-offline'} style={{color: statusInfo.color}}>
            <span className="status-dot-card" style={{backgroundColor: statusInfo.color}}></span>
            {statusInfo.text}
          </div>
          <div className="distance-info" style={{color: '#6b7280', fontSize: '12px', marginTop: '2px'}}>
            📍 {formatDistance(user.distance)} di distanza
          </div>
          {getAge() && (
            <div className="age-info" style={{color: '#6b7280', fontSize: '12px'}}>
              🎂 {getAge()}
            </div>
          )}
        </div>
      </div>

      {/* Bio dell'utente */}
      {user.bio && (
        <div className="user-bio">
          "{user.bio}"
        </div>
      )}

      {/* Interessi comuni */}
      {commonInterests.length > 0 && (
        <div className="common-interests">
          <h4>
            ✨ Interessi in comune ({commonInterests.length})
          </h4>
          <div className="interests-list">
            {commonInterests.map((interest, index) => (
              <span key={index} className="common-interest-tag">
                {interest}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Altri interessi */}
      {userInterests.length > 0 && (
        <div className="user-interests">
          <h4>🎯 Interessi ({userInterests.length})</h4>
          <div className="interests-list">
            {userInterests.map((interest, index) => (
              <span 
                key={index} 
                className={commonInterests.includes(interest) ? 'common-interest-tag' : 'interest-tag'}
              >
                {interest}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Informazioni aggiuntive */}
      <div className="user-additional-info" style={{
        display: 'flex', 
        gap: '15px', 
        margin: '15px 0', 
        fontSize: '12px', 
        color: '#6b7280'
      }}>
        <div>📅 Su Caffis dal {new Date(user.createdAt).toLocaleDateString('it-IT')}</div>
      </div>

      {/* Azioni */}
      <div className="user-card-actions">
        <button 
          className="btn-invite-user"
          onClick={handleInviteClick}
          disabled={!statusInfo.isLive}
        >
          ☕ {statusInfo.isLive ? 'Invita per un caffè' : 'Non disponibile'}
        </button>
        <button 
          className="btn-close-card"
          onClick={onClose}
          title="Chiudi"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default UserInfoCard;