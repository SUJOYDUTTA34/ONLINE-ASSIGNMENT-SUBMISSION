import React, { useState } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
  Clock,
  Trash2,
  CheckCheck,
  Filter,
} from 'lucide-react';

export const NotificationsView: React.FC = () => {
  const { notifications, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  if (!user) return null;

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    return true;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-rose-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div id="notifications-view" className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Notifications Center
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Stay updated with submission receipts, published grades, and faculty announcements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="notif-mark-all-read-btn"
            onClick={markAllAsRead}
            disabled={notifications.length === 0}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </button>
          <button
            id="notif-clear-all-btn"
            onClick={clearAll}
            disabled={notifications.length === 0}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear all
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
            filter === 'unread'
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }`}
        >
          Unread ({notifications.filter((n) => !n.isRead).length})
        </button>
      </div>

      {/* Notifications List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No notifications to display
            </p>
            <p className="text-xs text-slate-400 mt-1">You are completely up to date!</p>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => markAsRead(item.id)}
              className={`p-4 transition-colors flex items-start gap-3.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                !item.isRead ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
              }`}
            >
              <div className="mt-0.5 shrink-0">{getIcon(item.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4
                    className={`text-xs ${
                      !item.isRead
                        ? 'font-bold text-slate-900 dark:text-white'
                        : 'font-medium text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {item.title}
                  </h4>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3" />
                    {new Date(item.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    • {new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {item.message}
                </p>
              </div>
              {!item.isRead && (
                <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-2" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
