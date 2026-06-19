export interface MachineSpecs {
  potencia?: string;
  capacidad?: string;
  transmision?: string;
  alcance?: string;
  ancho?: string;
}

export type MachineStatus = 'available' | 'rented' | 'maintenance';

export interface Machine {
  id: string;
  name: string;
  status: MachineStatus;
  price: number;
  specs: MachineSpecs;
  cat: string;
  img: string;
  description: string;
  location: string;
  owner: string;
  /** Numeric backend id of the owning usuario (propietario_id). Used to scope the owner dashboard. */
  ownerId?: number;
  /** Numeric backend departamento_id, kept for round-tripping the publish form. */
  departamentoId?: number | null;
  history?: RentalHistory[];
}

export interface RentalHistory {
  id: string;
  client: string;
  dates: string;
  amount: number;
  status: 'completed' | 'active';
}

export interface Operator {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  exp: string;
  loc: string;
  verified: boolean;
  img: string;
  whatsapp?: string;
}

export interface User {
  /** Numeric backend usuario id, resolved via GET /auth/me. Undefined until resolved. */
  id?: number;
  name: string;
  email: string;
  role: 'owner' | 'operator' | 'renter' | null;
  whatsapp?: string;
  verificado?: boolean;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
}

/* ────────────────────────────────────────────────────────────────
   BACKEND API TYPES
   Mirror the exact shape returned by the FastAPI backend
   (see imaq_backend/app/schemas/*.py). Field names match the SQL
   schema (snake_case), not the UI-facing camelCase models above.
   ──────────────────────────────────────────────────────────────── */

export type RolUsuario = 'propietario' | 'operador' | 'arrendatario' | 'admin';
export type EstadoMaquina = 'disponible' | 'alquilada' | 'mantenimiento';

export interface UsuarioApi {
  id: number;
  nombre: string;
  email: string;
  telefono: string | null;
  rol: RolUsuario;
  verificado: boolean;
  creado_en: string;
}

export interface UsuarioCreateApi {
  nombre: string;
  email: string;
  telefono?: string | null;
  rol: RolUsuario;
  password: string;
}

export interface TokenApi {
  access_token: string;
  token_type: string;
}

export interface LoginRequestApi {
  email: string;
  password: string;
}

export interface MaquinaApi {
  id: number;
  propietario_id: number;
  departamento_id: number | null;
  nombre: string;
  tipo: string;
  descripcion: string | null;
  precio_dia: number;
  ubicacion: string | null;
  latitud: number | null;
  longitud: number | null;
  imagen_url: string | null;
  estado: EstadoMaquina;
  creado_en: string;
}

export interface MaquinaCreateApi {
  nombre: string;
  tipo: string;
  descripcion?: string | null;
  precio_dia: number;
  ubicacion?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  imagen_url?: string | null;
  departamento_id?: number | null;
}

export interface OperadorApi {
  id: number;
  usuario_id: number;
  experiencia_anios: number;
  tarifa_dia: number | null;
  certificaciones: string | null;
  verificado: boolean;
  creado_en: string;
}

export interface OperadorCreateApi {
  usuario_id: number;
  experiencia_anios?: number;
  tarifa_dia?: number | null;
  certificaciones?: string | null;
}

export interface DepartamentoApi {
  id: number;
  nombre: string;
  pais: string;
}

export interface FavoritoApi {
  id: number;
  usuario_id: number;
  maquina_id: number;
  creado_en: string;
}

export interface FavoritoCreateApi {
  maquina_id: number;
}

export interface CalificacionApi {
  id: number;
  usuario_id: number;
  maquina_id: number;
  alquiler_id: number;
  estrellas: number;
  comentario: string | null;
  creado_en: string;
}

export interface CalificacionCreateApi {
  maquina_id: number;
  alquiler_id: number;
  estrellas: number;
  comentario?: string | null;
}

export interface ApiErrorBody {
  detail?: string | { msg: string }[];
}
