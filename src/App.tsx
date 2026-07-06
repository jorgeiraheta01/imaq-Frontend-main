import React, { useState, useEffect } from 'react';
import {
  motion,
  AnimatePresence
} from 'motion/react';
import {
  Wrench,
  Users,
  Check,
  Plus,
  Heart,
  MapPin,
  User,
  Calendar,
  ArrowRight,
  X,
  ChevronDown,
  Menu,
  Info,
  Camera,
  Briefcase,
  ShieldCheck,
  Send,
  Instagram,
  Mail,
  PhoneCall,
  Search,
  Clock,
  Star,
  AlertTriangle,
  LayoutDashboard,
  RefreshCw,
  ChevronUp,
  UserCircle,
  ImagePlus,
  Trash2,
} from 'lucide-react';
import { Machine, Operator, User as UserProfile, ToastMessage, DepartamentoApi, CalificacionApi, AlquilerPublicoApi, CotizacionApi } from './types';
import { fetchMachines, fetchOperators, mapMaquinaToMachine, mapOperadorToOperator } from './data';
import {
  ApiError,
  aceptarCotizacion,
  actualizarMaquina,
  agregarFavorito,
  AUTH_EXPIRED_EVENT,
  cancelarCotizacion,
  contarCotizacionesNoVistas,
  contarOperadores,
  contraofertarCotizacion,
  crearCotizacion,
  crearMaquina,
  crearOperador,
  eliminarFavorito,
  listarAlquileresPublicosPorMaquina,
  listarCalificacionesPorMaquina,
  listarCotizacionesEnviadas,
  listarCotizacionesRecibidas,
  listarDepartamentos,
  listarFavoritos,
  listarMaquinas,
  listarOperadores,
  loginUsuario,
  obtenerPerfilActual,
  rechazarCotizacion,
  recuperarPassword,
  registrarUsuario,
} from './lib/api';
import {
  getCurrentUser,
  getToken,
  logout as clearSession,
  saveSession,
  setCurrentUser,
  uiRoleToApiRol,
  usuarioApiToUser,
} from './lib/auth';
import { getImageUrl, subirImagen } from './lib/cloudinary';
import { formatLocalPhone, PHONE_PREFIX, toFullPhone } from './lib/phone';
import ProfilePage from './ProfilePage';
import Modal from './components/Modal';
import Collapsible from './components/Collapsible';
import { formatPrice } from './lib/format';

type Page = 'home' | 'operators' | 'publish' | 'dashboard' | 'profile';

const DUI_REGEX = /^[0-9]{8}-[0-9]{1}$/;

/** Auto-inserts the dash as the user types: 8 digits, then "-", then 1 digit. */
function formatDui(value: string): string {
  const digits = value.replace(/[^0-9]/g, '').slice(0, 9);
  if (digits.length <= 8) return digits;
  return `${digits.slice(0, 8)}-${digits.slice(8)}`;
}

