import { listarMaquinas, listarOperadores } from './lib/api';
import { Machine, MachineStatus, MaquinaApi, Operator, OperadorApi } from './types';

export const INITIAL_MACHINES: Machine[] = [
  {
    id: 'mac-1',
    name: 'Excavadora Hidráulica',
    status: 'available',
    price: 450,
    priceUnit: 'dia',
    specs: { potencia: '146 HP', capacidad: '21,800 kg' },
    cat: 'CAT 308 GC',
    img: 'https://images.unsplash.com/photo-1621922688758-359fc864071e?w=800&q=80',
    description: 'Excavadora de alto rendimiento ideal para excavaciones severas, zanjas profundas e ingeniería civil pesada en El Salvador. Cuenta con un sistema hidráulico avanzado y cabina presurizada con aire acondicionado para máxima comodidad.',
    location: 'San Salvador, Centro',
    owner: 'Maquinarias Cuscatlán S.A.',
    history: [
      { id: 'h-1', client: 'Constructora López S.A.', dates: '1-15 Nov 2024', amount: 6750, status: 'completed' },
      { id: 'h-2', client: 'Obras Civiles Hernández', dates: '5-20 Oct 2024', amount: 6750, status: 'completed' },
    ]
  },
  {
    id: 'mac-2',
    name: 'Tractor de Cadenas',
    status: 'available',
    price: 620,
    priceUnit: 'dia',
    specs: { potencia: '215 HP', transmision: 'Automática' },
    cat: 'CAT D6',
    img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
    description: 'Tractor topador de cadenas diseñado para movimientos de tierras masivos y nivelación de terrenos con alta precisión. Su transmisión automática optimiza el empuje de forma inteligente para optimizar el combustible en campo.',
    location: 'La Libertad, Santa Tecla',
    owner: 'Arrendamientos del Pacífico',
    history: [
      { id: 'h-3', client: 'Licitaciones Vía El Litoral', dates: '10-25 Ene 2025', amount: 9300, status: 'completed' }
    ]
  },
  {
    id: 'mac-3',
    name: 'Manipulador Telescópico',
    status: 'rented',
    price: 380,
    priceUnit: 'dia',
    specs: { alcance: '17.0 m', capacidad: '4,000 kg' },
    cat: 'JCB 540-170',
    img: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80',
    description: 'Excelente alcance y capacidad de carga en altura para la descarga de materiales de construcción y armado estructural. Ideal para obras edilicias multifamiliares y complejos comerciales.',
    location: 'Santa Ana, El Congo',
    owner: 'Servicios de Izaje de Occidente',
    history: [
      { id: 'h-4', client: 'Constructora Salazar', dates: '12-28 Feb 2025', amount: 6080, status: 'completed' }
    ]
  },
  {
    id: 'mac-4',
    name: 'Compactador de Suelos',
    status: 'available',
    price: 290,
    priceUnit: 'dia',
    specs: { ancho: '2,140 mm', potencia: '98 kW' },
    cat: 'HAMM 3411',
    img: 'https://images.unsplash.com/photo-1590959651373-a3db0f38a961?w=800&q=80',
    description: 'Compactadora vibratoria de rodillo liso para suelos cohesivos y granulares. Su fuerza de compactación uniforme es ideal para la cimentación de carreteras, calles, parqueos y preparación de suelos habitacionales.',
    location: 'La Paz, San Luis Talpa',
    owner: 'Vías Metropoli El Salvador',
    history: []
  }
];

export const INITIAL_OPERATORS: Operator[] = [
  {
    id: 'op-1',
    name: 'Roberto Mejía',
    specialty: 'Operador de Grúa Torre',
    rating: 4.9,
    exp: '12 años',
    loc: 'San Salvador',
    verified: true,
    img: 'https://images.unsplash.com/photo-1566753323558-f4e0952af115?w=400&q=80&crop=face',
    whatsapp: '50371234567'
  },
  {
    id: 'op-2',
    name: 'Elena Alvarado',
    specialty: 'Excavadora Hidráulica',
    rating: 5.0,
    exp: '8 años',
    loc: 'Santa Ana',
    verified: true,
    img: 'https://images.unsplash.com/photo-1573496799652-408c2ac9fe98?w=400&q=80&crop=face',
    whatsapp: '50372345678'
  },
  {
    id: 'op-3',
    name: 'Carlos Henríquez',
    specialty: 'Motoniveladora Especializada',
    rating: 4.8,
    exp: '20 años',
    loc: 'La Libertad',
    verified: true,
    img: 'https://images.unsplash.com/photo-1537511446984-935f663eb1f4?w=400&q=80&crop=face',
    whatsapp: '50373456789'
  },
  {
    id: 'op-4',
    name: 'Luis Vásquez',
    specialty: 'Bulldozer / Compactadora',
    rating: 4.7,
    exp: '5 años',
    loc: 'San Miguel',
    verified: true,
    img: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&q=80&crop=face',
    whatsapp: '50374567890'
  }
];

