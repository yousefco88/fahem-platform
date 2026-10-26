/**
 * FileUploader — مكون رفع الملفات إلى Supabase Storage
 * يدعم الفيديو والـ PDF
 */
import { useState, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';

const BUCKET = 'curriculum-media';

const FILE_TYPES = {
  video: {
    accept: 'video/*',
    maxSize: 100 * 1024 * 1024, // 100MB
    label: 'فيديو',
    icon: '🎬',
  },
  pdf: {
    accept: 'application/pdf',
    maxSize: 20 * 1024 * 1024, // 20MB
    label: 'PDF',
    icon: '📄',
  },
  image: {
    accept: 'image/*',
    maxSize: 10 * 1024 * 1024, // 10MB
    label: 'صورة',
    icon: '🖼️',
  },
};

export default function FileUploader({ 
  type = 'pdf', 
  currentUrl, 
  onUpload, 
  lessonId,
  disabled = false 
}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const { user, role } = useAuth();
  
  const config = FILE_TYPES[type] || FILE_TYPES.pdf;

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > config.maxSize) {
      setError(`الملف كبير جداً. الحد الأقصى: ${config.maxSize / (1024 * 1024)}MB`);
      return;
    }

    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      // Generate unique filename
      const ext = file.name.split('.').pop();
      const timestamp = Date.now();
      const safeName = `${lessonId || 'lesson'}_${type}_${timestamp}.${ext}`;
      // المعلم يرفع داخل مجلد باسمه فقط (تفرضه سياسة التخزين)
      const folder = role === 'teacher' && user?.id ? `${user.id}/` : '';
      const filePath = `${folder}${type}s/${safeName}`;

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          onUploadProgress: (progress) => {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            setProgress(percent);
          },
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(filePath);

      const publicUrl = urlData?.publicUrl;
      
      if (publicUrl && onUpload) {
        onUpload(publicUrl);
      }

      setProgress(100);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'فشل رفع الملف');
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function handleDelete() {
    if (!currentUrl || !confirm('حذف الملف المرفوع؟')) return;

    try {
      // Extract path from URL
      const urlParts = currentUrl.split(`${BUCKET}/`);
      if (urlParts.length < 2) return;
      
      const filePath = urlParts[1];
      
      const { error } = await supabase.storage
        .from(BUCKET)
        .remove([filePath]);

      if (error) throw error;

      onUpload?.('');
    } catch (err) {
      console.error('Delete error:', err);
      setError('فشل حذف الملف');
    }
  }

  return (
    <div className="file-uploader">
      {/* Current file display */}
      {currentUrl && (
        <div className="current-file">
          <span className="file-icon">{config.icon}</span>
          <a href={currentUrl} target="_blank" rel="noopener noreferrer" className="file-link">
            ملف مرفوع ←
          </a>
          <button 
            type="button" 
            className="btn-icon btn-danger" 
            onClick={handleDelete}
            title="حذف الملف"
          >
            🗑️
          </button>
        </div>
      )}

      {/* Upload button */}
      <div className="upload-zone">
        <input
          ref={fileInputRef}
          type="file"
          accept={config.accept}
          onChange={handleFileSelect}
          disabled={disabled || uploading}
          style={{ display: 'none' }}
          id={`file-upload-${type}`}
        />
        <label 
          htmlFor={`file-upload-${type}`} 
          className={`upload-label ${uploading ? 'uploading' : ''} ${disabled ? 'disabled' : ''}`}
        >
          {uploading ? (
            <>
              <span className="upload-progress">{progress}%</span>
              <span>جارٍ الرفع...</span>
            </>
          ) : (
            <>
              <span className="upload-icon">📤</span>
              <span>اختر {config.label} للرفع</span>
              <span className="upload-hint">الحد الأقصى: {config.maxSize / (1024 * 1024)}MB</span>
            </>
          )}
        </label>
      </div>

      {/* Progress bar */}
      {uploading && (
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="upload-error">
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}
