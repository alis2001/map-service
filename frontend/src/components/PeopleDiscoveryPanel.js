// components/PeopleDiscoveryPanel.js
// Location: /frontend/src/components/PeopleDiscoveryPanel.js

import React, { useState, useEffect } from 'react';

const PeopleDiscoveryPanel = ({
  users = [],
  currentCity,
  userLocation,
  onUserSelect,
  onCityChange,
  isLoading = false,
  searchRadius = 2000,
  onRadiusChange,
  totalOnline = 0,
  className = ""
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedRadius, setSelectedRadius] = useState(searchRadius);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter users based on search query
  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.firstName?.toLowerCase().includes(query) ||
      user.lastName?.toLowerCase().includes(query) ||
      user.bio?.toLowerCase().includes(query) ||
      (user.interests && user.interests.some(interest => 
        interest.toLowerCase().includes(query)
      ))
    );
  });

  const handleRadiusChange = (newRadius) => {
    setSelectedRadius(newRadius);
    if (onRadiusChange) {
      onRadiusChange(newRadius);
    }
  };

  const getStatusColor = (user) => {
    if (!user.isLive) return '#6b7280';
    
    const timeDiff = new Date() - new Date(user.lastSeen);
    const minutesAgo = Math.floor(timeDiff / (1000 * 60));
    
    if (minutesAgo < 5) return '#10b981'; // Verde brillante
    if (minutesAgo < 15) return '#22c55e'; // Verde
    if (minutesAgo < 30) return '#eab308'; // Giallo
    return '#6b7280'; // Grigio
  };

  const getStatusText = (user) => {
    if (!user.isLive) return 'Offline';
    
    const timeDiff = new Date() - new Date(user.lastSeen);
    const minutesAgo = Math.floor(timeDiff / (1000 * 60));
    
    if (minutesAgo < 2) return 'Online ora';
    if (minutesAgo < 5) return 'Attivo ora';
    if (minutesAgo < 15) return `${minutesAgo}m fa`;
    if (minutesAgo < 30) return 'Recentemente attivo';
    return 'Offline';
  };

  const formatDistance = (distance) => {
    if (!distance) return '---';
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    }
    return `${(distance / 1000).toFixed(1)}km`;
  };

  return (
    <div className={`people-discovery-panel ${className}`}>
      {/* Header con toggle */}
      <div className="panel-header">
        <div className="header-main">
          <div className="header-icon">👥</div>
          <div className="header-content">
            <h3 className="header-title">Persone Vicine</h3>
            <p className="header-subtitle">
              {currentCity?.name || 'Zona corrente'} • {filteredUsers.length} persone
            </p>
          </div>
        </div>
        <button 
          className="toggle-btn"
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? 'Riduci pannello' : 'Espandi pannello'}
        >
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>

      {/* Contenuto espandibile */}
      <div className={`panel-content ${isExpanded ? 'expanded' : 'collapsed'}`}>
        
        {/* Stats e controlli */}
        <div className="discovery-stats">
          <div className="stat-item">
            <span className="stat-number">{totalOnline}</span>
            <span className="stat-label">Online ora</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{filteredUsers.length}</span>
            <span className="stat-label">Nelle vicinanze</span>
          </div>
        </div>

        {/* Controlli ricerca */}
        <div className="search-controls">
          <div className="search-input-group">
            <input
              type="text"
              placeholder="Cerca per nome o interessi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="radius-control">
            <label className="radius-label">Raggio di ricerca</label>
            <div className="radius-options">
              {[500, 1000, 2000, 5000].map(radius => (
                <button
                  key={radius}
                  className={`radius-btn ${selectedRadius === radius ? 'active' : ''}`}
                  onClick={() => handleRadiusChange(radius)}
                >
                  {radius < 1000 ? `${radius}m` : `${radius/1000}km`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Lista utenti */}
        <div className="users-list">
          {isLoading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Cercando persone nelle vicinanze...</p>
            </div>
          ) : filteredUsers.length > 0 ? (
            filteredUsers.map(user => (
              <div 
                key={user.userId || user.id}
                className="user-item"
                onClick={() => onUserSelect(user)}
              >
                <div className="user-avatar">
                  {user.profilePic ? (
                    <img src={user.profilePic} alt={user.firstName} />
                  ) : (
                    <div className="avatar-placeholder">
                      {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                    </div>
                  )}
                  <div 
                    className="status-dot"
                    style={{ backgroundColor: getStatusColor(user) }}
                  />
                </div>
                
                <div className="user-info">
                  <div className="user-name">
                    {user.firstName} {user.lastName}
                  </div>
                  <div className="user-status">
                    <span 
                      className="status-text"
                      style={{ color: getStatusColor(user) }}
                    >
                      {getStatusText(user)}
                    </span>
                    <span className="distance-text">
                      📍 {formatDistance(user.distance)}
                    </span>
                  </div>
                  {user.bio && (
                    <div className="user-bio">
                      {user.bio.length > 50 ? `${user.bio.substring(0, 50)}...` : user.bio}
                    </div>
                  )}
                  {user.interests && user.interests.length > 0 && (
                    <div className="user-interests">
                      {user.interests.slice(0, 3).map((interest, idx) => (
                        <span key={idx} className="interest-tag">
                          {interest}
                        </span>
                      ))}
                      {user.interests.length > 3 && (
                        <span className="interest-more">+{user.interests.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <p className="empty-text">
                {searchQuery ? 'Nessun risultato per la ricerca' : 'Nessuna persona nelle vicinanze'}
              </p>
              <p className="empty-subtext">
                {searchQuery ? 'Prova a modificare i termini di ricerca' : 'Prova ad aumentare il raggio di ricerca'}
              </p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .people-discovery-panel {
          position: absolute;
          top: 20px;
          right: 20px;
          width: 350px;
          max-height: calc(100vh - 40px);
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.3);
          z-index: 1000;
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .panel-header {
          padding: 20px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
        }

        .header-main {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .header-icon {
          font-size: 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          background-clip: text;
          -webkit-background-clip: text;
          color: transparent;
        }

        .header-title {
          font-size: 18px;
          font-weight: 700;
          color: #1f2937;
          margin: 0;
        }

        .header-subtitle {
          font-size: 13px;
          color: #6b7280;
          margin: 2px 0 0 0;
        }

        .toggle-btn {
          padding: 8px;
          border: none;
          background: rgba(102, 126, 234, 0.1);
          border-radius: 8px;
          cursor: pointer;
          color: #667eea;
          font-size: 12px;
          transition: all 0.2s ease;
        }

        .toggle-btn:hover {
          background: rgba(102, 126, 234, 0.2);
        }

        .panel-content {
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .panel-content.expanded {
          max-height: calc(100vh - 120px);
          opacity: 1;
        }

        .panel-content.collapsed {
          max-height: 0;
          opacity: 0;
        }

        .discovery-stats {
          display: flex;
          gap: 20px;
          padding: 20px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }

        .stat-item {
          text-align: center;
          flex: 1;
        }

        .stat-number {
          display: block;
          font-size: 24px;
          font-weight: 700;
          color: #667eea;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 12px;
          color: #6b7280;
          font-weight: 500;
        }

        .search-controls {
          padding: 20px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }

        .search-input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid rgba(102, 126, 234, 0.1);
          border-radius: 12px;
          font-size: 14px;
          background: rgba(255, 255, 255, 0.8);
          transition: all 0.2s ease;
          margin-bottom: 16px;
        }

        .search-input:focus {
          outline: none;
          border-color: #667eea;
          background: white;
        }

        .radius-label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 8px;
        }

        .radius-options {
          display: flex;
          gap: 6px;
        }

        .radius-btn {
          flex: 1;
          padding: 8px 12px;
          border: 2px solid rgba(102, 126, 234, 0.1);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.8);
          color: #6b7280;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .radius-btn.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-color: transparent;
        }

        .radius-btn:hover:not(.active) {
          border-color: #667eea;
          color: #667eea;
        }

        .users-list {
          max-height: 400px;
          overflow-y: auto;
          padding: 0 20px 20px 20px;
        }

        .user-item {
          display: flex;
          gap: 12px;
          padding: 12px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-bottom: 8px;
        }

        .user-item:hover {
          background: rgba(102, 126, 234, 0.05);
        }

        .user-avatar {
          position: relative;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          overflow: hidden;
          flex-shrink: 0;
        }

        .user-avatar img {
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

        .status-dot {
          position: absolute;
          bottom: 2px;
          right: 2px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .user-info {
          flex: 1;
          min-width: 0;
        }

        .user-name {
          font-weight: 600;
          font-size: 14px;
          color: #1f2937;
          margin-bottom: 4px;
        }

        .user-status {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }

        .status-text {
          font-size: 12px;
          font-weight: 500;
        }

        .distance-text {
          font-size: 11px;
          color: #6b7280;
        }

        .user-bio {
          font-size: 12px;
          color: #6b7280;
          line-height: 1.4;
          margin-bottom: 6px;
        }

        .user-interests {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }

        .interest-tag {
          background: rgba(102, 126, 234, 0.1);
          color: #667eea;
          padding: 2px 6px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 500;
        }

        .interest-more {
          color: #6b7280;
          font-size: 10px;
          font-weight: 500;
        }

        .loading-state,
        .empty-state {
          text-align: center;
          padding: 40px 20px;
        }

        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(102, 126, 234, 0.1);
          border-top: 3px solid #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }

        .empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
          opacity: 0.5;
        }

        .empty-text {
          font-size: 16px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 8px;
        }

        .empty-subtext {
          font-size: 14px;
          color: #6b7280;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Responsive */
        @media (max-width: 768px) {
          .people-discovery-panel {
            right: 10px;
            width: calc(100vw - 20px);
            max-width: 350px;
          }
        }
      `}</style>
    </div>
  );
};

export default PeopleDiscoveryPanel;