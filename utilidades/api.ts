export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const TOKEN_KEY = "access_token";
const USUARIO_KEY = "usuario_actual";

export type UsuarioActual = {
  id: string;
  nombre: string;
  correo: string;
  rol: "Administrador" | "Operador";
  genero: "Masculino" | "Femenino" | null;
  estado: string;
  es_administrador: boolean;
  foto_url: string | null;
};

export function obtenerToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

/**
 * Wrapper de fetch que inyecta el token JWT y redirige a /login
 * cuando la sesión caduca (401). Lanza Error con el mensaje del backend
 * para que cada página lo muestre.
 */
export async function solicitar(ruta: string, opciones: RequestInit = {}): Promise<Response> {
  const token = obtenerToken();
  if (!token) {
    redirigirLogin();
    throw new Error("Tu sesión ha finalizado.");
  }

  const respuesta = await fetch(`${API_URL}${ruta}`, {
    ...opciones,
    headers: { Authorization: `Bearer ${token}`, ...opciones.headers },
  });

  if (respuesta.status === 401) {
    redirigirLogin();
    throw new Error("Tu sesión ha finalizado.");
  }

  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => null);
    throw new Error(cuerpo?.detail ?? "No se pudo completar la operación.");
  }
  return respuesta;
}

/**
 * Devuelve el usuario actual cacheado, o lo obtiene de /auth/me.
 * Útil para que el layout sepa el rol sin decodificar el JWT.
 */
export async function obtenerUsuarioActual(): Promise<UsuarioActual | null> {
  if (typeof window === "undefined") return null;
  if (!obtenerToken()) return null;

  const cache = window.localStorage.getItem(USUARIO_KEY);
  if (cache) {
    try {
      return JSON.parse(cache) as UsuarioActual;
    } catch {
      window.localStorage.removeItem(USUARIO_KEY);
    }
  }

  try {
    const respuesta = await solicitar("/auth/me");
    const usuario = (await respuesta.json()) as UsuarioActual;
    window.localStorage.setItem(USUARIO_KEY, JSON.stringify(usuario));
    return usuario;
  } catch {
    return null;
  }
}

export function esAdministrador(usuario: UsuarioActual | null): boolean {
  return usuario?.rol === "Administrador";
}

/** Limpia el cache del usuario para que la próxima llamada lo traiga fresco del backend. */
export function refrescarUsuarioActual(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(USUARIO_KEY);
}

export function cerrarSesion(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USUARIO_KEY);
  redirigirLogin();
}

function redirigirLogin(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USUARIO_KEY);
  window.location.assign("/login");
}
