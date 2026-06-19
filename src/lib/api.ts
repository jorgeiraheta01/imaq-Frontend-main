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
  MaquinaUpdateApi,
  OperadorApi,
  OperadorCreateApi,
  OperadorUpdateApi,
  TokenApi,
  UsuarioApi,
  UsuarioCreateApi,
  UsuarioUpdateApi,
} from '../types';
import { getToken } from './auth';

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
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = false } = options;

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

/* ───────────────────────── USUARIOS ───────────────────────── */

export function actualizarUsuario(id: number, datos: UsuarioUpdateApi): Promise<UsuarioApi> {
  return request<UsuarioApi>(`/usuarios/${id}`, { method: 'PUT', body: datos, auth: true });
}

/* ───────────────────────── SESIONES ───────────────────────── */

export function cerrarTodasLasSesiones(): Promise<void> {
  return request<void>('/sesiones/todas', { method: 'DELETE', auth: true });
}

/* ───────────────────────── MÁQUINAS ───────────────────────── */

export function listarMaquinas(): Promise<MaquinaApi[]> {
  return request<MaquinaApi[]>('/maquinas/');
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

export function listarOperadores(): Promise<OperadorApi[]> {
  return request<OperadorApi[]>('/operadores/');
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
