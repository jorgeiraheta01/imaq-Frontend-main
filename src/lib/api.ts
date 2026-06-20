import type {
  AlquilerApi,
  CalificacionApi,
  CalificacionCreateApi,
  CambiarPasswordApi,
  DepartamentoApi,
  DocumentoVerificacionApi,
  DocumentoVerificacionCreateApi,
  FavoritoApi,
  FavoritoCreateApi,
  LoginRequestApi,
  MaquinaApi,
  MaquinaCreateApi,
  MaquinaFiltrosApi,
  MaquinaUpdateApi,
  OperadorApi,
  OperadorCreateApi,
  OperadorFiltrosApi,
  OperadorUpdateApi,
  RecuperarPasswordRequestApi,
  ResetPasswordRequestApi,
  TokenApi,
  UsuarioApi,
  UsuarioCreateApi,
  UsuarioUpdateApi,
} from '../types';
import { getRefreshToken, getToken, logout, setToken } from './auth';

export const API_BASE_URL = 'http://127.0.0.1:8000';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  /** Internal: prevents infinite refresh loops. Don't set this yourself. */
  _isRetry?: boolean;
}

// Dispatched when a refresh attempt fails (refresh token missing, expired or
// rejected by the backend) so the UI can log the user out and prompt for
// login again. App.tsx listens for this on window.
export const AUTH_EXPIRED_EVENT = 'imaq:auth-expired';

// Shared in-flight refresh promise so concurrent 401s only trigger one
// POST /auth/refresh instead of a stampede of parallel refresh calls.
let refreshPromise: Promise<string> | null = null;

async function refrescarAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        throw new Error('No hay refresh token disponible');
      }
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!response.ok) {
        throw new Error('No se pudo renovar la sesión');
      }
      const data = (await response.json()) as TokenApi;
      setToken(data.access_token);
      return data.access_token;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = false, _isRetry = false } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (auth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('No se pudo conectar con el servidor de iMaq', 0);
  }

  // Access token expired/invalid: try a single silent refresh-and-retry.
  if (response.status === 401 && auth && !_isRetry) {
    try {
      await refrescarAccessToken();
      return request<T>(path, { ...options, _isRetry: true });
    } catch {
      logout();
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
      throw new ApiError('Tu sesión expiró. Inicia sesión de nuevo.', 401);
    }
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const detail = data?.detail;
    const message = Array.isArray(detail)
      ? detail.map((d) => d.msg).join(', ')
      : detail || `Error ${response.status} al comunicarse con el servidor`;
    throw new ApiError(message, response.status);
  }

  return data as T;
}

/* ───────────────────────── AUTH ───────────────────────── */

export function registrarUsuario(datos: UsuarioCreateApi): Promise<UsuarioApi> {
  return request<UsuarioApi>('/auth/registro', { method: 'POST', body: datos });
}

export function loginUsuario(datos: LoginRequestApi): Promise<TokenApi> {
  return request<TokenApi>('/auth/login', { method: 'POST', body: datos });
}

export function obtenerPerfilActual(): Promise<UsuarioApi> {
  return request<UsuarioApi>('/auth/me', { auth: true });
}

export function cambiarPassword(datos: CambiarPasswordApi): Promise<void> {
  return request<void>('/auth/cambiar-password', { method: 'PUT', body: datos, auth: true });
}

export function refrescarToken(refreshToken: string): Promise<TokenApi> {
  return request<TokenApi>('/auth/refresh', { method: 'POST', body: { refresh_token: refreshToken } });
}

export function recuperarPassword(datos: RecuperarPasswordRequestApi): Promise<{ detail: string }> {
  return request<{ detail: string }>('/auth/recuperar-password', { method: 'POST', body: datos });
}

export function resetPassword(datos: ResetPasswordRequestApi): Promise<void> {
  return request<void>('/auth/reset-password', { method: 'POST', body: datos });
}

/* ───────────────────────── USUARIOS ───────────────────────── */

