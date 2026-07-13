import React, { useEffect, useState } from 'react';
import {
  Camera,
  Check,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { User as UserProfile, OperadorApi, TipoDocumento } from './types';
import {
  ApiError,
  actualizarOperador,
  actualizarUsuario,
  cambiarPassword,
  cerrarTodasLasSesiones,
  crearDocumentoVerificacion,
  crearOperador,
  listarOperadores,
} from './lib/api';
import { setCurrentUser } from './lib/auth';
import { getImageUrl, subirImagen } from './lib/cloudinary';
import { formatLocalPhone, fromFullPhone, PHONE_PREFIX, toFullPhone } from './lib/phone';

interface ProfilePageProps {
  user: UserProfile;
  onUserChange: (user: UserProfile) => void;
  addToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  onLogout: () => void;
}

const ROL_BADGE: Record<NonNullable<UserProfile['role']>, { label: string; bg: string; text: string }> = {
  owner: { label: 'Propietario', bg: 'bg-[#E7F4EC]', text: 'text-[#1E7A46]' },
  operator: { label: 'Operador', bg: 'bg-[#FBF1E1]', text: 'text-[#B7791F]' },
  renter: { label: 'Arrendatario', bg: 'bg-[#FFF3D6]', text: 'text-[#17181A]' },
};

export default function ProfilePage({ user, onUserChange, addToast, onLogout }: ProfilePageProps) {
  const [nombre, setNombre] = useState(user.name);
  const [telefono, setTelefono] = useState(() => fromFullPhone(user.whatsapp));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, user.role]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user.id) return;
    setUploadingAvatar(true);
    try {
      const url = await subirImagen(file, 'perfiles');
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
      const actualizado = await actualizarUsuario(user.id, { nombre, telefono: telefono ? toFullPhone(telefono) : null });
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
      const url = await subirImagen(docFile, 'perfiles');
      await crearDocumentoVerificacion({ usuario_id: user.id, tipo: docTipo, url_documento: url });
      setDocSolicitada(true);
      addToast('Documento enviado correctamente.', 'success');
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
    <main className="flex-1 bg-[#F6F5F2] py-12 px-4 max-w-[900px] mx-auto w-full">
      <span className="block text-[10px] font-bold text-[#6B6F76] uppercase tracking-[0.1em] mb-1">MI CUENTA</span>
      <h1 className="text-[#17181A] text-2xl sm:text-3xl font-extrabold tracking-tight mb-8">Mi Perfil</h1>

      {/* GENERAL SECTION */}
      <section className="bg-white border border-[#E4E1DA] rounded-xl p-6 mb-6">
        <h2 className="text-[14px] font-bold text-[#17181A] mb-5">Información general</h2>

        <div className="flex items-center gap-5 mb-6">
          <div className="relative w-20 h-20 rounded-full bg-[#EFEEEA] overflow-hidden shrink-0">
            {user.fotoUrl ? (
              <img src={getImageUrl(user.fotoUrl, 'perfil')} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#6B6F76] text-2xl font-bold">
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
              <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md mb-1 ${badge.bg} ${badge.text}`}>
                {badge.label}
              </span>
            )}
            <p className="text-[12px] text-[#6B6F76]">
              {uploadingAvatar ? 'Subiendo foto…' : 'Haz clic en la foto para cambiarla'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-[10px] font-bold uppercase text-[#6B6F76] mb-1.5">Nombre completo</label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full bg-white border border-[#E4E1DA] rounded-lg text-[13px] font-medium p-3 focus:border-[#FFC72C] focus:outline-none focus:ring-2 focus:ring-[#FFC72C]/30"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-[#6B6F76] mb-1.5">Rol</label>
            <input
              value={badge ? badge.label : '—'}
              disabled
              className="w-full bg-[#F6F5F2] border border-[#E4E1DA] rounded-lg text-[13px] text-[#6B6F76] p-3"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-[#6B6F76] mb-1.5">Teléfono / WhatsApp</label>
            <div className="flex">
              <span className="flex items-center px-3 bg-[#F6F5F2] border border-r-0 border-[#E4E1DA] rounded-l-lg text-[#6B6F76] text-[13px] font-bold font-mono-imaq">
                {PHONE_PREFIX}
              </span>
              <input
                inputMode="numeric"
                placeholder="7868-8174"
                value={telefono}
                onChange={(e) => setTelefono(formatLocalPhone(e.target.value))}
                maxLength={9}
                className="w-full bg-white border border-[#E4E1DA] rounded-r-lg text-[13px] font-medium p-3 focus:border-[#FFC72C] focus:outline-none focus:ring-2 focus:ring-[#FFC72C]/30 font-mono-imaq"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-[#6B6F76] mb-1.5">Correo electrónico</label>
            <input value={user.email} disabled className="w-full bg-[#F6F5F2] border border-[#E4E1DA] rounded-lg text-[13px] text-[#6B6F76] p-3" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-[#6B6F76] mb-1.5">Miembro desde</label>
            <input
              value={user.creadoEn ? new Date(user.creadoEn).toLocaleDateString('es-SV', { year: 'numeric', month: 'long' }) : '—'}
              disabled
              className="w-full bg-[#F6F5F2] border border-[#E4E1DA] rounded-lg text-[13px] text-[#6B6F76] p-3"
            />
          </div>
        </div>

        <button
          onClick={handleSaveProfile}
          disabled={savingProfile}
          className="bg-[#FFC72C] hover:bg-[#E6B321] disabled:opacity-60 text-[#17181A] text-[12px] font-bold uppercase tracking-widest px-6 py-2.5 rounded-lg transition-colors cursor-pointer"
        >
          {savingProfile ? 'Guardando...' : 'Guardar cambios'}
        </button>

        <div className="mt-6 pt-5 border-t border-[#E4E1DA]">
          {user.verificado ? (
            <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#1E7A46] bg-[#E7F4EC] rounded-md px-3 py-1.5">
              <ShieldCheck size={14} /> Verificado
            </span>
          ) : docSolicitada ? (
            <p className="text-[12px] text-[#6B6F76]">Documento recibido.</p>
          ) : (
            <div className="space-y-3">
              <p className="text-[12px] text-[#6B6F76]">Sube un documento para verificar tu cuenta.</p>
              <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                <select
                  value={docTipo}
                  onChange={(e) => setDocTipo(e.target.value as TipoDocumento)}
                  className="bg-white border border-[#E4E1DA] rounded-lg text-[13px] p-2.5 cursor-pointer"
                >
                  <option value="dui">DUI</option>
                  <option value="licencia">Licencia</option>
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
                  className="bg-[#FFC72C] hover:bg-[#E6B321] disabled:opacity-60 text-[#17181A] text-[11px] font-bold uppercase px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Upload size={13} /> {submittingDoc ? 'Enviando...' : 'Subir documento'}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* OPERATOR SECTION */}
      {user.role === 'operator' && (
        <section className="bg-white border border-[#E4E1DA] rounded-xl p-6 mb-6">
          <h2 className="text-[14px] font-bold text-[#17181A] mb-5">Mi perfil de operador</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-[10px] font-bold uppercase text-[#6B6F76] mb-1.5">Años de experiencia</label>
              <input
                type="number"
                min={0}
                value={opExperiencia}
                onChange={(e) => setOpExperiencia(e.target.value)}
                className="w-full bg-white border border-[#E4E1DA] rounded-lg text-[13px] p-3 focus:border-[#FFC72C] focus:outline-none focus:ring-2 focus:ring-[#FFC72C]/30"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-[#6B6F76] mb-1.5">Tarifa por día (USD)</label>
              <input
                type="number"
                min={0}
                value={opTarifa}
                onChange={(e) => setOpTarifa(e.target.value)}
                className="w-full bg-white border border-[#E4E1DA] rounded-lg text-[13px] p-3 focus:border-[#FFC72C] focus:outline-none focus:ring-2 focus:ring-[#FFC72C]/30"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold uppercase text-[#6B6F76] mb-1.5">
                Certificaciones y tipos de máquina que opera
              </label>
              <textarea
                rows={3}
                value={opCertificaciones}
                onChange={(e) => setOpCertificaciones(e.target.value)}
                placeholder="Ej: Excavadora hidráulica, grúa torre — certificado NIOSH"
                className="w-full bg-white border border-[#E4E1DA] rounded-lg text-[13px] p-3 focus:border-[#FFC72C] focus:outline-none focus:ring-2 focus:ring-[#FFC72C]/30 resize-none"
              />
            </div>
          </div>
          <button
            onClick={handleSaveOperador}
            disabled={savingOperador}
            className="bg-[#FFC72C] hover:bg-[#E6B321] disabled:opacity-60 text-[#17181A] text-[12px] font-bold uppercase tracking-widest px-6 py-2.5 rounded-lg transition-colors cursor-pointer"
          >
            {savingOperador ? 'Guardando...' : 'Guardar cambios'}
          </button>
          {misOperador?.verificado && (
            <span className="ml-3 inline-flex items-center gap-1 text-[11px] font-bold text-[#1E7A46]">
              <Check size={13} /> Perfil verificado
            </span>
          )}
        </section>
      )}

      {/* SECURITY SECTION */}
      <section className="bg-white border border-[#E4E1DA] rounded-xl p-6">
        <h2 className="text-[14px] font-bold text-[#17181A] mb-5">Seguridad</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-[10px] font-bold uppercase text-[#6B6F76] mb-1.5">Contraseña actual</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-white border border-[#E4E1DA] rounded-lg text-[13px] p-3 focus:border-[#FFC72C] focus:outline-none focus:ring-2 focus:ring-[#FFC72C]/30"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-[#6B6F76] mb-1.5">Nueva contraseña (mín. 8 caracteres)</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-white border border-[#E4E1DA] rounded-lg text-[13px] p-3 focus:border-[#FFC72C] focus:outline-none focus:ring-2 focus:ring-[#FFC72C]/30"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleChangePassword}
            disabled={changingPassword}
            className="bg-[#FFC72C] hover:bg-[#E6B321] disabled:opacity-60 text-[#17181A] text-[12px] font-bold uppercase tracking-widest px-6 py-2.5 rounded-lg transition-colors cursor-pointer"
          >
            {changingPassword ? 'Cambiando...' : 'Cambiar contraseña'}
          </button>
          <button
            onClick={handleCerrarTodas}
            className="border border-[#C0392B] text-[#C0392B] hover:bg-[#FBEAE7] rounded-lg text-[12px] font-bold uppercase tracking-widest px-6 py-2.5 transition-colors cursor-pointer"
          >
            Cerrar sesión en todos los dispositivos
          </button>
        </div>
      </section>
    </main>
  );
}
