import React, { useState } from 'react';
import { ApiError, resetPassword } from './lib/api';

/**
 * Standalone page mounted at /reset-password?token=... (see main.tsx).
 * This app has no router, so this component is rendered directly instead
 * of <App/> when the pathname matches, and navigates back with a plain
 * location change once the password has been reset.
 */
export default function ResetPasswordPage() {
  const token = new URLSearchParams(window.location.search).get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('El link de recuperación no es válido. Solicita uno nuevo.');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      await resetPassword({ token, nueva_password: password });
      setDone(true);
      sessionStorage.setItem('imaq_toast_after_redirect', 'Contraseña actualizada correctamente');
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'No se pudo restablecer la contraseña';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F5F2] flex items-center justify-center p-4 font-sans">
      <div className="bg-white border border-[#E4E1DA] rounded-xl w-full max-w-[420px] p-8">
        <span className="text-[20px] font-extrabold tracking-[-0.03em] font-sans text-[#17181A] block mb-1">
          i<span className="text-[#8A6A00]">M</span>aq
        </span>
        <h1 className="text-[16px] font-bold text-[#17181A] mb-6">Restablecer contraseña</h1>

        {done ? (
          <div className="bg-[#E7F4EC] border border-[#1E7A46]/20 rounded-lg p-4">
            <p className="text-[13px] text-[#1E7A46]">
              Contraseña actualizada correctamente. Redirigiendo al inicio…
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {!token && (
              <div className="bg-[#FBEAE7] border border-[#C0392B]/20 rounded-lg p-3">
                <p className="text-[12px] text-[#C0392B]">
                  No se encontró un token en el link. Verifica que copiaste la URL completa del email.
                </p>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold uppercase text-[#6B6F76] mb-1.5">
                Nueva contraseña
              </label>
              <input
                type="password"
                required
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border border-[#E4E1DA] rounded-lg text-[#17181A] text-[13px] font-medium p-3 focus:border-[#FFC72C] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-[#6B6F76] mb-1.5">
                Confirmar contraseña
              </label>
              <input
                type="password"
                required
                placeholder="Repite la contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-white border border-[#E4E1DA] rounded-lg text-[#17181A] text-[13px] font-medium p-3 focus:border-[#FFC72C] focus:outline-none"
              />
            </div>

            {error && <p className="text-[12px] text-[#C0392B]">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="mx-auto min-w-[200px] block py-3 px-6 bg-[#FFC72C] hover:bg-[#E6B321] disabled:opacity-60 text-[#17181A] text-[12px] font-bold uppercase tracking-widest rounded-lg transition-colors cursor-pointer"
            >
              {loading ? 'Guardando...' : 'Restablecer contraseña'}
            </button>

            <a href="/" className="block text-center text-[12px] font-semibold text-[#17181A] hover:text-[#8A6A00]">
              Volver al inicio
            </a>
          </form>
        )}
      </div>
    </div>
  );
}