/** Formats an ISO date string (YYYY-MM-DD) as e.g. "15 nov 2024". */
function formatFechaCorta(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('es-SV', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function App() {
  // Page states: 'home' | 'operators' | 'publish' | 'dashboard'
  const [currentPage, setCurrentPage] = useState<Page>('home');

  // Catalog data, sourced live from the iMaq backend (no more localStorage cache
  // for machines/operators — loading/empty/error states reflect the real API).
  const [machines, setMachines] = useState<Machine[]>([]);
  const [machinesLoading, setMachinesLoading] = useState(true);
  const [machinesError, setMachinesError] = useState<string | null>(null);

  const [operators, setOperators] = useState<Operator[]>([]);
  const [operatorsLoading, setOperatorsLoading] = useState(true);
  const [operatorsError, setOperatorsError] = useState<string | null>(null);

  const [departments, setDepartments] = useState<DepartamentoApi[]>([]);

  const [loggedInUser, setLoggedInUser] = useState<UserProfile | null>(() => getCurrentUser());

  // Auth form submission state (loading / error feedback)
  const [authLoading, setAuthLoading] = useState(false);

  // Modal and Interactive UI states
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');

  // Ratings for the currently open machine modal
  const [machineRatings, setMachineRatings] = useState<CalificacionApi[]>([]);
  const [ratingsLoading, setRatingsLoading] = useState(false);

  // Public rental history for the currently open machine modal
  const [machineRentalHistory, setMachineRentalHistory] = useState<AlquilerPublicoApi[]>([]);
  const [rentalHistoryLoading, setRentalHistoryLoading] = useState(false);

  // Real registered-operators count, shown in the Operators page stats footer
  const [operadoresCount, setOperadoresCount] = useState<number | null>(null);

  // "Cotizar" form state for the currently open machine modal
  const [isCotizarFormOpen, setIsCotizarFormOpen] = useState(false);
  const [cotizarFechaInicio, setCotizarFechaInicio] = useState('');
  const [cotizarFechaFin, setCotizarFechaFin] = useState('');
  const [cotizarPrecio, setCotizarPrecio] = useState('');
  const [cotizarNotas, setCotizarNotas] = useState('');
  const [cotizarSubmitting, setCotizarSubmitting] = useState(false);
  const [cotizacionEnviada, setCotizacionEnviada] = useState<CotizacionApi | null>(null);

  // Cotizaciones sin ver, para el badge del navbar
  const [cotizacionesNoVistas, setCotizacionesNoVistas] = useState(0);

  // "Cotizaciones recibidas" en el panel del propietario
  const [cotizacionesRecibidas, setCotizacionesRecibidas] = useState<CotizacionApi[]>([]);
  const [cotizacionesRecibidasLoading, setCotizacionesRecibidasLoading] = useState(false);
  const [cotizacionActionId, setCotizacionActionId] = useState<number | null>(null);
  const [contraofertaFormId, setContraofertaFormId] = useState<number | null>(null);
  const [contraofertaPrecio, setContraofertaPrecio] = useState('');
  const [contraofertaFechaInicio, setContraofertaFechaInicio] = useState('');
  const [contraofertaFechaFin, setContraofertaFechaFin] = useState('');
  const [contraofertaNotas, setContraofertaNotas] = useState('');

  // Selected roles on Register form
  const [registerRole, setRegisterRole] = useState<'owner' | 'operator' | 'renter'>('renter');
  // True when the form was opened via "Registrarme como operador" — locks
  // the role to operator and swaps in the operator-specific field set.
  const [isOperatorOnlyRegistration, setIsOperatorOnlyRegistration] = useState(false);

  // Input fields for Register
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regDui, setRegDui] = useState('');
  const [regDuiError, setRegDuiError] = useState<string | null>(null);
  // Shown after a 409 (DUI already registered) with a link into the forgot-password flow.
  const [duiConflictMessage, setDuiConflictMessage] = useState(false);

  // Operator-only registration extra fields
  const OPERATOR_MACHINE_TYPES = ['Excavadora', 'Grúa', 'Compactadora', 'Motoniveladora', 'Bulldozer', 'Hormigonera'];
  const [operatorMachineTypes, setOperatorMachineTypes] = useState<string[]>([]);
  const [operatorExperience, setOperatorExperience] = useState('');
  const [operatorRate, setOperatorRate] = useState('');

  // Input fields for Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Forgot-password step shown inline within the login tab of the auth modal
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  // Favorite states: local optimistic set of machine ids + the backend
  // favorito row id for each one (needed to call DELETE /favoritos/{id}).
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('imaq_favorites');
    return saved ? JSON.parse(saved) : [];
  });
  const [favoritosMap, setFavoritosMap] = useState<Record<string, number>>({});

  // Toast Messages
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Mobile menu open / close
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Top-right profile dropdown (desktop navbar)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  /* ───────────────────────── MACHINE SEARCH & FILTERS (server-side) ───────────────────────── */
  const [searchMachines, setSearchMachines] = useState('');
  const [debouncedSearchMachines, setDebouncedSearchMachines] = useState('');
  const [filterTipo, setFilterTipo] = useState('Todos');
  const [filterDepartamentoId, setFilterDepartamentoId] = useState<number | 'todos'>('todos');
  const [filterPrecioMax, setFilterPrecioMax] = useState('');
  const [filterTipoPrecio, setFilterTipoPrecio] = useState<'todos' | 'hora' | 'dia'>('todos');
  const [filterEstado, setFilterEstado] = useState<'todos' | 'disponible' | 'alquilada' | 'mantenimiento'>('todos');
  const [filterIncluyeOperador, setFilterIncluyeOperador] = useState<'todos' | 'si' | 'no'>('todos');
  const [filterOrdenMaquinas, setFilterOrdenMaquinas] = useState<'ninguno' | 'precio_asc' | 'precio_desc' | 'reciente'>('ninguno');
  const [isMachineFiltersOpen, setIsMachineFiltersOpen] = useState(false);

  const [catalogMachines, setCatalogMachines] = useState<Machine[]>([]);
  const [catalogMachinesLoading, setCatalogMachinesLoading] = useState(true);
  const [catalogMachinesError, setCatalogMachinesError] = useState<string | null>(null);

  /* ───────────────────────── OPERATOR SEARCH & FILTERS (server-side) ───────────────────────── */
  const [searchOperators, setSearchOperators] = useState('');
  const [debouncedSearchOperators, setDebouncedSearchOperators] = useState('');
  const [operatorFilterMaquina, setOperatorFilterMaquina] = useState('Todos');
  const [operatorFilterDepartamentoId, setOperatorFilterDepartamentoId] = useState<number | 'todos'>('todos');
  const [operatorFilterTarifaMax, setOperatorFilterTarifaMax] = useState('');
  const [operatorFilterVerificado, setOperatorFilterVerificado] = useState(false);
  const [operatorFilterOrden, setOperatorFilterOrden] = useState<'ninguno' | 'tarifa_asc' | 'tarifa_desc' | 'mejor_calificacion'>('ninguno');

  const [catalogOperators, setCatalogOperators] = useState<Operator[]>([]);
  const [catalogOperatorsLoading, setCatalogOperatorsLoading] = useState(true);
  const [catalogOperatorsError, setCatalogOperatorsError] = useState<string | null>(null);

  // Form State for Publish Equipment Page
  const [publishStep, setPublishStep] = useState<1 | 2 | 3>(1);
  const [publishSubmitting, setPublishSubmitting] = useState(false);
  const [publishUploadingPhoto, setPublishUploadingPhoto] = useState(false);
  const [editingMachineId, setEditingMachineId] = useState<string | null>(null);
  const [formCategory, setFormCategory] = useState('Excavadora');
  const [formBrand, setFormBrand] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formYear, setFormYear] = useState('');
  const [formCapacidad, setFormCapacidad] = useState('');
  const [formHorometro, setFormHorometro] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDepartamentoId, setFormDepartamentoId] = useState<number | null>(null);
  const [formMunicipality, setFormMunicipality] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formTipoPrecio, setFormTipoPrecio] = useState<'hora' | 'dia'>('dia');
  const [formIncludesOperator, setFormIncludesOperator] = useState(false);
  const [formIncludesFuel, setFormIncludesFuel] = useState(false);
  const [formContactName, setFormContactName] = useState('');
  const [formContactPhone, setFormContactPhone] = useState('');

  // Photo upload: local file + preview, uploaded to Cloudinary on submit
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);

  // Email Newsletter state
  const [newsletterEmail, setNewsletterEmail] = useState('');

  useEffect(() => {
    localStorage.setItem('imaq_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const loadMachines = () => {
    setMachinesLoading(true);
    setMachinesError(null);
    fetchMachines()
      .then(setMachines)
      .catch((error) => {
        const message = error instanceof ApiError ? error.message : 'No se pudo conectar con el servidor de iMaq';
        setMachinesError(message);
      })
      .finally(() => setMachinesLoading(false));
  };

  const loadOperators = () => {
    setOperatorsLoading(true);
    setOperatorsError(null);
    fetchOperators()
      .then(setOperators)
      .catch((error) => {
        const message = error instanceof ApiError ? error.message : 'No se pudo conectar con el servidor de iMaq';
        setOperatorsError(message);
      })
      .finally(() => setOperatorsLoading(false));
  };

  // Load live catalog data from the iMaq backend on mount.
  useEffect(() => {
    loadMachines();
    loadOperators();
    listarDepartamentos().then(setDepartments).catch(() => setDepartments([]));
    contarOperadores().then(({ total }) => setOperadoresCount(total)).catch(() => setOperadoresCount(null));
  }, []);

  // Debounce the free-text search inputs (300ms) before they trigger a fetch.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearchMachines(searchMachines), 300);
    return () => clearTimeout(id);
  }, [searchMachines]);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearchOperators(searchOperators), 300);
    return () => clearTimeout(id);
  }, [searchOperators]);

  const loadCatalogMachines = () => {
    setCatalogMachinesLoading(true);
    setCatalogMachinesError(null);
    listarMaquinas({
      buscar: debouncedSearchMachines || undefined,
      estado: filterEstado !== 'todos' ? filterEstado : undefined,
      tipo: filterTipo !== 'Todos' ? filterTipo : undefined,
      departamento_id: filterDepartamentoId !== 'todos' ? filterDepartamentoId : undefined,
      precio_max: filterPrecioMax ? Number(filterPrecioMax) : undefined,
      tipo_precio: filterTipoPrecio !== 'todos' ? filterTipoPrecio : undefined,
      incluye_operador: filterIncluyeOperador !== 'todos' ? filterIncluyeOperador === 'si' : undefined,
      orden: filterOrdenMaquinas !== 'ninguno' ? filterOrdenMaquinas : undefined,
    })
      .then((maquinas) => setCatalogMachines(maquinas.map(mapMaquinaToMachine)))
      .catch((error) => {
        const message = error instanceof ApiError ? error.message : 'No se pudo conectar con el servidor de iMaq';
        setCatalogMachinesError(message);
      })
      .finally(() => setCatalogMachinesLoading(false));
  };

  // Server-side machine search/filtering — refetches whenever any filter changes.
  useEffect(loadCatalogMachines, [
    debouncedSearchMachines,
    filterEstado,
    filterTipo,
    filterDepartamentoId,
    filterPrecioMax,
    filterTipoPrecio,
    filterIncluyeOperador,
    filterOrdenMaquinas,
  ]);

  const loadCatalogOperators = () => {
    setCatalogOperatorsLoading(true);
    setCatalogOperatorsError(null);
    listarOperadores({
      buscar: debouncedSearchOperators || undefined,
      maquina: operatorFilterMaquina !== 'Todos' ? operatorFilterMaquina : undefined,
      departamento_id: operatorFilterDepartamentoId !== 'todos' ? operatorFilterDepartamentoId : undefined,
      tarifa_max: operatorFilterTarifaMax ? Number(operatorFilterTarifaMax) : undefined,
      verificado: operatorFilterVerificado ? true : undefined,
      orden: operatorFilterOrden !== 'ninguno' ? operatorFilterOrden : undefined,
    })
      .then((operadores) => setCatalogOperators(operadores.map(mapOperadorToOperator)))
      .catch((error) => {
        const message = error instanceof ApiError ? error.message : 'No se pudo conectar con el servidor de iMaq';
        setCatalogOperatorsError(message);
      })
      .finally(() => setCatalogOperatorsLoading(false));
  };

  // Server-side operator search/filtering — refetches whenever any filter changes.
  useEffect(loadCatalogOperators, [
    debouncedSearchOperators,
    operatorFilterMaquina,
    operatorFilterDepartamentoId,
    operatorFilterTarifaMax,
    operatorFilterVerificado,
    operatorFilterOrden,
  ]);

  // Picks up the one-shot toast left by ResetPasswordPage right before it
  // redirects back here (no shared router/state across that page change).
  useEffect(() => {
    const pending = sessionStorage.getItem('imaq_toast_after_redirect');
    if (pending) {
      sessionStorage.removeItem('imaq_toast_after_redirect');
      addToast(pending, 'success');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resolve / validate the current session against the backend on mount,
  // so a refreshed page always reflects the authoritative user profile
  // (and logs out cleanly if the stored token is no longer valid).
  useEffect(() => {
    if (!getToken()) return;
    obtenerPerfilActual()
      .then((usuario) => {
        const user = usuarioApiToUser(usuario);
        setCurrentUser(user);
        setLoggedInUser(user);
      })
      .catch(() => {
        clearSession();
        setLoggedInUser(null);
      });
  }, []);

  // If a silent token refresh ever fails (refresh token missing/expired/
  // revoked), api.ts dispatches this event — log out and prompt to log in again.
  useEffect(() => {
    const onAuthExpired = () => {
      setLoggedInUser(null);
      addToast('Tu sesión expiró. Inicia sesión de nuevo.', 'info');
      setAuthTab('login');
      setIsAuthModalOpen(true);
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onAuthExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onAuthExpired);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load the logged-in user's favorito rows (need their backend ids to unfavorite).
  useEffect(() => {
    if (!loggedInUser) {
      setFavoritosMap({});
      return;
    }
    listarFavoritos()
      .then((rows) => {
        const map: Record<string, number> = {};
        rows.forEach((row) => {
          map[String(row.maquina_id)] = row.id;
        });
        setFavoritosMap(map);
        setFavorites(rows.map((row) => String(row.maquina_id)));
      })
      .catch(() => {
        /* Non-fatal: favorites stay local-only if this fails. */
      });
  }, [loggedInUser]);

  // Guard the owner-only dashboard route and the login-only profile route.
  useEffect(() => {
    if (currentPage === 'dashboard' && (!loggedInUser || loggedInUser.role !== 'owner')) {
      setCurrentPage('home');
      addToast('Acceso restringido: el panel es solo para propietarios.', 'error');
    }
    if (currentPage === 'profile' && !loggedInUser) {
      setCurrentPage('home');
      setAuthTab('login');
      setIsAuthModalOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, loggedInUser]);

  /* ───────────────────────── PHOTO UPLOAD (publish form) ───────────────────────── */

  const addPhotoFiles = (files: FileList | File[]) => {
    const newFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (newFiles.length === 0) return;
    setPhotoFiles((prev) => [...prev, ...newFiles]);
    newFiles.forEach((file) => {
      const url = URL.createObjectURL(file);
      setPhotoPreviews((prev) => [...prev, url]);
    });
  };

  const removePhoto = (index: number) => {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  /* ───────────────────────── NAVIGATION HELPERS ───────────────────────── */

  const goToDashboardOrLogin = () => {
    setIsUserMenuOpen(false);
    if (loggedInUser) {
      navigateTo('dashboard');
    } else {
      setAuthTab('login');
      setIsAuthModalOpen(true);
    }
  };

  const scrollToHowItWorks = () => {
    if (currentPage !== 'home') {
      navigateTo('home');
      setTimeout(() => document.getElementById('how-it-works-anchor')?.scrollIntoView({ behavior: 'smooth' }), 50);
    } else {
      document.getElementById('how-it-works-anchor')?.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  // Fetch ratings for the machine currently open in the detail modal.
  useEffect(() => {
    if (!selectedMachine) {
      setMachineRatings([]);
      return;
    }
    setRatingsLoading(true);
    listarCalificacionesPorMaquina(Number(selectedMachine.id))
      .then(setMachineRatings)
      .catch(() => setMachineRatings([]))
      .finally(() => setRatingsLoading(false));
  }, [selectedMachine]);

  // Fetch public rental history for the machine currently open in the detail modal.
  useEffect(() => {
    if (!selectedMachine) {
      setMachineRentalHistory([]);
      return;
    }
    setRentalHistoryLoading(true);
    listarAlquileresPublicosPorMaquina(Number(selectedMachine.id))
      .then(setMachineRentalHistory)
      .catch(() => setMachineRentalHistory([]))
      .finally(() => setRentalHistoryLoading(false));
  }, [selectedMachine]);

  // Reset the "Cotizar" form whenever the open machine changes (or the modal closes).
  useEffect(() => {
    setIsCotizarFormOpen(false);
    setCotizarFechaInicio('');
    setCotizarFechaFin('');
    setCotizarPrecio('');
    setCotizarNotas('');
    setCotizacionEnviada(null);
  }, [selectedMachine]);

  // Toast logic helper
  const addToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  // Switch navigation page securely and scroll to top
  const navigateTo = (page: Page) => {
    setCurrentPage(page);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const toggleFavorite = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();

    if (!loggedInUser) {
      addToast('Inicia sesión para guardar máquinas en tus favoritos', 'info');
      setAuthTab('login');
      setIsAuthModalOpen(true);
      return;
    }

    const isFavorite = favorites.includes(id);

    // Optimistic UI: flip immediately, reconcile with the backend after.
    if (isFavorite) {
      setFavorites((prev) => prev.filter((favId) => favId !== id));
      addToast('Removido de favoritos', 'info');
      const favoritoId = favoritosMap[id];
      if (favoritoId) {
        try {
          await eliminarFavorito(favoritoId);
          setFavoritosMap((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
        } catch (error) {
          // Roll back on failure
          setFavorites((prev) => [...prev, id]);
          const message = error instanceof ApiError ? error.message : 'No se pudo quitar de favoritos';
          addToast(message, 'error');
        }
      }
    } else {
      setFavorites((prev) => [...prev, id]);
      addToast('Añadido a favoritos', 'success');
      try {
        const favorito = await agregarFavorito({ maquina_id: Number(id) });
        setFavoritosMap((prev) => ({ ...prev, [id]: favorito.id }));
      } catch (error) {
        // Roll back on failure
        setFavorites((prev) => prev.filter((favId) => favId !== id));
        const message = error instanceof ApiError ? error.message : 'No se pudo agregar a favoritos';
        addToast(message, 'error');
      }
    }
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) return;
    addToast('¡Gracias por suscribirse a nuestro newsletter!', 'success');
    setNewsletterEmail('');
  };

  // Perform quick WhatsApp link generation
  const handleWhatsAppContact = (
    e: React.MouseEvent,
    target: { name: string; cat?: string; telefonoContacto?: string | null }
  ) => {
    e.stopPropagation();
    const phone = target.telefonoContacto || '50371234567'; // Fallback only if the machine has no contact phone
    const text = encodeURIComponent(`Hola, estoy interesado en alquilar el equipo "${target.name}" ${target.cat ? `(${target.cat})` : ''} que vi en iMaq. ¿Está disponible?`);
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  // Handles active contact logic for certified operator
  const handleOperatorContact = (e: React.MouseEvent, op: Operator) => {
    e.stopPropagation();
    const phone = op.whatsapp || '50371234567';
    const text = encodeURIComponent(`Hola ${op.name}, vi tu perfil verificado en iMaq El Salvador como ${op.specialty} y me gustaría cotizar tus servicios para un proyecto de construcción.`);
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  const refreshCotizacionesNoVistas = () => {
    if (!loggedInUser) {
      setCotizacionesNoVistas(0);
      return;
    }
    contarCotizacionesNoVistas()
      .then(({ total }) => setCotizacionesNoVistas(total))
      .catch(() => {});
  };

  const cargarCotizacionesRecibidas = () => {
    setCotizacionesRecibidasLoading(true);
    listarCotizacionesRecibidas()
      .then(setCotizacionesRecibidas)
      .catch(() => setCotizacionesRecibidas([]))
      .finally(() => setCotizacionesRecibidasLoading(false));
  };

  const handleAceptarCotizacionRecibida = async (id: number) => {
    setCotizacionActionId(id);
    try {
      const actualizada = await aceptarCotizacion(id);
      if (actualizada.conflicto_fechas) {
        addToast('¡Alquiler confirmado! Pero hay otro alquiler con fechas cruzadas para esta máquina — revísalo.', 'error');
      } else {
        addToast('¡Alquiler confirmado!', 'success');
      }
      cargarCotizacionesRecibidas();
      refreshCotizacionesNoVistas();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'No se pudo aceptar la cotización';
      addToast(message, 'error');
    } finally {
      setCotizacionActionId(null);
    }
  };

  const handleRechazarCotizacionRecibida = async (id: number) => {
    const motivo = window.prompt('Motivo del rechazo (opcional):') || undefined;
    setCotizacionActionId(id);
    try {
      await rechazarCotizacion(id, { motivo_rechazo: motivo });
      addToast('Cotización rechazada', 'info');
      cargarCotizacionesRecibidas();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'No se pudo rechazar la cotización';
      addToast(message, 'error');
    } finally {
      setCotizacionActionId(null);
    }
  };

  const handleAbrirContraoferta = (id: number) => {
    setContraofertaFormId((current) => (current === id ? null : id));
    setContraofertaPrecio('');
    setContraofertaFechaInicio('');
    setContraofertaFechaFin('');
    setContraofertaNotas('');
  };

  const handleSubmitContraoferta = async (e: React.FormEvent, id: number) => {
    e.preventDefault();
    if (!contraofertaPrecio || !contraofertaFechaInicio || !contraofertaFechaFin) {
      addToast('Completa precio y fechas de la contraoferta', 'error');
      return;
    }
    setCotizacionActionId(id);
    try {
      await contraofertarCotizacion(id, {
        precio_contraoferta: Number(contraofertaPrecio),
        fecha_inicio_contraoferta: contraofertaFechaInicio,
        fecha_fin_contraoferta: contraofertaFechaFin,
        notas_contraoferta: contraofertaNotas || null,
      });
      addToast('Contraoferta enviada', 'success');
      setContraofertaFormId(null);
      cargarCotizacionesRecibidas();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'No se pudo enviar la contraoferta';
      addToast(message, 'error');
    } finally {
      setCotizacionActionId(null);
    }
  };

  // Carga cotizaciones recibidas al entrar al panel de propietario.
  useEffect(() => {
    if (currentPage === 'dashboard' && loggedInUser?.role === 'owner') {
      cargarCotizacionesRecibidas();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, loggedInUser]);

  // Refresca el badge de "sin ver" cada vez que cambia la sesión.
  useEffect(() => {
    refreshCotizacionesNoVistas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedInUser]);

  const handleAbrirFormularioCotizar = () => {
    if (!loggedInUser) {
      addToast('Inicia sesión para enviar una cotización', 'info');
      setAuthTab('login');
      setIsAuthModalOpen(true);
      return;
    }
    setIsCotizarFormOpen((o) => !o);
  };

  const handleSubmitCotizacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMachine) return;
    if (!cotizarFechaInicio || !cotizarFechaFin || !cotizarPrecio) {
      addToast('Completa las fechas y el precio propuesto', 'error');
      return;
    }
    setCotizarSubmitting(true);
    try {
      const nueva = await crearCotizacion({
        maquina_id: Number(selectedMachine.id),
        fecha_inicio: cotizarFechaInicio,
        fecha_fin: cotizarFechaFin,
        precio_propuesto: Number(cotizarPrecio),
        notas: cotizarNotas || null,
      });
      setCotizacionEnviada(nueva);
      setIsCotizarFormOpen(false);
      addToast('Cotización enviada', 'success');
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'No se pudo enviar la cotización';
      addToast(message, 'error');
    } finally {
      setCotizarSubmitting(false);
    }
  };

  /** Manual, one-click WhatsApp notification: the sender decides whether to actually send it. */
  const handleAvisarWhatsApp = (telefono: string | null | undefined, mensaje: string) => {
    const phone = telefono || '50371234567';
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(mensaje)}`, '_blank');
  };

  // Form submission / custom steps transition logic
  const handlePublishNext = async () => {
    if (!loggedInUser) {
      addToast('Inicia sesión para publicar un equipo', 'error');
      setAuthTab('login');
      setIsAuthModalOpen(true);
      return;
    }

    if (publishStep === 1) {
      if (!formBrand || !formModel || !formYear || !formDesc) {
        addToast('Por favor complete todos los datos técnicos requeridos', 'error');
        return;
      }
      setPublishStep(2);
      addToast('Paso 1 completado. Proceder con las imágenes.', 'success');
    } else if (publishStep === 2) {
      setPublishStep(3);
      addToast('Paso 2 completado. Proceder con ubicación y precio.', 'success');
    } else {
      // Step 3 submission — validate before hitting the backend
      const priceNumber = Number(formPrice);
      if (!formPrice || Number.isNaN(priceNumber) || priceNumber <= 0) {
        addToast('El precio debe ser un número positivo', 'error');
        return;
      }
      if (!formDepartamentoId) {
        addToast('Selecciona un departamento de ubicación', 'error');
        return;
      }
      if (!formMunicipality.trim()) {
        addToast('Indica el municipio o dirección exacta', 'error');
        return;
      }

      const departamento = departments.find((d) => d.id === formDepartamentoId);

      setPublishSubmitting(true);
      let imagenUrl: string | null = photoPreviews[0] && !photoFiles[0] ? photoPreviews[0] : null;
      if (photoFiles.length > 0) {
        // Only the first photo becomes the machine's primary imagen_url for now.
        setPublishUploadingPhoto(true);
        try {
          imagenUrl = await subirImagen(photoFiles[0], 'maquinas');
        } catch (error) {
          const message = error instanceof Error ? error.message : 'No se pudo subir la foto a Cloudinary';
          addToast(`Error al subir la foto: ${message}. La máquina no fue publicada.`, 'error');
          setPublishUploadingPhoto(false);
          setPublishSubmitting(false);
          return;
        }
        setPublishUploadingPhoto(false);
      }

      try {
        const payload = {
          nombre: `${formCategory} ${formBrand} ${formModel}`.trim(),
          tipo: formCategory,
          descripcion: formDesc,
          precio_dia: priceNumber,
          tipo_precio: formTipoPrecio,
          ubicacion: `${formMunicipality}, ${departamento?.nombre || ''}`,
          departamento_id: formDepartamentoId,
          imagen_url: imagenUrl,
          marca: formBrand || null,
          capacidad: formCapacidad || null,
          año: formYear ? Number(formYear) : null,
          horometro: formHorometro || null,
          incluye_operador: formIncludesOperator,
          incluye_combustible: formIncludesFuel,
          telefono_contacto: formContactPhone || null,
          nombre_contacto: formContactName || null,
        };

        const maquinaResultado = editingMachineId
          ? await actualizarMaquina(Number(editingMachineId), payload)
          : await crearMaquina(payload);

        const resultMachine = mapMaquinaToMachine(maquinaResultado);
        setMachines((prev) =>
          editingMachineId
            ? prev.map((m) => (m.id === editingMachineId ? resultMachine : m))
            : [resultMachine, ...prev]
        );
        addToast(
          editingMachineId
            ? `El equipo ${resultMachine.name} fue actualizado correctamente.`
            : `¡Excelente! El equipo ${resultMachine.name} ha sido publicado y ya aparece en el catálogo.`,
          'success'
        );

        // Reset state and direct back to list
        setPublishStep(1);
        setEditingMachineId(null);
        setFormBrand('');
        setFormModel('');
        setFormYear('');
        setFormCapacidad('');
        setFormHorometro('');
        setFormDesc('');
        setFormDepartamentoId(null);
        setFormMunicipality('');
        setFormPrice('');
        setFormTipoPrecio('dia');
        setFormIncludesOperator(false);
        setFormIncludesFuel(false);
        setFormContactName('');
        setFormContactPhone('');
        setPhotoFiles([]);
        setPhotoPreviews([]);
        navigateTo(loggedInUser.role === 'owner' ? 'dashboard' : 'home');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo publicar el equipo';
        addToast(message, 'error');
      } finally {
        setPublishSubmitting(false);
      }
    }
  };

  // Real login against the iMaq FastAPI backend
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      addToast('Por favor ingrese correo y contraseña', 'error');
      return;
    }

    setAuthLoading(true);
    try {
      const token = await loginUsuario({ email: loginEmail, password: loginPassword });
      saveSession(
        token.access_token,
        { name: loginEmail.split('@')[0].toUpperCase(), email: loginEmail, role: null },
        token.refresh_token
      );

      // Resolve the authoritative profile (id, rol, nombre) now that the token is stored.
      const usuario = await obtenerPerfilActual();
      const user = usuarioApiToUser(usuario);
      saveSession(token.access_token, user, token.refresh_token);
      setLoggedInUser(user);

      setIsAuthModalOpen(false);
      addToast('¡Bienvenido de nuevo a iMaq El Salvador!', 'success');

      setLoginEmail('');
      setLoginPassword('');

      if (user.role === 'owner') {
        navigateTo('dashboard');
      }
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'No se pudo iniciar sesión';
      addToast(message, 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      addToast('Ingresa tu correo electrónico', 'error');
      return;
    }
    setForgotLoading(true);
    try {
      await recuperarPassword({ email: forgotEmail });
    } catch {
      // Intentionally ignored: the backend always answers 200 for this
      // endpoint so it can't be used to enumerate registered emails — any
      // network-level failure still shows the same generic message below.
    } finally {
      setForgotLoading(false);
      setForgotSent(true);
    }
  };

  const resetForgotPasswordFlow = () => {
    setShowForgotPassword(false);
    setForgotSent(false);
    setForgotEmail('');
  };

  // Real registration against the iMaq FastAPI backend
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regEmail || !regPhone || !regPassword) {
      addToast('Por favor complete todos los datos', 'error');
      return;
    }
    if (!DUI_REGEX.test(regDui)) {
      setRegDuiError('Formato inválido. Ejemplo: 01234567-8');
      return;
    }
    setRegDuiError(null);
    setDuiConflictMessage(false);

    const rolFinal = isOperatorOnlyRegistration ? 'operator' : registerRole;

    setAuthLoading(true);
    try {
      const usuarioCreado = await registrarUsuario({
        nombre: regName,
        email: regEmail,
        telefono: toFullPhone(regPhone),
        rol: uiRoleToApiRol(rolFinal),
        password: regPassword,
        dui: regDui,
      });

      // The registro endpoint doesn't return a token, so log in right after.
      const token = await loginUsuario({ email: regEmail, password: regPassword });

      const newUser: UserProfile = usuarioApiToUser(usuarioCreado);

      saveSession(token.access_token, newUser, token.refresh_token);
      setLoggedInUser(newUser);

      // If registered as Operator, also create the operador record in the backend
      if (rolFinal === 'operator') {
        try {
          const certificaciones = isOperatorOnlyRegistration && operatorMachineTypes.length > 0
            ? `Tipos de máquina: ${operatorMachineTypes.join(', ')}`
            : null;
          await crearOperador({
            usuario_id: usuarioCreado.id,
            experiencia_anios: Number(operatorExperience) || 0,
            tarifa_dia: operatorRate ? Number(operatorRate) : null,
            certificaciones,
          });
          loadOperators();
        } catch (error) {
          console.warn('No se pudo crear el registro de operador en el backend', error);
        }
      }

      setIsAuthModalOpen(false);
      addToast('¡Cuenta creada con éxito! Bienvenido a iMaq', 'success');

      setRegName('');
      setRegEmail('');
      setRegPhone('');
      setRegPassword('');
      setRegDui('');
      setIsOperatorOnlyRegistration(false);
      setOperatorMachineTypes([]);
      setOperatorExperience('');
      setOperatorRate('');

      // Auto-redirect: owners land on their dashboard, everyone else stays on the catalog.
      navigateTo(newUser.role === 'owner' ? 'dashboard' : 'home');
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setDuiConflictMessage(true);
      } else {
        const message = error instanceof ApiError ? error.message : 'No se pudo crear la cuenta';
        addToast(message, 'error');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    clearSession();
    setLoggedInUser(null);
    addToast('Sesión de usuario finalizada', 'info');
    navigateTo('home');
  };

  // Distinct machine types present in the full catalog, for the type filter options
  // (always derived from the unfiltered `machines` list so options don't shrink as you filter).
  const machineTypes = ['Todos', ...Array.from(new Set(machines.map((m) => m.cat)))];
  const machineFiltersActive =
    !!searchMachines ||
    filterTipo !== 'Todos' ||
    filterDepartamentoId !== 'todos' ||
    !!filterPrecioMax ||
    filterTipoPrecio !== 'todos' ||
    filterEstado !== 'todos' ||
    filterIncluyeOperador !== 'todos' ||
    filterOrdenMaquinas !== 'ninguno';
  // Count of individually-active filters (excludes free-text search), used for the "Filtros (N)" badge.
  const activeMachineFilterCount = [
    filterTipo !== 'Todos',
    filterDepartamentoId !== 'todos',
    !!filterPrecioMax,
    filterTipoPrecio !== 'todos',
    filterEstado !== 'todos',
    filterIncluyeOperador !== 'todos',
    filterOrdenMaquinas !== 'ninguno',
  ].filter(Boolean).length;
  const clearMachineFilters = () => {
    setSearchMachines('');
    setFilterTipo('Todos');
    setFilterDepartamentoId('todos');
    setFilterPrecioMax('');
    setFilterTipoPrecio('todos');
    setFilterEstado('todos');
    setFilterIncluyeOperador('todos');
    setFilterOrdenMaquinas('ninguno');
  };

  const operatorFiltersActive =
    !!searchOperators ||
    operatorFilterMaquina !== 'Todos' ||
    operatorFilterDepartamentoId !== 'todos' ||
    !!operatorFilterTarifaMax ||
    operatorFilterVerificado ||
    operatorFilterOrden !== 'ninguno';
  const clearOperatorFilters = () => {
    setSearchOperators('');
    setOperatorFilterMaquina('Todos');
    setOperatorFilterDepartamentoId('todos');
    setOperatorFilterTarifaMax('');
    setOperatorFilterVerificado(false);
    setOperatorFilterOrden('ninguno');
  };

  // Machines owned by the logged-in owner (used by the dashboard)
  const ownerMachines = loggedInUser?.id
    ? machines.filter((m) => m.ownerId === loggedInUser.id)
    : [];

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-[#2B44C7] selection:text-white relative">
      
      {/* ────────────────────────────────────────────────────────────────
          STICKY NAVBAR (Only rendered if NOT on the Publish page)
          ──────────────────────────────────────────────────────────────── */}
      {currentPage !== 'publish' && (
        <header className="sticky top-0 left-0 w-full bg-white z-[60] border-b border-[#E2E2DE]">
          <div className="max-w-[1140px] mx-auto h-14 px-4 flex items-center justify-between">
            
            {/* Logo */}
            <div 
              onClick={() => navigateTo('home')} 
              className="flex items-center space-x-1 cursor-pointer select-none"
            >
              <span className="text-[20px] font-extrabold tracking-[-0.03em] font-sans text-[#0F0F0F]">
                i<span className="text-[#2B44C7]">M</span>aq
              </span>
            </div>

            {/* Menu Links (Hidden on Mobile) */}
            <nav className="hidden md:flex items-center space-x-8">
              {[
                { label: 'Máquinas', key: 'home' },
                { label: 'Operadores', key: 'operators' }
              ].map((link) => {
                const isActive = currentPage === link.key;
                return (
                  <button
                    key={link.key}
                    onClick={() => navigateTo(link.key as any)}
                    className={`text-[13px] font-medium transition-colors relative h-14 flex items-center ${
                      isActive 
                        ? 'text-[#2B44C7] font-semibold' 
                        : 'text-[#717171] hover:text-[#0F0F0F]'
                    }`}
                  >
                    <span>{link.label}</span>
                    {isActive && (
                      <motion.div 
                        layoutId="nav-underline" 
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#2B44C7]" 
                      />
                    )}
                  </button>
                );
              })}
              
              <button
                onClick={scrollToHowItWorks}
                className="text-[13px] font-medium text-[#717171] hover:text-[#0F0F0F]"
              >
                Cómo funciona
              </button>
            </nav>

            {/* Right Side Buttons */}
            <div className="hidden md:flex items-center space-x-4">
              {!loggedInUser && (
                <button
                  onClick={() => { setAuthTab('login'); setIsAuthModalOpen(true); }}
                  className="text-[13px] font-semibold text-[#0F0F0F] hover:text-[#2B44C7] px-3 py-1 cursor-pointer transition-colors"
                >
                  Ingresar
                </button>
              )}

              <button
                onClick={() => navigateTo('publish')}
                className="bg-[#E8A020] text-[#0F0F0F] font-semibold text-[13px] px-4 py-2 hover:bg-[#C88010] cursor-pointer transition-colors rounded-[6px]"
              >
                Publicar máquina
              </button>

              {/* Logged-in user dropdown: Mi Perfil / Mi Panel / Cerrar Sesión */}
              {loggedInUser && (
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen((v) => !v)}
                    className="flex items-center gap-2 text-[13px] font-semibold text-[#0F0F0F] hover:text-[#2B44C7] cursor-pointer"
                  >
                    <span className="relative">
                      {loggedInUser.fotoUrl ? (
                        <img
                          src={getImageUrl(loggedInUser.fotoUrl, 'perfil')}
                          alt={loggedInUser.name}
                          className="w-6 h-6 rounded-full object-cover border border-[#E2E2DE]"
                        />
                      ) : (
                        <span className="w-6 h-6 rounded-full bg-[#2B44C7] text-white text-[10px] font-bold flex items-center justify-center">
                          {loggedInUser.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      {cotizacionesNoVistas > 0 && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#991B1B] border border-white" />
                      )}
                    </span>
                    {loggedInUser.name}
                    {isUserMenuOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  <AnimatePresence>
                    {isUserMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          className="absolute right-0 top-9 w-48 bg-white border border-[#E2E2DE] shadow-[0_8px_32px_rgba(0,0,0,.12)] z-50"
                        >
                          <button
                            onClick={() => { setIsUserMenuOpen(false); navigateTo('profile'); }}
                            className="w-full text-left text-[13px] font-medium text-[#3A3A3A] hover:bg-[#F5F4F0] px-4 py-2.5 flex items-center gap-2"
                          >
                            <UserCircle size={14} /> Mi Perfil
                          </button>
                          <button
                            onClick={goToDashboardOrLogin}
                            className="w-full text-left text-[13px] font-medium text-[#3A3A3A] hover:bg-[#F5F4F0] px-4 py-2.5 flex items-center gap-2"
                          >
                            <LayoutDashboard size={14} /> Mi Panel
                          </button>
                          <button
                            onClick={() => { setIsUserMenuOpen(false); handleLogout(); }}
                            className="w-full text-left text-[13px] font-medium text-[#991B1B] hover:bg-[#FEF2F2] px-4 py-2.5 flex items-center gap-2 border-t border-[#E2E2DE]"
                          >
                            <X size={14} /> Cerrar Sesión
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Mobile Hamburger menu */}
            <div className="md:hidden flex items-center">
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
                className="text-[#0F0F0F] p-1.5 focus:outline-none focus:ring-2 focus:ring-[#2B44C7]/30"
              >
                {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>

          </div>

          {/* Mobile dropdown */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="md:hidden bg-white border-t border-[#E2E2DE] overflow-hidden"
              >
                <div className="px-4 py-4 space-y-3 flex flex-col">
                  <button 
                    onClick={() => navigateTo('home')}
                    className={`text-left text-[14px] font-medium py-1.5 ${currentPage === 'home' ? 'text-[#2B44C7]' : 'text-[#3A3A3A]'}`}
                  >
                    Máquinas
                  </button>
                  <button 
                    onClick={() => navigateTo('operators')}
                    className={`text-left text-[14px] font-medium py-1.5 ${currentPage === 'operators' ? 'text-[#2B44C7]' : 'text-[#3A3A3A]'}`}
                  >
                    Operadores
                  </button>
                  <button
                    onClick={scrollToHowItWorks}
                    className="text-left text-[14px] font-medium text-[#3A3A3A] py-1.5"
                  >
                    Cómo funciona
                  </button>

                  {loggedInUser ? (
                    <div className="pt-2 border-t border-[#E2E2DE] space-y-2">
                      <p className="text-[13px] text-[#2B44C7] font-semibold flex items-center gap-2">
                        {loggedInUser.fotoUrl ? (
                          <img src={getImageUrl(loggedInUser.fotoUrl, 'perfil')} alt={loggedInUser.name} className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <span className="w-6 h-6 rounded-full bg-[#2B44C7] text-white text-[10px] font-bold flex items-center justify-center">
                            {loggedInUser.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                        Sesión: {loggedInUser.name}
                      </p>
                      <button
                        onClick={() => navigateTo('profile')}
                        className={`text-left text-[14px] font-medium py-1.5 block ${currentPage === 'profile' ? 'text-[#2B44C7]' : 'text-[#3A3A3A]'}`}
                      >
                        Mi Perfil
                      </button>
                      <button
                        onClick={goToDashboardOrLogin}
                        className={`text-left text-[14px] font-medium py-1.5 flex items-center gap-1.5 ${currentPage === 'dashboard' ? 'text-[#2B44C7]' : 'text-[#3A3A3A]'}`}
                      >
                        Mi Panel
                        {cotizacionesNoVistas > 0 && (
                          <span className="w-2 h-2 rounded-full bg-[#991B1B]" />
                        )}
                      </button>
                      <button
                        onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                        className="text-left text-[13px] text-[#991B1B] font-medium"
                      >
                        Cerrar sesión
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => { setIsMobileMenuOpen(false); setAuthTab('login'); setIsAuthModalOpen(true); }}
                      className="text-left text-[14px] font-medium text-[#3A3A3A] py-1.5"
                    >
                      Ingresar a mi panel
                    </button>
                  )}

                  <div className="pt-3">
                    <button 
                      onClick={() => navigateTo('publish')}
                      className="w-full text-center bg-[#E8A020] text-[#0F0F0F] font-bold text-[13px] py-2.5 rounded-[6px]"
                    >
                      Publicar máquina
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>
      )}

      {/* ────────────────────────────────────────────────────────────────
          PAGE 1: HOME PAGE
          ──────────────────────────────────────────────────────────────── */}
      {currentPage === 'home' && (
        <main className="flex-1 bg-[#F5F4F0]">
          
          {/* HERO SECTION — 2-column 50/50, max 50vh */}
          <section className="relative h-[50vh] min-h-[420px] max-h-[600px] overflow-hidden grid grid-cols-1 md:grid-cols-2">

            {/* Left column — text on the original dark overlay tone */}
            <div className="relative z-10 flex items-center bg-[#0A0A14] order-2 md:order-1">
              <div className="max-w-[560px] w-full mx-auto px-6 md:px-10 py-8">
                <span className="block text-[11px] font-medium tracking-[0.1em] uppercase text-white/55 mb-2">
                  Plataforma líder · El Salvador · Centroamérica
                </span>

                <h1 className="text-white text-3xl sm:text-4xl md:text-5xl font-normal leading-tight tracking-[-0.01em]">
                  Alquila maquinaria,<br />
                  <span className="block italic text-[#E8A020] font-serif-italic text-4xl sm:text-5xl md:text-6xl mt-1">
                    opera con confianza.
                  </span>
                </h1>

                <p className="text-white/60 text-[14px] max-w-[400px] leading-[1.65] mt-3 mb-6">
                  La plataforma líder en El Salvador para el alquiler de maquinaria pesada y contratación de operadores certificados.
                </p>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => {
                      const element = document.getElementById('catalog-anchor');
                      element?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="bg-[#E8A020] text-[#0F0F0F] text-[13px] font-bold px-6 py-3.5 hover:bg-[#C88010] rounded-[6px] transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    Explorar catálogo <ArrowRight size={15} />
                  </button>
                  <button
                    onClick={() => navigateTo('operators')}
                    className="bg-transparent text-white/85 text-[13px] font-bold px-6 py-3.5 border-[1.5px] border-white/35 hover:bg-white/10 rounded-[6px] transition-colors cursor-pointer"
                  >
                    Buscar operadores
                  </button>
                </div>
              </div>
            </div>

            {/* Right column — original background image */}
            <div className="relative order-1 md:order-2 min-h-[220px]">
              <img
                src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=80"
                alt="Maquinaria de construcción"
                className="w-full h-full object-cover object-[center_40%]"
              />
            </div>
          </section>

          {/* SERVICES SECTION */}
          <section id="how-it-works-anchor" className="bg-white border-b border-[#E2E2DE]">
            <div className="max-w-[1140px] mx-auto grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#E2E2DE]">
              
              {/* Cell 1 */}
              <div className="p-10 md:py-12 md:px-10 flex flex-col justify-between hover:bg-[#F9F9F7] transition-colors group">
                <div>
                  <div className="w-10 h-10 bg-[#2B44C7] flex items-center justify-center text-white mb-6">
                    <Wrench size={20} className="stroke-[1.75px]" />
                  </div>
                  <span className="block text-[10px] font-semibold text-[#2B44C7] tracking-wider uppercase mb-1">
                    SERVICIOS
                  </span>
                  <h3 className="text-[20px] font-bold text-[#0F0F0F] mb-3">
                    Alquiler de Maquinaria
                  </h3>
                  <p className="text-[#3A3A3A] text-[13px] leading-relaxed mb-6">
                    Acceda a una flota diversa de excavadoras, retroexcavadoras y grúas de última generación con mantenimiento preventivo riguroso.
                  </p>
                </div>
                <button 
                  onClick={() => {
                    const el = document.getElementById('catalog-anchor');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-left text-[#2B44C7] text-[12px] font-semibold hover:underline flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                >
                  Ver inventario →
                </button>
              </div>

              {/* Cell 2 */}
              <div className="p-10 md:py-12 md:px-10 flex flex-col justify-between hover:bg-[#F9F9F7] transition-colors group">
                <div>
                  <div className="w-10 h-10 bg-[#2B44C7] flex items-center justify-center text-white mb-6">
                    <Users size={20} className="stroke-[1.75px]" />
                  </div>
                  <span className="block text-[10px] font-semibold text-[#2B44C7] tracking-wider uppercase mb-1">
                    TALENTO
                  </span>
                  <h3 className="text-[20px] font-bold text-[#0F0F0F] mb-3">
                    Operadores Certificados
                  </h3>
                  <p className="text-[#3A3A3A] text-[13px] leading-relaxed mb-6">
                    Conectamos sus proyectos con profesionales verificados y capacitados bajo estándares internacionales de seguridad industrial.
                  </p>
                </div>
                <button 
                  onClick={() => navigateTo('operators')}
                  className="text-left text-[#2B44C7] text-[12px] font-semibold hover:underline flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                >
                  Contratar experto →
                </button>
              </div>

              {/* Cell 3 */}
              <div className="p-10 md:py-12 md:px-10 flex flex-col justify-between hover:bg-[#F9F9F7] transition-colors group">
                <div>
                  <div className="w-10 h-10 bg-[#2B44C7] flex items-center justify-center text-white mb-6">
                    <PhoneCall size={20} className="stroke-[1.75px]" />
                  </div>
                  <span className="block text-[10px] font-semibold text-[#2B44C7] tracking-wider uppercase mb-1">
                    CONTACTO
                  </span>
                  <h3 className="text-[20px] font-bold text-[#0F0F0F] mb-3">
                    Contacto Directo
                  </h3>
                  <p className="text-[#3A3A3A] text-[13px] leading-relaxed mb-6">
                    Conecta directo con propietarios vía WhatsApp. Sin intermediarios, sin comisiones en Fase 1.
                  </p>
                </div>
                <button
                  onClick={() => {
                    const el = document.getElementById('catalog-anchor');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-left text-[#2B44C7] text-[12px] font-semibold hover:underline flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                >
                  Contactar ahora →
                </button>
              </div>

            </div>
          </section>

          {/* CATALOG SECTION */}
          <section id="catalog-anchor" className="py-20 max-w-[1140px] mx-auto px-4">

            {/* Header row */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
              <div>
                <span className="block text-[10px] font-bold text-[#717171] uppercase tracking-[0.1em] mb-1">
                  CATÁLOGO DESTACADO
                </span>
                <h2 className="text-[#0F0F0F] text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Disponibilidad Inmediata
                </h2>
              </div>
              {!machinesLoading && !machinesError && (
                <button
                  onClick={() => { loadMachines(); loadCatalogMachines(); }}
                  className="text-[13px] font-semibold text-[#2B44C7] hover:underline text-left self-start sm:self-auto flex items-center gap-1.5"
                >
                  <RefreshCw size={13} /> Actualizar catálogo
                </button>
              )}
            </div>

            {/* Free-text search */}
            <div className="relative mb-4">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#717171]" />
              <input
                type="text"
                placeholder="Buscar por nombre, descripción, marca, ubicación..."
                value={searchMachines}
                onChange={(e) => setSearchMachines(e.target.value)}
                className="w-full bg-white border border-[#E2E2DE] text-[#0F0F0F] text-[13px] font-medium pl-10 pr-4 py-3 focus:border-[#2B44C7] focus:outline-none focus:ring-2 focus:ring-[#2B44C7]/30"
              />
            </div>

            {/* Collapsible filter panel */}
            <button
              type="button"
              onClick={() => setIsMachineFiltersOpen((o) => !o)}
              className="flex items-center gap-2 mb-3 text-[12px] font-bold uppercase tracking-wider text-[#0F0F0F] border border-[#E2E2DE] bg-white px-4 py-2.5 hover:bg-[#F9F9F7] transition-colors cursor-pointer"
            >
              <span>Filtros{activeMachineFilterCount > 0 ? ` (${activeMachineFilterCount})` : ''}</span>
              <ChevronDown size={14} className={`text-[#717171] transition-transform ${isMachineFiltersOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence initial={false}>
              {isMachineFiltersOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
            <div className="bg-white border border-[#E2E2DE] p-4 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[9px] font-bold uppercase text-[#717171] mb-1">Tipo de máquina</label>
                <select
                  value={filterTipo}
                  onChange={(e) => setFilterTipo(e.target.value)}
                  className="w-full bg-white border border-[#E2E2DE] text-[#0F0F0F] text-[12px] font-medium p-2.5 focus:border-[#2B44C7] focus:outline-none focus:ring-2 focus:ring-[#2B44C7]/30 cursor-pointer"
                >
                  {machineTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase text-[#717171] mb-1">Departamento</label>
                <select
                  value={filterDepartamentoId}
                  onChange={(e) => setFilterDepartamentoId(e.target.value === 'todos' ? 'todos' : Number(e.target.value))}
                  className="w-full bg-white border border-[#E2E2DE] text-[#0F0F0F] text-[12px] font-medium p-2.5 focus:border-[#2B44C7] focus:outline-none focus:ring-2 focus:ring-[#2B44C7]/30 cursor-pointer"
                >
                  <option value="todos">Todos</option>
                  {departments.map((dep) => (
                    <option key={dep.id} value={dep.id}>{dep.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase text-[#717171] mb-1">Precio máximo (USD)</label>
                <input
                  type="number"
                  min={0}
                  placeholder="Sin límite"
                  value={filterPrecioMax}
                  onChange={(e) => setFilterPrecioMax(e.target.value)}
                  className="w-full bg-white border border-[#E2E2DE] text-[#0F0F0F] text-[12px] font-medium p-2.5 focus:border-[#2B44C7] focus:outline-none focus:ring-2 focus:ring-[#2B44C7]/30"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase text-[#717171] mb-1">Tarifa por</label>
                <select
                  value={filterTipoPrecio}
                  onChange={(e) => setFilterTipoPrecio(e.target.value as 'todos' | 'hora' | 'dia')}
                  className="w-full bg-white border border-[#E2E2DE] text-[#0F0F0F] text-[12px] font-medium p-2.5 focus:border-[#2B44C7] focus:outline-none focus:ring-2 focus:ring-[#2B44C7]/30 cursor-pointer"
                >
                  <option value="todos">Hora o día</option>
                  <option value="dia">Por día</option>
                  <option value="hora">Por hora</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase text-[#717171] mb-1">Estado</label>
                <select
                  value={filterEstado}
                  onChange={(e) => setFilterEstado(e.target.value as typeof filterEstado)}
                  className="w-full bg-white border border-[#E2E2DE] text-[#0F0F0F] text-[12px] font-medium p-2.5 focus:border-[#2B44C7] focus:outline-none focus:ring-2 focus:ring-[#2B44C7]/30 cursor-pointer"
                >
                  <option value="todos">Todos</option>
                  <option value="disponible">Disponible</option>
                  <option value="alquilada">Alquilada</option>
                  <option value="mantenimiento">Mantenimiento</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase text-[#717171] mb-1">Incluye operador</label>
                <select
                  value={filterIncluyeOperador}
                  onChange={(e) => setFilterIncluyeOperador(e.target.value as typeof filterIncluyeOperador)}
                  className="w-full bg-white border border-[#E2E2DE] text-[#0F0F0F] text-[12px] font-medium p-2.5 focus:border-[#2B44C7] focus:outline-none focus:ring-2 focus:ring-[#2B44C7]/30 cursor-pointer"
                >
                  <option value="todos">Todos</option>
                  <option value="si">Sí</option>
                  <option value="no">No</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase text-[#717171] mb-1">Ordenar por</label>
                <select
                  value={filterOrdenMaquinas}
                  onChange={(e) => setFilterOrdenMaquinas(e.target.value as typeof filterOrdenMaquinas)}
                  className="w-full bg-white border border-[#E2E2DE] text-[#0F0F0F] text-[12px] font-medium p-2.5 focus:border-[#2B44C7] focus:outline-none focus:ring-2 focus:ring-[#2B44C7]/30 cursor-pointer"
                >
                  <option value="ninguno">Relevancia</option>
                  <option value="precio_asc">Precio: menor a mayor</option>
                  <option value="precio_desc">Precio: mayor a menor</option>
                  <option value="reciente">Más reciente</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={clearMachineFilters}
                  disabled={!machineFiltersActive}
                  className="w-full text-[11px] font-bold uppercase tracking-wider px-3 py-2.5 border border-[#E2E2DE] text-[#717171] hover:border-[#991B1B] hover:text-[#991B1B] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  Limpiar filtros
                </button>
              </div>
            </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Results counter */}
            {!catalogMachinesLoading && !catalogMachinesError && (
              <p className="text-[12px] text-[#717171] mb-6">
                Mostrando <strong className="text-[#0F0F0F]">{catalogMachines.length}</strong> de{' '}
                <strong className="text-[#0F0F0F]">{machines.length}</strong> máquinas
              </p>
            )}

            {/* LOADING SKELETON */}
            {catalogMachinesLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="bg-white border border-[#E2E2DE] overflow-hidden animate-pulse">
                    <div className="h-[180px] bg-[#E2E2DE]" />
                    <div className="p-4 space-y-3">
                      <div className="h-2.5 w-1/3 bg-[#E2E2DE]" />
                      <div className="h-4 w-2/3 bg-[#E2E2DE]" />
                      <div className="h-8 w-full bg-[#F5F4F0] border-t border-[#E2E2DE] mt-2" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ERROR STATE */}
            {!catalogMachinesLoading && catalogMachinesError && (
              <div className="flex flex-col items-center justify-center text-center bg-white border border-[#E2E2DE] py-16 px-6">
                <AlertTriangle size={28} className="text-[#991B1B] mb-3" />
                <h3 className="text-[15px] font-bold text-[#0F0F0F] mb-1">No se pudo cargar el catálogo</h3>
                <p className="text-[13px] text-[#717171] max-w-[360px] mb-5">{catalogMachinesError}</p>
                <button
                  onClick={loadCatalogMachines}
                  className="bg-[#0F0F0F] hover:bg-[#3A3A3A] text-white text-[12px] font-bold uppercase tracking-widest px-5 py-2.5 transition-colors cursor-pointer flex items-center gap-2"
                >
                  <RefreshCw size={14} /> Reintentar
                </button>
              </div>
            )}

            {/* EMPTY STATE (no machines at all) */}
            {!catalogMachinesLoading && !catalogMachinesError && machines.length === 0 && (
              <div className="flex flex-col items-center justify-center text-center bg-white border border-[#E2E2DE] py-16 px-6">
                <Wrench size={28} className="text-[#717171] mb-3" />
                <h3 className="text-[15px] font-bold text-[#0F0F0F] mb-1">Aún no hay máquinas disponibles</h3>
                <p className="text-[13px] text-[#717171] max-w-[360px]">
                  Sé el primero en publicar un equipo y aparecerá aquí de inmediato.
                </p>
                <button
                  onClick={() => navigateTo('publish')}
                  className="mt-5 bg-[#E8A020] hover:bg-[#C88010] text-[#0F0F0F] text-[12px] font-bold uppercase tracking-widest px-5 py-2.5 transition-colors cursor-pointer"
                >
                  Publicar máquina
                </button>
              </div>
            )}

            {/* No results for the active filters */}
            {!catalogMachinesLoading && !catalogMachinesError && machines.length > 0 && catalogMachines.length === 0 && (
              <div className="text-center bg-white border border-[#E2E2DE] py-12 px-6">
                <p className="text-[13px] text-[#717171]">
                  Ningún equipo coincide con los filtros seleccionados.{' '}
                  <button onClick={clearMachineFilters} className="text-[#2B44C7] font-semibold hover:underline">
                    Limpiar filtros
                  </button>
                </p>
              </div>
            )}

            {/* Machine cards grid */}
            {!catalogMachinesLoading && !catalogMachinesError && catalogMachines.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {catalogMachines.map((machine) => {
                const isFavorite = favorites.includes(machine.id);
                return (
                  <div
                    key={machine.id}
                    onClick={() => setSelectedMachine(machine)}
                    className="bg-white border border-[#E2E2DE] overflow-hidden group hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,0,0,.08)] transition-all duration-300 flex flex-col justify-between cursor-pointer"
                  >

                    {/* Image space */}
                    <div className="h-[180px] overflow-hidden relative bg-[#E2E2DE]">
                      <img
                        src={getImageUrl(machine.img, 'maquina')}
                        alt={machine.name}
                        className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300"
                      />

                      {/* Status Badges */}
                      <span className={`absolute top-3 left-3 text-[9px] font-bold uppercase tracking-wider px-2 py-1 ${
                        machine.status === 'available'
                          ? 'bg-[#E8F5ED] text-[#16793A]'
                          : machine.status === 'rented'
                          ? 'bg-[#FEF2F2] text-[#991B1B]'
                          : 'bg-[#FFF9E6] text-[#C88010]'
                      }`}>
                        {machine.status === 'available' ? 'DISPONIBLE' : machine.status === 'rented' ? 'ALQUILADO' : 'MANTENIMIENTO'}
                      </span>

                      {/* Favorite Button */}
                      <button
                        onClick={(e) => toggleFavorite(e, machine.id)}
                        className="absolute top-3 right-3 w-7 h-7 bg-white rounded-none flex items-center justify-center text-[#717171] hover:text-[#991B1B] border border-[#E2E2DE] transition-colors"
                      >
                        <Heart size={14} className={isFavorite ? 'fill-[#991B1B] stroke-[#991B1B]' : 'stroke-current'} />
                      </button>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        {/* Extra badges: operator / fuel / brand / year */}
                        {(machine.incluyeOperador || machine.incluyeCombustible === false || machine.marca || machine.anio) && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {machine.incluyeOperador && (
                              <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 bg-[#E8F5ED] text-[#16793A]">Incluye operador</span>
                            )}
                            {machine.incluyeCombustible === false && (
                              <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 bg-[#FFF9E6] text-[#C88010]">Sin combustible</span>
                            )}
                            {machine.marca && (
                              <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 bg-[#F5F4F0] text-[#3A3A3A]">{machine.marca}</span>
                            )}
                            {machine.anio && (
                              <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 bg-[#F5F4F0] text-[#3A3A3A]">{machine.anio}</span>
                            )}
                          </div>
                        )}

                        {/* Specs row */}
                        <div className="flex gap-4 mb-3 border-b border-[#F5F4F0] pb-2">
                          <div>
                            <span className="block text-[9px] uppercase text-[#717171]">Potencia</span>
                            <span className="text-[12px] font-bold text-[#3A3A3A]">{machine.specs.potencia}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] uppercase text-[#717171]">
                              {machine.specs.capacidad ? 'Capacidad' : machine.specs.alcance ? 'Alcance' : 'Ancho'}
                            </span>
                            <span className="text-[12px] font-bold text-[#3A3A3A]">
                              {machine.specs.capacidad || machine.specs.alcance || machine.specs.ancho}
                            </span>
                          </div>
                        </div>

                        {/* Model code */}
                        <span className="block font-mono-imaq text-[10px] text-[#717171] uppercase tracking-[0.04em] mb-0.5">
                          {machine.cat}
                        </span>

                        {/* Machine Name */}
                        <h4 className="text-[15px] font-bold text-[#0F0F0F] tracking-tight group-hover:text-[#2B44C7] transition-colors mb-4">
                          {machine.name}
                        </h4>
                      </div>

                      {/* Card Footer */}
                      <div className="flex items-center justify-between border-t border-[#E2E2DE] pt-3 mt-auto">
                        <div>
                          <span className="block text-[9px] uppercase text-[#717171] tracking-wider leading-none">Tarifa</span>
                          <div className="flex items-baseline mt-0.5">
                            <span className="font-mono-imaq text-[17px] font-bold text-[#C88010] leading-none">${formatPrice(machine.price)}</span>
                            <span className="text-[10px] text-[#717171] ml-0.5 font-normal">/{machine.priceUnit === 'hora' ? 'hora' : 'día'}</span>
                          </div>
                        </div>

                        {/* Action WhatsApp Button */}
                        <button
                          onClick={(e) => handleWhatsAppContact(e, machine)}
                          className="w-8 h-8 bg-[#2B44C7] hover:bg-[#1B2D6B] text-white flex items-center justify-center transition-colors shadow-sm cursor-pointer"
                          title="Contactar por WhatsApp"
                        >
                          <Plus size={16} />
                        </button>
                      </div>

                    </div>

                  </div>
                );
              })}
            </div>
            )}

          </section>

        </main>
      )}

      {/* ────────────────────────────────────────────────────────────────
          PAGE 2: OPERATORS DIRECTORY
          ──────────────────────────────────────────────────────────────── */}
      {currentPage === 'operators' && (
        <main className="flex-1 bg-[#F5F4F0]">
          
          {/* OPERATORS COMPACT HEADER (max 80px tall) */}
          <section className="bg-white border-b border-[#E2E2DE] h-20 flex items-center">
            <div className="max-w-[1140px] mx-auto px-4 w-full flex items-center justify-between gap-4">
              <h1 className="text-[18px] sm:text-[20px] font-extrabold text-[#0F0F0F] tracking-tight">
                Directorio de Operadores
              </h1>
            </div>
          </section>

          {/* OPERATORS GRID */}
          <section className="py-16 max-w-[1140px] mx-auto px-4">

            {/* Free-text search */}
            <div className="relative mb-4">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#717171]" />
              <input
                type="text"
                placeholder="Buscar por nombre o certificaciones..."
                value={searchOperators}
                onChange={(e) => setSearchOperators(e.target.value)}
                className="w-full bg-white border border-[#E2E2DE] text-[#0F0F0F] text-[13px] font-medium pl-10 pr-4 py-3 focus:border-[#2B44C7] focus:outline-none focus:ring-2 focus:ring-[#2B44C7]/30"
              />
            </div>

            {/* Always-visible filter bar */}
            <div className="bg-white border border-[#E2E2DE] p-4 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="block text-[9px] font-bold uppercase text-[#717171] mb-1">Tipo de máquina</label>
                <select
                  value={operatorFilterMaquina}
                  onChange={(e) => setOperatorFilterMaquina(e.target.value)}
                  className="w-full bg-white border border-[#E2E2DE] text-[#0F0F0F] text-[12px] font-medium p-2.5 focus:border-[#2B44C7] focus:outline-none focus:ring-2 focus:ring-[#2B44C7]/30 cursor-pointer"
                >
                  <option value="Todos">Todos</option>
                  {OPERATOR_MACHINE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase text-[#717171] mb-1">Departamento</label>
                <select
                  value={operatorFilterDepartamentoId}
                  onChange={(e) => setOperatorFilterDepartamentoId(e.target.value === 'todos' ? 'todos' : Number(e.target.value))}
                  className="w-full bg-white border border-[#E2E2DE] text-[#0F0F0F] text-[12px] font-medium p-2.5 focus:border-[#2B44C7] focus:outline-none focus:ring-2 focus:ring-[#2B44C7]/30 cursor-pointer"
                >
                  <option value="todos">Todos</option>
                  {departments.map((dep) => (
                    <option key={dep.id} value={dep.id}>{dep.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase text-[#717171] mb-1">Tarifa máxima (USD/día)</label>
                <input
                  type="number"
                  min={0}
                  placeholder="Sin límite"
                  value={operatorFilterTarifaMax}
                  onChange={(e) => setOperatorFilterTarifaMax(e.target.value)}
                  className="w-full bg-white border border-[#E2E2DE] text-[#0F0F0F] text-[12px] font-medium p-2.5 focus:border-[#2B44C7] focus:outline-none focus:ring-2 focus:ring-[#2B44C7]/30"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase text-[#717171] mb-1">Ordenar por</label>
                <select
                  value={operatorFilterOrden}
                  onChange={(e) => setOperatorFilterOrden(e.target.value as typeof operatorFilterOrden)}
                  className="w-full bg-white border border-[#E2E2DE] text-[#0F0F0F] text-[12px] font-medium p-2.5 focus:border-[#2B44C7] focus:outline-none focus:ring-2 focus:ring-[#2B44C7]/30 cursor-pointer"
                >
                  <option value="ninguno">Relevancia</option>
                  <option value="tarifa_asc">Tarifa: menor a mayor</option>
                  <option value="tarifa_desc">Tarifa: mayor a menor</option>
                  <option value="mejor_calificacion">Mejor calificación</option>
                </select>
              </div>

              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 h-[38px] px-3 border border-[#E2E2DE] flex-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={operatorFilterVerificado}
                    onChange={(e) => setOperatorFilterVerificado(e.target.checked)}
                    className="w-3.5 h-3.5 text-[#2B44C7] focus:ring-0 border-[#E2E2DE]"
                  />
                  <span className="text-[11px] font-bold text-[#3A3A3A]">Solo verificados</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
              {!catalogOperatorsLoading && !catalogOperatorsError && (
                <p className="text-[12px] text-[#717171]">
                  Mostrando <strong className="text-[#0F0F0F]">{catalogOperators.length}</strong> de{' '}
                  <strong className="text-[#0F0F0F]">{operators.length}</strong> operadores
                </p>
              )}
              <button
                onClick={clearOperatorFilters}
                disabled={!operatorFiltersActive}
                className="text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 border border-[#E2E2DE] text-[#717171] hover:border-[#991B1B] hover:text-[#991B1B] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Limpiar filtros
              </button>
            </div>

            {catalogOperatorsLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="bg-white border border-[#E2E2DE] overflow-hidden animate-pulse">
                    <div className="h-[220px] bg-[#E2E2DE]" />
                    <div className="p-4 space-y-3">
                      <div className="h-3 w-2/3 bg-[#E2E2DE]" />
                      <div className="h-8 w-full bg-[#F5F4F0] mt-4" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!catalogOperatorsLoading && catalogOperatorsError && (
              <div className="flex flex-col items-center justify-center text-center bg-white border border-[#E2E2DE] py-16 px-6 mb-12">
                <AlertTriangle size={28} className="text-[#991B1B] mb-3" />
                <h3 className="text-[15px] font-bold text-[#0F0F0F] mb-1">No se pudo cargar el directorio</h3>
                <p className="text-[13px] text-[#717171] max-w-[360px] mb-5">{catalogOperatorsError}</p>
                <button
                  onClick={loadCatalogOperators}
                  className="bg-[#0F0F0F] hover:bg-[#3A3A3A] text-white text-[12px] font-bold uppercase tracking-widest px-5 py-2.5 transition-colors cursor-pointer flex items-center gap-2"
                >
                  <RefreshCw size={14} /> Reintentar
                </button>
              </div>
            )}

            {!catalogOperatorsLoading && !catalogOperatorsError && catalogOperators.length === 0 && (
              <div className="flex flex-col items-center text-center bg-white border border-[#E2E2DE] py-12 px-6 mb-12">
                <p className="text-[13px] text-[#717171] mb-4">
                  {operators.length === 0
                    ? 'Aún no hay operadores registrados.'
                    : 'Ningún operador coincide con los filtros seleccionados.'}
                </p>
                {operators.length === 0 ? (
                  <button
                    onClick={() => {
                      setRegisterRole('operator');
                      setIsOperatorOnlyRegistration(true);
                      setAuthTab('register');
                      setIsAuthModalOpen(true);
                    }}
                    className="bg-[#E8A020] hover:bg-[#C88010] text-[#0F0F0F] text-[12px] font-bold uppercase tracking-widest px-5 py-2.5 transition-colors cursor-pointer"
                  >
                    Registrarme como operador
                  </button>
                ) : (
                  <button onClick={clearOperatorFilters} className="text-[#2B44C7] font-semibold text-[12px] hover:underline">
                    Limpiar filtros
                  </button>
                )}
              </div>
            )}

            {!catalogOperatorsLoading && !catalogOperatorsError && catalogOperators.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
              {catalogOperators.map((operator) => (
                <div
                  key={operator.id}
                  className="bg-white border border-[#E2E2DE] overflow-hidden group hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,0,0,.08)] transition-all duration-300 flex flex-col justify-between"
                >

                  {/* Photo area */}
                  <div className="h-[220px] overflow-hidden relative bg-[#E2E2DE]">
                    <img
                      src={operator.img}
                      alt={operator.name}
                      className="w-full h-full object-cover object-top group-hover:scale-[1.04] transition-transform duration-300"
                    />

                    {/* Verified badge */}
                    {operator.verified && (
                      <span className="absolute top-3 left-3 bg-[#2B44C7] text-white text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 flex items-center gap-1">
                        <Check size={11} className="stroke-[3px]" />
                        ✓ VERIFICADO
                      </span>
                    )}
                  </div>

                  {/* Body card */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="text-[15px] font-bold text-[#0F0F0F] tracking-tight truncate mr-2">
                          {operator.name}
                        </h3>
                        <div className="flex items-center text-[#E8A020] space-x-0.5 shrink-0">
                          <span className="text-[13px] font-semibold">★</span>
                          <span className="text-[12px] font-bold text-[#0F0F0F]">{operator.rating.toFixed(1)}</span>
                        </div>
                      </div>

                      <p className="text-[12px] text-[#717171] mb-3 leading-tight font-medium">
                        {operator.specialty}
                      </p>

                      {operator.tarifaDia != null && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 bg-[#FFF9E6] text-[#C88010]">
                            ${operator.tarifaDia}/día
                          </span>
                        </div>
                      )}

                      {/* Meta Grid info */}
                      <div className="grid grid-cols-2 gap-4 border-t border-[#F5F4F0] pt-4 mb-6">
                        <div>
                          <span className="block text-[9px] uppercase text-[#717171] tracking-wider mb-0.5">Experiencia</span>
                          <span className="block text-[12px] font-bold text-[#3A3A3A]">{operator.exp.toUpperCase()}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] uppercase text-[#717171] tracking-wider mb-0.5">Ubicación</span>
                          <span className="block text-[12px] font-bold text-[#3A3A3A]">{operator.loc.toUpperCase()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Contact Button */}
                    <button
                      onClick={(e) => handleOperatorContact(e, operator)}
                      className="w-full mt-auto py-2.5 border-[1.5px] border-[#0F0F0F] text-[#0F0F0F] text-[12px] font-bold uppercase tracking-[0.04em] hover:bg-[#0F0F0F] hover:text-white transition-colors uppercase-spacing mb-1 cursor-pointer"
                    >
                      CONTACTAR
                    </button>

                  </div>

                </div>
              ))}
            </div>
            )}

          </section>

          {/* STATS SECTION */}
          <section className="bg-white border-t border-b border-[#E2E2DE]">
            <div className="max-w-[1140px] mx-auto grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#E2E2DE]">
              
              <div className="py-12 px-6 text-center">
                <span className="block text-4xl sm:text-5xl font-extrabold text-[#2B44C7] font-sans tracking-tight mb-2">
                  {operadoresCount !== null ? `${Math.max(Math.floor(operadoresCount / 50) * 50, 0)}+` : '—'}
                </span>
                <span className="block text-[10px] font-bold text-[#717171] uppercase tracking-[0.1em]">
                  OPERADORES REGISTRADOS
                </span>
              </div>

              <div className="py-12 px-6 text-center">
                <span className="block text-4xl sm:text-5xl font-extrabold text-[#C88010] font-sans tracking-tight mb-2">
                  98%
                </span>
                <span className="block text-[10px] font-bold text-[#717171] uppercase tracking-[0.1em]">
                  TASA DE SATISFACCIÓN
                </span>
              </div>

              <div className="py-12 px-6 text-center">
                <span className="block text-4xl sm:text-5xl font-extrabold text-[#2B44C7] font-sans tracking-tight mb-2">
                  1.2k
                </span>
                <span className="block text-[10px] font-bold text-[#717171] uppercase tracking-[0.1em]">
                  PROYECTOS COMPLETADOS
                </span>
              </div>

            </div>
          </section>

        </main>
      )}

      {/* ────────────────────────────────────────────────────────────────
          PAGE 3: PUBLISH EQUIPMENT FORM
          (Gets its own clean transactional layout instead of default shared nav)
          ──────────────────────────────────────────────────────────────── */}
      {currentPage === 'publish' && (
        <div className="min-h-screen bg-[#F5F4F0] flex flex-col justify-between">
          
          {/* Form specific header */}
          <header className="bg-white border-b border-[#E2E2DE] py-4 px-6 md:px-12 sticky top-0 z-[60]">
            <div className="max-w-[1140px] mx-auto flex items-center justify-between">
              
              {/* Logo */}
              <div 
                onClick={() => navigateTo('home')}
                className="flex items-center space-x-1 cursor-pointer select-none"
              >
                <span className="text-[20px] font-extrabold tracking-[-0.03em] font-sans text-[#0F0F0F]">
                  i<span className="text-[#2B44C7]">M</span>aq
                </span>
              </div>

              {/* Close out */}
              <button 
                onClick={() => navigateTo('home')}
                className="flex items-center space-x-1 text-[#0F0F0F] hover:text-[#2B44C7] text-[12px] font-bold tracking-widest uppercase transition-colors"
              >
                <X size={15} />
                <span>SALIR</span>
              </button>

            </div>
          </header>

          {/* Form main body */}
          <main className="flex-1 py-12 px-4 md:px-8 max-w-[1140px] mx-auto w-full flex items-center justify-center">
            
            {/* Split layout styled container with absolute sharp corners */}
            <div className="bg-white border border-[#E2E2DE] w-full max-w-[900px] grid grid-cols-1 md:grid-cols-12 overflow-hidden shadow-sm">
              
              {/* Left Sidebar Info panel */}
              <aside className="md:col-span-4 bg-[#F9F9F7] border-b md:border-b-0 md:border-r border-[#E2E2DE] p-8 md:p-10 flex flex-col justify-between min-h-[300px] md:min-h-auto">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-[22px] font-bold text-[#0F0F0F] tracking-[-0.02em] mb-2 leading-tight">
                      Publicar equipo
                    </h2>
                    <p className="text-[#717171] text-[13px] leading-[1.65]">
                      Complete los detalles técnicos y comerciales para listar su maquinaria en el mercado de El Salvador.
                    </p>
                  </div>

                  {/* Progressive indicator steps */}
                  <div className="space-y-4 pt-4 border-t border-[#E2E2DE]">
                    
                    <div className="flex items-center space-x-3">
                      <span className={`font-mono-imaq text-[12px] ${publishStep === 1 ? 'text-[#2B44C7] font-bold' : 'text-[#717171]'}`}>
                        01
                      </span>
                      {publishStep === 1 && <span className="w-0.5 h-4 bg-[#E8A020]"></span>}
                      <span className={`text-[12px] font-bold tracking-wider ${publishStep === 1 ? 'text-[#0F0F0F]' : 'text-[#717171]'}`}>
                        DETALLES TÉCNICOS
                      </span>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className={`font-mono-imaq text-[12px] ${publishStep === 2 ? 'text-[#2B44C7] font-bold' : 'text-[#717171]'}`}>
                        02
                      </span>
                      {publishStep === 2 && <span className="w-0.5 h-4 bg-[#E8A020]"></span>}
                      <span className={`text-[12px] font-bold tracking-wider ${publishStep === 2 ? 'text-[#0F0F0F]' : 'text-[#717171]'}`}>
                        GALERÍA VISUAL
                      </span>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className={`font-mono-imaq text-[12px] ${publishStep === 3 ? 'text-[#2B44C7] font-bold' : 'text-[#717171]'}`}>
                        03
                      </span>
                      {publishStep === 3 && <span className="w-0.5 h-4 bg-[#E8A020]"></span>}
                      <span className={`text-[12px] font-bold tracking-wider ${publishStep === 3 ? 'text-[#0F0F0F]' : 'text-[#717171]'}`}>
                        UBICACIÓN Y PRECIO
                      </span>
                    </div>

                  </div>
                </div>

                <div className="pt-8 border-t border-[#E2E2DE] mt-auto hidden md:block">
                  <p className="text-[#2B44C7] italic font-serif-italic text-[18px] leading-snug">
                    "Precisión en cada metro cúbico."
                  </p>
                </div>

              </aside>

              {/* Right Form column */}
              <section className="md:col-span-8 p-6 md:p-12">
                <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
                  
                  {/* STEP 1 */}
                  {publishStep === 1 && (
                    <motion.div 
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-5"
                    >
                      <h3 className="text-[11px] font-bold tracking-widest text-[#2B44C7] uppercase border-b border-[#F5F4F0] pb-2 mb-2">
                        Paso 1: Detalles técnicos de la maquinaria
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-[#717171] mb-1.5">
                            CATEGORÍA DE MÁQUINA
                          </label>
                          <select 
                            value={formCategory}
                            onChange={(e) => setFormCategory(e.target.value)}
                            className="w-full bg-white border border-[#E2E2DE] text-[#0F0F0F] text-[13px] font-medium p-3 focus:border-[#2B44C7] focus:outline-none focus:ring-2 focus:ring-[#2B44C7]/30 rounded-none cursor-pointer"
                          >
                            <option>Excavadora</option>
                            <option>Retroexcavadora</option>
                            <option>Grúa Torre</option>
                            <option>Compactadora</option>
                            <option>Motoniveladora</option>
                            <option>Montacargas</option>
                            <option>Bulldozer</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase text-[#717171] mb-1.5">
                            MARCA / FABRICANTE
                          </label>
                          <input 
                            type="text" 
                            required
                            placeholder="Ej: Caterpillar, JCB, Komatsu"
                            value={formBrand}
                            onChange={(e) => setFormBrand(e.target.value)}
                            className="w-full bg-white border border-[#E2E2DE] text-[#0F0F0F] text-[13px] font-medium p-3 focus:border-[#2B44C7] focus:outline-none focus:ring-2 focus:ring-[#2B44C7]/30 rounded-none placeholder-[#B0B0B0]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-[#717171] mb-1.5">
                            MODELO
                          </label>
                          <input 
                            type="text" 
                            required
                            placeholder="Ej: 320D L"
                            value={formModel}
                            onChange={(e) => setFormModel(e.target.value)}
                            className="w-full bg-white border border-[#E2E2DE] text-[#0F0F0F] text-[13px] font-medium p-3 focus:border-[#2B44C7] focus:outline-none focus:ring-2 focus:ring-[#2B44C7]/30 rounded-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase text-[#717171] mb-1.5">
                            AÑO DE FABRICACIÓN
                          </label>
                          <input 
                            type="number" 
                            required
                            placeholder="Ej: 2022"
                            value={formYear}
                            onChange={(e) => setFormYear(e.target.value)}
                            className="w-full bg-white border border-[#E2E2DE] text-[#0F0F0F] text-[13px] font-medium p-3 focus:border-[#2B44C7] focus:outline-none focus:ring-2 focus:ring-[#2B44C7]/30 rounded-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-[#717171] mb-1.5">
                            CAPACIDAD
                          </label>
                          <input
                            type="text"
                            placeholder="Ej: 2.6 m3, 1.5 ton"
                            value={formCapacidad}
                            onChange={(e) => setFormCapacidad(e.target.value)}
                            className="w-full bg-white border border-[#E2E2DE] text-[#0F0F0F] text-[13px] font-medium p-3 focus:border-[#2B44C7] focus:outline-none focus:ring-2 focus:ring-[#2B44C7]/30 rounded-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-[#717171] mb-1.5">
                            HORÓMETRO
                          </label>
                          <input
                            type="text"
                            placeholder="Ej: 447 horas o N/A"
                            value={formHorometro}
                            onChange={(e) => setFormHorometro(e.target.value)}
                            className="w-full bg-white border border-[#E2E2DE] text-[#0F0F0F] text-[13px] font-medium p-3 focus:border-[#2B44C7] focus:outline-none focus:ring-2 focus:ring-[#2B44C7]/30 rounded-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#717171] mb-1.5">
                          DESCRIPCIÓN DE ESTADO Y CAPACIDADES
                        </label>
                        <textarea
                          rows={4}
                          required
                          placeholder="Describa el mantenimiento reciente, horas de uso, accesorios incluidos y características operativas..."
                          value={formDesc}
                          onChange={(e) => setFormDesc(e.target.value)}
                          className="w-full bg-white border border-[#E2E2DE] text-[#0F0F0F] text-[13px] font-medium p-3 focus:border-[#2B44C7] focus:outline-none focus:ring-2 focus:ring-[#2B44C7]/30 rounded-none resize-none"
                        />
                      </div>

                      <div className="bg-[#E8F5ED] border border-[#16793A]/20 p-4 flex gap-3">
                        <Info className="text-[#16793A] shrink-0 mt-0.5" size={16} />
                        <p className="text-[12px] text-[#16793A] leading-relaxed">
                          Asegúrese de que el año de fabricación coincida con los documentos de importación para evitar retrasos en la verificación corporativa de iMaq.
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 2 */}
                  {publishStep === 2 && (
                    <motion.div 
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-5"
                    >
                      <h3 className="text-[11px] font-bold tracking-widest text-[#2B44C7] uppercase border-b border-[#F5F4F0] pb-2 mb-2">
                        Paso 2: Carga de fotos de la maquinaria
                      </h3>

                      <p className="text-[#3A3A3A] text-[13px] leading-relaxed">
                        Arrastra o selecciona fotos reales de la maquinaria. La primera foto será la imagen principal del anuncio.
                      </p>

                      <label
                        onDragOver={(e) => { e.preventDefault(); setIsDraggingPhoto(true); }}
                        onDragLeave={() => setIsDraggingPhoto(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDraggingPhoto(false);
                          if (e.dataTransfer.files) addPhotoFiles(e.dataTransfer.files);
                        }}
                        className={`border border-dashed p-8 text-center flex flex-col items-center justify-center space-y-2 cursor-pointer transition-colors block ${
                          isDraggingPhoto ? 'border-[#2B44C7] bg-[#EEF1FD]' : 'border-[#B0B0B0] bg-[#F9F9F7] hover:bg-[#F5F4F0]'
                        }`}
                      >
                        <ImagePlus size={26} className="text-[#717171]" />
                        <span className="text-[11px] font-bold text-[#0F0F0F] tracking-wide">ARRASTRA TUS FOTOS AQUÍ</span>
                        <span className="text-[10px] text-[#717171]">o haz clic para seleccionar archivos</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => { if (e.target.files) addPhotoFiles(e.target.files); e.target.value = ''; }}
                        />
                      </label>

                      {photoPreviews.length > 0 && (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                          {photoPreviews.map((src, i) => (
                            <div key={src} className="relative aspect-square bg-[#E2E2DE] group overflow-hidden">
                              <img src={src} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                              {i === 0 && (
                                <span className="absolute top-1 left-1 bg-[#2B44C7] text-white text-[8px] font-bold uppercase px-1.5 py-0.5">
                                  Principal
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => removePhoto(i)}
                                className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {photoPreviews.length === 0 && (
                        <div className="flex items-center space-x-2 text-[12px] text-[#C88010]">
                          <Info size={14} />
                          <span>Aún no has agregado fotos. Puedes continuar, pero los anuncios con fotos reciben más contactos.</span>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* STEP 3 */}
                  {publishStep === 3 && (
                    <motion.div 
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-5"
                    >
                      <h3 className="text-[11px] font-bold tracking-widest text-[#2B44C7] uppercase border-b border-[#F5F4F0] pb-2 mb-2">
                        Paso 3: Ubicación y Configuración de Tarifas
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-[#717171] mb-1.5">
                            DEPARTAMENTO DE UBICACIÓN *
                          </label>
                          <select
                            required
                            value={formDepartamentoId ?? ''}
                            onChange={(e) => setFormDepartamentoId(e.target.value ? Number(e.target.value) : null)}
                            className="w-full bg-white border border-[#E2E2DE] text-[#0F0F0F] text-[13px] font-medium p-3 focus:border-[#2B44C7] focus:outline-none focus:ring-2 focus:ring-[#2B44C7]/30 rounded-none cursor-pointer disabled:opacity-60"
                            disabled={departments.length === 0}
                          >
                            <option value="" disabled>
                              {departments.length === 0 ? 'Cargando departamentos…' : 'Seleccione un departamento'}
                            </option>
                            {departments.map((dep) => (
                              <option key={dep.id} value={dep.id}>{dep.nombre}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase text-[#717171] mb-1.5">
                            MUNICIPIO / DISTRITO Y DETALLE
                          </label>
                          <input 
                            type="text" 
                            placeholder="Ej: Antiguo Cuscatlán, San Miguelito"
                            value={formMunicipality}
                            onChange={(e) => setFormMunicipality(e.target.value)}
                            className="w-full bg-white border border-[#E2E2DE] text-[#0F0F0F] text-[13px] font-medium p-3 focus:border-[#2B44C7] focus:outline-none focus:ring-2 focus:ring-[#2B44C7]/30 rounded-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-[#717171] mb-1.5">
                            TARIFA DE ALQUILER (USD)
                          </label>
                          <div className="flex">
                            <div className="relative flex-1">
                              <span className="absolute left-3 top-3.5 text-[#0F0F0F] text-[13px] font-bold font-mono-imaq">$</span>
                              <input
                                type="number"
                                required
                                min={1}
                                step="0.01"
                                placeholder="Ej: 450"
                                value={formPrice}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  if (v === '' || Number(v) >= 0) setFormPrice(v);
                                }}
                                className="w-full bg-white border border-[#E2E2DE] text-[#0F0F0F] text-[13px] font-medium p-3 pl-8 focus:border-[#2B44C7] focus:outline-none focus:ring-2 focus:ring-[#2B44C7]/30 rounded-none font-mono-imaq"
                              />
                            </div>
                            <select
                              value={formTipoPrecio}
                              onChange={(e) => setFormTipoPrecio(e.target.value as 'hora' | 'dia')}
                              className="bg-[#F9F9F7] border border-l-0 border-[#E2E2DE] text-[#0F0F0F] text-[13px] font-medium px-3 focus:outline-none focus:ring-2 focus:ring-[#2B44C7]/30 cursor-pointer"
                            >
                              <option value="dia">por día</option>
                              <option value="hora">por hora</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex items-end gap-3">
                          <div className="flex items-center space-x-2 h-12 bg-[#F9F9F7] px-3 border border-[#E2E2DE] flex-1">
                            <input
                              type="checkbox"
                              checked={formIncludesOperator}
                              onChange={(e) => setFormIncludesOperator(e.target.checked)}
                              className="w-4 h-4 text-[#2B44C7] focus:ring-0 border-[#E2E2DE]"
                              id="includes-operator"
                            />
                            <label htmlFor="includes-operator" className="text-[12px] font-medium text-[#3A3A3A] cursor-pointer">
                              Incluye operador
                            </label>
                          </div>
                          <div className="flex items-center space-x-2 h-12 bg-[#F9F9F7] px-3 border border-[#E2E2DE] flex-1">
                            <input
                              type="checkbox"
                              checked={formIncludesFuel}
                              onChange={(e) => setFormIncludesFuel(e.target.checked)}
                              className="w-4 h-4 text-[#2B44C7] focus:ring-0 border-[#E2E2DE]"
                              id="includes-fuel"
                            />
                            <label htmlFor="includes-fuel" className="text-[12px] font-medium text-[#3A3A3A] cursor-pointer">
                              Incluye combustible
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-[#717171] mb-1.5">
                            NOMBRE DE CONTACTO
                          </label>
                          <input
                            type="text"
                            placeholder="Persona o empresa de contacto"
                            value={formContactName}
                            onChange={(e) => setFormContactName(e.target.value)}
                            className="w-full bg-white border border-[#E2E2DE] text-[#0F0F0F] text-[13px] font-medium p-3 focus:border-[#2B44C7] focus:outline-none focus:ring-2 focus:ring-[#2B44C7]/30 rounded-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-[#717171] mb-1.5">
                            TELÉFONO DE CONTACTO
                          </label>
                          <input
                            type="text"
                            placeholder="Puede ser distinto al de tu cuenta"
                            value={formContactPhone}
                            onChange={(e) => setFormContactPhone(e.target.value)}
                            className="w-full bg-white border border-[#E2E2DE] text-[#0F0F0F] text-[13px] font-medium p-3 focus:border-[#2B44C7] focus:outline-none focus:ring-2 focus:ring-[#2B44C7]/30 rounded-none"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Form control buttons footer */}
                  <div className="pt-6 border-t border-[#E2E2DE] flex justify-between items-center mt-8">
                    {publishStep > 1 ? (
                      <button 
                        type="button" 
                        onClick={() => setPublishStep((prev) => (prev - 1) as any)}
                        className="text-[12px] font-bold uppercase tracking-wider text-[#717171] hover:text-[#0F0F0F] py-2 px-4 transition-colors cursor-pointer"
                      >
                        ← Atrás
                      </button>
                    ) : (
                      <span className="text-[11px] text-[#717171]">El Salvador, Centro América</span>
                    )}

                    <button
                      type="button"
                      onClick={handlePublishNext}
                      disabled={publishSubmitting}
                      className="bg-[#E8A020] hover:bg-[#C88010] disabled:opacity-60 disabled:cursor-not-allowed text-[#0F0F0F] font-bold text-[12px] tracking-widest uppercase px-8 py-3 rounded-none transition-colors ml-auto cursor-pointer flex items-center gap-2"
                    >
                      {publishStep === 3 && publishSubmitting && (
                        <span className="w-3.5 h-3.5 border-2 border-[#0F0F0F]/30 border-t-[#0F0F0F] rounded-full animate-spin" />
                      )}
                      {publishStep === 3
                        ? publishUploadingPhoto
                          ? 'Subiendo foto...'
                          : publishSubmitting
                          ? 'Publicando...'
                          : 'Listo - Publicar Máquina'
                        : 'CONTINUAR'}
                    </button>
                  </div>

                </form>
              </section>

            </div>

          </main>

          {/* Form simple footer */}
          <footer className="bg-[#F5F4F0] border-t border-[#E2E2DE] py-6 px-4">
            <div className="max-w-[1140px] mx-auto flex flex-col sm:flex-row justify-between items-center text-[#717171] text-[11px] space-y-2 sm:space-y-0">
              <span>© {new Date().getFullYear()} iMaq El Salvador. Todos los derechos reservados.</span>
              <span className="font-serif-italic italic text-[#3A3A3A] text-[13px] font-semibold">"Alquila maquinaria, opera con confianza."</span>
            </div>
          </footer>

        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────
          PAGE 4: OWNER DASHBOARD (gated to loggedInUser.role === 'owner')
          ──────────────────────────────────────────────────────────────── */}
      {currentPage === 'dashboard' && loggedInUser?.role === 'owner' && (
        <main className="flex-1 bg-[#F5F4F0] py-12 px-4 max-w-[1140px] mx-auto w-full">

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <span className="block text-[10px] font-bold text-[#717171] uppercase tracking-[0.1em] mb-1">
                PANEL DE PROPIETARIO
              </span>
              <h1 className="text-[#0F0F0F] text-2xl sm:text-3xl font-extrabold tracking-tight">
                Hola, {loggedInUser.name}
              </h1>
            </div>
            <button
              onClick={() => navigateTo('publish')}
              className="bg-[#E8A020] hover:bg-[#C88010] text-[#0F0F0F] font-bold text-[12px] tracking-widest uppercase px-6 py-3 transition-colors cursor-pointer flex items-center gap-2"
            >
              <Plus size={14} /> Publicar máquina
            </button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            <div className="bg-white border border-[#E2E2DE] p-6">
              <span className="block text-[10px] font-bold text-[#717171] uppercase tracking-wider mb-2">Máquinas publicadas</span>
              <span className="block text-3xl font-extrabold text-[#0F0F0F]">{ownerMachines.length}</span>
            </div>
            <div className="bg-white border border-[#E2E2DE] p-6">
              <span className="block text-[10px] font-bold text-[#717171] uppercase tracking-wider mb-2">Disponibles</span>
              <span className="block text-3xl font-extrabold text-[#16793A]">
                {ownerMachines.filter((m) => m.status === 'available').length}
              </span>
            </div>
            <div className="bg-white border border-[#E2E2DE] p-6">
              <span className="block text-[10px] font-bold text-[#717171] uppercase tracking-wider mb-2">Alquiladas / Mantenimiento</span>
              <span className="block text-3xl font-extrabold text-[#C88010]">
                {ownerMachines.filter((m) => m.status !== 'available').length}
              </span>
            </div>
          </div>

          {/* Cotizaciones recibidas */}
          <div className="bg-white border border-[#E2E2DE] mb-8">
            <div className="p-5 border-b border-[#E2E2DE] flex items-center gap-2">
              <h2 className="text-[14px] font-bold text-[#0F0F0F]">Cotizaciones recibidas</h2>
              {cotizacionesRecibidas.filter((c) => c.estado === 'pendiente').length > 0 && (
                <span className="bg-[#991B1B] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {cotizacionesRecibidas.filter((c) => c.estado === 'pendiente').length}
                </span>
              )}
            </div>

            {cotizacionesRecibidasLoading ? (
              <div className="p-6 space-y-3">
                {[0, 1].map((i) => (
                  <div key={i} className="h-16 bg-[#F5F4F0] animate-pulse" />
                ))}
              </div>
            ) : cotizacionesRecibidas.length === 0 ? (
              <p className="p-6 text-[13px] text-[#717171]">Aún no has recibido cotizaciones.</p>
            ) : (
              <div className="p-5 space-y-3">
                {cotizacionesRecibidas.map((cot) => {
                  const maquina = machines.find((m) => Number(m.id) === cot.maquina_id);
                  const enAccion = cotizacionActionId === cot.id;
                  return (
                    <div key={cot.id} className="border border-[#E2E2DE] p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <p className="text-[13px] font-bold text-[#0F0F0F]">
                            {cot.arrendatario_nombre} — {maquina?.name || `Máquina #${cot.maquina_id}`}
                          </p>
                          <p className="text-[11px] text-[#717171]">
                            {cot.fecha_inicio} a {cot.fecha_fin} · ${formatPrice(cot.precio_propuesto)} propuesto
                            {cot.notas ? ` — "${cot.notas}"` : ''}
                          </p>
                        </div>
                        <span className="text-[9px] font-bold uppercase px-2 py-1 bg-[#F5F4F0] text-[#3A3A3A]">
                          {cot.estado}
                        </span>
                      </div>

                      {cot.estado === 'pendiente' && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleAceptarCotizacionRecibida(cot.id)}
                            disabled={enAccion}
                            className="bg-[#16793A] hover:bg-[#115C2C] text-white text-[10px] font-bold uppercase px-3 py-2 transition-colors disabled:opacity-60 cursor-pointer"
                          >
                            Aceptar
                          </button>
                          <button
                            onClick={() => handleAbrirContraoferta(cot.id)}
                            disabled={enAccion}
                            className="border border-[#0F0F0F] text-[#0F0F0F] hover:bg-[#F5F4F0] text-[10px] font-bold uppercase px-3 py-2 transition-colors disabled:opacity-60 cursor-pointer"
                          >
                            Contraofertar
                          </button>
                          <button
                            onClick={() => handleRechazarCotizacionRecibida(cot.id)}
                            disabled={enAccion}
                            className="border border-[#991B1B] text-[#991B1B] hover:bg-[#FEF2F2] text-[10px] font-bold uppercase px-3 py-2 transition-colors disabled:opacity-60 cursor-pointer"
                          >
                            Rechazar
                          </button>
                        </div>
                      )}

                      {contraofertaFormId === cot.id && (
                        <form onSubmit={(e) => handleSubmitContraoferta(e, cot.id)} className="bg-[#F9F9F7] border border-[#E2E2DE] p-3 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="date"
                              required
                              value={contraofertaFechaInicio}
                              onChange={(e) => setContraofertaFechaInicio(e.target.value)}
                              className="w-full bg-white border border-[#E2E2DE] text-[12px] p-2 focus:border-[#2B44C7] focus:outline-none focus:ring-2 focus:ring-[#2B44C7]/30"
                            />
                            <input
                              type="date"
                              required
                              value={contraofertaFechaFin}
                              onChange={(e) => setContraofertaFechaFin(e.target.value)}
                              className="w-full bg-white border border-[#E2E2DE] text-[12px] p-2 focus:border-[#2B44C7] focus:outline-none focus:ring-2 focus:ring-[#2B44C7]/30"
                            />
                          </div>
                          <input
                            type="number"
                            min={1}
                            required
                            placeholder="Precio propuesto (USD)"
                            value={contraofertaPrecio}
                            onChange={(e) => setContraofertaPrecio(e.target.value)}
                            className="w-full bg-white border border-[#E2E2DE] text-[12px] p-2 focus:border-[#2B44C7] focus:outline-none focus:ring-2 focus:ring-[#2B44C7]/30"
                          />
                          <textarea
                            rows={2}
                            placeholder="Notas (opcional)"
                            value={contraofertaNotas}
                            onChange={(e) => setContraofertaNotas(e.target.value)}
                            className="w-full bg-white border border-[#E2E2DE] text-[12px] p-2 focus:border-[#2B44C7] focus:outline-none focus:ring-2 focus:ring-[#2B44C7]/30 resize-none"
                          />
                          <button
                            type="submit"
                            disabled={enAccion}
                            className="bg-[#2B44C7] hover:bg-[#1B2D6B] text-white text-[10px] font-bold uppercase px-3 py-2 transition-colors disabled:opacity-60 cursor-pointer"
                          >
                            Enviar contraoferta
                          </button>
                        </form>
                      )}

                      {cot.estado === 'aceptada' && (
                        <div className="flex items-center gap-3 flex-wrap">
                          <p className="text-[12px] text-[#16793A] font-semibold">¡Alquiler confirmado!</p>
                          <button
                            onClick={() =>
                              handleAvisarWhatsApp(
                                cot.arrendatario_telefono,
                                `Hola ${cot.arrendatario_nombre}, confirmé tu cotización en iMaq para "${maquina?.name || 'la máquina'}" del ${formatFechaCorta(cot.fecha_inicio_contraoferta || cot.fecha_inicio)} al ${formatFechaCorta(cot.fecha_fin_contraoferta || cot.fecha_fin)}. ¡Alquiler confirmado!`
                              )
                            }
                            className="text-[10px] font-bold uppercase text-[#16793A] hover:underline flex items-center gap-1"
                          >
                            <PhoneCall size={12} /> Avisar por WhatsApp
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Owner's machines table */}
          <div className="bg-white border border-[#E2E2DE]">
            <div className="p-5 border-b border-[#E2E2DE]">
              <h2 className="text-[14px] font-bold text-[#0F0F0F]">Mis máquinas</h2>
            </div>

            {machinesLoading ? (
              <div className="p-6 space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-10 bg-[#F5F4F0] animate-pulse" />
                ))}
              </div>
            ) : ownerMachines.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-16 px-6">
                <Wrench size={28} className="text-[#717171] mb-3" />
                <h3 className="text-[15px] font-bold text-[#0F0F0F] mb-1">Todavía no has publicado ninguna máquina</h3>
                <p className="text-[13px] text-[#717171] max-w-[360px] mb-5">
                  Publica tu primer equipo para que otros contratistas puedan encontrarlo y alquilarlo.
                </p>
                <button
                  onClick={() => navigateTo('publish')}
                  className="bg-[#0F0F0F] hover:bg-[#3A3A3A] text-white text-[12px] font-bold uppercase tracking-widest px-5 py-2.5 transition-colors cursor-pointer"
                >
                  Publicar mi primera máquina
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[#E2E2DE] text-[10px] uppercase tracking-wider text-[#717171]">
                      <th className="p-4 font-bold">Nombre</th>
                      <th className="p-4 font-bold">Tipo</th>
                      <th className="p-4 font-bold">Precio/día</th>
                      <th className="p-4 font-bold">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ownerMachines.map((machine) => (
                      <tr key={machine.id} className="border-b border-[#F5F4F0] hover:bg-[#F9F9F7] cursor-pointer" onClick={() => setSelectedMachine(machine)}>
                        <td className="p-4 text-[13px] font-bold text-[#0F0F0F]">{machine.name}</td>
                        <td className="p-4 text-[13px] text-[#3A3A3A] font-mono-imaq uppercase">{machine.cat}</td>
                        <td className="p-4 text-[13px] font-mono-imaq text-[#C88010] font-bold">${formatPrice(machine.price)}/{machine.priceUnit === 'hora' ? 'hora' : 'día'}</td>
                        <td className="p-4">
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 ${
                            machine.status === 'available'
                              ? 'bg-[#E8F5ED] text-[#16793A]'
                              : machine.status === 'rented'
                              ? 'bg-[#FEF2F2] text-[#991B1B]'
                              : 'bg-[#FFF9E6] text-[#C88010]'
                          }`}>
                            {machine.status === 'available' ? 'DISPONIBLE' : machine.status === 'rented' ? 'ALQUILADO' : 'MANTENIMIENTO'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </main>
      )}

      {/* ────────────────────────────────────────────────────────────────
          PAGE 5: MY PROFILE (gated to any logged-in user)
          ──────────────────────────────────────────────────────────────── */}
      {currentPage === 'profile' && loggedInUser && (
        <ProfilePage
          user={loggedInUser}
          machines={machines}
          onUserChange={setLoggedInUser}
          addToast={addToast}
          onNavigatePublish={() => navigateTo('publish')}
          onLogout={handleLogout}
        />
      )}

      {/* ────────────────────────────────────────────────────────────────
          SHARED FOOTER (Only shown if NOT on the Publish page)
          ──────────────────────────────────────────────────────────────── */}
      {currentPage !== 'publish' && (
        <footer className="bg-[#F5F4F0] border-t border-[#E2E2DE] py-14 px-4">
          <div className="max-w-[1140px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12 pb-10">
            
            {/* Column 1 - Brand */}
            <div className="lg:col-span-5 space-y-4">
              <span className="text-[20px] font-extrabold tracking-[-0.03em] font-sans text-[#0F0F0F]">
                i<span className="text-[#2B44C7]">M</span>aq
              </span>
              <p className="text-[#717171] text-[13px] leading-relaxed max-w-[340px]">
                Soluciones de infraestructura y maquinaria pesada con estándares de ingeniería global en Centroamérica.
              </p>
              
              {/* IG + Email contacts */}
              <div className="flex gap-2.5 pt-2">
                <a 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); addToast('@iMaq_sv en Instagram', 'info'); }}
                  className="w-8 h-8 rounded-none border border-[#E2E2DE] bg-white flex items-center justify-center text-[#3A3A3A] hover:bg-black hover:text-white transition-colors"
                >
                  <Instagram size={14} />
                </a>
                <a 
                  href="mailto:info@imaq.com.sv" 
                  className="w-8 h-8 rounded-none border border-[#E2E2DE] bg-white flex items-center justify-center text-[#3A3A3A] hover:bg-black hover:text-white transition-colors"
                >
                  <Mail size={14} />
                </a>
              </div>
            </div>

            {/* Column 2 - Explorar */}
            <div className="lg:col-span-2 space-y-3">
              <h4 className="text-[10px] font-bold uppercase text-[#0F0F0F] tracking-widest">
                EXPLORAR
              </h4>
              <ul className="space-y-2">
                <li>
                  <button onClick={() => navigateTo('home')} className="text-[13px] text-[#717171] hover:text-[#2B44C7] hover:underline">
                    Máquinas
                  </button>
                </li>
                <li>
                  <button onClick={() => navigateTo('operators')} className="text-[13px] text-[#717171] hover:text-[#2B44C7] hover:underline">
                    Operadores
                  </button>
                </li>
                <li>
                  <button onClick={() => addToast('Pestaña informativa. Explore el catálogo.', 'info')} className="text-[13px] text-[#717171] hover:text-[#2B44C7] hover:underline">
                    Cómo funciona
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3 - Legal */}
            <div className="lg:col-span-2 space-y-3">
              <h4 className="text-[10px] font-bold uppercase text-[#0F0F0F] tracking-widest">
                LEGAL
              </h4>
              <ul className="space-y-2 text-[13px]">
                <li>
                  <a href="#" onClick={(e) => { e.preventDefault(); addToast('Condiciones de privacidad.', 'info'); }} className="text-[#717171] hover:text-[#2B44C7] hover:underline">
                    Privacidad
                  </a>
                </li>
                <li>
                  <a href="#" onClick={(e) => { e.preventDefault(); addToast('Términos y condiciones.', 'info'); }} className="text-[#717171] hover:text-[#2B44C7] hover:underline">
                    Términos
                  </a>
                </li>
                <li>
                  <a href="#" onClick={(e) => { e.preventDefault(); addToast('Pólizas de seguro de maquinaria.', 'info'); }} className="text-[#717171] hover:text-[#2B44C7] hover:underline">
                    Seguros
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 4 - Newsletter */}
            <div className="lg:col-span-3 space-y-3">
              <h4 className="text-[10px] font-bold uppercase text-[#0F0F0F] tracking-widest">
                NEWSLETTER
              </h4>
              <p className="text-[#717171] text-[12px] leading-relaxed">
                Reciba actualizaciones del mercado industrial.
              </p>
              
              <form onSubmit={handleNewsletterSubmit} className="flex border border-[#E2E2DE] overflow-hidden bg-white">
                <input 
                  type="email" 
                  required
                  placeholder="Email" 
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  className="bg-transparent text-[13px] p-2 focus:outline-none focus:ring-2 focus:ring-[#2B44C7]/30 flex-1 font-sans placeholder-[#B0B0B0] border-none"
                />
                <button 
                  type="submit"
                  className="bg-[#2B44C7] hover:bg-[#1B2D6B] text-white px-3 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Send size={14} />
                </button>
              </form>
            </div>

          </div>

          {/* Bottom attribution row */}
          <div className="max-w-[1140px] mx-auto border-t border-[#E2E2DE] pt-7 flex flex-col sm:flex-row justify-between items-center text-[#717171] text-[12px] gap-4">
            <span>© 2024 iMaq El Salvador. Todos los derechos reservados.</span>
            <span className="font-serif-italic italic text-[#717171] text-[20px] font-semibold select-none">
              Construyendo el futuro.
            </span>
          </div>

        </footer>
      )}

      {/* ────────────────────────────────────────────────────────────────
          MACHINE DETAIL MODAL
          ──────────────────────────────────────────────────────────────── */}
      <Modal open={!!selectedMachine} onClose={() => setSelectedMachine(null)} maxWidth="max-w-[760px]">
        {selectedMachine && (
          <>
            {/* Top Banner machine photo */}
            <div className="h-[180px] w-full relative bg-[#E2E2DE] shrink-0">
              <img
                src={getImageUrl(selectedMachine.img, 'maquina')}
                alt={selectedMachine.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent flex items-end p-6">
                <span className="bg-[#E8F5ED] text-[#16793A] text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 mb-0.5">
                  {selectedMachine.status === 'available' ? 'DISPONIBLE EN EL SALVADOR' : 'CONTRATADO'}
                </span>
              </div>
            </div>

            {/* Essential info & primary actions — always visible, never scrolls */}
            <div className="p-6 md:p-8 pb-5 space-y-4 shrink-0">

              {/* Header info */}
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-mono-imaq text-[10px] text-[#717171] uppercase tracking-[0.04em] mb-0.5 block">
                    {selectedMachine.cat}
                  </span>
                  <h3 className="text-2xl font-bold text-[#0F0F0F] tracking-tight">
                    {selectedMachine.name}
                  </h3>
                </div>

                {/* Bordered X close square */}
                <button
                  onClick={() => setSelectedMachine(null)}
                  className="w-8 h-8 rounded-none border border-[#E2E2DE] hover:bg-[#F5F4F0] flex items-center justify-center text-[#717171] transition-colors shrink-0"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-2 font-normal text-[13px] text-[#3A3A3A]">
                <div className="flex items-center space-x-3">
                  <MapPin size={15} className="text-[#2B44C7] shrink-0" />
                  <span><strong>Ubicación:</strong> {selectedMachine.location}</span>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="text-[#C88010] font-bold text-[14px] font-mono-imaq leading-none shrink-0">$</span>
                  <span><strong>Tarifa:</strong> <span className="font-mono-imaq text-[#C88010] font-bold">${formatPrice(selectedMachine.price)} USD</span> / {selectedMachine.priceUnit === 'hora' ? 'hora' : 'día'}</span>
                </div>

                <div className="flex items-center space-x-3">
                  <User size={15} className="text-[#2B44C7] shrink-0" />
                  <span><strong>Propietario:</strong> {selectedMachine.owner}</span>
                </div>

                <p className="text-[12px] text-[#717171] leading-relaxed pt-1">
                  {selectedMachine.description}
                </p>
              </div>

              {/* WhatsApp Action Buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={(e) => handleWhatsAppContact(e, selectedMachine)}
                  className="bg-[#16793A] hover:bg-[#115C2C] text-white font-bold text-[11px] uppercase tracking-wider px-4 py-3 rounded-none transition-colors flex items-center justify-center gap-2 flex-1 cursor-pointer"
                >
                  <PhoneCall size={14} /> WhatsApp
                </button>
                {!cotizacionEnviada && (
                  <button
                    onClick={handleAbrirFormularioCotizar}
                    className="bg-transparent text-[#0F0F0F] border border-[#0F0F0F] hover:bg-[#F5F4F0] font-bold text-[11px] uppercase tracking-wider px-4 py-3 rounded-none transition-colors flex-1 cursor-pointer"
                  >
                    Cotizar
                  </button>
                )}
              </div>

              {/* Cotizar form */}
              {isCotizarFormOpen && !cotizacionEnviada && (
                <form onSubmit={handleSubmitCotizacion} className="border border-[#E2E2DE] p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold uppercase text-[#717171] mb-1">Fecha inicio</label>
                      <input
                        type="date"
                        required
                        value={cotizarFechaInicio}
                        onChange={(e) => setCotizarFechaInicio(e.target.value)}
                        className="w-full bg-white border border-[#E2E2DE] text-[#0F0F0F] text-[12px] font-medium p-2.5 focus:border-[#2B44C7] focus:outline-none focus:ring-2 focus:ring-[#2B44C7]/30"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold uppercase text-[#717171] mb-1">Fecha fin</label>
                      <input
                        type="date"
                        required
                        value={cotizarFechaFin}
                        onChange={(e) => setCotizarFechaFin(e.target.value)}
                        className="w-full bg-white border border-[#E2E2DE] text-[#0F0F0F] text-[12px] font-medium p-2.5 focus:border-[#2B44C7] focus:outline-none focus:ring-2 focus:ring-[#2B44C7]/30"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase text-[#717171] mb-1">Precio propuesto (USD)</label>
                    <input
                      type="number"
                      min={1}
                      required
                      placeholder="Ej: 90"
                      value={cotizarPrecio}
                      onChange={(e) => setCotizarPrecio(e.target.value)}
                      className="w-full bg-white border border-[#E2E2DE] text-[#0F0F0F] text-[12px] font-medium p-2.5 focus:border-[#2B44C7] focus:outline-none focus:ring-2 focus:ring-[#2B44C7]/30"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase text-[#717171] mb-1">Notas (opcional)</label>
                    <textarea
                      rows={2}
                      value={cotizarNotas}
                      onChange={(e) => setCotizarNotas(e.target.value)}
                      className="w-full bg-white border border-[#E2E2DE] text-[#0F0F0F] text-[12px] font-medium p-2.5 focus:border-[#2B44C7] focus:outline-none focus:ring-2 focus:ring-[#2B44C7]/30 resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={cotizarSubmitting}
                    className="w-full bg-[#2B44C7] hover:bg-[#1B2D6B] text-white font-bold text-[11px] uppercase tracking-wider px-4 py-3 transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    {cotizarSubmitting ? 'Enviando…' : 'Enviar cotización'}
                  </button>
                </form>
              )}

              {/* Success state after sending a cotización */}
              {cotizacionEnviada && (
                <div className="bg-[#E8F5ED] border border-[#16793A]/20 p-4 space-y-3">
                  <p className="text-[13px] text-[#16793A] leading-relaxed">
                    ¡Cotización enviada! {selectedMachine.owner} la verá en su panel.
                  </p>
                  <button
                    onClick={() =>
                      handleAvisarWhatsApp(
                        selectedMachine.telefonoContacto,
                        `Hola ${selectedMachine.owner}, te mandé una cotización en iMaq para tu "${selectedMachine.name}" del ${formatFechaCorta(cotizacionEnviada.fecha_inicio)} al ${formatFechaCorta(cotizacionEnviada.fecha_fin)}. Puedes verla en tu panel.`
                      )
                    }
                    className="w-full bg-[#16793A] hover:bg-[#115C2C] text-white font-bold text-[11px] uppercase tracking-wider px-4 py-3 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <PhoneCall size={14} /> Avisar a {selectedMachine.owner} por WhatsApp
                  </button>
                </div>
              )}
            </div>

            {/* Secondary sections — collapsible, internal scroll only */}
            <div className="overflow-y-auto flex-1 min-h-0 px-6 md:px-8 pb-6 space-y-0 border-t border-[#E2E2DE]">

              <Collapsible title="Historial de alquileres">
                <div className="relative pl-6 space-y-6">
                  {/* Visual Timeline line */}
                  <div className="absolute top-1 left-2 w-[1px] h-[80%] bg-[#E2E2DE]" />

                  {rentalHistoryLoading && (
                    <div className="relative text-[12px] leading-tight flex flex-col space-y-1 animate-pulse">
                      <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#E2E2DE]" />
                      <span className="h-3 w-24 bg-[#E2E2DE]" />
                    </div>
                  )}

                  {!rentalHistoryLoading && machineRentalHistory.length === 0 && (
                    <div className="relative text-[12px] leading-tight flex flex-col space-y-1">
                      <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#E2E2DE]" />
                      <span className="text-[#717171]">Sin historial de alquileres aún</span>
                    </div>
                  )}

                  {!rentalHistoryLoading &&
                    machineRentalHistory.slice(0, 4).map((alquiler, i) => (
                      <div key={i} className="relative text-[12px] leading-tight flex flex-col space-y-1">
                        <span
                          className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full ${
                            alquiler.estado === 'activo' ? 'bg-[#2B44C7] animate-pulse' : 'bg-[#16793A]'
                          }`}
                        />
                        <span className="font-bold text-[#0F0F0F]">
                          {alquiler.estado === 'activo' ? 'Alquiler en curso' : 'Alquiler finalizado'}
                        </span>
                        <span className="text-[#717171] font-mono-imaq text-[11px]">
                          {formatFechaCorta(alquiler.fecha_inicio)} – {formatFechaCorta(alquiler.fecha_fin)}
                        </span>
                      </div>
                    ))}

                  {/* State Now */}
                  <div className="relative text-[12px] leading-tight flex flex-col space-y-1">
                    <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#2B44C7] animate-pulse" />
                    <span className="font-bold text-[#2B44C7]">
                      {selectedMachine.status === 'available' ? 'Disponible ahora' : 'No disponible actualmente'}
                    </span>
                    <span className="text-[#717171]">
                      {selectedMachine.status === 'available' ? 'Listo para alquilar' : 'Contratado / en mantenimiento'}
                    </span>
                  </div>
                </div>
              </Collapsible>

              <Collapsible title="Operadores disponibles para este equipo">
                <div className="space-y-3">
                  {operators.slice(0, 2).map((op) => (
                    <div
                      key={op.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between border border-[#E2E2DE] p-3 hover:bg-[#F9F9F7] transition-all gap-4"
                    >

                      <div className="flex items-center space-x-4">
                        <img
                          src={op.img}
                          alt={op.name}
                          className="w-10 h-10 rounded-full object-cover shrink-0 bg-[#E2E2DE]"
                        />
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="text-[13px] font-bold text-[#0F0F0F]">{op.name}</h4>
                            <span className="bg-[#E8F5ED] text-[#16793A] text-[8px] font-bold px-1.5 py-0.5 uppercase tracking-wide">
                              ✓ VERIFICADO
                            </span>
                          </div>
                          <p className="text-[11px] text-[#717171]">
                            {op.specialty} · {op.exp} exp · {op.loc}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                        <div className="text-right sm:mr-3">
                          <span className="block text-[8px] uppercase text-[#717171] leading-none">Tarifa Ref</span>
                          <span className="font-mono-imaq text-[14px] font-bold text-[#C88010]">
                            {op.tarifaDia ? `$${formatPrice(op.tarifaDia)}/día` : 'Consultar'}
                          </span>
                        </div>

                        <button
                          onClick={(e) => handleOperatorContact(e, op)}
                          className="bg-[#2B44C7] hover:bg-[#1B2D6B] text-white text-[10px] font-bold uppercase tracking-wider px-4 py-2 transition-colors cursor-pointer"
                        >
                          Contratar
                        </button>
                      </div>

                    </div>
                  ))}
                </div>
              </Collapsible>

              <Collapsible
                title="Calificaciones de clientes"
                badge={
                  machineRatings.length > 0
                    ? `${(machineRatings.reduce((sum, r) => sum + r.estrellas, 0) / machineRatings.length).toFixed(1)} ★ (${machineRatings.length})`
                    : undefined
                }
              >
                {ratingsLoading && (
                  <p className="text-[12px] text-[#717171]">Cargando calificaciones…</p>
                )}

                {!ratingsLoading && machineRatings.length === 0 && (
                  <p className="text-[12px] text-[#717171]">Esta máquina aún no tiene calificaciones.</p>
                )}

                {!ratingsLoading && machineRatings.length > 0 && (
                  <div className="space-y-3">
                    {machineRatings.slice(0, 4).map((rating) => (
                      <div key={rating.id} className="border border-[#E2E2DE] p-3">
                        <div className="flex items-center gap-0.5 mb-1.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={12}
                              className={star <= rating.estrellas ? 'fill-[#E8A020] stroke-[#E8A020]' : 'stroke-[#E2E2DE]'}
                            />
                          ))}
                        </div>
                        {rating.comentario && (
                          <p className="text-[12px] text-[#3A3A3A] leading-relaxed">{rating.comentario}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Collapsible>
            </div>

            {/* Modal footer closing trigger */}
            <div className="bg-[#F5F4F0] px-6 py-4 border-t border-[#E2E2DE] flex justify-end shrink-0">
              <button
                onClick={() => setSelectedMachine(null)}
                className="bg-[#0F0F0F] hover:bg-[#3A3A3A] text-white text-[11px] font-bold uppercase tracking-widest px-5 py-2 cursor-pointer"
              >
                CERRAR VENTANA
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* ────────────────────────────────────────────────────────────────
          AUTH / REGISTER MODAL (Ingresar / Registrarse)
          ──────────────────────────────────────────────────────────────── */}
      <Modal
        open={isAuthModalOpen}
        onClose={() => { setIsAuthModalOpen(false); setIsOperatorOnlyRegistration(false); resetForgotPasswordFlow(); }}
        maxWidth="max-w-[420px]"
      >

              {/* Title & Brand Intro (fixed, doesn't scroll) */}
              <div className="p-5 pb-3 text-center space-y-1.5 shrink-0">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[20px] font-extrabold tracking-[-0.03em] font-sans text-[#0F0F0F] text-left">
                    i<span className="text-[#2B44C7]">M</span>aq
                  </span>

                  <button
                    onClick={() => { setIsAuthModalOpen(false); setIsOperatorOnlyRegistration(false); resetForgotPasswordFlow(); }}
                    className="text-[#717171] hover:text-[#0F0F0F]"
                  >
                    <X size={18} />
                  </button>
                </div>
                <p className="text-[12px] text-[#717171] uppercase font-bold tracking-wider leading-none text-left">
                  Marketplace de maquinaria de construcción
                </p>
              </div>

              {/* Toggle switch tabs (fixed, doesn't scroll) */}
              <div className="grid grid-cols-2 border-t border-b border-[#E2E2DE] divide-x divide-[#E2E2DE] shrink-0">
                <button
                  onClick={() => { setAuthTab('login'); }}
                  className={`py-3 text-[12px] font-bold uppercase tracking-widest transition-colors cursor-pointer ${
                    authTab === 'login'
                      ? 'bg-[#0F0F0F] text-white'
                      : 'bg-white text-[#717171] hover:bg-[#F9F9F7]'
                  }`}
                >
                  Ingresar
                </button>
                <button
                  onClick={() => { setAuthTab('register'); resetForgotPasswordFlow(); }}
                  className={`py-3 text-[12px] font-bold uppercase tracking-widest transition-colors cursor-pointer ${
                    authTab === 'register'
                      ? 'bg-[#0F0F0F] text-white'
                      : 'bg-white text-[#717171] hover:bg-[#F9F9F7]'
                  }`}
                >
                  Registrarse
                </button>
              </div>

              {/* Login block */}
              {authTab === 'login' ? (
                showForgotPassword ? (
                  /* Forgot-password sub-step, inline within the login tab */
                  <form onSubmit={handleForgotPasswordSubmit} className="flex flex-col flex-1 min-h-0">
                    <div className="overflow-y-auto flex-1 p-8 space-y-4">
                    <button
                      type="button"
                      onClick={resetForgotPasswordFlow}
                      className="text-[11px] font-semibold text-[#717171] hover:text-[#0F0F0F] flex items-center gap-1"
                    >
                      ← Volver a ingresar
                    </button>

                    {forgotSent ? (
                      <div className="bg-[#E8F5ED] border border-[#16793A]/20 p-4">
                        <p className="text-[13px] text-[#16793A] leading-relaxed">
                          Si existe una cuenta con ese email, recibirás un link en los próximos minutos.
                        </p>
                      </div>
                    ) : (
                      <>
                        <p className="text-[12px] text-[#717171] leading-relaxed">
                          Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
                        </p>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-[#717171] mb-1.5">
                            Correo Electrónico
                          </label>
                          <input
                            type="email"
                            required
                            placeholder="Ej: constructor@obras.sv"
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            className="w-full bg-white border border-[#E2E2DE] text-[#0F0F0F] text-[13px] font-medium p-3 focus:border-[#2B44C7] focus:outline-none focus:ring-2 focus:ring-[#2B44C7]/30"
                          />
                        </div>
                      </>
                    )}
                    </div>
                    {!forgotSent && (
                      <div className="p-8 pt-4 border-t border-[#E2E2DE] shrink-0">
                        <button
                          type="submit"
                          disabled={forgotLoading}
                          className="w-full py-3 bg-[#0F0F0F] hover:bg-[#3A3A3A] disabled:opacity-60 disabled:cursor-not-allowed text-white text-[12px] font-bold uppercase tracking-widest transition-colors cursor-pointer"
                        >
                          {forgotLoading ? 'Enviando...' : 'Enviar instrucciones'}
                        </button>
                      </div>
                    )}
                  </form>
                ) : (
                <form onSubmit={handleLoginSubmit} className="flex flex-col flex-1 min-h-0">
                  <div className="overflow-y-auto flex-1 p-8 space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#717171] mb-1.5">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="Ej: constructor@obras.sv"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full bg-white border border-[#E2E2DE] text-[#0F0F0F] text-[13px] font-medium p-3 focus:border-[#2B44C7] focus:outline-none focus:ring-2 focus:ring-[#2B44C7]/30"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#717171] mb-1.5">
                      Contraseña
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full bg-white border border-[#E2E2DE] text-[#0F0F0F] text-[13px] font-medium p-3 focus:border-[#2B44C7] focus:outline-none focus:ring-2 focus:ring-[#2B44C7]/30"
                    />
                  </div>
                  </div>

                  <div className="p-8 pt-4 border-t border-[#E2E2DE] space-y-3 shrink-0">
                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full py-3 bg-[#0F0F0F] hover:bg-[#3A3A3A] disabled:opacity-60 disabled:cursor-not-allowed text-white text-[12px] font-bold uppercase tracking-widest transition-colors cursor-pointer"
                    >
                      {authLoading ? 'Ingresando...' : 'Ingresar con mi cuenta'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="w-full text-center text-[12px] font-semibold text-[#2B44C7] hover:underline"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                </form>
                )
              ) : (
                /* Register block with Account types grid selector */
                <form onSubmit={handleRegisterSubmit} className="flex flex-col flex-1 min-h-0">
                <div className="overflow-y-auto flex-1 p-8 space-y-3">

                  {isOperatorOnlyRegistration ? (
                    <div className="bg-[#E8F5ED] border border-[#2B44C7]/30 p-2 flex items-center gap-2">
                      <span className="text-[14px]">👷</span>
                      <span className="text-[13px] font-bold text-[#0F0F0F]">Registro de Operador</span>
                    </div>
                  ) : (
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold uppercase text-[#717171] mb-1.5">
                      TIPO DE CUENTA
                    </label>

                    <div className="grid grid-cols-1 gap-2">

                      {/* Operator Option */}
                      <div
                        onClick={() => setRegisterRole('operator')}
                        className={`p-3 border text-left cursor-pointer transition-colors ${
                          registerRole === 'operator'
                            ? 'bg-[#E8F5ED] border-[#2B44C7]'
                            : 'bg-white border-[#E2E2DE] hover:bg-[#F9F9F7]'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-[14px]">👷</span>
                          <span className="text-[13px] font-bold text-[#0F0F0F]">Operador</span>
                        </div>
                        <span className="block text-[11px] text-[#717171] mt-0.5">
                          Quiero ofrecer mis servicios y ser contratado.
                        </span>
                      </div>

                      {/* Owner Option */}
                      <div
                        onClick={() => setRegisterRole('owner')}
                        className={`p-3 border text-left cursor-pointer transition-colors ${
                          registerRole === 'owner'
                            ? 'bg-[#E8F5ED] border-[#2B44C7]'
                            : 'bg-white border-[#E2E2DE] hover:bg-[#F9F9F7]'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-[14px]">🏗️</span>
                          <span className="text-[13px] font-bold text-[#0F0F0F]">Propietario</span>
                        </div>
                        <span className="block text-[11px] text-[#717171] mt-0.5">
                          Tengo maquinaria pesada para listar en alquiler.
                        </span>
                      </div>

                      {/* Renter Option */}
                      <div
                        onClick={() => setRegisterRole('renter')}
                        className={`p-3 border text-left cursor-pointer transition-colors ${
                          registerRole === 'renter'
                            ? 'bg-[#E8F5ED] border-[#2B44C7]'
                            : 'bg-white border-[#E2E2DE] hover:bg-[#F9F9F7]'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-[14px]">🏢</span>
                          <span className="text-[13px] font-bold text-[#0F0F0F]">Arrendatario</span>
                        </div>
                        <span className="block text-[11px] text-[#717171] mt-0.5">
                          Necesito alquilar maquinaria para mis obras viles.
                        </span>
                      </div>

                    </div>
                  </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#717171] mb-1">
                      Nombre Completo
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Ing. Jorge Iraheta"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="w-full bg-white border border-[#E2E2DE] text-[#0F0F0F] text-[13px] font-medium p-3 focus:border-[#2B44C7] focus:outline-none focus:ring-2 focus:ring-[#2B44C7]/30"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#717171] mb-1">
                      DUI
                    </label>
                    <input
                      type="text"
                      required
                      inputMode="numeric"
                      placeholder="01234567-8"
                      value={regDui}
                      onChange={(e) => {
                        setRegDui(formatDui(e.target.value));
                        setRegDuiError(null);
                        setDuiConflictMessage(false);
                      }}
                      onBlur={() => {
                        if (regDui && !DUI_REGEX.test(regDui)) {
                          setRegDuiError('Formato inválido. Ejemplo: 01234567-8');
                        }
                      }}
                      maxLength={10}
                      className={`w-full bg-white border text-[#0F0F0F] text-[13px] font-medium p-3 focus:outline-none focus:ring-2 focus:ring-[#2B44C7]/30 font-mono-imaq ${
                        regDuiError ? 'border-[#991B1B]' : 'border-[#E2E2DE] focus:border-[#2B44C7]'
                      }`}
                    />
                    {regDuiError && <p className="text-[11px] text-[#991B1B] mt-1">{regDuiError}</p>}
                    {duiConflictMessage && (
                      <p className="text-[11px] text-[#991B1B] mt-1">
                        Ya existe una cuenta con este DUI.{' '}
                        <button
                          type="button"
                          onClick={() => {
                            setAuthTab('login');
                            setShowForgotPassword(true);
                            setForgotEmail(regEmail);
                          }}
                          className="font-bold underline hover:text-[#0F0F0F]"
                        >
                          ¿Olvidaste tu contraseña?
                        </button>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#717171] mb-1">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="Ej: jorge@infraestructuras.sv"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full bg-white border border-[#E2E2DE] text-[#0F0F0F] text-[13px] font-medium p-3 focus:border-[#2B44C7] focus:outline-none focus:ring-2 focus:ring-[#2B44C7]/30"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#717171] mb-1">
                      WhatsApp
                    </label>
                    <div className="flex">
                      <span className="flex items-center px-3 bg-[#F5F4F0] border border-r-0 border-[#E2E2DE] text-[#717171] text-[13px] font-bold font-mono-imaq">
                        {PHONE_PREFIX}
                      </span>
                      <input
                        type="text"
                        required
                        inputMode="numeric"
                        placeholder="7868-8174"
                        value={regPhone}
                        onChange={(e) => setRegPhone(formatLocalPhone(e.target.value))}
                        maxLength={9}
                        className="w-full bg-white border border-[#E2E2DE] text-[#0F0F0F] text-[13px] font-medium p-3 focus:border-[#2B44C7] focus:outline-none focus:ring-2 focus:ring-[#2B44C7]/30 font-mono-imaq"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#717171] mb-1">
                      Contraseña
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Cree una contraseña segura"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full bg-white border border-[#E2E2DE] text-[#0F0F0F] text-[13px] font-medium p-3 focus:border-[#2B44C7] focus:outline-none focus:ring-2 focus:ring-[#2B44C7]/30"
                    />
                  </div>

                  {isOperatorOnlyRegistration && (
                    <>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-[#717171] mb-1.5">
                          Tipos de máquina que opera
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {OPERATOR_MACHINE_TYPES.map((tipo) => {
                            const checked = operatorMachineTypes.includes(tipo);
                            return (
                              <label
                                key={tipo}
                                className={`flex items-center gap-2 p-2 border text-[12px] font-medium cursor-pointer transition-colors ${
                                  checked ? 'bg-[#E8F5ED] border-[#2B44C7] text-[#0F0F0F]' : 'bg-white border-[#E2E2DE] text-[#3A3A3A]'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) =>
                                    setOperatorMachineTypes((prev) =>
                                      e.target.checked ? [...prev, tipo] : prev.filter((t) => t !== tipo)
                                    )
                                  }
                                  className="w-3.5 h-3.5 text-[#2B44C7] focus:ring-0 border-[#E2E2DE]"
                                />
                                {tipo}
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-[#717171] mb-1">
                            Años de experiencia
                          </label>
                          <input
                            type="number"
                            min={0}
                            placeholder="Ej: 5"
                            value={operatorExperience}
                            onChange={(e) => setOperatorExperience(e.target.value)}
                            className="w-full bg-white border border-[#E2E2DE] text-[#0F0F0F] text-[13px] font-medium p-3 focus:border-[#2B44C7] focus:outline-none focus:ring-2 focus:ring-[#2B44C7]/30"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-[#717171] mb-1">
                            Tarifa por día (USD)
                          </label>
                          <input
                            type="number"
                            min={0}
                            placeholder="Ej: 30"
                            value={operatorRate}
                            onChange={(e) => setOperatorRate(e.target.value)}
                            className="w-full bg-white border border-[#E2E2DE] text-[#0F0F0F] text-[13px] font-medium p-3 focus:border-[#2B44C7] focus:outline-none focus:ring-2 focus:ring-[#2B44C7]/30"
                          />
                        </div>
                      </div>
                    </>
                  )}

                </div>

                <div className="p-6 border-t border-[#E2E2DE] shrink-0">
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3 bg-[#0F0F0F] hover:bg-[#3A3A3A] disabled:opacity-60 disabled:cursor-not-allowed text-white text-[12px] font-bold uppercase tracking-widest transition-colors cursor-pointer"
                  >
                    {authLoading ? 'Creando cuenta...' : 'Crear cuenta gratis'}
                  </button>
                </div>

                </form>
              )}

      </Modal>

      {/* ────────────────────────────────────────────────────────────────
          BOTTOM-RIGHT INTERACTIVE TOAST NOTIFICATIONS
          ──────────────────────────────────────────────────────────────── */}
      <div className="fixed bottom-6 right-6 z-[100] space-y-2 pointer-events-none max-w-[340px] w-full">
        <AnimatePresence>
          {toasts.map((toast) => {
            const toastStyles = {
              success: { bg: 'bg-[#16793A]', icon: '✓' },
              error: { bg: 'bg-[#991B1B]', icon: '✕' },
              info: { bg: 'bg-[#2B44C7]', icon: 'ℹ' },
            }[toast.type];
            return (
              <motion.div
                key={toast.id}
                initial={{ y: 20, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -10, opacity: 0 }}
                className={`${toastStyles.bg} text-white p-4 flex items-center space-x-3 shadow-xl border border-white/10 pointer-events-auto`}
              >
                <div className="text-white shrink-0 font-bold">{toastStyles.icon}</div>
                <p className="text-[12px] font-sans font-medium">
                  {toast.message}
                </p>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

    </div>
  );
}
