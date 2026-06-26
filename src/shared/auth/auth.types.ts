export interface AuthUser {
  id: string;
  email: string | null;
}

export type AuthStatus =
  | 'INITIALIZING'
  | 'AUTHENTICATED'
  | 'OFFLINE_AUTHENTICATED'
  | 'UNAUTHENTICATED'
  | 'SESSION_EXPIRED'
  | 'ERROR';

export interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  canUseLocalData: boolean;
  canSynchronize: boolean;
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface SignOutResult {
  success: true;
}
