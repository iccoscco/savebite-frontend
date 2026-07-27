"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import LayoutDashboard from "../../componentes/LayoutDashboard";
import {
  esAdministrador,
  obtenerUsuarioActual,
  solicitar,
  type UsuarioActual,
} from "../../utilidades/api";
import styles from "./Usuarios.module.css";

type Genero = "Masculino" | "Femenino";
type Rol = "Administrador" | "Operador";
type Estado = "Activo" | "Inactivo";

type Usuario = {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
  genero: Genero | null;
  estado: Estado;
  foto_url: string | null;
};

/** Muestra el rol concordando con el género: Femenino + Operador -> "Operadora". */
function etiquetaRol(rol: Rol, genero: Genero | null): string {
  if (genero === "Femenino") {
    return rol === "Administrador" ? "Administradora" : "Operadora";
  }
  return rol;
}

export default function UsuariosPage() {
  const router = useRouter();
  const [actual, setActual] = useState<UsuarioActual | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [usuarioEnEdicion, setUsuarioEnEdicion] = useState<Usuario | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    obtenerUsuarioActual().then((u) => {
      setActual(u);
      // Los Operadores no pueden administrar usuarios.
      if (!esAdministrador(u)) {
        router.replace("/dashboard");
        return;
      }
      void cargarUsuarios();
    });
  }, [router]);

  async function cargarUsuarios() {
    setCargando(true);
    setError("");
    try {
      const respuesta = await solicitar("/usuarios/");
      const datos = await respuesta.json();
      console.log("Usuarios recibidos del servidor:", datos); // DEBUG LOG
      setUsuarios(datos);
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : "No se pudieron cargar los usuarios.");
    } finally {
      setCargando(false);
    }
  }

  const usuariosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return usuarios;
    return usuarios.filter((usuario) =>
      `${usuario.nombre} ${usuario.correo} ${etiquetaRol(usuario.rol, usuario.genero)}`
        .toLowerCase()
        .includes(termino),
    );
  }, [busqueda, usuarios]);

  function abrirNuevoUsuario() {
    setUsuarioEnEdicion(null);
    setError("");
    setModalAbierto(true);
  }

  function abrirEdicion(usuario: Usuario) {
    setUsuarioEnEdicion(usuario);
    setError("");
    setModalAbierto(true);
  }

  async function guardarUsuario(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setGuardando(true);
    setError("");

    try {
      const formulario = new FormData(evento.currentTarget);
      const datos: Record<string, unknown> = {
        nombre: String(formulario.get("nombre") ?? ""),
        correo: String(formulario.get("correo") ?? ""),
        genero: String(formulario.get("genero") ?? ""),
        rol: String(formulario.get("rol") ?? ""),
        estado: String(formulario.get("estado") ?? ""),
      };

      const contrasena = String(formulario.get("contrasena") ?? "");
      if (contrasena) {
        datos.contrasena = contrasena;
      }

      const editando = usuarioEnEdicion !== null;
      await solicitar(editando ? `/usuarios/${usuarioEnEdicion.id}` : "/usuarios/", {
        method: editando ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });

      setModalAbierto(false);
      setMensaje(editando ? "Usuario actualizado correctamente." : "Usuario registrado correctamente.");
      await cargarUsuarios();
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : "No se pudo guardar el usuario.");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminarUsuario(usuario: Usuario) {
    if (!window.confirm(`¿Eliminar a "${usuario.nombre}"?`)) return;

    setError("");
    try {
      await solicitar(`/usuarios/${usuario.id}`, { method: "DELETE" });
      setMensaje("Usuario eliminado correctamente.");
      await cargarUsuarios();
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : "No se pudo eliminar el usuario.");
    }
  }

  // Mientras se resuelve el rol, no renderizamos el panel (evita parpadeo).
  if (actual === null) {
    return (
      <LayoutDashboard enlaceActivo="/usuarios">
        <p className={styles.estadoTabla}>Cargando...</p>
      </LayoutDashboard>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
    <LayoutDashboard enlaceActivo="/usuarios">
      <section className={styles.encabezado}>
        <div>
          <p className={styles.etiqueta}>Administración</p>
          <h1>Usuarios</h1>
        </div>
        <button className={styles.botonPrimario} onClick={abrirNuevoUsuario} type="button">
          Agregar usuario
        </button>
      </section>

      <section className={styles.panel} aria-label="Listado de usuarios">
        <input
          aria-label="Buscar usuarios"
          className={styles.buscador}
          onChange={(evento) => setBusqueda(evento.target.value)}
          placeholder="Buscar usuarios"
          type="search"
          value={busqueda}
        />
        {mensaje && <p className={styles.mensajeExito}>{mensaje}</p>}
        {error && <p className={styles.mensajeError} role="alert">{error}</p>}

        <div className={styles.contenedorTabla}>
          <table className={styles.tabla}>
            <thead>
              <tr>
                <th>Imagen</th>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr><td colSpan={6} className={styles.estadoTabla}>Cargando usuarios...</td></tr>
              ) : usuariosFiltrados.length === 0 ? (
                <tr><td colSpan={6} className={styles.estadoTabla}>No se encontraron usuarios.</td></tr>
              ) : (
                usuariosFiltrados.map((usuario) => (
                  <tr key={usuario.id}>
                    <td>
                      <div className={styles.avatarMini}>
                        {usuario.foto_url ? (
                          <img
                            alt={usuario.nombre}
                            src={usuario.foto_url}
                            style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              console.error("Error cargando imagen para:", usuario.nombre, usuario.foto_url);
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.textContent = usuario.nombre.charAt(0).toUpperCase();
                              }
                            }}
                          />
                        ) : (
                          usuario.nombre.charAt(0).toUpperCase()
                        )}
                      </div>
                    </td>
                    <td>{usuario.nombre}</td>
                    <td>{usuario.correo}</td>
                    <td>{etiquetaRol(usuario.rol, usuario.genero)}</td>
                    <td>{usuario.estado}</td>
                    <td>
                      <div className={styles.acciones}>
                        <button className={styles.botonSecundario} onClick={() => abrirEdicion(usuario)} type="button">
                          Editar
                        </button>
                        <button className={styles.botonEliminar} onClick={() => void eliminarUsuario(usuario)} type="button">
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modalAbierto && (
        <div className={styles.fondoModal} role="presentation">
          <section aria-labelledby="titulo-modal-usuario" className={styles.modal} role="dialog">
            <div className={styles.cabeceraModal}>
              <h2 id="titulo-modal-usuario">{usuarioEnEdicion ? "Editar usuario" : "Nuevo usuario"}</h2>
              <button aria-label="Cerrar modal" className={styles.cerrarModal} onClick={() => setModalAbierto(false)} type="button">×</button>
            </div>

            <form className={styles.formulario} key={usuarioEnEdicion?.id ?? "nuevo"} onSubmit={guardarUsuario}>
              <label>Nombre
                <input defaultValue={usuarioEnEdicion?.nombre} name="nombre" required />
              </label>
              <label>Correo
                <input defaultValue={usuarioEnEdicion?.correo} name="correo" required type="email" />
              </label>
              <label>Género
                <select defaultValue={usuarioEnEdicion?.genero ?? "Masculino"} name="genero" required>
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                </select>
              </label>
              <label>Rol
                <select defaultValue={usuarioEnEdicion?.rol ?? "Operador"} name="rol" required>
                  <option value="Operador">Operador</option>
                  <option value="Administrador">Administrador</option>
                </select>
              </label>
              <label>Estado
                <select defaultValue={usuarioEnEdicion?.estado ?? "Activo"} name="estado" required>
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </label>
              <label>
                {usuarioEnEdicion ? "Nueva contraseña (opcional)" : "Contraseña"}
                <input
                  minLength={6}
                  name="contrasena"
                  placeholder={usuarioEnEdicion ? "Dejar vacío para mantener" : ""}
                  required={!usuarioEnEdicion}
                  type="password"
                />
              </label>
              <button className={styles.botonPrimario} disabled={guardando} type="submit">
                {guardando ? "Guardando..." : "Guardar"}
              </button>
            </form>
          </section>
        </div>
      )}
    </LayoutDashboard>
    </div>
  );
}
