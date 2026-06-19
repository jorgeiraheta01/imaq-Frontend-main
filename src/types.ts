export interface MachineSpecs {
  potencia?: string;
  capacidad?: string;
  transmision?: string;
  alcance?: string;
  ancho?: string;
}

export type MachineStatus = 'available' | 'rented' | 'maintenance';

export type PriceUnit = 'hora' | 'dia';

export interface Machine {
  id: string;
  name: string;
  status: MachineStatus;
  price: number;
  priceUnit: PriceUnit;
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
  marca?: string | null;
  capacidad?: string | null;
  anio?: number | null;
  horometro?: string | null;
  incluyeOperador?: boolean;
  incluyeCombustible?: boolean;
  telefonoContacto?: string | null;
  nombreContacto?: string | null;
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
  fotoUrl?: string | null;
  creadoEn?: string;
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
  foto_url: string | null;
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

export interface UsuarioUpdateApi {
  nombre?: string;
  telefono?: string | null;
  foto_url?: string | null;
}

export interface CambiarPasswordApi {
  password_actual: string;
  password_nueva: string;
}

export interface UsuarioPublicoApi {
  id: number;
  nombre: string;
  telefono: string | null;
  foto_url: string | null;
  rol: RolUsuario;
  verificado: boolean;
}

export interface TokenApi {
  access_token: string;
  token_type: string;
}

export interface LoginRequestApi {
  email: string;
  password: string;
}

export type TipoPrecio = 'hora' | 'dia';

export interface MaquinaApi {
  id: number;
  propietario_id: number;
  departamento_id: number | null;
  nombre: string;
  tipo: string;
  descripcion: string | null;
  precio_dia: number;
  tipo_precio: TipoPrecio;
  ubicacion: string | null;
  latitud: number | null;
  longitud: number | null;
  imagen_url: string | null;
  marca: string | null;
  capacidad: string | null;
  año: number | null;
  horometro: string | null;
  incluye_operador: boolean;
  incluye_combustible: boolean;
  telefono_contacto: string | null;
  nombre_contacto: string | null;
  estado: EstadoMaquina;
  creado_en: string;
}

export interface MaquinaCreateApi {
  nombre: string;
  tipo: string;
  descripcion?: string | null;
  precio_dia: number;
  tipo_precio?: TipoPrecio;
  ubicacion?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  imagen_url?: string | null;
  marca?: string | null;
  capacidad?: string | null;
  año?: number | null;
  horometro?: string | null;
  incluye_operador?: boolean;
  incluye_combustible?: boolean;
  telefono_contacto?: string | null;
  nombre_contacto?: string | null;
  departamento_id?: number | null;
}

export interface MaquinaUpdateApi extends Partial<MaquinaCreateApi> {
  estado?: EstadoMaquina;
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

export interface OperadorUpdateApi {
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

export type EstadoAlquiler = 'pendiente' | 'activo' | 'finalizado' | 'cancelado';

export interface AlquilerApi {
  id: number;
  maquina_id: number;
  arrendatario_id: number;
  operador_id: number | null;
  fecha_inicio: string;
  fecha_fin: string;
  precio_acordado: number;
  costo_total: number | null;
  estado: EstadoAlquiler;
  creado_en: string;
}

export type TipoDocumento = 'dui' | 'licencia' | 'rtn' | 'certificacion';
export type EstadoDocumento = 'pendiente' | 'aprobado' | 'rechazado';

export interface DocumentoVerificacionApi {
  id: number;
  usuario_id: number;
  tipo: TipoDocumento;
  url_documento: string;
  estado: EstadoDocumento;
  creado_en: string;
}

export interface DocumentoVerificacionCreateApi {
  usuario_id: number;
  tipo: TipoDocumento;
  url_documento: string;
}

export interface ApiErrorBody {
  detail?: string | { msg: string }[];
}
