import type { AuthResult, AuthService } from "@/lib/auth/auth-service";

const AUTH_DELAY_MS = 700;

export class MockAuthService implements AuthService {
  async signInWithPassword(email: string, password: string): Promise<AuthResult> {
    await new Promise((resolve) => setTimeout(resolve, AUTH_DELAY_MS));

    if (!email || !password) {
      return {
        success: false,
        message: "이메일과 비밀번호를 모두 입력해 주세요.",
      };
    }

    return {
      success: true,
      message: "로그인에 성공했습니다. 오늘의 훈련을 시작해볼까요?",
    };
  }
}
