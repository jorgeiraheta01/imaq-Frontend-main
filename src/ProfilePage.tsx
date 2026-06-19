import React, { useEffect, useState } from 'react';
import {
  Camera,
  Check,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { Machine, User as UserProfile, AlquilerApi, OperadorApi, TipoDocumento } from './types';
import {
  ApiError,
  actualizarOperador,
  actualizarUsuario,
  cambiarPassword,
  cerrarTodasLasSesiones,
  crearDocumentoVerificacion,
  crearOperador,
  listarMisAlquileres,
  listarOperadores,
} from './lib/api';
import { setCurrentUser } from './lib/auth';
import { subirImagenACloudinary } from './lib/cloudinary';

interface ProfilePageProps {
  user: UserProfile;
  machines: Machine[];
  onUserChange: (user: UserProfile) => void;
  addToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  onNavigatePublish: () => void;
  onLogout: () => void;
}

const ROL_BADGE: Record<NonNullable<UserProfile['role']>, { label: string; bg: string; text: string }> = {
  owner: { label: 'Propietario', bg: 'bg-[#E8F5ED]', text: 'text-[#16793A]' },
  operator: { label: 'Operador', bg: 'bg-[#FFF9E6]', text: 'text-[#C88010]' },
  renter: { label: 'Arrendatario', bg: 'bg-[#EEF1FD]', text: 'text-[#2B44C7]' },
};

export default function ProfilePage({ user, machines, onUserChange, addToast, onNavigatePublish, onLogout }: ProfilePageProps) {
  const [nombre, setNombre] = useState(user.name);
  const [telefono, setTelefono] = useState(user.whatsapp || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [docTipo, setDocTipo] = useState<TipoDocumento>('dui');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [submittingDoc, setSubmittingDoc] = useState(false);
  const [docSolicitada, setDocSolicitada] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [misOperador, setMisOperador] = useState<OperadorApi | null>(null);
  const [opExperiencia, setOpExperiencia] = useState('0');
  const [opTarifa, setOpTarifa] = useState('');
  const [opCertificaciones, setOpCertificaciones] = useState('');
  const [savingOperador, setSavingOperador] = useState(false);

  const [misAlquileres, setMisAlquileres] = useState<AlquilerApi[]>([]);
  const [alquileresLoading, setAlquileresLoading] = useState(false);

  const ownerMachines = user.id ? machines.filter((m) => m.ownerId === user.id) : [];

  useEffect(() => {
    if (user.role === 'operator') {
      listarOperadores()
        .then((operadores) => {
          const mio = operadores.find((op) => op.usuario_id === user.id) || null;
          setMisOperador(mio);
          if (mio) {
            setOpExperiencia(String(mio.experiencia_anios));
            setOpTarifa(mio.tarifa_dia != null ? String(mio.tarifa_dia) : '');
            setOpCertificaciones(mio.certificaciones || '');
          }
        })
        .catch(() => {});
    }
    if (user.role === 'renter') {
      setAlquileresLoading(true);
      listarMisAlquileres()
        .then(setMisAlquileres)
        .catch(() => setMisAlquileres([]))
        .finally(() => setAlquileresLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, user.role]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user.id) return;
    setUploadingAvatar(true);
    try {
      const url = await subirImagenACloudinary(file);
      const actualizado = await actualizarUsuario(user.id, { foto_url: url });
      const updated = { ...user, fotoUrl: actualizado.foto_url };
      onUserChange(updated);
      setCurrentUser(updated);
      addToast('Foto de perfil actualizada', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo subir la foto';
      addToast(message, 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user.id) return;
    if (!nombre.trim()) {
      addToast('El nombre no puede estar vacío', 'error');
      return;
    }
    setSavingProfile(true);
    try {
      const actualizado = await actualizarUsuario(user.id, { nombre, telefono: telefono || null });
      const updated = { ...user, name: actualizado.nombre, whatsapp: actualizado.telefono || undefined };
      onUserChange(updated);
      setCurrentUser(updated);
      addToast('Perfil actualizado correctamente', 'success');
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'No se pudo actualizar el perfil';
      addToast(message, 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSolicitarVerificacion = async () => {
    if (!docFile || !user.id) {
      addToast('Selecciona un documento para subir', 'error');
      return;
    }
    setSubmittingDoc(true);
    try {
      const url = await subirImagenACloudinary(docFile);
      await crearDocumentoVerificacion({ usuario_id: user.id, tipo: docTipo, url_documento: url });
      setDocSolicitada(true);
      addToast('Documento enviado. Tu verificación está pendiente de revisión.', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo enviar el documento';
      addToast(message, 'error');
    } finally {
      setSubmittingDoc(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      addToast('La nueva contraseña debe tener al menos 8 caracteres', 'error');
      return;
    }
    setChangingPassword(true);
    try {
      await cambiarPassword({ password_actual: currentPassword, password_nueva: newPassword });
      addToast('Contraseña actualizada correctamente', 'success');
      setCurrentPassword('');
      setNewPassword('');
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'No se pudo cambiar la contraseña';
      addToast(message, 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleCerrarTodas = async () => {
    try {
      await cerrarTodasLasSesiones();
      addToast('Se cerraron todas las sesiones activas. Vuelve a iniciar sesión.', 'info');
      onLogout();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'No se pudo cerrar las sesiones';
      addToast(message, 'error');
    }
  };

  const handleSaveOperador = async () => {
    if (!user.id) return;
    setSavingOperador(true);
    try {
      const datos = {
        experiencia_anios: Number(opExperiencia) || 0,
        tarifa_dia: opTarifa ? Number(opTarifa) : null,
        certificaciones: opCertificaciones || null,
      };
      if (misOperador) {
        const actualizado = await actualizarOperador(misOperador.id, datos);
        setMisOperador(actualizado);
      } else {
        const creado = await crearOperador({ usuario_id: user.id, ...datos });
        setMisOperador(creado);
      }
      addToast('Datos de operador actualizados', 'success');
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'No se pudo guardar';
      addToast(message, 'error');
    } finally {
      setSavingOperador(false);
    }
  };

  const badge = user.role ? ROL_BADGE[user.role] : null;

  return (
    <main className="flex-1 bg-[#F5F4F0] py-12 px-4 max-w-[900px] mx-auto w-full">
      <span className="block text-[10px] font-bold text-[#717171] uppercase tracking-[0.1em] mb-1">MI CUENTA</span>
      <h1 className="text-[#0F0F0F] text-2xl sm:text-3xl font-extrabold tracking-tight mb-8">Mi Perfil</h1>

      {/* GENERAL SECTION */}
      <section className="bg-white border border-[#E2E2DE] p-6 mb-6">
        <h2 className="text-[14px] font-bold text-[#0F0F0F] mb-5">Información general</h2>

        <div className="flex items-center gap-5 mb-6">
          <div className="relative w-20 h-20 rounded-full bg-[#E2E2DE] overflow-hidden shrink-0">
            {user.fotoUrl ? (
              <img src={user.fotoUrl} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#717171] text-2xl font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <label className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
              <Camera size={18} className="text-white" />
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={uploadingAvatar} />
            </label>
          </div>
          <div>
            {badge && (
              <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 mb-1 ${badge.bg} ${badge.text}`}>
                {badge.label}
              </span>
            )}
            <p className="text-[12px] text-[#717171]">
              {uploadingAvatar ? 'Subiendo foto…' : 'Haz clic en la foto para cambiarla'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-[10px] font-bold uppercase text-[#717171] mb-1.5">Nombre completo</label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full bg-white border border-[#E2E2DE] text-[13px] font-medium p-3 focus:border-[#2B44C7] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-[#717171] mb-1.5">Email</label>
            <input value={user.email} disabled className="w-full bg-[#F5F4F0] border border-[#E2E2DE] text-[13px] text-[#717171] p-3" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-[#717171] mb-1.5">Teléfono / WhatsApp</label>
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full bg-white border border-[#E2E2DE] text-[13px] font-medium p-3 focus:border-[#2B44C7] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-[#717171] mb-1.5">Fecha de registro</label>
            <input
              value={user.creadoEn ? new Date(user.creadoEn).toLocaleDateString('es-SV') : '—'}
              disabled
              className="w-full bg-[#F5F4F0] border border-[#E2E2DE] text-[13px] text-[#717171] p-3"
            />
          </div>
        </div>

        <button
          onClick={handleSaveProfile}
          disabled={savingProfile}
          className="bg-[#0F0F0F] hover:bg-[#3A3A3A] disabled:opacity-60 text-white text-[12px] font-bold uppercase tracking-widest px-5 py-2.5 transition-colors cursor-pointer"
        >
          {savingProfile ? 'Guardando...' : 'Guardar cambios'}
        </button>

        <div className="mt-6 pt-5 border-t border-[#E2E2DE]">
          {user.verificado ? (
            <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#16793A] bg-[#E8F5ED] px-3 py-1.5">
              <ShieldCheck size={14} /> Verificado
            </span>
          ) : docSolicitada ? (
            <p className="text-[12px] text-[#C88010]">Tu solicitud de verificación está pendiente de revisión.</p>
          ) : (
            <div className="space-y-3">
              <p className="text-[12px] text-[#717171]">Solicita la verificación de tu cuenta subiendo un documento.</p>
              <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                <select
                  value={docTipo}
                  onChange={(e) => setDocTipo(e.target.value as TipoDocumento)}
                  className="bg-white border border-[#E2E2DE] text-[13px] p-2.5 cursor-pointer"
                >
                  <option value="dui">DUI</option>
                  <option value="licencia">Licencia</option>
                  <option value="rtn">RTN</option>
                  <option value="certificacion">Certificación</option>
                </select>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                  className="text-[12px]"
                />
                <button
                  onClick={handleSolicitarVerificacion}
                  disabled={submittingDoc}
                  className="bg-[#E8A020] hover:bg-[#C88010] disabled:opacity-60 text-[#0F0F0F] text-[11px] font-bold uppercase px-4 py-2 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Upload size={13} /> {submittingDoc ? 'Enviando...' : 'Solicitar verificación'}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* OWNER SECTION */}
      {user.role === 'owner' && (
        <section className="bg-white border border-[#E2E2DE] p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[14px] font-bold text-[#0F0F0F]">Mis máquinas</h2>
            <button
              onClick={onNavigatePublish}
              className="bg-[#E8A020] hover:bg-[#C88010] text-[#0F0F0F] text-[11px] font-bold uppercase px-4 py-2 transition-colors cursor-pointer"
            >
              Publicar nueva máquina
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="border border-[#E2E2DE] p-3 text-center">
              <span className="block text-xl font-extrabold text-[#0F0F0F]">{ownerMachines.length}</span>
              <span className="text-[10px] text-[#717171] uppercase">Publicadas</span>
            </div>
            <div className="border border-[#E2E2DE] p-3 text-center">
              <span className="block text-xl font-extrabold text-[#16793A]">
                {ownerMachines.filter((m) => m.status === 'available').length}
              </span>
              <span className="text-[10px] text-[#717171] uppercase">Disponibles</span>
            </div>
            <div className="border border-[#E2E2DE] p-3 text-center">
              <span className="block text-xl font-extrabold text-[#C88010]">
                {ownerMachines.filter((m) => m.status === 'rented').length}
              </span>
              <span className="text-[10px] text-[#717171] uppercase">Alquiladas</span>
            </div>
          </div>

          {ownerMachines.length === 0 ? (
            <p className="text-[13px] text-[#717171]">Todavía no has publicado ninguna máquina.</p>
          ) : (
            <div className="space-y-2">
              {ownerMachines.map((m) => (
                <div key={m.id} className="flex items-center justify-between border border-[#E2E2DE] p-3">
                  <div>
                    <p className="text-[13px] font-bold text-[#0F0F0F]">{m.name}</p>
                    <p className="text-[11px] text-[#717171] font-mono-imaq">${m.price}/{m.priceUnit}</p>
                  </div>
                  <span className={`text-[9px] font-bold uppercase px-2 py-1 ${
                    m.status === 'available' ? 'bg-[#E8F5ED] text-[#16793A]' : m.status === 'rented' ? 'bg-[#FEF2F2] text-[#991B1B]' : 'bg-[#FFF9E6] text-[#C88010]'
                  }`}>
                    {m.status === 'available' ? 'DISPONIBLE' : m.status === 'rented' ? 'ALQUILADA' : 'MANTENIMIENTO'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* OPERATOR SECTION */}
      {user.role === 'operator' && (
        <section className="bg-white border border-[#E2E2DE] p-6 mb-6">
          <h2 className="text-[14px] font-bold text-[#0F0F0F] mb-5">Mi perfil de operador</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-[10px] font-bold uppercase text-[#717171] mb-1.5">Años de experiencia</label>
              <input
                type="number"
                min={0}
                value={opExperiencia}
                onChange={(e) => setOpExperiencia(e.target.value)}
                className="w-full bg-white border border-[#E2E2DE] text-[13px] p-3 focus:border-[#2B44C7] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-[#717171] mb-1.5">Tarifa por día (USD)</label>
              <input
                type="number"
                min={0}
                value={opTarifa}
                onChange={(e) => setOpTarifa(e.target.value)}
                className="w-full bg-white border border-[#E2E2DE] text-[13px] p-3 focus:border-[#2B44C7] focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold uppercase text-[#717171] mb-1.5">
                Certificaciones y tipos de máquina que opera
              </label>
              <textarea
                rows={3}
                value={opCertificaciones}
                onChange={(e) => setOpCertificaciones(e.target.value)}
                placeholder="Ej: Excavadora hidráulica, grúa torre — certificado NIOSH"
                className="w-full bg-white border border-[#E2E2DE] text-[13px] p-3 focus:border-[#2B44C7] focus:outline-none resize-none"
              />
            </div>
          </div>
          <button
            onClick={handleSaveOperador}
            disabled={savingOperador}
            className="bg-[#0F0F0F] hover:bg-[#3A3A3A] disabled:opacity-60 text-white text-[12px] font-bold uppercase tracking-widest px-5 py-2.5 transition-colors cursor-pointer"
          >
            {savingOperador ? 'Guardando...' : 'Guardar cambios'}
          </button>
          {misOperador?.verificado && (
            <span className="ml-3 inline-flex items-center gap-1 text-[11px] font-bold text-[#16793A]">
              <Check size={13} /> Perfil verificado
            </span>
          )}
        </section>
      )}

      {/* RENTER SECTION */}
      {user.role === 'renter' && (
        <section className="bg-white border border-[#E2E2DE] p-6 mb-6">
          <h2 className="text-[14px] font-bold text-[#0F0F0F] mb-5">Historial de alquileres</h2>
          {alquileresLoading ? (
            <p className="text-[13px] text-[#717171]">Cargando…</p>
          ) : misAlquileres.length === 0 ? (
            <p className="text-[13px] text-[#717171]">Aún no tienes alquileres registrados.</p>
          ) : (
            <div className="space-y-2">
              {misAlquileres.map((alq) => {
                const maquina = machines.find((m) => Number(m.id) === alq.maquina_id);
                return (
                  <div key={alq.id} className="flex items-center justify-between border border-[#E2E2DE] p-3 gap-3 flex-wrap">
                    <div>
                      <p className="text-[13px] font-bold text-[#0F0F0F]">{maquina?.name || `Máquina #${alq.maquina_id}`}</p>
                      <p className="text-[11px] text-[#717171]">{alq.fecha_inicio} a {alq.fecha_fin} · ${alq.costo_total ?? alq.precio_acordado}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold uppercase px-2 py-1 bg-[#F5F4F0] text-[#3A3A3A]">{alq.estado}</span>
                      {alq.estado === 'finalizado' && (
                        <button
                          onClick={() => addToast('Abre el detalle de la máquina para calificarla desde el catálogo.', 'info')}
                          className="text-[10px] font-bold uppercase text-[#2B44C7] hover:underline"
                        >
                          Calificar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* SECURITY SECTION */}
      <section className="bg-white border border-[#E2E2DE] p-6">
        <h2 className="text-[14px] font-bold text-[#0F0F0F] mb-5">Seguridad</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-[10px] font-bold uppercase text-[#717171] mb-1.5">Contraseña actual</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-white border border-[#E2E2DE] text-[13px] p-3 focus:border-[#2B44C7] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-[#717171] mb-1.5">Nueva contraseña (mín. 8 caracteres)</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-white border border-[#E2E2DE] text-[13px] p-3 focus:border-[#2B44C7] focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleChangePassword}
            disabled={changingPassword}
            className="bg-[#0F0F0F] hover:bg-[#3A3A3A] disabled:opacity-60 text-white text-[12px] font-bold uppercase tracking-widest px-5 py-2.5 transition-colors cursor-pointer"
          >
            {changingPassword ? 'Cambiando...' : 'Cambiar contraseña'}
          </button>
          <button
            onClick={handleCerrarTodas}
            className="border border-[#991B1B] text-[#991B1B] hover:bg-[#FEF2F2] text-[12px] font-bold uppercase tracking-widest px-5 py-2.5 transition-colors cursor-pointer"
          >
            Cerrar sesión en todos los dispositivos
          </button>
        </div>
      </section>
    </main>
  );
}
