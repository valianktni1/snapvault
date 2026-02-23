import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../utils/api';
import { EVENT_TYPES, TEMPLATES, getTemplate } from '../utils/themes';
import { Heart, Cake, Briefcase, ArrowLeft, ArrowRight, Check } from 'lucide-react';

const ICONS = { Heart, Cake, Briefcase };

export default function CreateEvent({ edit = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(edit ? 3 : 1);
  const [eventType, setEventType] = useState('wedding');
  const [template, setTemplate] = useState('floral');
  const [form, setForm] = useState({ title: '', subtitle: '', welcome_message: '', event_date: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (edit && id) {
      api.get(`/events/${id}`).then(res => {
        const e = res.data;
        setEventType(e.event_type);
        setTemplate(e.template);
        setForm({
          title: e.title,
          subtitle: e.subtitle || '',
          welcome_message: e.welcome_message || '',
          event_date: e.event_date || ''
        });
      }).catch(() => navigate('/dashboard'));
    }
  }, [edit, id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Event title is required'); return; }
    setLoading(true);
    setError('');
    try {
      if (edit && id) {
        await api.put(`/events/${id}`, { ...form, template });
        navigate(`/events/${id}`);
      } else {
        const res = await api.post('/events', { ...form, event_type: eventType, template });
        navigate(`/events/${res.data.id}`);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save event');
      setLoading(false);
    }
  };

  const templates = TEMPLATES[eventType] || [];
  const selectedTemplate = getTemplate(eventType, template);

  const steps = [
    { num: 1, label: 'Event Type' },
    { num: 2, label: 'Template' },
    { num: 3, label: 'Details' }
  ];

  return (
    <Layout title={edit ? 'Edit Event' : 'Create New Event'}>
      <div className="max-w-2xl mx-auto">
        {/* Stepper */}
        {!edit && (
          <div className="flex items-center gap-2 mb-10">
            {steps.map((s, i) => (
              <React.Fragment key={s.num}>
                <div className={`flex items-center gap-2 ${step >= s.num ? 'text-indigo-600' : 'text-slate-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                    step > s.num ? 'bg-indigo-600 border-indigo-600 text-white' :
                    step === s.num ? 'border-indigo-600 text-indigo-600 bg-indigo-50' :
                    'border-slate-200 text-slate-400'
                  }`}>
                    {step > s.num ? <Check className="w-4 h-4" /> : s.num}
                  </div>
                  <span className="text-sm font-medium hidden sm:block">{s.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 rounded-full transition-colors ${step > s.num ? 'bg-indigo-600' : 'bg-slate-200'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Step 1: Event Type */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">What type of event?</h2>
            <p className="text-slate-500 text-sm mb-6">Choose the type to unlock matching templates</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              {EVENT_TYPES.map(type => {
                const Icon = ICONS[type.icon] || Heart;
                const active = eventType === type.key;
                return (
                  <button
                    key={type.key}
                    data-testid={`event-type-${type.key}`}
                    onClick={() => {
                      setEventType(type.key);
                      setTemplate(TEMPLATES[type.key][0].key);
                    }}
                    className={`p-6 rounded-2xl border-2 text-center transition-all hover:-translate-y-0.5 ${
                      active
                        ? 'border-indigo-500 bg-indigo-50 shadow-md'
                        : 'border-slate-200 bg-white hover:border-indigo-200 hover:shadow-sm'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 transition-colors ${
                      active ? 'bg-indigo-600' : 'bg-slate-100'
                    }`}>
                      <Icon className={`w-6 h-6 ${active ? 'text-white' : 'text-slate-500'}`} />
                    </div>
                    <h3 className={`font-bold mb-1 ${active ? 'text-indigo-700' : 'text-slate-900'}`}>{type.label}</h3>
                    <p className="text-xs text-slate-500">{type.description}</p>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end">
              <button
                data-testid="step1-next-btn"
                onClick={() => setStep(2)}
                className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-all"
              >
                Choose Template <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Template */}
        {step === 2 && (
          <div>
            <button onClick={() => setStep(1)} className="flex items-center gap-1 text-slate-400 hover:text-slate-700 text-sm mb-5 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <h2 className="text-xl font-bold text-slate-900 mb-1">Choose a template</h2>
            <p className="text-slate-500 text-sm mb-6">Select the visual theme for your guest upload page</p>
            <div className="grid grid-cols-2 gap-4 mb-8">
              {templates.map(t => (
                <button
                  key={t.key}
                  data-testid={`template-${t.key}`}
                  onClick={() => setTemplate(t.key)}
                  className={`rounded-2xl border-2 overflow-hidden text-left transition-all hover:shadow-md ${
                    template === t.key ? 'border-indigo-500 shadow-md' : 'border-slate-200 hover:border-indigo-200'
                  }`}
                >
                  {/* Color preview */}
                  <div
                    className="h-28 flex items-center justify-center p-4"
                    style={{ backgroundColor: t.bg }}
                  >
                    <div className="text-center">
                      <p style={{ color: t.text, fontFamily: t.headerFont, fontSize: '15px', fontWeight: '700' }}>
                        {t.name}
                      </p>
                      <p style={{ color: t.accent, fontSize: '11px', marginTop: '6px' }}>
                        {t.description}
                      </p>
                      <div
                        style={{
                          display: 'inline-block',
                          marginTop: '8px',
                          backgroundColor: t.button,
                          color: '#fff',
                          padding: '3px 10px',
                          borderRadius: '20px',
                          fontSize: '10px'
                        }}
                      >
                        Upload Here
                      </div>
                    </div>
                  </div>
                  <div className="p-3 bg-white flex items-center justify-between">
                    <p className="font-semibold text-sm text-slate-900">{t.name}</p>
                    {template === t.key && (
                      <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
            <div className="flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-2 px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                data-testid="step2-next-btn"
                onClick={() => setStep(3)}
                disabled={!template}
                className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 transition-all"
              >
                Event Details <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Details */}
        {step === 3 && (
          <div>
            {!edit && (
              <button onClick={() => setStep(2)} className="flex items-center gap-1 text-slate-400 hover:text-slate-700 text-sm mb-5 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            )}
            <h2 className="text-xl font-bold text-slate-900 mb-1">Event details</h2>
            <p className="text-slate-500 text-sm mb-6">Personalise your guest upload page</p>

            {/* Live template preview */}
            {selectedTemplate && (
              <div className="rounded-2xl overflow-hidden mb-6 border border-slate-200 shadow-sm">
                <div
                  className="h-20 flex flex-col items-center justify-center px-6"
                  style={{ backgroundColor: selectedTemplate.bg }}
                >
                  <p style={{
                    color: selectedTemplate.text,
                    fontFamily: selectedTemplate.headerFont,
                    fontSize: '18px',
                    fontWeight: '700',
                    textAlign: 'center'
                  }}>
                    {form.title || `${selectedTemplate.name} — Preview`}
                  </p>
                  {form.subtitle && (
                    <p style={{ color: selectedTemplate.accent, fontSize: '12px', marginTop: '4px' }}>
                      {form.subtitle}
                    </p>
                  )}
                </div>
                <div className="px-4 py-2 bg-slate-50 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedTemplate.accent }} />
                  <span className="text-xs text-slate-500">{selectedTemplate.name}</span>
                </div>
              </div>
            )}

            {error && (
              <div data-testid="create-event-error" className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Event Title <span className="text-red-500 normal-case">*</span>
                </label>
                <input
                  data-testid="event-title-input"
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder={
                    eventType === 'wedding' ? "John & Jane's Wedding" :
                    eventType === 'birthday' ? "Sarah's 30th Birthday" : "Annual Tech Summit 2025"
                  }
                  required
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Subtitle <span className="font-normal text-slate-400 normal-case">(optional)</span>
                </label>
                <input
                  data-testid="event-subtitle-input"
                  type="text"
                  value={form.subtitle}
                  onChange={e => setForm({ ...form, subtitle: e.target.value })}
                  placeholder={eventType === 'wedding' ? "12th July 2025 · Sunset Gardens" : "Join us in celebrating!"}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Event Date <span className="font-normal text-slate-400 normal-case">(optional)</span>
                </label>
                <input
                  data-testid="event-date-input"
                  type="date"
                  value={form.event_date}
                  onChange={e => setForm({ ...form, event_date: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Welcome Message <span className="font-normal text-slate-400 normal-case">(optional)</span>
                </label>
                <textarea
                  data-testid="event-welcome-input"
                  value={form.welcome_message}
                  onChange={e => setForm({ ...form, welcome_message: e.target.value })}
                  placeholder="Share your photos and videos with us! Your memories make our day complete."
                  rows={3}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  data-testid="save-event-btn"
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-700 disabled:opacity-60 transition-all active:scale-[0.98]"
                >
                  {loading ? 'Saving...' : edit ? 'Save Changes' : 'Create Event'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </Layout>
  );
}
