// src/components/Login.tsx
import React, { useState, useEffect } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Lock, Mail, ArrowRight, Shield, Users } from "lucide-react";
import "./Login.css";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signIn, user } = useAuth();
  const location = useLocation();
  const locationState = location.state as { message?: string } | null;

  // Clear any stale session on mount
  useEffect(() => {
    localStorage.removeItem("supabase.auth.token");
    sessionStorage.clear();
  }, []);

  // If user is already logged in, redirect to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signIn(email, password);
    } catch (err: any) {
      console.error("Auth error:", err);
      setError(err.message || "Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
          </div>
          <h1>TeamTracker</h1>
          <p>Performance & Availability</p>
        </div>

        {locationState?.message && (
          <div className="success-message" style={{ marginBottom: "16px" }}>
            {locationState.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <h2>Sign In</h2>

          <div className="form-group">
            <label>Email</label>
            <div className="input-wrapper">
              <Mail className="input-icon" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner"></span>
                Loading...
              </>
            ) : (
              <>
                Sign In
                <ArrowRight className="btn-icon" size={18} />
              </>
            )}
          </button>
        </form>

        <div className="auth-links">
          <div className="text-center mt-4">
            <p className="text-sm text-gray-600">
              Don't have an account?{" "}
              <Link
                to="/admin-signup"
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                Create admin account
              </Link>
            </p>
          </div>
          <div className="text-center mt-2">
            <p className="text-xs text-gray-400">
              First-time setup? Click the link above to create the admin
              account.
            </p>
          </div>

          <div className="text-center mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-center items-center space-x-4 text-xs text-gray-400">
              <span className="flex items-center">
                <Shield size={14} className="mr-1" />
                Secure Login
              </span>
              <span>•</span>
              <span className="flex items-center">
                <Users size={14} className="mr-1" />
                Invited users can log in
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;