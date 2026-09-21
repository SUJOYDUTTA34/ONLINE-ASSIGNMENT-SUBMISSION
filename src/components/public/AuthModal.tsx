import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthForm } from '@/components/ui/premium-auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  onOpenForgotPassword: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onOpenForgotPassword,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="auth-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
        >
          <motion.div
            id="auth-modal-dialog"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-md my-8"
          >
            <AuthForm
              defaultMode={initialMode}
              onClose={onClose}
              onSuccess={onClose}
              onOpenForgotPassword={onOpenForgotPassword}
              showCloseButton={true}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
