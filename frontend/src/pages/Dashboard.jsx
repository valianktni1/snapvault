import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import api from '../utils/api';
import { getTemplate } from '../utils/themes';
import { Plus, Heart, Cake, Briefcase, Images, Calendar, Trash2 } from 'lucide-react';

const EVENT_ICONS = { wedding: Heart, birthday: Cake, corporate: Briefcase };

export default function Dashboard() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { fetchEvents(); }, []);

  const fetchEvents = async () => {
    try {
      const res = await api.get('/events');
      setEvents(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (eventId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this event and all its uploaded media? This cannot be undone.')) return;
    setDeleting(eventId);
    try {
      await api.delete(`/events/${eventId}`);
      setEvents(prev => prev.filter(ev => ev.id !== eventId));
    } catch {
      alert('Failed to delete event');
    } finally {
      setDeleting(null);
    }
  };

  const totalMedia = events.reduce((s, e) => s + e.media_count, 0);
  const thisMonth = events.filter(e => {
    const d = new Date(e.created_at);
    const n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  }).length;

  return (
    <Layout title="Dashboard">
      {/* Welcome row */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-7">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Welcome back, {user?.name?.split(' ')[0]}!
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">Manage your events and media collections</p>
        </div>
        <button
          data-testid="create-event-btn"
          onClick={() => navigate('/events/create')}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Event
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-7">
        {[
          { label: 'Total Events', value: events.length, icon: '📋', color: 'bg-indigo-50 text-indigo-600' },
          { label: 'Total Uploads', value: totalMedia, icon: '📸', color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Events This Month', value: thisMonth, icon: '📅', color: 'bg-violet-50 text-violet-600' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-2">{stat.label}</p>
            <p
              data-testid={`stat-${stat.label.toLowerCase().replace(/ /g, '-')}`}
              className="text-3xl font-bold text-slate-900"
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Events grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
              <div className="h-2 bg-slate-200 rounded-full mb-4 w-full" />
              <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-slate-200 rounded w-1/2 mb-5" />
              <div className="h-8 bg-slate-200 rounded-xl" />
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-indigo-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">No events yet</h3>
          <p className="text-slate-500 text-sm mb-6 max-w-xs mx-auto">
            Create your first event to start collecting photos and videos from your guests.
          </p>
          <button
            data-testid="create-first-event-btn"
            onClick={() => navigate('/events/create')}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-all"
          >
            Create First Event
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map(event => {
            const Icon = EVENT_ICONS[event.event_type] || Heart;
            const template = getTemplate(event.event_type, event.template);
            return (
              <div
                key={event.id}
                data-testid={`event-card-${event.id}`}
                className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition-all cursor-pointer group"
                onClick={() => navigate(`/events/${event.id}`)}
              >
                {/* Color bar */}
                <div
                  className="w-full h-1.5 rounded-full mb-4"
                  style={{ background: `linear-gradient(90deg, ${template.accent}, ${template.button})` }}
                />
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: template.accent + '20' }}
                    >
                      <Icon className="w-4 h-4" style={{ color: template.accent }} />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      {event.event_type}
                    </span>
                  </div>
                  <button
                    data-testid={`delete-event-${event.id}`}
                    onClick={(e) => handleDelete(event.id, e)}
                    disabled={deleting === event.id}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="font-bold text-slate-900 mb-0.5 truncate">{event.title}</h3>
                <p className="text-xs text-slate-400 mb-3">{template.name}</p>

                <div className="flex items-center gap-4 text-xs text-slate-400 mb-4">
                  {event.event_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(event.event_date).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Images className="w-3 h-3" />
                    {event.media_count} file{event.media_count !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    data-testid={`manage-event-${event.id}`}
                    onClick={(e) => { e.stopPropagation(); navigate(`/events/${event.id}`); }}
                    className="flex-1 py-2 text-xs font-semibold bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    Manage
                  </button>
                  <button
                    data-testid={`gallery-event-${event.id}`}
                    onClick={(e) => { e.stopPropagation(); navigate(`/events/${event.id}/gallery`); }}
                    className="flex-1 py-2 text-xs font-semibold bg-indigo-50 text-indigo-700 rounded-xl hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1"
                  >
                    <Images className="w-3 h-3" />
                    Gallery
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
