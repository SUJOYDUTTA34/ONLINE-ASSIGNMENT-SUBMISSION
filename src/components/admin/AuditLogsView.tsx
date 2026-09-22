import React, { useState } from 'react';
import { storage } from '../../services/storage';
import { AuditLog } from '../../types';
import { useNotifications } from '../../context/NotificationContext';
import {
  ScrollText,
  Search,
  Filter,
  Download,
  ShieldCheck,
  Calendar,
  User,
  Clock,
  CheckCircle2,
} from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const { showToast } = useNotifications();
  const [logs] = useState<AuditLog[]>(() => storage.getAuditLogs());
  const [deletedUsers, setDeletedUsers] = useState<any[]>(() => storage.getDeletedUsers());

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [selectedRole, setSelectedRole] = useState('ALL');

  const handleRestoreUser = (userId: string, userName: string) => {
    try {
      const res = storage.restoreDeletedUser(userId);
      if (res.success) {
        setDeletedUsers(storage.getDeletedUsers());
        showToast({
          type: 'success',
          title: 'User Restored (Undo Successful)',
          message: `${userName} has been successfully restored to active institutional directory.`,
        });
      } else {
        showToast({
          type: 'error',
          title: 'Restoration Failed',
          message: res.message,
        });
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Error',
        message: err.message || 'Could not restore user.',
      });
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (selectedAction !== 'ALL' && log.action !== selectedAction) return false;
    if (selectedRole !== 'ALL' && log.userRole !== selectedRole) return false;

    return true;
  });

  const handleExportCsv = () => {
    const headers = ['ID', 'Timestamp', 'User', 'Role', 'Action', 'TargetEntity', 'Details', 'IPAddress', 'Status'];
    const rows = filteredLogs.map((l) => [
      l.id,
      l.timestamp,
      `"${l.userName}"`,
      l.userRole,
      l.action,
      l.targetEntity,
      `"${l.details.replace(/"/g, '""')}"`,
      l.ipAddress,
      l.status,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Security_Audit_Trail_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    const jsonContent = JSON.stringify(filteredLogs, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Audit_Log_Archive_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="admin-audit-logs-view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Security & Compliance Audit Trail
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Immutable log of all user authentications, submissions, grade entries, and administrative alterations
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportJson}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-xs"
          >
            Export JSON
          </button>
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Recently Deleted Users Undo / Restore Archive Panel */}
      {deletedUsers.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <h3 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                Recently De-provisioned User Accounts ({deletedUsers.length}) — Undo / Restore Available
              </h3>
            </div>
            <span className="text-[10px] text-amber-700 dark:text-amber-400">
              Restoring revokes deletion and restores institutional credentials instantly
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {deletedUsers.map((item) => (
              <div
                key={item.user.id}
                className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-2 shadow-xs"
              >
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{item.user.name}</p>
                  <p className="text-[10px] text-slate-500">{item.user.email} • <span className="uppercase text-purple-600 font-bold">{item.user.role}</span></p>
                  <p className="text-[9px] text-slate-400 mt-0.5">Deleted by: {item.deletedBy}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRestoreUser(item.user.id, item.user.name)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold shrink-0 shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  ↺ Undo
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search audit trail by user, event details, or action..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="ALL">All Actions</option>
            <option value="SUBMISSION_UPLOADED">Submission Uploaded</option>
            <option value="GRADE_RECORDED">Grade Recorded</option>
            <option value="ASSIGNMENT_CREATED">Assignment Created</option>
            <option value="ASSIGNMENT_UPDATED">Assignment Updated</option>
            <option value="USER_LOGIN">User Login</option>
            <option value="USER_CREATED">User Created</option>
            <option value="USER_UPDATED">User Updated</option>
            <option value="COURSE_CREATED">Course Created</option>
          </select>

          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="ALL">All Roles</option>
            <option value="student">Student</option>
            <option value="faculty">Faculty</option>
            <option value="admin">Administrator</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Event Timestamp</th>
                <th className="py-3.5 px-4">Principal User</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Action Code</th>
                <th className="py-3.5 px-4">Target Entity</th>
                <th className="py-3.5 px-4">Event Context & Details</th>
                <th className="py-3.5 px-4">IP Address</th>
                <th className="py-3.5 px-4 text-right">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No audit records match your query.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors font-sans"
                  >
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString([], {
                        year: 'numeric',
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                      {log.userName}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          log.userRole === 'admin'
                            ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                            : log.userRole === 'faculty'
                            ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                            : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        {log.userRole}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400 text-[11px]">
                      {log.action}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 uppercase font-mono text-[10px]">
                      {log.targetEntity}
                    </td>

                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 max-w-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate">{log.details}</span>
                        {log.action === 'USER_DELETED' && deletedUsers.some((d) => d.user.id === log.entityId) && (
                          <button
                            type="button"
                            onClick={() => {
                              const target = deletedUsers.find((d) => d.user.id === log.entityId);
                              if (target) handleRestoreUser(target.user.id, target.user.name);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold shrink-0 flex items-center gap-1 shadow-xs cursor-pointer"
                          >
                            ↺ Undo Deletion
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[10px] text-slate-400">
                      {log.ipAddress}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                        SUCCESS
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
