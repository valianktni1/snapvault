import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../utils/api';
import { getTemplate } from '../utils/themes';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, Edit, Trash2, Images, ExternalLink, Calendar, ArrowLeft, Printer } from 'lucide-react';
import PrintableQRCards from '../components/PrintableQRCards';

export default function EventManage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get(`/events/${id}`)
      .then(res => setEvent(res.data))
      .catch(() => navigate('/dashboard'))
      .finally(() => setLoading(false));
  }, [id]);

  const guestUrl = event ? `${window.location.origin}/event/${event.slug}` : '';

  const copyLink = () => {
    navigator.clipboard.writeText(guestUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this event and all its media? This cannot be undone.')) return;
    try {
      await api.delete(`/events/${id}`);
      navigate('/dashboard');
    } catch {
      alert('Failed to delete event');
    }
  };

  if (loading) {
    return (
      <Layout title="Loading...">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="h-40 bg-slate-200 rounded-2xl animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 h-48 bg-slate-200 rounded-2xl animate-pulse" />
            <div className="h-48 bg-slate-200 rounded-2xl animate-pulse" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!event) return null;
  const template = getTemplate(event.event_type, event.template);

  return (
    <Layout title={event.title}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-700 text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </button>
          <div className="flex gap-2">
            <button
              data-testid="edit-event-btn"
              onClick={() => navigate(`/events/${id}/edit`)}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Edit className="w-4 h-4" /> Edit
            </button>
            <button
              data-testid="delete-event-btn"
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 border border-red-200 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: Event Info */}
          <div className="lg:col-span-2 space-y-5">
            {/* Template Preview */}
            <div className="rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
              <div
                className="h-36 flex flex-col items-center justify-center px-8 text-center"
                style={{ backgroundColor: template.bg }}
              >
                <h2 style={{
                  color: template.text,
                  fontFamily: template.headerFont,
                  fontSize: 'clamp(20px, 4vw, 28px)',
                  fontWeight: '700',
                  lineHeight: '1.2'
                }}>
                  {event.title}
                </h2>
                {event.subtitle && (
                  <p style={{ color: template.accent, fontSize: '14px', marginTop: '6px' }}>
                    {event.subtitle}
                  </p>
                )}
              </div>
              <div className="px-5 py-3 bg-white flex items-center gap-2">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: template.accent }} />
                <span className="text-sm text-slate-600">{template.name}</span>
                <span className="text-slate-300">·</span>
                <span className="text-sm text-slate-500 capitalize">{event.event_type}</span>
              </div>
            </div>

            {/* Details Card */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4">Event Details</h3>
              <div className="space-y-3">
                {event.event_date && (
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="text-slate-500">Date:</span>
                    <span className="text-slate-900 font-medium">
                      {new Date(event.event_date).toLocaleDateString('en-GB', {
                        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                      })}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm">
                  <Images className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-slate-500">Media uploaded:</span>
                  <span data-testid="media-count" className="font-bold text-slate-900">
                    {event.media_count} file{event.media_count !== 1 ? 's' : ''}
                  </span>
                </div>
                {event.welcome_message && (
                  <div className="text-sm pt-1">
                    <p className="text-slate-500 mb-2">Welcome message:</p>
                    <p className="text-slate-800 bg-slate-50 rounded-xl p-3 leading-relaxed">{event.welcome_message}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Gallery CTA */}
            <button
              data-testid="view-gallery-btn"
              onClick={() => navigate(`/events/${id}/gallery`)}
              className="w-full flex items-center justify-between p-4 bg-indigo-50 hover:bg-indigo-100 rounded-2xl border border-indigo-100 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                  <Images className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-indigo-900 text-sm">View Media Gallery</p>
                  <p className="text-xs text-indigo-500 mt-0.5">
                    {event.media_count} files uploaded by guests
                  </p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-indigo-400 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Right: QR Code */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4">Share with Guests</h3>
              <div className="flex justify-center mb-4">
                <div
                  className="p-3 bg-white rounded-2xl border-2 border-slate-100 shadow-sm"
                  data-testid="qr-code"
                >
                  <QRCodeSVG value={guestUrl} size={148} />
                </div>
              </div>
              <p className="text-xs text-slate-400 text-center mb-4 leading-relaxed">
                Guests scan this QR code to upload photos and videos
              </p>

              <div className="bg-slate-50 rounded-xl p-3 mb-3 border border-slate-100">
                <p className="text-xs text-slate-400 mb-1">Guest Upload Link</p>
                <p
                  data-testid="guest-url"
                  className="text-xs text-slate-700 font-mono break-all leading-relaxed"
                >
                  {guestUrl}
                </p>
              </div>

              <button
                data-testid="copy-link-btn"
                onClick={copyLink}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] ${
                  copied
                    ? 'bg-emerald-500 text-white'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {copied ? (
                  <><Check className="w-4 h-4" /> Copied!</>
                ) : (
                  <><Copy className="w-4 h-4" /> Copy Link</>
                )}
              </button>
            </div>

            <a
              data-testid="preview-guest-page-link"
              href={guestUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Preview Guest Page
            </a>
          </div>
        </div>

        {/* Printable QR Cards Section */}
        <div className="mt-8 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <PrintableQRCards
            eventType={event.event_type}
            eventTitle={event.title}
            eventSubtitle={event.subtitle}
            guestUrl={guestUrl}
          />
        </div>
      </div>
    </Layout>
  );
}
