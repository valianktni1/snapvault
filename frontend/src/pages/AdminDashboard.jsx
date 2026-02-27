import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api, { API } from '../utils/api';
import { getTemplate } from '../utils/themes';
import {
  Users, Calendar, Images, Download, Trash2,
  Heart, Cake, Briefcase, Shield, Eye, HardDrive,
  AlertTriangle, Mail, Send, CheckCircle2, Clock, CreditCard
} from 'lucide-react';

const EVENT_ICONS = { wedding: Heart, birthday: Cake, corporate: Briefcase };

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-8 h-8 ${color} rounded-xl flex items-center justify-center`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">{label}</p>
      </div>
      <p data-testid={`admin-stat-${label.toLowerCase().replace(/ /g, '-')}`}
        className="text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('events');
  const [downloading, setDownloading] = useState(null);
  const [deletingEvent, setDeletingEvent] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [approvingEvent, setApprovingEvent] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/events'),
      api.get('/admin/users')
    ]).then(([s, e, u]) => {
      setStats(s.data);
      setEvents(e.data);
      setUsers(u.data);
    }).catch(err => {
      if (err.response?.status === 403) navigate('/dashboard');
    }).finally(() => setLoading(false));
  }, []);

  const handleBulkDownload = async (event) => {
    if (event.media_count === 0) { alert('No media files to download.'); return; }
    setDownloading(event.id);
    try {
      const token = localStorage.getItem('snapvault_token');
      const response = await fetch(`${API}/events/${event.id}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${event.title.replace(/[^a-z0-9]/gi, '_')}_SnapVault.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('Download failed. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Permanently delete this event and ALL its media? This cannot be undone.')) return;
    setDeletingEvent(eventId);
    try {
      await api.delete(`/events/${eventId}`);
      setEvents(prev => prev.filter(e => e.id !== eventId));
      setStats(prev => prev ? { ...prev, total_events: prev.total_events - 1 } : prev);
    } catch {
      alert('Failed to delete event');
    } finally {
      setDeletingEvent(null);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Delete user "${userName}" and ALL their events and media? This cannot be undone.`)) return;
    setDeletingUser(userId);
    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers(prev => prev.filter(u => u.id !== userId));
      // Refresh events and stats
      const [statsRes, eventsRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/events')
      ]);
      setStats(statsRes.data);
      setEvents(eventsRes.data);
    } catch {
      alert('Failed to delete user');
    } finally {
      setDeletingUser(null);
    }
  };

  if (loading) {
    return (
      <Layout title="Admin Panel">
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-slate-200 rounded-2xl animate-pulse" />
            ))}
          </div>
          <div className="h-64 bg-slate-200 rounded-2xl animate-pulse" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Admin Panel">
      {/* Admin Badge */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-1.5 rounded-xl text-sm font-bold shadow-sm">
          <Shield className="w-4 h-4" />
          Full Admin Access
        </div>
        <p className="text-slate-500 text-sm">
          You have full control over all events, media and users on this platform.
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
          <StatCard label="Total Users" value={stats.total_users} icon={Users} color="bg-indigo-500" />
          <StatCard label="Total Events" value={stats.total_events} icon={Calendar} color="bg-violet-500" />
          <StatCard label="Total Media Files" value={stats.total_media} icon={Images} color="bg-emerald-500" />
          <StatCard label="Storage Used" value={`${stats.storage_used_mb} MB`} icon={HardDrive} color="bg-amber-500" />
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-slate-100 rounded-xl p-1 w-fit mb-5 gap-0.5">
        {[
          { key: 'events', label: `All Events (${events.length})` },
          { key: 'users', label: `Users (${users.length})` },
          { key: 'settings', label: 'Settings' }
        ].map(t => (
          <button
            key={t.key}
            data-testid={`admin-tab-${t.key}`}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              tab === t.key ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Events Table */}
      {tab === 'events' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {events.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No events on this platform yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Event</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Organizer</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Type</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Files</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Created</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {events.map(event => {
                    const template = getTemplate(event.event_type, event.template);
                    const Icon = EVENT_ICONS[event.event_type] || Heart;
                    return (
                      <tr key={event.id} data-testid={`admin-event-row-${event.id}`} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-1.5 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: template.accent }} />
                            <div>
                              <p className="font-semibold text-slate-900 text-sm">{event.title}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{template.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell">
                          <p className="text-sm text-slate-700 font-medium">{event.organizer_name}</p>
                          <p className="text-xs text-slate-400">{event.organizer_email}</p>
                        </td>
                        <td className="px-5 py-4 hidden sm:table-cell">
                          <div className="flex items-center gap-1.5">
                            <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: template.accent }} />
                            <span className="text-sm text-slate-600 capitalize">{event.event_type}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`text-sm font-bold ${event.media_count === 0 ? 'text-slate-300' : 'text-slate-900'}`}>
                            {event.media_count}
                          </span>
                        </td>
                        <td className="px-5 py-4 hidden lg:table-cell text-xs text-slate-400">
                          {new Date(event.created_at).toLocaleDateString('en-GB', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              data-testid={`admin-view-gallery-${event.id}`}
                              onClick={() => navigate(`/events/${event.id}/gallery`)}
                              title="View & Moderate Gallery"
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              data-testid={`admin-download-${event.id}`}
                              onClick={() => handleBulkDownload(event)}
                              disabled={downloading === event.id || event.media_count === 0}
                              title="Download All as ZIP"
                              className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors disabled:opacity-30"
                            >
                              {downloading === event.id ? (
                                <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Download className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              data-testid={`admin-delete-event-${event.id}`}
                              onClick={() => handleDeleteEvent(event.id)}
                              disabled={deletingEvent === event.id}
                              title="Delete Event"
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-30"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Users Table */}
      {tab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {users.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No users registered yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">User</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Email</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Events</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Joined</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {users.map(user => (
                    <tr key={user.id} data-testid={`admin-user-row-${user.id}`} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                            user.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {user.name[0]?.toUpperCase()}
                          </div>
                          <p className="font-semibold text-slate-900 text-sm">{user.name}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4 hidden sm:table-cell text-sm text-slate-600">{user.email}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          user.role === 'admin'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {user.role === 'admin' && <Shield className="w-3 h-3" />}
                          {user.role}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm font-bold text-slate-900">{user.events_count}</td>
                      <td className="px-5 py-4 hidden md:table-cell text-xs text-slate-400">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        }) : '-'}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end">
                          {user.role !== 'admin' && (
                            <button
                              data-testid={`admin-delete-user-${user.id}`}
                              onClick={() => handleDeleteUser(user.id, user.name)}
                              disabled={deletingUser === user.id}
                              title="Delete User & All Data"
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl border border-red-200 transition-colors disabled:opacity-40"
                            >
                              <AlertTriangle className="w-3 h-3" />
                              Delete
                            </button>
                          )}
                          {user.role === 'admin' && (
                            <span className="text-xs text-slate-400 px-2">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {tab === 'settings' && (
        <div className="space-y-6">
          <SMTPSettings />
        </div>
      )}

      {/* Account Settings */}
      <AccountSettings />
    </Layout>
  );
}

function SMTPSettings() {
  const [smtp, setSmtp] = useState({ smtp_host: '', smtp_port: 465, smtp_user: '', smtp_password: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    api.get('/admin/settings/smtp')
      .then(res => setSmtp(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      await api.post('/admin/settings/smtp', smtp);
      setMessage({ type: 'success', text: 'SMTP settings saved successfully' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await api.post('/admin/settings/smtp/test');
      setMessage({ type: 'success', text: res.data.message });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'SMTP test failed' });
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <div className="h-40 bg-slate-200 rounded-2xl animate-pulse" />;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
          <Mail className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900">Email (SMTP) Settings</h3>
          <p className="text-xs text-slate-500">Used to send QR cards to organisers after payment</p>
        </div>
      </div>

      {message.text && (
        <div className={`p-3 rounded-xl text-sm mb-4 flex items-center gap-2 ${
          message.type === 'error'
            ? 'bg-red-50 text-red-700 border border-red-200'
            : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">SMTP Host</label>
            <input
              data-testid="smtp-host-input"
              value={smtp.smtp_host}
              onChange={e => setSmtp(s => ({ ...s, smtp_host: e.target.value }))}
              required
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
              placeholder="smtp.hostinger.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">SMTP Port</label>
            <input
              data-testid="smtp-port-input"
              type="number"
              value={smtp.smtp_port}
              onChange={e => setSmtp(s => ({ ...s, smtp_port: parseInt(e.target.value) || 465 }))}
              required
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">SMTP User (Email)</label>
          <input
            data-testid="smtp-user-input"
            type="email"
            value={smtp.smtp_user}
            onChange={e => setSmtp(s => ({ ...s, smtp_user: e.target.value }))}
            required
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
            placeholder="admin@snapvault.uk"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">SMTP Password</label>
          <input
            data-testid="smtp-password-input"
            type="password"
            value={smtp.smtp_password}
            onChange={e => setSmtp(s => ({ ...s, smtp_password: e.target.value }))}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
            placeholder="Enter your SMTP password"
          />
          <p className="text-xs text-slate-400 mt-1">Leave blank to keep existing password unchanged</p>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            data-testid="save-smtp-btn"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-all disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          <button
            type="button"
            data-testid="test-smtp-btn"
            onClick={handleTest}
            disabled={testing}
            className="flex items-center gap-2 px-5 py-2.5 border border-slate-200 rounded-xl font-semibold text-sm text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {testing ? 'Sending...' : 'Send Test Email'}
          </button>
        </div>
      </form>
    </div>
  );
}

