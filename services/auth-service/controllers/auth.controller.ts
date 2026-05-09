import * as authService from "../services/auth.service.js";

export const register = async (user: {
  email: string;
  password: string;
}): Promise<[number, string]> => {
  try {
    const result = await authService.register(user);
    return [result[0], result[1]];
  } catch (e) {
    return [500, String(e)];
  }
};

export const login = async (user: {
  email: string;
  password: string;
}): Promise<[number, string]> => {
  try {
    const result = await authService.login(user);
    return [result[0], result[1]];
  } catch (e) {
    return [500, String(e)];
  }
};
