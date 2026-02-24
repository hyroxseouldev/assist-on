export type AuthResult = {
  success: boolean;
  message: string;
};

export interface AuthService {
  signInWithPassword(email: string, password: string): Promise<AuthResult>;
}