export function actualizarUsuario(id: number, datos: UsuarioUpdateApi): Promise<UsuarioApi> {
  return request<UsuarioApi>(`/usuarios/${id}`, { method: 'PUT', body: datos, auth: true });
}

/* ───────────────────────── SESIONES ───────────────────────── */

export function cerrarTodasLasSesiones(): Promise<void> {
  return request<void>('/sesiones/todas', { method: 'DELETE', auth: true });
}

/* ───────────────────────── HELPERS ───────────────────────── */

function buildQueryString(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/* ───────────────────────── MÁQUINAS ───────────────────────── */

export function listarMaquinas(filtros: MaquinaFiltrosApi = {}): Promise<MaquinaApi[]> {
  return request<MaquinaApi[]>(`/maquinas/${buildQueryString(filtros)}`);
}

export function obtenerMaquina(id: number): Promise<MaquinaApi> {
  return request<MaquinaApi>(`/maquinas/${id}`);
}

export function crearMaquina(datos: MaquinaCreateApi): Promise<MaquinaApi> {
  return request<MaquinaApi>('/maquinas/', { method: 'POST', body: datos, auth: true });
}

export function actualizarMaquina(id: number, datos: MaquinaUpdateApi): Promise<MaquinaApi> {
  return request<MaquinaApi>(`/maquinas/${id}`, { method: 'PUT', body: datos, auth: true });
}

/* ───────────────────────── OPERADORES ───────────────────────── */

export function listarOperadores(filtros: OperadorFiltrosApi = {}): Promise<OperadorApi[]> {
  return request<OperadorApi[]>(`/operadores/${buildQueryString(filtros)}`);
}

export function crearOperador(datos: OperadorCreateApi): Promise<OperadorApi> {
  return request<OperadorApi>('/operadores/', { method: 'POST', body: datos, auth: true });
}

export function actualizarOperador(id: number, datos: OperadorUpdateApi): Promise<OperadorApi> {
  return request<OperadorApi>(`/operadores/${id}`, { method: 'PUT', body: datos, auth: true });
}

/* ───────────────────────── DEPARTAMENTOS ───────────────────────── */

export function listarDepartamentos(): Promise<DepartamentoApi[]> {
  return request<DepartamentoApi[]>('/departamentos/');
}

/* ───────────────────────── FAVORITOS ───────────────────────── */

export function listarFavoritos(): Promise<FavoritoApi[]> {
  return request<FavoritoApi[]>('/favoritos/', { auth: true });
}

export function agregarFavorito(datos: FavoritoCreateApi): Promise<FavoritoApi> {
  return request<FavoritoApi>('/favoritos/', { method: 'POST', body: datos, auth: true });
}

export function eliminarFavorito(id: number): Promise<void> {
  return request<void>(`/favoritos/${id}`, { method: 'DELETE', auth: true });
}

/* ───────────────────────── CALIFICACIONES ───────────────────────── */

export function crearCalificacion(datos: CalificacionCreateApi): Promise<CalificacionApi> {
  return request<CalificacionApi>('/calificaciones/', { method: 'POST', body: datos, auth: true });
}

export function listarCalificacionesPorMaquina(maquinaId: number): Promise<CalificacionApi[]> {
  return request<CalificacionApi[]>(`/calificaciones/?maquina_id=${maquinaId}`);
}

/* ───────────────────────── ALQUILERES ───────────────────────── */

export function listarMisAlquileres(): Promise<AlquilerApi[]> {
  return request<AlquilerApi[]>('/alquileres/', { auth: true });
}

/* ───────────────────────── DOCUMENTOS DE VERIFICACIÓN ───────────────────────── */

export function crearDocumentoVerificacion(
  datos: DocumentoVerificacionCreateApi
): Promise<DocumentoVerificacionApi> {
  return request<DocumentoVerificacionApi>('/documentos-verificacion/', {
    method: 'POST',
    body: datos,
    auth: true,
  });
}
