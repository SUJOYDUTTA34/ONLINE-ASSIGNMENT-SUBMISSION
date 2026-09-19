import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { storage } from '../services/storage';
import { syncUserToSupabase } from '../services/supabaseClient';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password?: string, rememberMe?: boolean) => Promise<{ success: boolean; message?: string }>;
  register: (data: Partial<User> & { password?: string }) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  switchDemoUser: (role: UserRole) => void;
  updateProfile: (updatedData: Partial<User>) => Promise<boolean>;
  resetPasswordRequest: (email: string) => Promise<{ success: boolean; message?: string }>;
  confirmResetPassword: (email: string, newPassword: string) => Promise<{ success: boolean; message?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    storage.init();
    const storedUserId = storage.getCurrentUserId();
    if (storedUserId) {
      const existing = storage.getUserById(storedUserId);
      if (existing && existing.status === 'active') {
        setUser(existing);
      } else {
        setUser(null);
        storage.setCurrentUserId('');
      }
    } else {
      setUser(null);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, _password?: string, _rememberMe?: boolean) => {
    setIsLoading(true);
    // Simulate brief network latency for realism
    await new Promise((r) => setTimeout(r, 400));
    const foundUser = storage.getUserByEmail(email);

    if (!foundUser) {
      setIsLoading(false);
      return { success: false, message: 'Invalid credentials or user not found with this email.' };
    }

    if (foundUser.status === 'inactive') {
      setIsLoading(false);
      return { success: false, message: 'Your account has been deactivated by the system administrator.' };
    }

    setUser(foundUser);
    storage.setCurrentUserId(foundUser.id);

    storage.addAuditLog({
      userId: foundUser.id,
      userName: foundUser.name,
      userRole: foundUser.role,
      action: 'USER_LOGIN',
      entityType: 'Auth',
      entityId: foundUser.id,
      details: `Successful authentication via web portal from IP 127.0.0.1`,
      ipAddress: '127.0.0.1',
    });

    setIsLoading(false);
    return { success: true };
  };

  const register = async (data: Partial<User> & { password?: string }) => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 400));

    if (!data.email || !data.name) {
      setIsLoading(false);
      return { success: false, message: 'Name and email are required.' };
    }

    const existing = storage.getUserByEmail(data.email);
    if (existing) {
      setIsLoading(false);
      return { success: false, message: 'An account with this email address already exists.' };
    }

    // Admins cannot be created via standard self-registration
    const role: UserRole = data.role === 'faculty' ? 'faculty' : 'student';

    const depts = storage.getDepartments();
    const dept = depts.find((d) => d.id === data.departmentId) || depts[0];

    const newUser: User = {
      id: `user-${role.slice(0, 3)}-${Date.now()}`,
      name: data.name,
      email: data.email,
      role,
      avatarUrl:
        role === 'faculty'
          ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      status: 'active',
      phone: data.phone || '+1 (555) 000-0000',
      departmentId: dept.id,
      departmentName: dept.name,
      studentIdNumber: role === 'student' ? (data.studentIdNumber || `STU-${Date.now().toString().slice(-4)}`) : undefined,
      employeeIdNumber: role === 'faculty' ? (data.employeeIdNumber || `FAC-${Date.now().toString().slice(-4)}`) : undefined,
      semester: role === 'student' ? (data.semester || 1) : undefined,
      program: data.program || (role === 'student' ? 'Undergraduate Degree' : 'Department Faculty'),
      joinedDate: new Date().toISOString().split('T')[0],
    };

    storage.saveUser(newUser);
    setUser(newUser);
    storage.setCurrentUserId(newUser.id);

    try {
      await syncUserToSupabase({
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        departmentName: newUser.departmentName,
        phone: newUser.phone,
        status: newUser.status,
        studentIdNumber: newUser.studentIdNumber,
        employeeIdNumber: newUser.employeeIdNumber,
        program: newUser.program,
        joinedDate: newUser.joinedDate,
      });
    } catch (err) {
      console.error('Supabase registration sync error:', err);
    }

    // Auto-enroll new students into general CSE/IT courses so they immediately have active assignments!
    if (role === 'student') {
      const courses = storage.getCourses();
      courses.slice(0, 3).forEach((c) => {
        if (!c.enrolledStudentIds.includes(newUser.id)) {
          c.enrolledStudentIds.push(newUser.id);
          storage.saveCourse(c);
        }
      });
    }

    storage.addAuditLog({
      userId: newUser.id,
      userName: newUser.name,
      userRole: newUser.role,
      action: 'USER_REGISTERED',
      entityType: 'Auth',
      entityId: newUser.id,
      details: `New ${newUser.role} self-registered with identifier ${newUser.studentIdNumber || newUser.employeeIdNumber}`,
      ipAddress: '127.0.0.1',
    });

    setIsLoading(false);
    return { success: true };
  };

  const logout = () => {
    if (user) {
      storage.addAuditLog({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'USER_LOGOUT',
        entityType: 'Auth',
        entityId: user.id,
        details: `User signed out of session`,
        ipAddress: '127.0.0.1',
      });
    }
    setUser(null);
    storage.setCurrentUserId('');
  };

  const switchDemoUser = (targetRole: UserRole) => {
    const users = storage.getUsers();
    let demoUser: User | undefined;

    if (targetRole === 'admin') {
      demoUser = users.find((u) => u.role === 'admin');
    } else if (targetRole === 'faculty') {
      demoUser = users.find((u) => u.role === 'faculty');
    } else {
      demoUser = users.find((u) => u.role === 'student');
    }

    if (demoUser) {
      setUser(demoUser);
      storage.setCurrentUserId(demoUser.id);
      storage.addAuditLog({
        userId: demoUser.id,
        userName: demoUser.name,
        userRole: demoUser.role,
        action: 'DEMO_ROLE_SWITCH',
        entityType: 'Auth',
        entityId: demoUser.id,
        details: `Switched demo context to role: ${targetRole} (${demoUser.name})`,
        ipAddress: '127.0.0.1',
      });
    }
  };

  const updateProfile = async (updatedData: Partial<User>) => {
    if (!user) return false;
    const updated: User = {
      ...user,
      ...updatedData,
    };
    storage.saveUser(updated);
    setUser(updated);

    storage.addAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'PROFILE_UPDATED',
      entityType: 'User',
      entityId: user.id,
      details: `Updated personal account profile information`,
      ipAddress: '127.0.0.1',
    });

    return true;
  };

  const resetPasswordRequest = async (email: string) => {
    await new Promise((r) => setTimeout(r, 400));
    const target = storage.getUserByEmail(email);
    if (!target) {
      return { success: false, message: 'No registered user found with that institutional email address.' };
    }
    return { success: true, message: 'Password recovery verification code sent to ' + email };
  };

  const confirmResetPassword = async (email: string, _newPassword: string) => {
    await new Promise((r) => setTimeout(r, 400));
    const target = storage.getUserByEmail(email);
    if (!target) {
      return { success: false, message: 'User not found.' };
    }
    storage.addAuditLog({
      userId: target.id,
      userName: target.name,
      userRole: target.role,
      action: 'PASSWORD_RESET',
      entityType: 'Auth',
      entityId: target.id,
      details: `Password was successfully updated via self-service verification`,
      ipAddress: '127.0.0.1',
    });
    return { success: true, message: 'Password updated successfully! You can now log in.' };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        switchDemoUser,
        updateProfile,
        resetPasswordRequest,
        confirmResetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
