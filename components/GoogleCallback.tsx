import React, { useEffect, useState } from 'react';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { handleGoogleCallback } from '../services/googleDriveService';

interface GoogleCallbackProps {
  onComplete: () => void;
}

export const GoogleCallback: React.FC<GoogleCallbackProps> = ({ onComplete }) => {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Connecting to Google Drive...');

  useEffect(() => {
    const processCallback = async () => {
      try {
        const hash = window.location.hash;
        
        if (!hash) {
          setStatus('error');
          setMessage('No authentication data received');
          return;
        }
        
        const success = await handleGoogleCallback(hash);
        
        if (success) {
          setStatus('success');
          setMessage('Successfully connected to Google Drive!');
          
          // Close popup and notify parent window
          setTimeout(() => {
            if (window.opener) {
              window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS' }, window.location.origin);
              window.close();
            } else {
              onComplete();
            }
          }, 1500);
        } else {
          setStatus('error');
          setMessage('Failed to connect. Please try again.');
        }
      } catch (error) {
        setStatus('error');
        setMessage('An error occurred during authentication.');
      }
    };

    processCallback();
  }, [onComplete]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#020617] font-sans text-slate-200 p-4">
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl text-center max-w-sm w-full">
        {status === 'processing' && (
          <>
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-white mb-2">Connecting...</h2>
            <p className="text-slate-400 text-sm">{message}</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">Connected!</h2>
            <p className="text-slate-400 text-sm">{message}</p>
            <p className="text-slate-500 text-xs mt-4">This window will close automatically...</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">Connection Failed</h2>
            <p className="text-slate-400 text-sm mb-4">{message}</p>
            <button
              onClick={() => window.close()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Close Window
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default GoogleCallback;
