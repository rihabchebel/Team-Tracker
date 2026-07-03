import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { mailerSendService } from '../lib/mailerSend';
import { Invitation } from '../types/models';

type InvitationWithProject = Invitation & {
  projects?: {
    name?: string | null;
  } | null;
};

export const AcceptInvitation = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [invitation, setInvitation] = useState<InvitationWithProject | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void validateInvitation();
  }, [token]);

  const validateInvitation = async () => {
    if (!token) {
      setError('Invalid invitation token');
      setLoading(false);
      return;
    }

    try {
      const { data, error: lookupError } = await supabase
        .from('invitations')
        .select('*, projects(name)')
        .eq('token', token)
        .single();

      if (lookupError || !data) {
        setError('Invalid invitation token');
        setLoading(false);
        return;
      }

      if (data.status !== 'pending') {
        setError(`This invitation has already been ${data.status}`);
        setLoading(false);
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        setError('This invitation has expired');
        setLoading(false);
        return;
      }

      setInvitation(data as InvitationWithProject);
      setLoading(false);
    } catch (validationError) {
      console.error('Error validating invitation:', validationError);
      setError('Failed to validate invitation');
      setLoading(false);
    }
  };

  const handleAccept = async (event: React.FormEvent) => {
    event.preventDefault();

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!token || !invitation) {
      setError('Invalid invitation token');
      return;
    }

    setAccepting(true);
    setError(null);

    try {
      const { error: acceptError } = await supabase.rpc('accept_invitation', {
        p_token: token,
        p_password: password,
      });

      if (acceptError) throw acceptError;

      try {
        await mailerSendService.sendWelcome({
          email: invitation.email,
          full_name: invitation.full_name,
        });
      } catch (welcomeError) {
        console.warn('Welcome email failed:', welcomeError);
      }

      navigate('/login', {
        state: {
          message: '✅ Account created successfully! Please log in.',
        },
      });
    } catch (acceptError: any) {
      console.error('Error accepting invitation:', acceptError);
      setError(acceptError.message || 'Failed to accept invitation. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  const handleReject = async () => {
    if (!token) {
      setError('Invalid invitation token');
      return;
    }

    if (!confirm('Are you sure you want to reject this invitation?')) return;

    try {
      await supabase.rpc('reject_invitation', { p_token: token });
      navigate('/login', {
        state: {
          message: 'Invitation rejected.',
        },
      });
    } catch (rejectError) {
      console.error('Error rejecting invitation:', rejectError);
      setError('Failed to reject invitation. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying your invitation...</p>
        </div>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Invalid Invitation</h1>
          <p className="text-gray-600 mb-6">{error || 'This invitation link is invalid or has expired.'}</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Accept Invitation</h1>
          <p className="text-gray-600 text-sm mt-1">Join TeamTracker and start collaborating</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
          <p className="flex justify-between">
            <span className="text-gray-600">Full Name:</span>
            <span className="font-medium">{invitation.full_name}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-gray-600">Email:</span>
            <span className="font-medium">{invitation.email}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-gray-600">Role:</span>
            <span className="font-medium capitalize">{invitation.role}</span>
          </p>
          {invitation.projects?.name && (
            <p className="flex justify-between">
              <span className="text-gray-600">Project:</span>
              <span className="font-medium">{invitation.projects.name}</span>
            </p>
          )}
          <p className="flex justify-between text-sm text-gray-500">
            <span>Expires:</span>
            <span>{new Date(invitation.expires_at).toLocaleDateString()}</span>
          </p>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

        <form onSubmit={handleAccept} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Choose a Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              required
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Minimum 6 characters"
              disabled={accepting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={6}
              required
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Confirm your password"
              disabled={accepting}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={accepting}
              className="flex-1 px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {accepting ? 'Creating Account...' : 'Accept Invitation'}
            </button>
            <button
              type="button"
              onClick={handleReject}
              disabled={accepting}
              className="flex-1 px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Reject
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};