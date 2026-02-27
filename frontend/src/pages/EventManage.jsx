import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../utils/api';
import { getTemplate } from '../utils/themes';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, Edit, Trash2, Images, ExternalLink, Calendar, ArrowLeft, CreditCard, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import PrintableQRCards from '../components/PrintableQRCards';
import { QR_CARD_TEMPLATES } from '../components/PrintableQRCards';

function PaymentGate({ event, guestUrl, onSubmitted }) {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedSize, setSelectedSize] = useState('10x8');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const templates = QR_CARD_TEMPLATES[event.event_type] || QR_CARD_TEMPLATES.wedding;
  const templateList = Object.entries(templates).map(([, val]) => val);

  const handleSubmitPayment = async () => {
    if (!selectedTemplate) {
      setError('Please select a QR card template first');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await api.post(`/events/${event.id}/submit-payment`, {
        qr_template: selectedTemplate.key,
        qr_size: selectedSize,
        guest_url: guestUrl
      });
      onSubmitted(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden mb-6">
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-5 border-b border-amber-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shadow-sm">
            <CreditCard className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-lg" data-testid="payment-required-heading">Payment Required</h3>
            <p className="text-sm text-slate-600">Complete payment to receive your printable QR card by email</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Step 1: Choose Template */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
            <h4 className="font-semibold text-slate-900">Choose your QR card design</h4>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {templateList.map((tmpl) => (
              <button
                key={tmpl.key}
                data-testid={`payment-template-${tmpl.key}`}
                onClick={() => { setSelectedTemplate(tmpl); setError(''); }}
                className={`relative rounded-xl overflow-hidden border-2 transition-all hover:shadow-md ${
                  selectedTemplate?.key === tmpl.key
                    ? 'border-indigo-500 ring-2 ring-indigo-200'
                    : 'border-slate-200 hover:border-indigo-300'
                }`}
              >
                <div className="h-20 flex items-center justify-center" style={{ backgroundColor: tmpl.bgColor }}>
                  <div className="w-8 h-8 rounded bg-white flex items-center justify-center" style={{ border: `2px solid ${tmpl.borderColor}` }}>
                    <div className="w-5 h-5 bg-slate-300 rounded-sm" />
                  </div>
                </div>
                <div className="p-2 bg-white">
                  <p className="font-medium text-xs text-slate-900">{tmpl.name}</p>
                  <p className="text-xs text-slate-400">{tmpl.description}</p>
                </div>
                {selectedTemplate?.key === tmpl.key && (
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
          {selectedTemplate && (
            <div className="flex items-center gap-3 mt-3">
              <span className="text-sm text-slate-600">Size:</span>
              {[{ key: '10x8', label: '10" x 8"' }, { key: '8x6', label: '8" x 6"' }].map(s => (
                <button
                  key={s.key}
                  data-testid={`payment-size-${s.key}`}
                  onClick={() => setSelectedSize(s.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    selectedSize === s.key ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Step 2: Pay via PayPal */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className={`w-6 h-6 text-white rounded-full flex items-center justify-center text-xs font-bold ${selectedTemplate ? 'bg-indigo-600' : 'bg-slate-300'}`}>2</span>
            <h4 className={`font-semibold ${selectedTemplate ? 'text-slate-900' : 'text-slate-400'}`}>Pay £40 via PayPal</h4>
          </div>
          {selectedTemplate ? (
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <p className="text-sm text-slate-700 mb-3">Click below to pay the one-time fee of <strong>£40</strong> via PayPal.</p>
              <a
                href="https://paypal.me/weddingsbymark/40"
                target="_blank"
                rel="noreferrer"
                data-testid="paypal-pay-btn"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#0070ba] text-white rounded-xl font-semibold text-sm hover:bg-[#005ea6] transition-all active:scale-[0.98] shadow-sm"
              >
                <CreditCard className="w-5 h-5" />
                Pay £40 via PayPal
              </a>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-sm text-slate-400">Select a design above first</p>
            </div>
          )}
        </div>

        {/* Step 3: Notify us */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className={`w-6 h-6 text-white rounded-full flex items-center justify-center text-xs font-bold ${selectedTemplate ? 'bg-indigo-600' : 'bg-slate-300'}`}>3</span>
            <h4 className={`font-semibold ${selectedTemplate ? 'text-slate-900' : 'text-slate-400'}`}>Let us know you've paid</h4>
          </div>
          {selectedTemplate ? (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-sm text-slate-700 mb-3">
                After completing your PayPal payment, click below to notify us. We'll verify your payment and email your QR card once approved.
              </p>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-xl text-sm mb-3 border border-red-200">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <button
                data-testid="submit-payment-btn"
                onClick={handleSubmitPayment}
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-xl font-semibold text-sm hover:bg-slate-900 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    I've Sent My Payment
                  </>
                )}
              </button>
              <p className="text-xs text-slate-400 mt-2">Your QR card will be emailed to you once payment is verified by our team.</p>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-sm text-slate-400">Select a design and pay via PayPal first</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AwaitingApproval() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-6 text-center">
      <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Clock className="w-7 h-7 text-amber-600" />
      </div>
      <h3 className="font-bold text-amber-900 text-lg mb-1" data-testid="awaiting-approval-heading">Payment Submitted — Awaiting Approval</h3>
      <p className="text-sm text-amber-700 max-w-md mx-auto">
        Thank you! We're verifying your payment. Once approved, your QR card will be emailed to you automatically. This usually takes a few hours.
      </p>
    </div>
  );
}

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

  const handlePaymentSubmitted = () => {
    api.get(`/events/${id}`).then(res => setEvent(res.data));
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
  const isPaid = event.is_paid;
  const paymentStatus = event.payment_status || 'unpaid';

  return (
    <Layout title={event.title}>
      <div className="max-w-5xl mx-auto">
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

        {/* Event Title Banner */}
        <div className="rounded-2xl overflow-hidden border border-slate-100 shadow-sm mb-6">
          <div
            className="h-28 flex flex-col items-center justify-center px-8 text-center"
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
          <div className="px-5 py-2 bg-white flex items-center gap-2">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: template.accent }} />
            <span className="text-sm text-slate-600">{template.name}</span>
            <span className="text-slate-300">·</span>
            <span className="text-sm text-slate-500 capitalize">{event.event_type}</span>
            <span className="text-slate-300">·</span>
            {isPaid ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> Approved
              </span>
            ) : paymentStatus === 'awaiting_approval' ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                <Clock className="w-3 h-3" /> Awaiting Approval
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                Payment Required
              </span>
            )}
          </div>
        </div>

        {/* PAYMENT FLOW */}
        {isPaid ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm mb-6">
            <PrintableQRCards
              eventType={event.event_type}
              eventTitle={event.title}
              eventSubtitle={event.subtitle}
              guestUrl={guestUrl}
            />
          </div>
        ) : paymentStatus === 'awaiting_approval' ? (
          <AwaitingApproval />
        ) : (
          <PaymentGate
            event={event}
            guestUrl={guestUrl}
            onSubmitted={handlePaymentSubmitted}
          />
        )}

        {/* Event Details & QR Code Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
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
                  <p className="text-xs text-indigo-500 mt-0.5">{event.media_count} files uploaded by guests</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-indigo-400 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="space-y-4">
            {isPaid ? (
              <>
                <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                  <h3 className="font-bold text-slate-900 mb-4">Quick Share</h3>
                  <div className="flex justify-center mb-4">
                    <div className="p-3 bg-white rounded-2xl border-2 border-slate-100 shadow-sm" data-testid="qr-code">
                      <QRCodeSVG value={guestUrl} size={120} />
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 mb-3 border border-slate-100">
                    <p className="text-xs text-slate-400 mb-1">Guest Upload Link</p>
                    <p data-testid="guest-url" className="text-xs text-slate-700 font-mono break-all leading-relaxed">{guestUrl}</p>
                  </div>
                  <button
                    data-testid="copy-link-btn"
                    onClick={copyLink}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] ${
                      copied ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    {copied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Link</>}
                  </button>
                </div>
                <a
                  data-testid="preview-guest-page-link"
                  href={guestUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" /> Preview Guest Page
                </a>
              </>
            ) : (
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 text-center">
                <div className="w-12 h-12 bg-slate-200 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <CreditCard className="w-6 h-6 text-slate-400" />
                </div>
                <p className="font-semibold text-slate-700 text-sm mb-1">QR Code Locked</p>
                <p className="text-xs text-slate-500">
                  {paymentStatus === 'awaiting_approval'
                    ? 'Your payment is being verified. QR code will be available once approved.'
                    : 'Complete payment to unlock your QR code and sharing features'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
