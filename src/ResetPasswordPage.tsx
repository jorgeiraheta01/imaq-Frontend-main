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
    <div className="min-h-screen bg-[#F5F4F0] flex items-center justify-center p-4 font-sans">
      <div className="bg-white border border-[#E2E2DE] w-full max-w-[420px] p-8">
        <span className="text-[20px] font-extrabold tracking-[-0.03em] font-sans text-[#0F0F0F] block mb-1">
          i<span className="text-[#2B44C7]">M</span>aq
        </span>
        <h1 className="text-[16px] font-bold text-[#0F0F0F] mb-6">Restablecer contraseña</h1>

        {done ? (
          <div className="bg-[#E8F5ED] border border-[#16793A]/20 p-4">
            <p className="text-[13px] text-[#16793A]">
              Contraseña actualizada correctamente. Redirigiendo al inicio…
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {!token && (
              <div className="bg-[#FEF2F2] border border-[#991B1B]/20 p-3">
                <p className="text-[12px] text-[#991B1B]">
                  No se encontró un token en el link. Verifica que copiaste la URL completa del email.
                </p>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold uppercase text-[#717171] mb-1.5">
                Nueva contraseña
              </label>
              <input
                type="password"
                required
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border border-[#E2E2DE] text-[#0F0F0F] text-[13px] font-medium p-3 focus:border-[#2B44C7] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-[#717171] mb-1.5">
                Confirmar contraseña
              </label>
              <input
                type="password"
                required
                placeholder="Repite la contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-white border border-[#E2E2DE] text-[#0F0F0F] text-[13px] font-medium p-3 focus:border-[#2B44C7] focus:outline-none"
              />
            </div>

            {error && <p className="text-[12px] text-[#991B1B]">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#0F0F0F] hover:bg-[#3A3A3A] disabled:opacity-60 text-white text-[12px] font-bold uppercase tracking-widest transition-colors cursor-pointer"
            >
              {loading ? 'Guardando...' : 'Restablecer contraseña'}
            </button>

            <a href="/" className="block text-center text-[12px] font-semibold text-[#2B44C7] hover:underline">
              Volver al inicio
            </a>
          </form>
        )}
      </div>
    </div>
  );
}
