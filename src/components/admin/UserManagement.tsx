import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { storage } from '../../services/storage';
import { User, UserRole } from '../../types';
import { UserAvatar } from '../common/UserAvatar';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Download,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  X,
  AlertCircle,
  Building2,
  GraduationCap,
  ShieldCheck,
  Phone,
  Mail,
  Lock,
} from 'lucide-react';

interface UserManagementProps {
  isAddModalOpen?: boolean;
  onCloseAddModal?: () => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({
  isAddModalOpen = false,
  onCloseAddModal,
}) => {
  const { user: currentUser } = useAuth();
  const { showToast } = useNotifications();

  const [users, setUsers] = useState<User[]>(() => storage.getUsers(currentUser));
  const departments = storage.getDepartments();

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Modal State
  const [modalOpen, setModalOpen] = useState(isAddModalOpen);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [departmentId, setDepartmentId] = useState(departments[0]?.id || '');
  const [idNumber, setIdNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [semester, setSemester] = useState(1);
  const [program, setProgram] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const [formError, setFormError] = useState<string | null>(null);

  // Live real-time sync with Cloudflare D1 on mount
  React.useEffect(() => {
    fetch('/api/users')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.users)) {
          storage.syncUsersFromD1(data.users);
          setUsers(storage.getUsers(currentUser));
        }
      })
      .catch((e) => console.warn('D1 live users fetch notice:', e));
  }, []);

  // React to prop change
  React.useEffect(() => {
    if (isAddModalOpen) {
      resetForm();
      setModalOpen(true);
    }
  }, [isAddModalOpen]);

  const resetForm = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setRole('student');
    setDepartmentId(departments[0]?.id || '');
    setIdNumber('');
    setPhone('');
    setSemester(1);
    setProgram('');
    setPassword('');
    setStatus('active');
    setFormError(null);
  };

  const handleOpenEdit = (target: User) => {
    setEditingUser(target);
    setName(target.name);
    setEmail(target.email);
    setRole(target.role);
    setDepartmentId(target.departmentId);
    setIdNumber(target.studentIdNumber || target.employeeIdNumber || '');
    setPhone(target.phone || '');
    setSemester(target.semester || 1);
    setProgram(target.program || '');
    setPassword('');
    setStatus(target.status);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim() || !email.trim()) {
      setFormError('Name and email are required.');
      return;
    }

    try {
      const selectedDeptObj = departments.find((d) => d.id === departmentId);
      const userData: any = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        departmentId,
        departmentName: selectedDeptObj?.name || 'Academic Department',
        phone: phone.trim(),
        status,
        semester: role === 'student' ? Number(semester) : undefined,
        program: program.trim() || (role === 'student' ? 'Computer Science' : 'Faculty'),
        studentIdNumber: role === 'student' ? (idNumber || `STU-${Date.now().toString().slice(-4)}`) : undefined,
        employeeIdNumber: role !== 'student' ? (idNumber || `FAC-${Date.now().toString().slice(-4)}`) : undefined,
      };

      if (password.trim()) {
        userData.password = password.trim();
      }

      let updatedUser: User;
      if (editingUser) {
        updatedUser = storage.updateUser(editingUser.id, userData, currentUser || undefined);
        setUsers(users.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
        showToast({
          type: 'success',
          title: 'User Updated',
          message: `Profile for ${updatedUser.name} has been updated in Cloudflare D1 & system.`,
        });
      } else {
        updatedUser = storage.createUser(
          {
            ...userData,
            password: password.trim() || 'password123',
            avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80`,
          },
          currentUser || undefined
        );
        setUsers([...users, updatedUser]);
        showToast({
          type: 'success',
          title: 'User Created & Synced to D1',
          message: `New account provisioned for ${updatedUser.name} (${updatedUser.role}) in Cloudflare D1.`,
        });
      }

      setModalOpen(false);
      if (onCloseAddModal) onCloseAddModal();
      resetForm();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save user.');
    }
  };

  const handleDeleteUser = async (id: string, userName: string) => {
    try {
      // 1. Immediately delete from Cloudflare D1 database
      await fetch(`/api/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
      // 2. Remove from local store and sync
      storage.deleteUser(id, currentUser || undefined);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      showToast({
        type: 'success',
        title: 'Student Removed from D1 & System',
        message: `Account for ${userName} (${id}) has been removed from Cloudflare D1 and institutional records.`,
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Delete Failed',
        message: err?.message || 'Failed to remove user',
      });
    }
  };

  const handleToggleStatus = (target: User) => {
    const newStatus = target.status === 'active' ? 'inactive' : 'active';
    const updated = storage.updateUser(target.id, { status: newStatus }, currentUser || undefined);
    setUsers(users.map((u) => (u.id === updated.id ? updated : u)));
    showToast({
      type: 'info',
      title: 'Status Updated',
      message: `${target.name} marked as ${newStatus}.`,
    });
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.studentIdNumber && u.studentIdNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.employeeIdNumber && u.employeeIdNumber.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (selectedRole !== 'ALL' && u.role !== selectedRole) return false;
    if (selectedDept !== 'ALL' && u.departmentId !== selectedDept) return false;
    if (selectedStatus !== 'ALL' && u.status !== selectedStatus) return false;

    return true;
  });

  const handleExportCsv = () => {
    const headers = ['ID', 'Name', 'Email', 'Role', 'Department', 'StudentID', 'EmployeeID', 'Status', 'RegisteredAt'];
    const rows = filteredUsers.map((u) => [
      u.id,
      `"${u.name}"`,
      u.email,
      u.role,
      `"${u.departmentName}"`,
      u.studentIdNumber || '',
      u.employeeIdNumber || '',
      u.status,
      u.createdAt,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Institutional_Users_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="admin-users-view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Institutional User Directory</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage student enrollments, faculty profiles, and system administrative permissions
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            id="open-add-user-modal-btn"
            onClick={() => {
              resetForm();
              setModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Add New User
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, institutional email, student ID, or employee ID..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="ALL">All Roles</option>
            <option value="student">Students</option>
            <option value="faculty">Faculty Members</option>
            <option value="admin">Administrators</option>
          </select>

          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.code})
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="active">Active Accounts</option>
            <option value="inactive">Inactive / Suspended</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Institutional ID</th>
                <th className="py-3.5 px-4">Department & Program</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    No institutional users found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          src={u.avatarUrl}
                          name={u.name}
                          size="md"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-white truncate">
                            {u.name}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          u.role === 'admin'
                            ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                            : u.role === 'faculty'
                            ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                            : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {u.studentIdNumber || u.employeeIdNumber || '—'}
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-medium text-slate-800 dark:text-slate-200">
                        {u.departmentName}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {u.program || (u.semester ? `Semester ${u.semester}` : '')}
                      </p>
                    </td>

                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                          u.status === 'active'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-rose-100 hover:text-rose-700'
                            : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 hover:bg-emerald-100 hover:text-emerald-700'
                        }`}
                        title="Click to toggle active status"
                      >
                        {u.status.toUpperCase()}
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
                          title="Edit User"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id, u.name)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500"
                          title="Delete User"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit User Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-xs my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {editingUser ? 'Edit User Profile' : 'Provision Institutional User'}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Administrator User Management Suite
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setModalOpen(false);
                  if (onCloseAddModal) onCloseAddModal();
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveUser} className="space-y-3.5 max-h-[70vh] overflow-y-auto pr-1">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Institutional Role *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['student', 'faculty', 'admin'] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold capitalize transition-all ${
                        role === r
                          ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 ring-2 ring-purple-600/20'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Maya Lin"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ID Number *
                  </label>
                  <input
                    type="text"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    placeholder={role === 'student' ? 'CS-2024-088' : 'FAC-302'}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@gmail.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number (India)
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Department *
                  </label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Account Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive / Suspended</option>
                  </select>
                </div>
              </div>

              {role === 'student' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Current Semester
                    </label>
                    <select
                      value={semester}
                      onChange={(e) => setSemester(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                        <option key={s} value={s}>
                          Semester {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Degree Program
                    </label>
                    <input
                      type="text"
                      value={program}
                      onChange={(e) => setProgram(e.target.value)}
                      placeholder="e.g. B.S. Software Engineering"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Specialization / Research Field
                  </label>
                  <input
                    type="text"
                    value={program}
                    onChange={(e) => setProgram(e.target.value)}
                    placeholder="e.g. Artificial Intelligence / Networks"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {editingUser ? 'Reset Password (leave empty to keep current)' : 'Initial Password'}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={editingUser ? '••••••••' : 'Default: password123'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    if (onCloseAddModal) onCloseAddModal();
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-xs flex items-center gap-2"
                >
                  {editingUser ? 'Update Profile' : 'Create User'}
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
