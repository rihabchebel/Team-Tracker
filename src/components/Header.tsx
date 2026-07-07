// components/Header.tsx - Updated with better user tag

import React from 'react';
import { LogOut, Mail, Settings,  } from 'lucide-react';
import './Header.css';

interface HeaderProps {
  user: string;
  email: string;
  onLogout?: () => void;
  onSettings?: () => void;
  avatarColor?: string;
}

const Header: React.FC<HeaderProps> = ({ 
  user, 
  email, 
  onLogout, 
  onSettings,
  avatarColor = '#4f72e8'
}) => {
  // Get user initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const initials = getInitials(user);

  return (
    <header className="header">
      <div className="header-left">
        <div className="logo">
          <h1>TeamTracker</h1>
          <span className="tagline">Performance & Availability</span>
        </div>
      </div>
      <div className="header-right">
        <div className="user-tag">
          <div className="user-avatar" style={{ backgroundColor: avatarColor }}>
            {initials}
          </div>
          <div className="user-details">
            <span className="user-name">{user}</span>
            <span className="user-email">
              <Mail size={12} />
              {email}
            </span>
          </div>
          <div className="user-actions">
            {onSettings && (
              <button 
                className="icon-btn settings-btn" 
                onClick={onSettings} 
                title="Settings"
              >
                <Settings size={16} />
              </button>
            )}
            {onLogout && (
              <button 
                className="icon-btn logout-btn" 
                onClick={onLogout} 
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            )}
         
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;