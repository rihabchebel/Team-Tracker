// components/Header.tsx
import React from 'react';
import { LogOut } from 'lucide-react';
import './Header.css';

interface HeaderProps {
  user: string;
  email: string;
  onLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, email, onLogout }) => {
  return (
    <header className="header">
      <div className="header-left">
        <div className="logo">
          <h1>TeamTracker</h1>
          <span className="tagline">Performance & Availability</span>
        </div>
      </div>
      <div className="header-right">
        <div className="user-info">
          <span className="user-name">{user}</span>
          <span className="user-email">{email}</span>
          {onLogout && (
            <button className="logout-button" onClick={onLogout} title="Logout">
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;