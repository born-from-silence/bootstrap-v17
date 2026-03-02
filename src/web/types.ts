export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  error: string | null;
  loading: boolean;
}

export interface LoginFormProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onToggleMode: () => void;
  loading: boolean;
  error: string | null;
}

export interface RegisterFormProps {
  onRegister: (email: string, password: string) => Promise<void>;
  onToggleMode: () => void;
  loading: boolean;
  error: string | null;
}

export interface DashboardProps {
  user: User;
  onLogout: () => void;
}