/* ────────────────────────────────────────────────────────────────
   BACKEND → UI MAPPERS
   The FastAPI backend doesn't store operator names/ratings directly
   (those fields live in the usuarios table, not yet exposed via a
   combined endpoint), so operators fall back to neutral placeholders
   for the fields the API doesn't provide. Machines now carry a real
   imagen_url; a stock photo by category is only used when it's null.
   ──────────────────────────────────────────────────────────────── */

const FALLBACK_MACHINE_IMAGES = [
  'https://images.unsplash.com/photo-1621922688758-359fc864071e?w=800&q=80',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
  'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80',
  'https://images.unsplash.com/photo-1590959651373-a3db0f38a961?w=800&q=80',
];

const ESTADO_TO_STATUS: Record<MaquinaApi['estado'], MachineStatus> = {
  disponible: 'available',
  alquilada: 'rented',
  mantenimiento: 'maintenance',
};

export function mapMaquinaToMachine(maquina: MaquinaApi, index = 0): Machine {
  return {
    id: String(maquina.id),
    name: maquina.nombre,
    status: ESTADO_TO_STATUS[maquina.estado],
    price: Number(maquina.precio_dia),
    priceUnit: maquina.tipo_precio || 'dia',
    specs: { potencia: maquina.tipo },
    cat: maquina.tipo.toUpperCase(),
    img: maquina.imagen_url || FALLBACK_MACHINE_IMAGES[index % FALLBACK_MACHINE_IMAGES.length],
    description: maquina.descripcion || 'Sin descripción disponible.',
    location: maquina.ubicacion || 'El Salvador',
    owner: `Propietario #${maquina.propietario_id}`,
    ownerId: maquina.propietario_id,
    departamentoId: maquina.departamento_id,
    marca: maquina.marca,
    capacidad: maquina.capacidad,
    anio: maquina.año,
    horometro: maquina.horometro,
    incluyeOperador: maquina.incluye_operador,
    incluyeCombustible: maquina.incluye_combustible,
    telefonoContacto: maquina.telefono_contacto,
    nombreContacto: maquina.nombre_contacto,
    history: [],
  };
}

const FALLBACK_OPERATOR_IMAGES = [
  'https://images.unsplash.com/photo-1566753323558-f4e0952af115?w=400&q=80&crop=face',
  'https://images.unsplash.com/photo-1573496799652-408c2ac9fe98?w=400&q=80&crop=face',
  'https://images.unsplash.com/photo-1537511446984-935f663eb1f4?w=400&q=80&crop=face',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&q=80&crop=face',
];

export function mapOperadorToOperator(operador: OperadorApi, index = 0): Operator {
  return {
    id: String(operador.id),
    name: `Operador #${operador.usuario_id}`,
    specialty: operador.certificaciones || 'Operador certificado',
    rating: 4.8,
    exp: `${operador.experiencia_anios} años`,
    loc: 'El Salvador',
    verified: operador.verificado,
    img: FALLBACK_OPERATOR_IMAGES[index % FALLBACK_OPERATOR_IMAGES.length],
  };
}

/* ────────────────────────────────────────────────────────────────
   FETCHERS
   Fetch live data from the backend and let errors propagate — the
   UI is responsible for showing loading/empty/error states instead
   of silently swapping in sample data.
   ──────────────────────────────────────────────────────────────── */

export async function fetchMachines(): Promise<Machine[]> {
  const maquinas = await listarMaquinas();
  return maquinas.map(mapMaquinaToMachine);
}

export async function fetchOperators(): Promise<Operator[]> {
  const operadores = await listarOperadores();
  return operadores.map(mapOperadorToOperator);
}
