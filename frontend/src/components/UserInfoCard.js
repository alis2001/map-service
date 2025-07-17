// Enhanced UserInfoCard with location card pattern
import React, { useEffect, useState } from 'react';

const UserInfoCard = ({ user, visible, onClose, onInvite, currentUser }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [enhancedUser, setEnhancedUser] = useState(user);

  // Handle visibility with proper timing like location cards
  useEffect(() => {
    if (visible) {
      // Small delay to ensure smooth animation
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [visible]);

  // Enhanced user data loading effect
  useEffect(() => {
    if (user && visible) {
      setEnhancedUser(user);
      
      // If user is missing key preference data, try to fetch from main backend
      const missingPreferences = !user.socialEnergy && !user.groupPreference && !user.locationPreference;
      
      if (missingPreferences) {
        console.log('🔄 User missing preferences, attempting to fetch from main backend...');
        fetchUserPreferencesFromMainBackend(user);
      }
    }
  }, [user, visible]);

  // Fetch user preferences from main backend as fallback
  const fetchUserPreferencesFromMainBackend = async (userData) => {
    try {
      const token = localStorage.getItem('caffis_auth_token') || localStorage.getItem('token');
      if (!token) return;

      // Try to get user profile from main backend (port 5000)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/user/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Fetched user preferences from main backend:', data.user);
        
        // Merge main backend data with map service data
        setEnhancedUser(prev => ({
          ...prev,
          ...data.user,
          userId: prev.userId, // Keep original userId
          firstName: prev.firstName, // Keep original names
          lastName: prev.lastName,
          distance: prev.distance, // Keep distance info
          lastSeen: prev.lastSeen, // Keep location info
          isLive: prev.isLive
        }));
      }
    } catch (error) {
      console.error('❌ Error fetching user preferences from main backend:', error);
    }
  };

  // Handle backdrop click to close
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    // Delay the actual close to allow animation
    setTimeout(() => {
      onClose();
    }, 300);
  };

  if (!visible || !enhancedUser) return null;

  // Debug logging to see what data we're receiving
  console.log('🔍 UserInfoCard received user data:', enhancedUser);
  console.log('🔍 User preferences:', {
    socialEnergy: enhancedUser.socialEnergy,
    groupPreference: enhancedUser.groupPreference,
    locationPreference: enhancedUser.locationPreference,
    meetingFrequency: enhancedUser.meetingFrequency,
    timePreference: enhancedUser.timePreference,
    conversationTopics: enhancedUser.conversationTopics,
    socialGoals: enhancedUser.socialGoals,
    coffeePersonality: enhancedUser.coffeePersonality
  });

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

  // Parse conversation topics safely
  const getConversationTopics = (topics) => {
    if (!topics) return '';
    if (typeof topics === 'string') {
      try {
        const parsed = JSON.parse(topics);
        if (Array.isArray(parsed)) {
          return parsed.join(', ');
        }
        return topics;
      } catch {
        return topics;
      }
    }
    if (Array.isArray(topics)) {
      return topics.join(', ');
    }
    return String(topics);
  };

  // Format preference values for better display
  const formatPreferenceValue = (value) => {
    if (!value) return value;
    
    // Capitalize first letter and handle common cases
    const formatted = String(value)
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .toLowerCase()
      .replace(/^\w/, c => c.toUpperCase());
    
    // Handle specific translations
    const translations = {
      'introvert': 'Introverso',
      'extrovert': 'Estroverso', 
      'ambivert': 'Equilibrato',
      'friendship': 'Amicizia',
      'networking': 'Network',
      'fun': 'Divertimento',
      'learning': 'Imparare',
      'daily': 'Giornaliero',
      'weekly': 'Settimanale',
      'monthly': 'Mensile',
      'rarely': 'Raramente',
      'morning': 'Mattina',
      'afternoon': 'Pomeriggio',
      'evening': 'Sera',
      'coworking': 'Coworking',
      'quiet': 'Tranquillo',
      'lively': 'Vivace',
      'outdoor': 'All\'aperto'
    };
    
    return translations[value.toLowerCase()] || formatted;
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

  // Calculate distance if coordinates available
  const getDistance = () => {
    if (user.distance !== undefined) {
      return user.distance < 1000 
        ? `${Math.round(user.distance)}m` 
        : `${(user.distance / 1000).toFixed(1)}km`;
    }
    return null;
  };

  const interests = getInterests(user.interests);
  const isCurrentUser = currentUser && user.userId === currentUser.id;
  const userStatus = getUserStatus();
  const statusColor = getStatusColor();
  const distance = getDistance();
  const registrationDate = formatRegistrationDate(user.registeredAt);
  const conversationTopics = getConversationTopics(user.conversationTopics);

  return (
    <div 
      className={`user-info-overlay ${isVisible ? 'visible' : ''}`}
      onClick={handleBackdropClick}
    >
      <div className={`user-info-card ${isVisible ? 'visible' : ''}`}>
        
        {/* Close button */}
        <button 
          className="user-card-close"
          onClick={handleClose}
          title="Chiudi"
        >
          ×
        </button>

        {/* Header with animated background */}
        <div className="user-card-header">
          <div className="user-card-avatar">
            {enhancedUser.profilePic ? (
              <img src={enhancedUser.profilePic} alt={enhancedUser.firstName} />
            ) : (
              <div className="avatar-placeholder">
                {enhancedUser.firstName?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}
          </div>

          <div className="user-card-info">
            <h3>
              {enhancedUser.firstName} {enhancedUser.lastName}
              {isCurrentUser && <span style={{ color: '#667eea' }}>👤</span>}
            </h3>
            {enhancedUser.username && (
              <div className="username">@{enhancedUser.username}</div>
            )}
            <div className={`status-${userStatus === 'Online' ? 'live' : 'offline'}`}>
              <div 
                className="status-dot-card"
                style={{ backgroundColor: statusColor }}
              />
              {userStatus}
              {distance && <span> • {distance}</span>}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="user-card-content">
          
          {/* Bio section */}
          {enhancedUser.bio && (
            <div className="user-card-section">
              <h4>📝 Bio</h4>
              <p>{enhancedUser.bio}</p>
            </div>
          )}

          {/* Interests section */}
          {interests.length > 0 && (
            <div className="user-card-section">
              <h4>💫 Interessi</h4>
              <div className="user-interests">
                {interests.slice(0, 6).map((interest, index) => (
                  <span key={index} className="interest-tag">
                    {interest}
                  </span>
                ))}
                {interests.length > 6 && (
                  <span className="interest-tag">+{interests.length - 6}</span>
                )}
              </div>
            </div>
          )}

          {/* Coffee preferences */}
          {enhancedUser.coffeePersonality && (
            <div className="user-card-section">
              <h4>☕ Personalità Caffè</h4>
              <p>{enhancedUser.coffeePersonality}</p>
            </div>
          )}

          {/* Basic info stats */}
          {(enhancedUser.ageRange || registrationDate) && (
            <div className="user-card-section">
              <h4>📊 Informazioni</h4>
              <div className="user-stats">
                {enhancedUser.ageRange && (
                  <div className="stat-item">
                    <div className="stat-value">{enhancedUser.ageRange}</div>
                    <div className="stat-label">Età</div>
                  </div>
                )}
                {registrationDate && (
                  <div className="stat-item">
                    <div className="stat-value">{registrationDate}</div>
                    <div className="stat-label">Su Caffis</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Social preferences */}
          {(enhancedUser.socialEnergy || enhancedUser.groupPreference || enhancedUser.socialGoals) && (
            <div className="user-card-section">
              <h4>🤝 Preferenze Sociali</h4>
              <div className="user-stats">
                {enhancedUser.socialEnergy && (
                  <div className="stat-item">
                    <div className="stat-value">{formatPreferenceValue(enhancedUser.socialEnergy)}</div>
                    <div className="stat-label">Energia Sociale</div>
                  </div>
                )}
                {enhancedUser.groupPreference && (
                  <div className="stat-item">
                    <div className="stat-value">{formatPreferenceValue(enhancedUser.groupPreference)}</div>
                    <div className="stat-label">Gruppo</div>
                  </div>
                )}
                {enhancedUser.socialGoals && (
                  <div className="stat-item">
                    <div className="stat-value">{formatPreferenceValue(enhancedUser.socialGoals)}</div>
                    <div className="stat-label">Obiettivi</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Meeting preferences */}
          {(enhancedUser.meetingFrequency || enhancedUser.timePreference || enhancedUser.locationPreference) && (
            <div className="user-card-section">
              <h4>📅 Preferenze Incontri</h4>
              <div className="user-stats">
                {enhancedUser.meetingFrequency && (
                  <div className="stat-item">
                    <div className="stat-value">{formatPreferenceValue(enhancedUser.meetingFrequency)}</div>
                    <div className="stat-label">Frequenza</div>
                  </div>
                )}
                {enhancedUser.timePreference && (
                  <div className="stat-item">
                    <div className="stat-value">{formatPreferenceValue(enhancedUser.timePreference)}</div>
                    <div className="stat-label">Orario</div>
                  </div>
                )}
                {enhancedUser.locationPreference && (
                  <div className="stat-item">
                    <div className="stat-value">{formatPreferenceValue(enhancedUser.locationPreference)}</div>
                    <div className="stat-label">Luogo</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Conversation topics */}
          {conversationTopics && (
            <div className="user-card-section">
              <h4>💬 Argomenti di Conversazione</h4>
              <p>{conversationTopics}</p>
            </div>
          )}

          {/* Actions */}
          {!isCurrentUser && (
            <div className="user-card-actions">
              <button 
                className="user-action-btn user-action-primary"
                onClick={() => onInvite && onInvite(enhancedUser)}
              >
                ☕ Invita per un caffè
              </button>
            </div>
          )}

          {isCurrentUser && (
            <div className="user-card-actions">
              <button 
                className="user-action-btn user-action-secondary"
                onClick={() => {
                  // Add profile edit functionality
                  console.log('Modifica profilo');
                }}
              >
                ✏️ Modifica profilo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserInfoCard;