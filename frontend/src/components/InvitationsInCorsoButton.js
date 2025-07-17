// Invitations in Corso Button - Shows when in location selection mode
import React from 'react';
import { Calendar, Clock, Users } from 'lucide-react';

const InvitationsInCorsoButton = ({ 
  visible, 
  onToggle, 
  invitationsCount = 0,
  isExpanded = false 
}) => {
  if (!visible) return null;

  return (
    <div className="invitations-in-corso-container">
      <button 
        className={`invitations-in-corso-btn ${isExpanded ? 'expanded' : ''}`}
        onClick={onToggle}
      >
        <div className="btn-content">
          <div className="btn-icon-wrapper">
            <Calendar className="w-5 h-5" />
            {invitationsCount > 0 && (
              <div className="invitation-badge">{invitationsCount}</div>
            )}
          </div>
          <div className="btn-text">
            <div className="btn-title">Inviti in Corso</div>
            <div className="btn-subtitle">
              {invitationsCount === 0 
                ? 'Nessun invito attivo' 
                : `${invitationsCount} invit${invitationsCount === 1 ? 'o' : 'i'} attiv${invitationsCount === 1 ? 'o' : 'i'}`
              }
            </div>
          </div>
          <div className="btn-arrow">
            {isExpanded ? '▼' : '▶'}
          </div>
        </div>
      </button>

      {/* Expanded Panel - Shows active invitations */}
      {isExpanded && (
        <div className="invitations-panel">
          <div className="panel-header">
            <h4>Inviti Attivi</h4>
          </div>
          
          {invitationsCount === 0 ? (
            <div className="no-invitations">
              <div className="no-invitations-icon">📅</div>
              <div className="no-invitations-text">
                Nessun invito in corso
              </div>
              <div className="no-invitations-subtext">
                Gli inviti che invierai appariranno qui
              </div>
            </div>
          ) : (
            <div className="invitations-list">
              {/* Sample invitation item - replace with real data */}
              <div className="invitation-item">
                <div className="invitation-avatar">
                  <div className="avatar-placeholder">M</div>
                </div>
                <div className="invitation-details">
                  <div className="invitation-name">Marco Rossi</div>
                  <div className="invitation-location">📍 Caffè Centrale</div>
                  <div className="invitation-time">
                    <Clock className="w-3 h-3" />
                    Oggi, 15:30
                  </div>
                </div>
                <div className="invitation-status pending">
                  In attesa
                </div>
              </div>
              
              {/* Add more invitation items as needed */}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InvitationsInCorsoButton;