function AccountSettings() {
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword
      });
      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPassword(false);
    } catch (err) {
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.detail || 'Failed to change password' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-slate-600 rounded-xl flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-bold text-slate-900">Account Settings</h3>
        </div>
        <button
          data-testid="toggle-change-password"
          onClick={() => setShowPassword(!showPassword)}
          className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
        >
          {showPassword ? 'Cancel' : 'Change Password'}
        </button>
      </div>

      {showPassword && (
        <form onSubmit={handleChangePassword} className="space-y-4">
          {message.text && (
            <div className={`p-3 rounded-xl text-sm ${
              message.type === 'error' 
                ? 'bg-red-50 text-red-700 border border-red-200' 
                : 'bg-green-50 text-green-700 border border-green-200'
            }`}>
              {message.text}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Current Password
            </label>
            <input
              type="password"
              data-testid="current-password-input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              placeholder="Enter current password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              New Password
            </label>
            <input
              type="password"
              data-testid="new-password-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              placeholder="Enter new password (min 6 characters)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              data-testid="confirm-password-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              placeholder="Confirm new password"
            />
          </div>

          <button
            type="submit"
            data-testid="save-password-btn"
            disabled={loading}
            className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-all disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Update Password'}
          </button>
        </form>
      )}
    </div>
  );
}
