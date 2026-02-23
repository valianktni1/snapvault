import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api, { BACKEND_URL, API } from '../utils/api';
import { Trash2, Download, Image as ImageIcon, Video, ArrowLeft, X, Music } from 'lucide-react';

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function OrganizerGallery() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [media, setMedia] = useState([]);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [deleting, setDeleting] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/events/${id}`),
      api.get(`/events/${id}/media`)
    ]).then(([evRes, mediaRes]) => {
      setEvent(evRes.data);
      setMedia(mediaRes.data);
    }).catch(() => navigate('/dashboard'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async (mediaId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this file permanently?')) return;
    setDeleting(mediaId);
    try {
      await api.delete(`/media/${mediaId}`);
      setMedia(prev => prev.filter(m => m.id !== mediaId));
      if (lightbox?.id === mediaId) setLightbox(null);
    } catch {
      alert('Failed to delete');
    } finally {
      setDeleting(null);
    }
  };

  const imageCount = media.filter(m => m.file_type === 'image').length;
  const videoCount = media.filter(m => m.file_type === 'video').length;
  const audioCount = media.filter(m => m.file_type === 'audio').length;

  const filtered = media.filter(m => {
    if (filter === 'images') return m.file_type === 'image';
    if (filter === 'videos') return m.file_type === 'video';
    if (filter === 'audio') return m.file_type === 'audio';
    return true;
  });

  const handleBulkDownload = async () => {
    if (media.length === 0) { alert('No files to download.'); return; }
    setDownloading(true);
    try {
      const token = localStorage.getItem('snapvault_token');
      const response = await fetch(`${API}/events/${id}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${event?.title?.replace(/[^a-z0-9]/gi, '_') || 'event'}_SnapVault.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('Download failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Layout title={event ? `${event.title} — Gallery` : 'Gallery'}>
      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
            onClick={() => setLightbox(null)}
            data-testid="lightbox-close"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="max-w-4xl max-h-[85vh] relative" onClick={e => e.stopPropagation()}>
            {lightbox.file_type === 'image' ? (
              <img
                src={`${BACKEND_URL}${lightbox.url}`}
                alt={lightbox.original_name}
                className="max-w-full max-h-[80vh] rounded-xl object-contain"
              />
            ) : lightbox.file_type === 'audio' ? (
              <div className="bg-gradient-to-br from-violet-900 to-indigo-900 rounded-2xl p-12 flex flex-col items-center gap-6 min-w-[300px]">
                <div className="w-20 h-20 bg-indigo-500 rounded-full flex items-center justify-center shadow-2xl">
                  <Music className="w-10 h-10 text-white" />
                </div>
                <p className="text-white font-semibold text-center">{lightbox.original_name}</p>
                <audio
                  src={`${BACKEND_URL}${lightbox.url}`}
                  controls
                  autoPlay
                  className="w-full"
                />
              </div>
            ) : (
              <video
                src={`${BACKEND_URL}${lightbox.url}`}
                controls
                autoPlay
                className="max-w-full max-h-[80vh] rounded-xl"
              />
            )}
            <div className="mt-3 flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium">{lightbox.original_name}</p>
                <p className="text-white/50 text-xs mt-0.5">
                  By {lightbox.uploader_name} · {formatSize(lightbox.file_size)} · {formatDate(lightbox.created_at)}
                </p>
              </div>
              <div className="flex gap-2">
                <a
                  href={`${BACKEND_URL}${lightbox.url}`}
                  download={lightbox.original_name}
                  target="_blank"
                  rel="noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white text-xs font-medium transition-colors"
                >
                  <Download className="w-4 h-4" /> Download
                </a>
                <button
                  onClick={(e) => handleDelete(lightbox.id, e)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/80 hover:bg-red-600 rounded-lg text-white text-xs font-medium transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/events/${id}`)}
              data-testid="back-to-event-btn"
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{event?.title}</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {media.length} file{media.length !== 1 ? 's' : ''} · {imageCount} photos · {videoCount} videos{audioCount > 0 ? ` · ${audioCount} voice` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Bulk Download */}
            <button
              data-testid="bulk-download-btn"
              onClick={handleBulkDownload}
              disabled={downloading || media.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40 transition-all active:scale-[0.98]"
            >
              {downloading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {downloading ? 'Creating ZIP...' : 'Download All (ZIP)'}
            </button>

            {/* Filter Tabs */}
            <div className="flex bg-slate-100 rounded-xl p-1 gap-0.5">
              {[
                { key: 'all', label: `All (${media.length})` },
                { key: 'images', label: `Photos (${imageCount})` },
                { key: 'videos', label: `Videos (${videoCount})` },
                ...(audioCount > 0 ? [{ key: 'audio', label: `Voice (${audioCount})` }] : [])
              ].map(f => (
                <button
                  key={f.key}
                  data-testid={`filter-${f.key}`}
                  onClick={() => setFilter(f.key)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    filter === f.key
                      ? 'bg-white shadow-sm text-slate-900'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-square bg-slate-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ImageIcon className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              {media.length === 0 ? 'No uploads yet' : 'No files match this filter'}
            </h3>
            <p className="text-slate-500 text-sm">
              {media.length === 0
                ? 'Share your event link and guests will start uploading.'
                : 'Try switching to a different filter.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filtered.map(m => (
              <div
                key={m.id}
                data-testid={`media-item-${m.id}`}
                className="group relative aspect-square bg-slate-100 rounded-xl overflow-hidden cursor-pointer"
                onClick={() => setLightbox(m)}
              >
                {m.file_type === 'image' ? (
                  <img
                    src={`${BACKEND_URL}${m.url}`}
                    alt={m.original_name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : m.file_type === 'audio' ? (
                  <div className="w-full h-full bg-gradient-to-br from-violet-100 to-indigo-100 flex flex-col items-center justify-center p-3 gap-2">
                    <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center shadow-lg">
                      <Music className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-xs text-indigo-700 font-semibold text-center truncate w-full px-1">{m.original_name}</p>
                    <p className="text-xs text-indigo-400">{m.uploader_name}</p>
                  </div>
                ) : (
                  <div className="w-full h-full relative bg-slate-800">
                    <video
                      src={`${BACKEND_URL}${m.url}`}
                      className="w-full h-full object-cover opacity-80"
                      preload="metadata"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-10 h-10 bg-white/80 rounded-full flex items-center justify-center shadow-lg">
                        <Video className="w-5 h-5 text-slate-700" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="absolute bottom-0 left-0 right-0 p-2">
                    <p className="text-white text-xs font-medium truncate">{m.uploader_name}</p>
                    <p className="text-white/60 text-xs">{formatSize(m.file_size)}</p>
                    <div className="flex gap-1 mt-1.5">
                      <a
                        data-testid={`download-${m.id}`}
                        href={`${BACKEND_URL}${m.url}`}
                        download={m.original_name}
                        target="_blank"
                        rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="flex-1 flex items-center justify-center py-1 bg-white/20 hover:bg-white/30 rounded-lg text-white text-xs transition-colors"
                      >
                        <Download className="w-3 h-3" />
                      </a>
                      <button
                        data-testid={`delete-media-${m.id}`}
                        onClick={(e) => handleDelete(m.id, e)}
                        disabled={deleting === m.id}
                        className="flex-1 flex items-center justify-center py-1 bg-red-500/80 hover:bg-red-600 rounded-lg text-white text-xs transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
