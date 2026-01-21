/**
 * Google Drive Backup Service
 * Handles OAuth authentication and automatic backup uploads to Google Drive
 */

import { createExcelBackup } from './excelExportService';

const GOOGLE_CLIENT_ID_KEY = 'db_google_client_id';
const GOOGLE_ACCESS_TOKEN_KEY = 'db_google_access_token';
const GOOGLE_REFRESH_TOKEN_KEY = 'db_google_refresh_token';
const GOOGLE_TOKEN_EXPIRY_KEY = 'db_google_token_expiry';
const GOOGLE_USER_INFO_KEY = 'db_google_user_info';
const GOOGLE_AUTO_BACKUP_KEY = 'db_google_auto_backup';
const GOOGLE_LAST_BACKUP_KEY = 'db_google_last_drive_backup';

export interface GoogleUserInfo {
  email: string;
  name: string;
  picture?: string;
}

export interface GoogleDriveConfig {
  isConnected: boolean;
  userInfo: GoogleUserInfo | null;
  autoBackupEnabled: boolean;
  lastBackup: string | null;
}

// Scopes needed for Drive file uploads
const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
].join(' ');

/**
 * Get stored Google Client ID (user configures this in settings)
 */
export const getGoogleClientId = (): string | null => {
  return localStorage.getItem(GOOGLE_CLIENT_ID_KEY);
};

/**
 * Set Google Client ID
 */
export const setGoogleClientId = (clientId: string) => {
  localStorage.setItem(GOOGLE_CLIENT_ID_KEY, clientId);
};

/**
 * Check if Google Drive is connected
 */
export const isGoogleDriveConnected = (): boolean => {
  const token = localStorage.getItem(GOOGLE_ACCESS_TOKEN_KEY);
  const expiry = localStorage.getItem(GOOGLE_TOKEN_EXPIRY_KEY);
  
  if (!token || !expiry) return false;
  
  // Check if token is still valid (with 5 min buffer)
  const expiryTime = parseInt(expiry, 10);
  return Date.now() < expiryTime - 300000;
};

/**
 * Get current Google Drive configuration
 */
export const getGoogleDriveConfig = (): GoogleDriveConfig => {
  const userInfoStr = localStorage.getItem(GOOGLE_USER_INFO_KEY);
  const autoBackup = localStorage.getItem(GOOGLE_AUTO_BACKUP_KEY);
  const lastBackup = localStorage.getItem(GOOGLE_LAST_BACKUP_KEY);
  
  return {
    isConnected: isGoogleDriveConnected(),
    userInfo: userInfoStr ? JSON.parse(userInfoStr) : null,
    autoBackupEnabled: autoBackup === 'true',
    lastBackup
  };
};

/**
 * Initiate Google OAuth flow
 */
export const initiateGoogleAuth = () => {
  const clientId = getGoogleClientId();
  
  if (!clientId) {
    throw new Error('Google Client ID not configured. Please add it in Settings.');
  }
  
  const redirectUri = `${window.location.origin}/google-callback`;
  
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'token');
  authUrl.searchParams.set('scope', SCOPES);
  authUrl.searchParams.set('include_granted_scopes', 'true');
  authUrl.searchParams.set('prompt', 'consent');
  
  // Open in popup
  const width = 500;
  const height = 600;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;
  
  const popup = window.open(
    authUrl.toString(),
    'google-auth',
    `width=${width},height=${height},left=${left},top=${top},popup=yes`
  );
  
  return popup;
};

/**
 * Handle OAuth callback - extract token from URL
 */
export const handleGoogleCallback = async (hash: string): Promise<boolean> => {
  try {
    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get('access_token');
    const expiresIn = params.get('expires_in');
    
    if (!accessToken) {
      console.error('No access token in callback');
      return false;
    }
    
    // Calculate expiry time
    const expiryTime = Date.now() + (parseInt(expiresIn || '3600', 10) * 1000);
    
    // Store tokens
    localStorage.setItem(GOOGLE_ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(GOOGLE_TOKEN_EXPIRY_KEY, expiryTime.toString());
    
    // Fetch user info
    const userInfo = await fetchGoogleUserInfo(accessToken);
    if (userInfo) {
      localStorage.setItem(GOOGLE_USER_INFO_KEY, JSON.stringify(userInfo));
    }
    
    return true;
  } catch (error) {
    console.error('Error handling Google callback:', error);
    return false;
  }
};

/**
 * Fetch Google user info
 */
const fetchGoogleUserInfo = async (accessToken: string): Promise<GoogleUserInfo | null> => {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) throw new Error('Failed to fetch user info');
    
    const data = await response.json();
    return {
      email: data.email,
      name: data.name,
      picture: data.picture
    };
  } catch (error) {
    console.error('Error fetching user info:', error);
    return null;
  }
};

