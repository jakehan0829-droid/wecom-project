import { loginService } from '../service/auth.service.js';

export async function login(payload: Record<string, unknown>) {
  return loginService(payload);
}
