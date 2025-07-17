// Enhanced UserInfoCard with preferences and registration date
import React from 'react';

const UserInfoCard = ({ user, visible, onClose, onInvite, currentUser }) => {
  if (!visible || !user) return null;

  // Format registration date
  const formatRegistrationDate = (dateString) => {
    if (!dateString || dateString === 'Invalid Date') return 'Recente';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Recente';
      
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 30) return `${diffDays} giorni fa`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)} mesi fa`;
      return `${Math.floor(diffDays / 365)} anni fa`;
    } catch (error) {
      return 'Recente';
    }
  };

  // Parse interests safely
  const getInterests = (interests) => {
    if (!interests) return [];
    if (Array.isArray(interests)) return interests;
    if (typeof interests === 'string') {
      try {
        return JSON.parse(interests);
      } catch {
        return interests.split(',').map(i => i.trim());
      }
    }
    return [];
  };

  // Get user status
  const getUserStatus = () => {
    if (!user.lastSeen) return 'Offline';
    
    const now = new Date();
    const lastSeen = new Date(user.lastSeen);
    const diffMinutes = Math.floor((now - lastSeen) / (1000 * 60));
    
    if (diffMinutes < 5) return 'Online';
    if (diffMinutes < 15) return 'Attivo di recente';
    return 'Offline';
  };

  const getStatusColor = () => {
    const status = getUserStatus();
    if (status === 'Online') return '#10b981';
    if (status === 'Attivo di recente') return '#f59e0b';
    return '#6b7280';
  };

  const interests = getInterests(user.interests);
  const isCurrentUser = currentUser && user.userId === currentUser.id;

  return (
    <div className="user-info-overlay">
      <div className="user-info-card">
        {/* Header */}
        <div className="user-header">
          <div className="user-avatar">
            {user.profilePic ? (
              <img src={user.profilePic} alt={user.firstName} />
            ) : (
              <div className="avatar-placeholder">
                {user.firstName?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}
            <div 
              className="status-indicator" 
              style={{ backgroundColor: getStatusColor() }}
            />
          </div>
          
          <div className="user-basic-info">
            <h2>{user.firstName} {user.lastName}</h2>
            {user.username && <p className="username">@{user.username}</p>}
            <div className="status-info">
              <span className="status" style={{ color: getStatusColor() }}>
                {getUserStatus()}
              </span>
              <span className="distance">📍 {Math.round(user.distance || 0)}m di distanza</span>
              <span className="registration">
                📅 Su Caffis dal {formatRegistrationDate(user.registeredAt || user.createdAt)}
              </span>
            </div>
          </div>
          
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {/* Bio */}
        {user.bio && (
          <div className="user-section">
            <h3>📝 Bio</h3>
            <p>{user.bio}</p>
          </div>
        )}

        {/* Interests */}
        {interests.length > 0 && (
          <div className="user-section">
            <h3>🎯 Interessi</h3>
            <div className="interests-tags">
              {interests.map((interest, index) => (
                <span key={index} className="interest-tag">
                  {interest}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Coffee Preferences */}
        <div className="user-section">
          <h3>☕ Preferenze Caffè</h3>
          <div className="preferences-grid">
            {user.coffeePersonality && (
              <div className="pref-item">
                <span className="pref-label">Personalità:</span>
                <span className="pref-value">{user.coffeePersonality}</span>
              </div>
            )}
            {user.ageRange && (
              <div className="pref-item">
                <span className="pref-label">Età:</span>
                <span className="pref-value">{user.ageRange}</span>
              </div>
            )}
            {user.socialEnergy && (
              <div className="pref-item">
                <span className="pref-label">Energia sociale:</span>
                <span className="pref-value">{user.socialEnergy}</span>
              </div>
            )}
            {user.groupPreference && (
              <div className="pref-item">
                <span className="pref-label">Gruppo:</span>
                <span className="pref-value">{user.groupPreference}</span>
              </div>
            )}
          </div>
        </div>

        {/* Meeting Preferences */}
        {(user.meetingFrequency || user.timePreference || user.locationPreference) && (
          <div className="user-section">
            <h3>🤝 Preferenze Incontri</h3>
            <div className="preferences-grid">
              {user.meetingFrequency && (
                <div className="pref-item">
                  <span className="pref-label">Frequenza:</span>
                  <span className="pref-value">{user.meetingFrequency}</span>
                </div>
              )}
              {user.timePreference && (
                <div className="pref-item">
                  <span className="pref-label">Orario preferito:</span>
                  <span className="pref-value">{user.timePreference}</span>
                </div>
              )}
              {user.locationPreference && (
                <div className="pref-item">
                  <span className="pref-label">Luogo:</span>
                  <span className="pref-value">{user.locationPreference}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Conversation Topics */}
        {user.conversationTopics && (
          <div className="user-section">
            <h3>💬 Argomenti di Conversazione</h3>
            <p>{user.conversationTopics}</p>
          </div>
        )}

        {/* Social Goals */}
        {user.socialGoals && (
          <div className="user-section">
            <h3>🎯 Obiettivi Sociali</h3>
            <p>{user.socialGoals}</p>
          </div>
        )}

        {/* Action Buttons */}
        {!isCurrentUser && (
          <div className="user-actions">
            <button 
              className="invite-btn"
              onClick={() => onInvite && onInvite(user)}
            >
              ☕ Invita per un caffè
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .user-info-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 20px;
        }

        .user-info-card {
          background: white;
          border-radius: 20px;
          padding: 24px;
          max-width: 480px;
          width: 100%;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          position: relative;
        }

        .user-header {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 24px;
          position: relative;
        }

        .user-avatar {
          position: relative;
          width: 64px;
          height: 64px;
          flex-shrink: 0;
        }

        .user-avatar img,
        .avatar-placeholder {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          object-fit: cover;
        }

        .avatar-placeholder {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: 600;
        }

        .status-indicator {
          position: absolute;
          bottom: 4px;
          right: 4px;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 3px solid white;
        }

        .user-basic-info {
          flex: 1;
        }

        .user-basic-info h2 {
          margin: 0 0 4px 0;
          font-size: 22px;
          font-weight: 700;
          color: #1f2937;
        }

        .username {
          margin: 0 0 8px 0;
          color: #6b7280;
          font-size: 14px;
          font-weight: 500;
        }

        .status-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 13px;
        }

        .status {
          font-weight: 600;
        }

        .distance, .registration {
          color: #6b7280;
        }

        .close-btn {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #f3f4f6;
          border: none;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 18px;
          color: #6b7280;
          transition: all 0.2s;
        }

        .close-btn:hover {
          background: #e5e7eb;
          color: #374151;
        }

        .user-section {
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid #f3f4f6;
        }

        .user-section:last-of-type {
          border-bottom: none;
          margin-bottom: 0;
        }

        .user-section h3 {
          margin: 0 0 12px 0;
          font-size: 16px;
          font-weight: 600;
          color: #374151;
        }

        .user-section p {
          margin: 0;
          color: #6b7280;
          line-height: 1.5;
        }

        .interests-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .interest-tag {
          background: #f0f9ff;
          color: #0369a1;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 500;
        }

        .preferences-grid {
          display: grid;
          gap: 8px;
        }

        .pref-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
        }

        .pref-label {
          font-weight: 500;
          color: #374151;
          font-size: 14px;
        }

        .pref-value {
          color: #6b7280;
          font-size: 14px;
          text-align: right;
          max-width: 60%;
        }

        .user-actions {
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px solid #f3f4f6;
        }

        .invite-btn {
          width: 100%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .invite-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        @media (max-width: 768px) {
          .user-info-card {
            margin: 10px;
            max-height: 90vh;
          }
          
          .user-header {
            flex-direction: column;
            text-align: center;
          }
          
          .preferences-grid {
            grid-template-columns: 1fr;
          }
          
          .pref-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
          }
          
          .pref-value {
            max-width: 100%;
            text-align: left;
          }
        }
      `}</style>
    </div>
  );
};

export default UserInfoCard;