/**
 * Disconnect Google Drive
 */
export const disconnectGoogleDrive = () => {
  localStorage.removeItem(GOOGLE_ACCESS_TOKEN_KEY);
  localStorage.removeItem(GOOGLE_REFRESH_TOKEN_KEY);
  localStorage.removeItem(GOOGLE_TOKEN_EXPIRY_KEY);
  localStorage.removeItem(GOOGLE_USER_INFO_KEY);
  localStorage.removeItem(GOOGLE_AUTO_BACKUP_KEY);
};

/**
 * Enable/disable automatic Google Drive backup
 */
export const setGoogleAutoBackup = (enabled: boolean) => {
  localStorage.setItem(GOOGLE_AUTO_BACKUP_KEY, enabled.toString());
};

/**
 * Upload file to Google Drive
 */
export const uploadToGoogleDrive = async (
  content: string | Blob,
  filename: string,
  mimeType: string = 'application/json'
): Promise<{ success: boolean; fileId?: string; error?: string }> => {
  const accessToken = localStorage.getItem(GOOGLE_ACCESS_TOKEN_KEY);
  
  if (!accessToken) {
    return { success: false, error: 'Not connected to Google Drive' };
  }
  
  try {
    // Check/create Dreambox Backups folder
    const folderId = await getOrCreateBackupFolder(accessToken);
    
    // Create file metadata
    const metadata = {
      name: filename,
      mimeType,
      parents: folderId ? [folderId] : undefined
    };
    
    // Create multipart request
    const boundary = '-------dreambox-boundary';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;
    
    const body = 
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${mimeType}\r\n\r\n` +
      (content instanceof Blob ? await content.text() : content) +
      closeDelimiter;
    
    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Upload failed');
    }
    
    const result = await response.json();
    
    // Update last backup timestamp
    localStorage.setItem(GOOGLE_LAST_BACKUP_KEY, new Date().toISOString());
    
    return { success: true, fileId: result.id };
  } catch (error: any) {
    console.error('Google Drive upload error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get or create "Dreambox Backups" folder in Google Drive
 */
const getOrCreateBackupFolder = async (accessToken: string): Promise<string | null> => {
  try {
    // Search for existing folder
    const searchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='Dreambox Backups' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );
    
    const searchData = await searchResponse.json();
    
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }
    
    // Create new folder
    const createResponse = await fetch(
      'https://www.googleapis.com/drive/v3/files',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Dreambox Backups',
          mimeType: 'application/vnd.google-apps.folder'
        })
      }
    );
    
    const folderData = await createResponse.json();
    return folderData.id;
  } catch (error) {
    console.error('Error with backup folder:', error);
    return null;
  }
};

/**
 * Perform backup to Google Drive (JSON + Excel)
 */
export const backupToGoogleDrive = async (
  backupData: any,
  includeExcel: boolean = true
): Promise<{ success: boolean; jsonFileId?: string; excelFileId?: string; error?: string }> => {
  const dateStr = new Date().toISOString().split('T')[0];
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  // Upload JSON backup
  const jsonResult = await uploadToGoogleDrive(
    JSON.stringify(backupData, null, 2),
    `dreambox-backup-${dateStr}.json`,
    'application/json'
  );
  
  if (!jsonResult.success) {
    return { success: false, error: jsonResult.error };
  }
  
  let excelFileId: string | undefined;
  
  // Upload Excel backup if requested
  if (includeExcel) {
    try {
      const excelBlob = await createExcelBackup(backupData.data);
      
      const excelResult = await uploadToGoogleDrive(
        excelBlob,
        `dreambox-backup-${dateStr}.xlsx`,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      
      excelFileId = excelResult.fileId;
    } catch (error) {
      console.warn('Excel backup skipped:', error);
    }
  }
  
  return { 
    success: true, 
    jsonFileId: jsonResult.fileId,
    excelFileId
  };
};
