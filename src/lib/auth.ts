import type { RolUsuario, UsuarioApi, User } from '../types';

const TOKEN_KEY = 'imaq_token';
const REFRESH_TOKEN_KEY = 'imaq_refresh_token';
const USER_KEY = 'imaq_user';

/* ───────────────────────── TOKEN STORAGE ───────────────────────── */

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function clearRefreshToken(): void {
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

interface JwtPayload {
  sub?: string;
  exp?: number;
  [key: string]: unknown;
}

export function decodeJwt(token: string): JwtPayload | null {
  try {
    const payloadBase64 = token.split('.')[1];
    const normalized = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(escape(atob(normalized))));
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeJwt(token);
  if (!payload?.exp) return false;
  return Date.now() >= payload.exp * 1000;
}

/* ───────────────────────── CURRENT USER ───────────────────────── */

export function getCurrentUser(): User | null {
  const token = getToken();
  if (!token) {
    return null;
  }
  const saved = localStorage.getItem(USER_KEY);
  return saved ? (JSON.parse(saved) as User) : null;
}

export function setCurrentUser(user: User | null): void {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}

/* ───────────────────────── SESSION HELPERS ───────────────────────── */

export function saveSession(accessToken: string, user: User, refreshToken?: string | null): void {
  setToken(accessToken);
  if (refreshToken) {
    setRefreshToken(refreshToken);
  }
  setCurrentUser(user);
}

export function logout(): void {
  clearToken();
  clearRefreshToken();
  setCurrentUser(null);
}

/* ───────────────────────── ROLE MAPPING ─────────────────────────
   UI role ('owner' | 'operator' | 'renter') <-> backend rol
   ('propietario' | 'operador' | 'arrendatario' | 'admin')
   ──────────────────────────────────────────────────────────────── */

export function uiRoleToApiRol(role: 'owner' | 'operator' | 'renter'): RolUsuario {
  switch (role) {
    case 'owner':
      return 'propietario';
    case 'operator':
      return 'operador';
    case 'renter':
      return 'arrendatario';
  }
}

export function apiRolToUiRole(rol: RolUsuario): 'owner' | 'operator' | 'renter' | null {
  switch (rol) {
    case 'propietario':
      return 'owner';
    case 'operador':
      return 'operator';
    case 'arrendatario':
      return 'renter';
    default:
      return null;
  }
}

export function usuarioApiToUser(usuario: UsuarioApi): User {
  return {
    id: usuario.id,
    name: usuario.nombre,
    email: usuario.email,
    role: apiRolToUiRole(usuario.rol),
    whatsapp: usuario.telefono || undefined,
    verificado: usuario.verificado,
    fotoUrl: usuario.foto_url,
    creadoEn: usuario.creado_en,
  };
}
