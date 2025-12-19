'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Toaster, toast } from 'react-hot-toast';

// API base URL
const API_URL = 'http://localhost:8000';

export default function Home() {
  const [userEmail, setUserEmail] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Email form state
  const [emailForm, setEmailForm] = useState({
    to: '',
    subject: '',
    body: ''
  });

  // Check URL parameters for auth success
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authStatus = params.get('auth');
    const email = params.get('email');
    const token = params.get('access_token');
    
    if (authStatus === 'success' && email && token) {
      setUserEmail(email);
      setAccessToken(token);
      setIsAuthenticated(true);
      localStorage.setItem('email', email);
      localStorage.setItem('access_token', token);
      
      // Clean URL
      window.history.replaceState({}, '', '/');
      
      toast.success(`Authenticated as ${email}`);
    }
    
    // Check localStorage for existing tokens
    const storedEmail = localStorage.getItem('email');
    const storedToken = localStorage.getItem('access_token');
    
    if (storedEmail && storedToken) {
      setUserEmail(storedEmail);
      setAccessToken(storedToken);
      setIsAuthenticated(true);
    }
  }, []);

  // Start Google OAuth flow
  const handleGoogleAuth = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/auth/google`);
      // Redirect to Google OAuth page
      window.location.href = response.data.auth_url;
    } catch (error) {
      toast.error('Failed to start authentication');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Send email
  const handleSendEmail = async () => {
    if (!isAuthenticated) {
      toast.error('Please authenticate first');
      return;
    }
    
    if (!emailForm.to || !emailForm.subject || !emailForm.body) {
      toast.error('Please fill all fields');
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/send-email`, {
        user_email: userEmail,
        access_token: accessToken,
        to: emailForm.to,
        subject: emailForm.subject,
        body: emailForm.body
      });
      
      toast.success('Email sent successfully!');
      setEmailForm({ to: '', subject: '', body: '' });
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error('Session expired. Please re-authenticate.');
        // Clear tokens
        localStorage.removeItem('email');
        localStorage.removeItem('access_token');
        setUserEmail('');
        setAccessToken('');
        setIsAuthenticated(false);
      } else {
        toast.error(error.response?.data?.detail || 'Failed to send email');
      }
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem('email');
    localStorage.removeItem('access_token');
    setUserEmail('');
    setAccessToken('');
    setIsAuthenticated(false);
    toast.success('Logged out');
  };

  // Check stored tokens on backend
  const checkStoredTokens = async () => {
    try {
      const response = await axios.get(`${API_URL}/get-stored-tokens`);
      console.log('Stored tokens:', response.data);
      alert(`Backend has ${response.data.count} tokens stored`);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <Toaster position="top-right" />
      
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
            📧 Email Sender with OAuth2
          </h1>
          <p className="text-gray-600">
            Learn OAuth2 flow with Google Gmail API
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Authentication */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              🔐 Authentication
            </h2>
            
            <div className="space-y-6">
              {/* Current Status */}
              <div className={`p-4 rounded-lg ${isAuthenticated ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 ${isAuthenticated ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                  <span className="font-medium">
                    {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
                  </span>
                </div>
                {isAuthenticated && (
                  <p className="mt-2 text-sm text-gray-600 break-all">
                    <strong>Email:</strong> {userEmail}<br/>
                    <strong>Token:</strong> {accessToken.substring(0, 30)}...
                  </p>
                )}
              </div>
              
              {/* Auth Button */}
              <button
                onClick={handleGoogleAuth}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 transition-all duration-200 font-medium"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-3"></div>
                    Connecting...
                  </div>
                ) : (
                  <>
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    {isAuthenticated ? 'Re-authenticate with Google' : 'Connect Google Account'}
                  </>
                )}
              </button>
              
              {/* Logout Button */}
              {isAuthenticated && (
                <button
                  onClick={handleLogout}
                  className="w-full px-6 py-3 bg-red-50 text-red-600 border border-red-200 rounded-xl hover:bg-red-100 transition-colors font-medium"
                >
                  Logout
                </button>
              )}
              
              {/* Test Buttons */}
              <div className="space-y-3">
                <button
                  onClick={checkStoredTokens}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                >
                  🔍 Check Stored Tokens on Backend
                </button>
                
                <button
                  onClick={() => {
                    console.log('Email:', userEmail);
                    console.log('Token:', accessToken);
                    console.log('LocalStorage:', {
                      email: localStorage.getItem('email'),
                      token: localStorage.getItem('access_token')
                    });
                    toast.success('Console logged! Check browser console.');
                  }}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                >
                  📝 Debug: Log to Console
                </button>
              </div>
            </div>
            
            {/* Info Box */}
            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-bold text-blue-800 mb-2">ℹ️ How it works:</h3>
              <ol className="list-decimal pl-5 space-y-1 text-sm text-blue-700">
                <li>Click "Connect Google Account"</li>
                <li>Authorize the app in Google</li>
                <li>You'll be redirected back with tokens</li>
                <li>Tokens are stored in localStorage</li>
                <li>Use the form to send emails</li>
              </ol>
            </div>
          </div>
          
          {/* Right Column - Email Form */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              ✉️ Send Email
            </h2>
            
            <div className="space-y-6">
              {/* Sender Info */}
              {isAuthenticated ? (
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <div className="flex items-center text-indigo-700 mb-2">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                    </svg>
                    <span className="font-medium">Sending as: {userEmail}</span>
                  </div>
                  <p className="text-sm text-indigo-600">
                    Emails will be sent from your Google account
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center text-yellow-700">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                    </svg>
                    <span>You need to authenticate first to send emails</span>
                  </div>
                </div>
              )}
              
              {/* Email Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To
                  </label>
                  <input
                    type="email"
                    value={emailForm.to}
                    onChange={(e) => setEmailForm({...emailForm, to: e.target.value})}
                    placeholder="recipient@example.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={emailForm.subject}
                    onChange={(e) => setEmailForm({...emailForm, subject: e.target.value})}
                    placeholder="Your email subject"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message
                  </label>
                  <textarea
                    value={emailForm.body}
                    onChange={(e) => setEmailForm({...emailForm, body: e.target.value})}
                    rows={6}
                    placeholder="Type your message here..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                  />
                </div>
                
                <button
                  onClick={handleSendEmail}
                  disabled={!isAuthenticated || isLoading}
                  className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                    isAuthenticated 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                      Sending...
                    </div>
                  ) : (
                    'Send Email'
                  )}
                </button>
              </div>
              
              {/* Quick Test Buttons */}
              <div className="space-y-2">
                <p className="text-sm text-gray-500">Quick test emails:</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEmailForm({
                      to: userEmail,
                      subject: 'Test Email from My App',
                      body: 'This is a test email sent using OAuth2 with Google Gmail API!'
                    })}
                    className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                  >
                    Test to Yourself
                  </button>
                  <button
                    onClick={() => setEmailForm({
                      to: '',
                      subject: 'Test Subject',
                      body: 'Test email body content.'
                    })}
                    className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                  >
                    Fill Sample
                  </button>
                </div>
              </div>
            </div>
            
            {/* Notes Section */}
            <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h3 className="font-bold text-gray-800 mb-2">📝 Notes for Testing:</h3>
              <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
                <li>Use a Gmail test account (added in Google Cloud Console)</li>
                <li>Tokens are stored in browser's localStorage</li>
                <li>Access tokens expire in 1 hour</li>
                <li>Refresh token is obtained (stored in backend memory)</li>
                <li>Check browser console for debugging info</li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <footer className="mt-12 text-center text-gray-500 text-sm">
          <p>OAuth2 Learning Project • Tokens stored in localStorage (for testing only)</p>
          <p className="mt-1">Backend running on port 8000 • Frontend on port 3000</p>
        </footer>
      </div>
    </div>
  );
}