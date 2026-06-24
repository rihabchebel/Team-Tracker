// components/Header.tsx
import React from 'react';
import { User } from 'lucide-react';
import './Header.css';

interface HeaderProps {
  user: string;
  email: string;
}

const Header: React.FC<HeaderProps> = ({ user, email }) => {
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
          <User size={16} className="user-icon" />
          <span className="user-name">{user}</span>
          <span className="user-email">{email}</span>
        </div>
      </div>
    </header>
  );
};

export default Header;