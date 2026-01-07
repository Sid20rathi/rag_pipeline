'use client';

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const EmailSender = ({ userEmail, onClose }) => {
  // Form states
  const [recipients, setRecipients] = useState([]); // Array of email objects: {id, email, valid}
  const [currentEmail, setCurrentEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [authStatus, setAuthStatus] = useState({ authenticated: false });
  const [inputError, setInputError] = useState('');
  
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const inputRef = useRef(null);

  // Check authentication status on load
  useEffect(() => {
    if (userEmail) {
      checkAuthStatus();
    }
  }, [userEmail]);

  // Focus input on component mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Check if user has valid OAuth tokens
  const checkAuthStatus = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/check-auth/${userEmail}`);
      setAuthStatus(response.data);
    } catch (error) {
      console.error('Error checking auth status:', error);
    }
  };

  // Validate email format
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  // Add recipient
  const addRecipient = () => {
    if (!currentEmail.trim()) return;
    
    const email = currentEmail.trim();
    
    // Check if email already exists
    if (recipients.some(r => r.email === email)) {
      setInputError('This email is already added');
      return;
    }
    
    // Validate email format
    if (!validateEmail(email)) {
      setInputError('Please enter a valid email address');
      return;
    }
    
    // Add to recipients
    const newRecipient = {
      id: Date.now(), // Simple unique ID
      email: email,
      valid: true
    };
    
    setRecipients([...recipients, newRecipient]);
    setCurrentEmail('');
    setInputError('');
    
    // Focus back on input
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Remove recipient
  const removeRecipient = (id) => {
    setRecipients(recipients.filter(r => r.id !== id));
  };

  // Handle key presses in email input
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addRecipient();
    } else if (e.key === 'Backspace' && currentEmail === '' && recipients.length > 0) {
      // Remove last recipient on backspace when input is empty
      removeRecipient(recipients[recipients.length - 1].id);
    }
  };

  // Handle paste - split multiple emails
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const emails = pastedText.split(/[,;\s]+/).filter(email => email.trim() !== '');
    
    let hasInvalid = false;
    let hasDuplicate = false;
    
    emails.forEach(email => {
      if (!validateEmail(email)) {
        hasInvalid = true;
        return;
      }
      
      if (recipients.some(r => r.email === email.trim())) {
        hasDuplicate = true;
        return;
      }
      
      const newRecipient = {
        id: Date.now() + Math.random(),
        email: email.trim(),
        valid: true
      };
      
      setRecipients(prev => [...prev, newRecipient]);
    });
    
    if (hasInvalid) {
      setInputError('Some emails were invalid and not added');
    } else if (hasDuplicate) {
      setInputError('Some duplicate emails were skipped');
    } else if (emails.length > 0) {
      toast.success(`Added ${emails.length} recipient(s)`);
    }
  };

  // Handle email sending
  const handleSendEmail = async () => {
    // Validation
    if (!authStatus.authenticated) {
      toast.error('Please authenticate with Google first');
      return;
    }

    if (recipients.length === 0) {
      toast.error('Please add at least one recipient');
      return;
    }

    if (!subject.trim()) {
      toast.error('Subject is required');
      return;
    }

    if (!body.trim()) {
      toast.error('Email body is required');
      return;
    }

    setIsSending(true);
    const toastId = toast.loading('Sending emails...');

    try {
      // Send to each recipient
      const sendPromises = recipients.map(async (recipient) => {
        const emailData = {
          user_email: userEmail,
          to: recipient.email,
          subject: subject.trim(),
          body: body.trim(),
          attachment_url: attachmentUrl.trim() || null
        };

        return axios.post(`${API_BASE_URL}/send-email`, emailData, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
      });

      // Wait for all emails to be sent
      const results = await Promise.allSettled(sendPromises);
      
      // Analyze results
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.data.success);
      const failed = results.filter(r => r.status === 'rejected' || !r.value?.data?.success);
      
      if (failed.length === 0) {
        toast.success(`Successfully sent ${successful.length} email(s)!`, { id: toastId });
        // Reset form on complete success
        setRecipients([]);
        setSubject('');
        setBody('');
        setAttachmentUrl('');
      } else if (successful.length > 0) {
        toast.success(`Sent ${successful.length} email(s), ${failed.length} failed`, { id: toastId });
      } else {
        toast.error(`Failed to send all ${failed.length} email(s)`, { id: toastId });
      }

      // Log detailed results
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`Failed to send to ${recipients[index].email}:`, result.reason);
        }
      });

    } catch (error) {
      console.error('Error sending emails:', error);
      toast.error('Failed to send emails. Please try again.', { id: toastId });
      
      // Check if it's an authentication error
      if (error.response?.status === 401) {
        toast.error('Authentication expired. Please reconnect your Google account.');
        setAuthStatus({ authenticated: false });
      }
    } finally {
      setIsSending(false);
    }
  };

  // Handle Google OAuth authentication
  const handleGoogleAuth = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/google`);
      // Redirect to Google OAuth page
      window.location.href = response.data.auth_url;
    } catch (error) {
      toast.error('Failed to start authentication');
      console.error(error);
    }
  };

  // Quick templates (unchanged)
  const applyTemplate = (templateName) => {
    const templates = {
      'job_application': {
        subject: 'Job Application - Full Stack Developer',
        body: `Dear Hiring Manager,

I am writing to express my interest in the Full Stack Developer position at your company.

My qualifications and experience align well with your requirements. Please find my resume attached for your review.

I look forward to the opportunity to discuss how my skills can contribute to your team.

Best regards,
${userEmail.split('@')[0] || 'Your Name'}`
      },
      'follow_up': {
        subject: 'Following up on my application',
        body: `Hello,

I wanted to follow up on the application I submitted last week. I'm very excited about the opportunity to join your team.

Please let me know if you need any additional information.

Thank you,
${userEmail.split('@')[0] || 'Your Name'}`
      }
    };

    if (templates[templateName]) {
      setSubject(templates[templateName].subject);
      setBody(templates[templateName].body);
      toast.success(`Applied ${templateName.replace('_', ' ')} template`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">📧 Batch Email Sender</h1>
              <p className="text-gray-600">Send emails to multiple recipients with attachments</p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                ✕
              </button>
            )}
          </div>

          {/* Authentication Status */}
          <div className={`p-4 rounded-lg ${authStatus.authenticated ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 ${authStatus.authenticated ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                  <span className="font-medium">
                    {authStatus.authenticated ? `Authenticated as ${userEmail}` : 'Not Authenticated'}
                  </span>
                </div>
                {authStatus.authenticated && authStatus.expires_at && (
                  <p className="text-sm text-gray-600 ml-6 mt-1">
                    Token expires: {new Date(authStatus.expires_at).toLocaleString()}
                  </p>
                )}
              </div>
              {!authStatus.authenticated && (
                <button
                  onClick={handleGoogleAuth}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Connect Google
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main Form */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Compose Email</h2>

          {/* Recipients Section - Gmail Style */}
          <div className="mb-6">
            <div className="flex items-start mb-2">
              <span className="text-sm font-medium text-gray-700 pt-3 pr-3">To:</span>
              <div className="flex-1">
                {/* Recipient Tags */}
                <div className="flex flex-wrap gap-2 mb-2">
                  {recipients.map((recipient) => (
                    <div
                      key={recipient.id}
                      className="inline-flex items-center bg-blue-100 text-blue-800 rounded-full pl-3 pr-2 py-1 group hover:bg-blue-200 transition-colors"
                    >
                      <span className="text-sm font-medium mr-1">{recipient.email}</span>
                      <button
                        type="button"
                        onClick={() => removeRecipient(recipient.id)}
                        className="ml-1 text-blue-600 hover:text-blue-900 opacity-70 group-hover:opacity-100 transition-opacity"
                        aria-label={`Remove ${recipient.email}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
                
                {/* Email Input */}
                <div className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={currentEmail}
                    onChange={(e) => {
                      setCurrentEmail(e.target.value);
                      setInputError('');
                    }}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    placeholder={recipients.length === 0 ? "Enter email addresses..." : "Add more recipients..."}
                    className="w-full px-3 py-2 border-0 focus:outline-none focus:ring-0 text-gray-900 placeholder-gray-400"
                  />
                  
                  {/* Input bottom border */}
                  <div className="absolute bottom-0 left-0 right-0 border-b border-gray-300"></div>
                  <div className={`absolute bottom-0 left-0 right-0 border-b-2 transition-all duration-300 ${
                    inputError ? 'border-red-500' : 'border-blue-500 scale-x-0 group-hover:scale-x-100'
                  }`}></div>
                </div>
                
                {/* Helper text and error */}
                <div className="mt-2">
                  {inputError ? (
                    <p className="text-sm text-red-600 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      {inputError}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500">
                      Press Enter, comma, or paste multiple emails separated by commas
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Recipient count */}
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{recipients.length}</span> recipient{recipients.length !== 1 ? 's' : ''} added
              </div>
              <button
                type="button"
                onClick={() => {
                  if (currentEmail.trim()) addRecipient();
                }}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!currentEmail.trim()}
              >
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add
              </button>
            </div>
          </div>

          {/* Subject */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject *
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Email Body */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Message *
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => applyTemplate('job_application')}
                  className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  Job Application
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('follow_up')}
                  className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                >
                  Follow-up
                </button>
              </div>
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              placeholder="Type your email message here..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
            />
            <p className="text-xs text-gray-500 mt-2">
              {body.length} characters
            </p>
          </div>

          {/* Attachment */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Resume Attachment (Optional)
            </label>
            <input
              type="url"
              value={attachmentUrl}
              onChange={(e) => setAttachmentUrl(e.target.value)}
              placeholder="https://vercel-blob-url.com/resume.pdf"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <p className="text-xs text-gray-500 mt-2">
              Provide a Vercel Blob URL for PDF attachments
            </p>
            
            {/* Quick Attachment Examples */}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setAttachmentUrl('https://public.blob.vercel-storage.com/resume.pdf')}
                className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Example URL
              </button>
              <button
                type="button"
                onClick={() => setAttachmentUrl('')}
                className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Send Button */}
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">
                Ready to send to <strong>{recipients.length}</strong> recipient{recipients.length !== 1 ? 's' : ''}
                {attachmentUrl && ' with attachment'}
              </p>
            </div>
            <button
              onClick={handleSendEmail}
              disabled={isSending || !authStatus.authenticated || recipients.length === 0}
              className={`px-8 py-4 rounded-xl font-bold text-lg transition-all ${
                authStatus.authenticated && !isSending && recipients.length > 0
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isSending ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                  Sending...
                </div>
              ) : (
                `Send ${recipients.length} Email${recipients.length !== 1 ? 's' : ''}`
              )}
            </button>
          </div>
        </div>

        {/* Stats & Info Panel */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 Email Stats</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-600">Recipients</p>
              <p className="text-2xl font-bold text-blue-700">{recipients.length}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-600">Status</p>
              <p className="text-lg font-bold text-green-700">
                {authStatus.authenticated ? 'Ready to send' : 'Needs authentication'}
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-600">Attachment</p>
              <p className="text-lg font-bold text-purple-700">
                {attachmentUrl ? '✓ Included' : 'None'}
              </p>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-medium text-yellow-800 mb-2">⚠️ Important Notes</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• All emails will be sent from your authenticated Google account ({userEmail})</li>
              <li>• Each email is sent separately for better tracking</li>
              <li>• Failed emails will be logged in the console</li>
              <li>• Keep attachment size under 25MB for Gmail compatibility</li>
              <li>• Authentication tokens expire after 1 hour</li>
              <li>• Press Enter or comma to add emails, backspace to remove last</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailSender;