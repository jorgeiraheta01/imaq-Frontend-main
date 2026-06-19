// VITE_CLOUDINARY_URL must be the unsigned upload endpoint, e.g.
// https://api.cloudinary.com/v1_1/<cloud_name>/image/upload
// VITE_CLOUDINARY_UPLOAD_PRESET must be an unsigned upload preset configured
// in the Cloudinary dashboard. Never put the API secret in a VITE_ var — it
// ships to the browser bundle.
const env = (import.meta as unknown as { env: Record<string, string | undefined> }).env;

const CLOUDINARY_URL = env.VITE_CLOUDINARY_URL;
const UPLOAD_PRESET = env.VITE_CLOUDINARY_UPLOAD_PRESET;

export class CloudinaryConfigError extends Error {}

export function isCloudinaryConfigured(): boolean {
  return Boolean(CLOUDINARY_URL && UPLOAD_PRESET);
}

export async function subirImagenACloudinary(file: File): Promise<string> {
  if (!CLOUDINARY_URL || !UPLOAD_PRESET) {
    throw new CloudinaryConfigError(
      'Cloudinary no está configurado. Define VITE_CLOUDINARY_URL y VITE_CLOUDINARY_UPLOAD_PRESET en tu .env'
    );
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);

  let response: Response;
  try {
    response = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
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
