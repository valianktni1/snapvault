import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { getTemplate } from '../utils/themes';
import { API } from '../utils/api';
import { Upload, Check, X, Image as ImageIcon, Video, Camera } from 'lucide-react';

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const STATUS = { uploading: 'uploading', done: 'done', error: 'error' };

export default function GuestUpload() {
  const { slug } = useParams();
  const [event, setEvent] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [uploaderName, setUploaderName] = useState('');
  const [uploads, setUploads] = useState([]);

  useEffect(() => {
    axios.get(`${API}/guest/event/${slug}`)
      .then(res => setEvent(res.data))
      .catch(() => setNotFound(true))
      .finally(() => setPageLoading(false));
  }, [slug]);

  const uploadFile = useCallback(async (file) => {
    const uid = `${Date.now()}-${Math.random()}`;
    setUploads(prev => [...prev, {
      uid, name: file.name, size: file.size, progress: 0, status: STATUS.uploading
    }]);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploader_name', uploaderName || 'Guest');

    try {
      await axios.post(`${API}/guest/event/${slug}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          const pct = e.total ? Math.round((e.loaded * 100) / e.total) : 0;
          setUploads(prev => prev.map(u => u.uid === uid ? { ...u, progress: pct } : u));
        }
      });
      setUploads(prev => prev.map(u =>
        u.uid === uid ? { ...u, progress: 100, status: STATUS.done } : u
      ));
    } catch (err) {
      const msg = err.response?.data?.detail || 'Upload failed. Please try again.';
      setUploads(prev => prev.map(u =>
        u.uid === uid ? { ...u, status: STATUS.error, error: msg } : u
      ));
    }
  }, [slug, uploaderName]);

  const onDrop = useCallback(async (acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      const errs = rejectedFiles.map(r => `${r.file.name}: ${r.errors.map(e => e.message).join(', ')}`);
      alert(`Some files were rejected:\n${errs.join('\n')}`);
    }
    for (const file of acceptedFiles) {
      await uploadFile(file);
    }
  }, [uploadFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.heic', '.heif', '.webp', '.bmp'],
      'video/*': ['.mp4', '.mov', '.avi', '.mkv', '.m4v', '.3gp', '.wmv']
    },
    maxSize: 200 * 1024 * 1024,
    multiple: true
  });

  const doneCount = uploads.filter(u => u.status === STATUS.done).length;

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Event Not Found</h2>
          <p className="text-slate-500 text-sm">This event link is invalid or has been removed.</p>
        </div>
      </div>
    );
  }

  if (!event) return null;

  const theme = getTemplate(event.event_type, event.template);

  return (
    <div
      style={{ backgroundColor: theme.bg, minHeight: '100vh', fontFamily: theme.bodyFont }}
      className="flex flex-col"
    >
      {/* Header */}
      <div className="text-center px-5 pt-10 pb-8">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Camera style={{ color: theme.accent, width: '18px', height: '18px' }} />
          <span style={{
            color: theme.accent,
            fontSize: '11px',
            fontWeight: '700',
            letterSpacing: '0.12em',
            textTransform: 'uppercase'
          }}>
            SnapVault Events
          </span>
        </div>

        <h1
          data-testid="event-title"
          style={{
            color: theme.text,
            fontFamily: theme.headerFont,
            fontSize: 'clamp(26px, 7vw, 52px)',
            fontWeight: '700',
            lineHeight: '1.15',
            marginBottom: '10px'
          }}
        >
          {event.title}
        </h1>

        {event.subtitle && (
          <p style={{ color: theme.accent, fontSize: '16px', marginBottom: '8px', fontWeight: '500' }}>
            {event.subtitle}
          </p>
        )}

        {event.welcome_message && (
          <p style={{
            color: theme.text,
            opacity: 0.7,
            fontSize: '15px',
            maxWidth: '460px',
            margin: '0 auto',
            lineHeight: '1.65'
          }}>
            {event.welcome_message}
          </p>
        )}
      </div>

      {/* Upload Zone */}
      <div className="flex-1 px-4 pb-10 max-w-lg mx-auto w-full">
        {/* Name input */}
        <div className="mb-4">
          <input
            data-testid="uploader-name-input"
            type="text"
            placeholder="Your name (optional)"
            value={uploaderName}
            onChange={e => setUploaderName(e.target.value)}
            style={{
              backgroundColor: 'rgba(255,255,255,0.18)',
              border: `1.5px solid ${theme.accent}50`,
              color: theme.text,
              width: '100%',
              padding: '12px 16px',
              borderRadius: '14px',
              fontSize: '15px',
              outline: 'none',
              backdropFilter: 'blur(8px)',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Dropzone */}
        <div
          {...getRootProps()}
          data-testid="upload-dropzone"
          style={{
            border: `2px dashed ${isDragActive ? theme.button : theme.accent + '55'}`,
            backgroundColor: isDragActive ? `${theme.accent}12` : 'rgba(255,255,255,0.12)',
            borderRadius: '22px',
            padding: '36px 24px',
            textAlign: 'center',
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            transition: 'all 0.2s ease',
            transform: isDragActive ? 'scale(1.01)' : 'scale(1)'
          }}
        >
          <input {...getInputProps()} data-testid="file-input" />

          <div style={{
            width: '68px',
            height: '68px',
            backgroundColor: theme.button,
            borderRadius: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: `0 8px 24px ${theme.button}40`
          }}>
            <Upload style={{ color: '#fff', width: '30px', height: '30px' }} />
          </div>

          <p style={{ color: theme.text, fontSize: '19px', fontWeight: '700', marginBottom: '8px' }}>
            {isDragActive ? 'Drop your files here!' : 'Upload Photos & Videos'}
          </p>

          <p style={{ color: theme.text, opacity: 0.55, fontSize: '14px', marginBottom: '18px' }}>
            Tap to select files or drag & drop
          </p>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {['Photos & Videos', 'Max 200MB each', 'Multiple files OK'].map(tag => (
              <span
                key={tag}
                style={{
                  backgroundColor: `${theme.accent}18`,
                  color: theme.accent,
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '600',
                  border: `1px solid ${theme.accent}30`
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          {doneCount > 0 && (
            <div style={{
              marginTop: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              color: '#22c55e',
              fontSize: '14px',
              fontWeight: '700'
            }}>
              <Check style={{ width: '16px', height: '16px' }} />
              {doneCount} file{doneCount !== 1 ? 's' : ''} uploaded successfully
            </div>
          )}
        </div>

        {/* Upload progress list */}
        {uploads.length > 0 && (
          <div className="mt-4 space-y-2.5" data-testid="upload-list">
            {uploads.map(u => (
              <div
                key={u.uid}
                data-testid={`upload-item-${u.status}`}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.18)',
                  borderRadius: '14px',
                  padding: '12px 14px',
                  backdropFilter: 'blur(8px)',
                  border: `1px solid ${u.status === STATUS.error ? '#ef444440' : u.status === STATUS.done ? '#22c55e40' : theme.accent + '25'}`
                }}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    {u.name.match(/\.(mp4|mov|avi|mkv|m4v|3gp|wmv)$/i) ? (
                      <Video style={{ color: theme.accent, width: '15px', height: '15px', flexShrink: 0 }} />
                    ) : (
                      <ImageIcon style={{ color: theme.accent, width: '15px', height: '15px', flexShrink: 0 }} />
                    )}
                    <span style={{
                      color: theme.text,
                      fontSize: '13px',
                      fontWeight: '600',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {u.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span style={{ color: theme.text, opacity: 0.5, fontSize: '11px' }}>{formatSize(u.size)}</span>
                    {u.status === STATUS.done && (
                      <Check style={{ color: '#22c55e', width: '16px', height: '16px' }} />
                    )}
                    {u.status === STATUS.error && (
                      <X style={{ color: '#ef4444', width: '16px', height: '16px' }} />
                    )}
                  </div>
                </div>

                {u.status === STATUS.uploading && (
                  <div>
                    <div style={{
                      height: '5px',
                      backgroundColor: `${theme.accent}25`,
                      borderRadius: '3px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        backgroundColor: theme.button,
                        borderRadius: '3px',
                        width: `${u.progress}%`,
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                    <p style={{ color: theme.text, opacity: 0.5, fontSize: '11px', marginTop: '4px' }}>
                      {u.progress < 100 ? `${u.progress}% uploading...` : 'Processing...'}
                    </p>
                  </div>
                )}

                {u.status === STATUS.error && (
                  <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{u.error}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center py-5 px-6">
        <p style={{ color: theme.text, opacity: 0.3, fontSize: '11px' }}>
          Powered by SnapVault Events · Your uploads are private and secure
        </p>
      </div>
    </div>
  );
}
