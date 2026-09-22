import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { storage } from '../services/storage';
import {
  createSessionToken,
  verifySessionToken,
  revokeSessionToken,
  generatePasswordResetToken,
  verifyAndConsumeResetToken,
  hashPassword,
  storeSessionToken,
  retrieveSessionToken,
  removeSessionToken,
} from '../lib/security';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password?: string, rememberMe?: boolean) => Promise<{ success: boolean; message?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; message?: string }>;
  register: (data: Partial<User> & { password?: string }) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  switchDemoUser: (role: UserRole) => void;
  updateProfile: (updatedData: Partial<User>) => Promise<boolean>;
  resetPasswordRequest: (email: string) => Promise<{ success: boolean; message?: string; debugCode?: string }>;
  confirmResetPassword: (email: string, code: string, newPassword: string) => Promise<{ success: boolean; message?: string }>;
  deleteAccount: () => Promise<{ success: boolean; message?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize and verify cryptographic JWT-like session token with sessionStorage isolation
  useEffect(() => {
    async function restoreSession() {
      storage.init();
      const sessionToken = retrieveSessionToken();
      if (sessionToken) {
        const verifyResult = await verifySessionToken(sessionToken);
        if (verifyResult.valid && verifyResult.payload) {
          const existing = storage.getUserById(verifyResult.payload.userId);
          if (existing && existing.status === 'active') {
            setUser(existing);
            storage.setCurrentUserId(existing.id);
            setIsLoading(false);
            return;
          }
        }
        // Token invalid, expired, or revoked
        removeSessionToken();
        storage.setCurrentUserId('');
      } else {
        // Fallback check on existing session ID
        const storedUserId = storage.getCurrentUserId();
        if (storedUserId) {
          const existing = storage.getUserById(storedUserId);
          if (existing && existing.status === 'active') {
            setUser(existing);
            // Upgrade legacy session to signed token in secure session store
            const token = await createSessionToken(existing);
            storeSessionToken(token);
          } else {
            storage.setCurrentUserId('');
          }
        }
      }
      setIsLoading(false);
    }
    restoreSession();
  }, []);

  const login = async (email: string, password?: string, _rememberMe?: boolean) => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 400));
    let foundUser = storage.getUserByEmail(email);

    if (!foundUser) {
      // SECURITY FIX: Prevent privilege escalation.
      // Any newly auto-provisioned user is strictly assigned 'student' role.
      // Administrator accounts can NEVER be auto-created via email strings.
      const term = email.trim();
      const derivedName = term.includes('@')
        ? term.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        : term.charAt(0).toUpperCase() + term.slice(1);

      const hashedPassword = password ? await hashPassword(password) : await hashPassword('password123');

      foundUser = storage.createUser({
        name: derivedName || 'Student User',
        email: term.includes('@') ? term : `${term}@gmail.com`,
        role: 'student', // Strictly lowest privilege
        phone: '+91 98765 43210',
        departmentName: 'Computer Science',
        status: 'active',
        password: hashedPassword,
      });
    } else {
      // Verify password credential using PBKDF2 with isolated credential vault
      if (password) {
        const isAuthValid = await storage.verifyUserCredentials(foundUser.id, password);
        if (!isAuthValid) {
          setIsLoading(false);
          return { success: false, message: 'Invalid institutional email or password.' };
        }
      }
    }

    if (foundUser.status === 'inactive') {
      setIsLoading(false);
      return { success: false, message: 'Your account has been deactivated by the system administrator.' };
    }

    // Generate signed HMAC session token with 2-hour expiration in secure storage
    const sessionToken = await createSessionToken(foundUser, 2);
    storeSessionToken(sessionToken);

    setUser(foundUser);
    storage.setCurrentUserId(foundUser.id);

    storage.addAuditLog({
      userId: foundUser.id,
      userName: foundUser.name,
      userRole: foundUser.role,
      action: 'USER_LOGIN',
      entityType: 'Auth',
      entityId: foundUser.id,
      details: `Successful authentication via web portal (Cryptographic session issued)`,
      ipAddress: '127.0.0.1',
    });

    setIsLoading(false);
    return { success: true };
  };

  const loginWithGoogle = async () => {
    return { success: false, message: 'Google Sign-In is not configured.' };
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

    // Allow student, faculty, and administrator self-registration with dedicated role selection
    const role: UserRole = data.role === 'admin' ? 'admin' : data.role === 'faculty' ? 'faculty' : 'student';

    if (role === 'admin' && (data as any).adminPasskey !== 'ADMIN-2026') {
      setIsLoading(false);
      return { success: false, message: 'Administrator registration requires a valid Admin Security Passkey (ADMIN-2026).' };
    }

    const depts = storage.getDepartments();
    const dept = depts.find((d) => d.id === data.departmentId) || depts[0];

    const hashedPassword = data.password ? await hashPassword(data.password) : await hashPassword('password123');

    const newUser: User = {
      id: `user-${role.slice(0, 3)}-${Date.now()}`,
      name: data.name,
      email: data.email,
      role,
      avatarUrl:
        role === 'admin'
          ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
          : role === 'faculty'
          ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      status: 'active',
      phone: data.phone || '+91 98765 43210',
      departmentId: dept.id,
      departmentName: dept.name,
      studentIdNumber: role === 'student' ? (data.studentIdNumber || `STU-${Date.now().toString().slice(-4)}`) : undefined,
      employeeIdNumber: role !== 'student' ? (data.employeeIdNumber || (role === 'admin' ? `ADM-${Date.now().toString().slice(-4)}` : `FAC-${Date.now().toString().slice(-4)}`)) : undefined,
      semester: role === 'student' ? (data.semester || 1) : undefined,
      program: data.program || (role === 'student' ? 'Undergraduate Degree' : role === 'admin' ? 'System Administration' : 'Department Faculty'),
      joinedDate: new Date().toISOString().split('T')[0],
      password: hashedPassword,
    };

    storage.saveUser(newUser);

    // Issue signed session token in secure storage
    const token = await createSessionToken(newUser, 2);
    storeSessionToken(token);

    setUser(newUser);
    storage.setCurrentUserId(newUser.id);

    if (role === 'student') {
      const courses = storage.getCourses();
      courses.slice(0, 3).forEach((c) => {
        if (!c.enrolledStudentIds.includes(newUser.id)) {
          c.enrolledStudentIds.push(newUser.id);
          storage.saveCourse(c, undefined, true);
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
    const currentToken = retrieveSessionToken();
    if (currentToken) {
      // SECURITY FIX: Invalidate and blacklist token on logout
      revokeSessionToken(currentToken);
    }
    removeSessionToken();
    if (user) {
      storage.addAuditLog({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'USER_LOGOUT',
        entityType: 'Auth',
        entityId: user.id,
        details: `User session terminated and token revoked`,
        ipAddress: '127.0.0.1',
      });
    }
    setUser(null);
    storage.setCurrentUserId('');
  };

  const switchDemoUser = async (targetRole: UserRole) => {
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
      const token = await createSessionToken(demoUser, 2);
      storeSessionToken(token);

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

  /**
   * SECURITY FIX: Password reset flow
   * - Random, single-use, 15-minute time-limited cryptographic token
   * - Tied strictly to specific user record
   */
  const resetPasswordRequest = async (email: string) => {
    await new Promise((r) => setTimeout(r, 400));
    const target = storage.getUserByEmail(email);

    // Defense against user enumeration: Always return consistent timing and success status
    if (!target) {
      return {
        success: true,
        message: 'If an account with that institutional email exists, a 6-digit verification code has been dispatched. Please check your inbox.',
      };
    }

    const { expiresAt } = generatePasswordResetToken(email, target.id);

    storage.addAuditLog({
      userId: target.id,
      userName: target.name,
      userRole: target.role,
      action: 'PASSWORD_RESET_REQUESTED',
      entityType: 'Auth',
      entityId: target.id,
      details: `Single-use recovery token issued (Expires in 15 minutes at ${new Date(expiresAt || Date.now()).toLocaleTimeString()})`,
      ipAddress: '127.0.0.1',
    });

    return {
      success: true,
      message: 'If an account with that institutional email exists, a 6-digit verification code has been dispatched. Please check your inbox.',
    };
  };

  /**
   * SECURITY FIX: Password reset confirmation
   * - Validates token existence, expiration (<= 15 min), single-use flag, and max 3 attempts
   * - Salts and hashes new password with PBKDF2 (100,000 rounds)
   */
  const confirmResetPassword = async (email: string, code: string, newPassword: string) => {
    await new Promise((r) => setTimeout(r, 400));
    const verifyResult = verifyAndConsumeResetToken(email, code);

    if (!verifyResult.valid || !verifyResult.userId) {
      return { success: false, message: verifyResult.error || 'Invalid or expired verification token.' };
    }

    const target = storage.getUserById(verifyResult.userId);
    if (!target) {
      return { success: false, message: 'User record not found.' };
    }

    // Salt and hash the new password using PBKDF2-SHA256
    const hashedPassword = await hashPassword(newPassword);
    storage.updateUserPassword(target.id, hashedPassword);

    storage.addAuditLog({
      userId: target.id,
      userName: target.name,
      userRole: target.role,
      action: 'PASSWORD_RESET',
      entityType: 'Auth',
      entityId: target.id,
      details: `Password successfully updated with PBKDF2 hash via verified recovery token`,
      ipAddress: '127.0.0.1',
    });

    return { success: true, message: 'Password updated successfully! You can now log in.' };
  };

  const deleteAccount = async (): Promise<{ success: boolean; message?: string }> => {
    if (!user) return { success: false, message: 'No active session.' };
    const userId = user.id;
    const result = storage.purgeUserPersonalData(userId);
    if (result.success) {
      const currentToken = retrieveSessionToken();
      if (currentToken) {
        revokeSessionToken(currentToken);
      }
      removeSessionToken();
      setUser(null);
      storage.setCurrentUserId('');
    }
    return result;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        loginWithGoogle,
        register,
        logout,
        switchDemoUser,
        updateProfile,
        resetPasswordRequest,
        confirmResetPassword,
        deleteAccount,
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
