// frontend/src/contexts/AuthContext.jsx
// Authentication context provider for MedPlat

import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

/**
 * AuthProvider - Provides authentication context to the app
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 * @param {Object} props.user - User object from Firebase Auth (optional)
 */
export function AuthProvider({ children, user: initialUser = null }) {
  const [user, setUser] = useState(initialUser);
  const [loading, setLoading] = useState(!initialUser);

  // TODO: Integrate with Firebase Auth
  // For now, use demo user or localStorage
  useEffect(() => {
    if (initialUser) {
      setUser(initialUser);
      setLoading(false);
      return;
    }

    // Check localStorage for saved user
    const savedUser = localStorage.getItem('medplat_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.warn('Failed to parse saved user:', e);
      }
    } else {
      // Default demo user
      setUser({ uid: 'demo_user_001', email: 'demo@medplat.com' });
    }
    setLoading(false);
  }, [initialUser]);

  const value = {
    user,
    uid: user?.uid || null,
    isAuthenticated: !!user,
    loading,
    setUser: (newUser) => {
      setUser(newUser);
      if (newUser) {
        localStorage.setItem('medplat_user', JSON.stringify(newUser));
      } else {
        localStorage.removeItem('medplat_user');
      }
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * useAuth - Hook to access authentication context
 * @returns {Object} Auth context value
 * @throws {Error} If used outside AuthProvider
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

