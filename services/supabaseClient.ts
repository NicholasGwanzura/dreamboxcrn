
import { createClient } from '@supabase/supabase-js';

// Use environment-based credentials; never hardcode keys.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let client = null;

if (!supabaseUrl || !supabaseKey) {
    console.warn("Supabase credentials not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local");
} else {
    // Validate anon key format - Supabase JWT tokens start with 'eyJ'
    if (!supabaseKey.startsWith('eyJ')) {
        console.error("⚠️ INVALID ANON KEY FORMAT! Supabase anon keys should start with 'eyJ...' (they are JWT tokens).");
        console.error("Your key starts with:", supabaseKey.substring(0, 20) + "...");
        console.error("Please get the correct anon key from: https://supabase.com/dashboard/project/" + supabaseUrl.split('//')[1].split('.')[0] + "/settings/api");
    }
    try {
        client = createClient(supabaseUrl, supabaseKey);
        console.log("✅ Supabase client initialized with URL:", supabaseUrl);
    } catch (e) {
        console.error("Supabase initialization failed:", e);
    }
}

export const supabase = client;

export const isSupabaseConfigured = () => !!supabase;

// Helper to check connection
export const checkSupabaseConnection = async () => {
    if (!supabase) return false;
    try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
            console.error("Supabase Connection Check Error:", error);
            return false;
        }
        return true;
    } catch (e) {
        console.error("Supabase Connection Exception:", e);
        return false;
    }
};

// Get the current session
export const getCurrentSession = async () => {
    if (!supabase) return null;
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        return session;
    } catch (e) {
        console.error("Error getting session:", e);
        return null;
    }
};

// Listen to auth state changes
export const onAuthStateChange = (callback: (session: any) => void) => {
    if (!supabase) return () => {};
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        callback(session);
    });

    return () => {
        subscription?.unsubscribe();
    };
};

// ============================================
// IMAGE UPLOAD UTILITIES
// ============================================

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB max
const MAX_IMAGE_DIMENSION = 1920; // Max width/height after compression
const COMPRESSION_QUALITY = 0.8; // JPEG quality (0-1)
const STORAGE_BUCKET = 'billboard-images';

export interface ImageUploadResult {
    success: boolean;
    url?: string;
    error?: string;
}

export interface ImageUploadProgress {
    status: 'idle' | 'validating' | 'compressing' | 'uploading' | 'complete' | 'error';
    progress: number; // 0-100
    message: string;
}

// Validate file size and type
export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    
    if (!validTypes.includes(file.type)) {
        return { valid: false, error: `Invalid file type. Allowed: JPG, PNG, WebP, GIF` };
    }
    
    if (file.size > MAX_FILE_SIZE) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        return { valid: false, error: `File too large (${sizeMB}MB). Maximum size is 2MB.` };
    }
    
    return { valid: true };
};

// Compress image using canvas
export const compressImage = (file: File, onProgress?: (progress: ImageUploadProgress) => void): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        onProgress?.({ status: 'compressing', progress: 10, message: 'Compressing image...' });
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                onProgress?.({ status: 'compressing', progress: 30, message: 'Resizing image...' });
                
                let { width, height } = img;
                
                // Scale down if needed
                if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
                    const ratio = Math.min(MAX_IMAGE_DIMENSION / width, MAX_IMAGE_DIMENSION / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }
                
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to create canvas context'));
                    return;
                }
                
                // Use better image smoothing
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);
                
                onProgress?.({ status: 'compressing', progress: 50, message: 'Optimizing quality...' });
                
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            onProgress?.({ status: 'compressing', progress: 60, message: 'Compression complete' });
                            resolve(blob);
                        } else {
                            reject(new Error('Failed to compress image'));
                        }
                    },
                    'image/jpeg',
                    COMPRESSION_QUALITY
                );
            };
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = e.target?.result as string;
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
};

// Upload image to Supabase Storage
export const uploadImageToSupabase = async (
    file: File,
    folder: string = 'billboards',
    onProgress?: (progress: ImageUploadProgress) => void
): Promise<ImageUploadResult> => {
    try {
        // Step 1: Validate
        onProgress?.({ status: 'validating', progress: 5, message: 'Validating file...' });
        const validation = validateImageFile(file);
        if (!validation.valid) {
            onProgress?.({ status: 'error', progress: 0, message: validation.error! });
            return { success: false, error: validation.error };
        }
        
        // Step 2: Compress
        let imageBlob: Blob;
        try {
            imageBlob = await compressImage(file, onProgress);
        } catch (err) {
            // If compression fails, use original if under size limit
            if (file.size <= MAX_FILE_SIZE) {
                imageBlob = file;
            } else {
                throw err;
            }
        }
        
        // Step 3: Check if Supabase is configured
        if (!supabase) {
            // Fallback to base64 for local storage
            onProgress?.({ status: 'uploading', progress: 70, message: 'Saving locally (Supabase not configured)...' });
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    onProgress?.({ status: 'complete', progress: 100, message: 'Image saved locally' });
                    resolve({ success: true, url: reader.result as string });
                };
                reader.onerror = () => {
                    onProgress?.({ status: 'error', progress: 0, message: 'Failed to read image' });
                    resolve({ success: false, error: 'Failed to read image' });
                };
                reader.readAsDataURL(imageBlob);
            });
        }
        
        // Step 4: Upload to Supabase Storage
        onProgress?.({ status: 'uploading', progress: 70, message: 'Uploading to cloud...' });
        
        const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
        
        const { data, error } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(fileName, imageBlob, {
                contentType: 'image/jpeg',
                cacheControl: '3600',
                upsert: false
            });
        
        if (error) {
            console.error('Supabase upload error:', error);
            // Fallback to base64 if storage fails
            onProgress?.({ status: 'uploading', progress: 80, message: 'Cloud failed, saving locally...' });
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    onProgress?.({ status: 'complete', progress: 100, message: 'Saved locally (cloud unavailable)' });
                    resolve({ success: true, url: reader.result as string });
                };
                reader.readAsDataURL(imageBlob);
            });
        }
        
        // Step 5: Get public URL
        onProgress?.({ status: 'uploading', progress: 90, message: 'Finalizing...' });
        
        const { data: urlData } = supabase.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(data.path);
        
        onProgress?.({ status: 'complete', progress: 100, message: 'Upload complete!' });
        
        return { success: true, url: urlData.publicUrl };
        
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Upload failed';
        onProgress?.({ status: 'error', progress: 0, message: errorMessage });
        return { success: false, error: errorMessage };
    }
};

// Delete image from Supabase Storage
export const deleteImageFromSupabase = async (imageUrl: string): Promise<boolean> => {
    if (!supabase || !imageUrl.includes(STORAGE_BUCKET)) {
        return true; // Not a Supabase image or not configured
    }
    
    try {
        // Extract path from URL
        const urlParts = imageUrl.split(`${STORAGE_BUCKET}/`);
        if (urlParts.length < 2) return true;
        
        const path = urlParts[1];
        const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path]);
        
        if (error) {
            console.error('Failed to delete image:', error);
            return false;
        }
        return true;
    } catch (err) {
        console.error('Delete image error:', err);
        return false;
    }
};
