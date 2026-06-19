// VITE_CLOUDINARY_CLOUD_NAME: your Cloudinary cloud name (public, safe to expose).
// VITE_CLOUDINARY_UPLOAD_PRESET: an UNSIGNED upload preset configured in your
// Cloudinary dashboard. Never put your API secret in a VITE_ variable — it
// ships to the browser bundle. No Cloudinary SDK is used — just native fetch.
const env = (import.meta as unknown as { env: Record<string, string | undefined> }).env;

const CLOUD_NAME = env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = env.VITE_CLOUDINARY_UPLOAD_PRESET;

export class CloudinaryConfigError extends Error {}

export function isCloudinaryConfigured(): boolean {
  return Boolean(CLOUD_NAME && UPLOAD_PRESET);
}

export type CarpetaCloudinary = 'maquinas' | 'operadores' | 'perfiles';

export async function subirImagen(file: File, carpeta: CarpetaCloudinary): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new CloudinaryConfigError(
      'Cloudinary no está configurado. Define VITE_CLOUDINARY_CLOUD_NAME y VITE_CLOUDINARY_UPLOAD_PRESET en tu .env'
    );
  }

  const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

  // Deliberately no `transformation` param here: not every unsigned upload
  // preset allows incoming transformations, and a shared API (web + the
  // Android app) is simpler if the DB always stores the raw, untransformed
  // secure_url. Resizing happens at delivery time via getImageUrl below —
  // each client (this web app, or Android via Glide/Coil) applies its own
  // transformation from the same stored URL.
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', `imaq/${carpeta}`);

  let response: Response;
  try {
    response = await fetch(uploadUrl, { method: 'POST', body: formData });
  } catch {
    throw new Error('No se pudo conectar con Cloudinary para subir la imagen');
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.error?.message || 'No se pudo subir la imagen a Cloudinary';
    throw new Error(message);
  }

  return data.secure_url as string;
}

type TipoImagen = 'maquina' | 'perfil' | 'operador';

const TRANSFORMACIONES: Record<TipoImagen, string> = {
  maquina: 'w_800,h_600,c_fill,q_auto,f_auto',
  perfil: 'w_200,h_200,c_fill,q_auto,f_auto',
  operador: 'w_300,h_300,c_fill,q_auto,f_auto',
};

/**
 * Builds a delivery URL with an inline Cloudinary transformation applied,
 * e.g. https://res.cloudinary.com/<cloud>/image/upload/v123/imaq/maquinas/x.jpg
 * becomes .../upload/w_800,h_600,c_fill,q_auto,f_auto/v123/imaq/maquinas/x.jpg
 *
 * The backend always stores and returns the raw secure_url (no
 * transformation baked in) so the same value works for this web app and
 * for the native Android app, which applies its own resize via Glide/Coil
 * using this exact same transformation string convention.
 */
export function getImageUrl(url: string, tipo: TipoImagen): string {
  if (!url || !url.includes('cloudinary.com')) return url;
  return url.replace('/upload/', `/upload/${TRANSFORMACIONES[tipo]}/`);
}
