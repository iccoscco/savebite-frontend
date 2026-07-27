"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import LayoutDashboard from "../../componentes/LayoutDashboard";
import { obtenerUsuarioActual, refrescarUsuarioActual, solicitar, type UsuarioActual } from "../../utilidades/api";
import styles from "./Perfil.module.css";

/** Comprime una imagen cuadrada (400px, JPEG) en el navegador antes de subirla. */
async function comprimirAvatar(archivo: File): Promise<File> {
  if (!archivo.type.startsWith("image/")) {
    throw new Error("Selecciona un archivo de imagen válido.");
  }
  const imagen = await createImageBitmap(archivo);
  const escala = Math.min(1, 400 / Math.max(imagen.width, imagen.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(imagen.width * escala);
  canvas.height = Math.round(imagen.height * escala);
  canvas.getContext("2d")?.drawImage(imagen, 0, 0, canvas.width, canvas.height);
  imagen.close();
  const contenido = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("No se pudo procesar la imagen."))), "image/jpeg", 0.85);
  });
  const nombre = archivo.name.replace(/\.[^/.]+$/, "");
  return new File([contenido], `${nombre}.jpg`, { type: "image/jpeg" });
}

export default function PerfilPage() {
  const [usuario, setUsuario] = useState<UsuarioActual | null>(null);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const inputFotoRef = useRef<HTMLInputElement>(null);

  async function cargarUsuario() {
    setCargando(true);
    const u = await obtenerUsuarioActual();
    setUsuario(u);
    setCargando(false);
  }

  useEffect(() => {
    void cargarUsuario();
  }, []);

  async function guardarPerfil(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setGuardando(true);
    setError("");
    setMensaje("");

    try {
      const formulario = new FormData(evento.currentTarget);
      const datos: Record<string, string> = {};

      const nombre = String(formulario.get("nombre") ?? "");
      const correo = String(formulario.get("correo") ?? "");
      const contrasena = String(formulario.get("contrasena") ?? "");

      if (nombre) datos.nombre = nombre;
      if (correo) datos.correo = correo;
      if (contrasena) datos.contrasena = contrasena;

      await solicitar("/auth/perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });

      refrescarUsuarioActual();
      setModalAbierto(false);
      setMensaje("Perfil actualizado correctamente.");
      await cargarUsuario();
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : "No se pudo actualizar el perfil.");
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarFoto(evento: React.ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;

    setSubiendoFoto(true);
    setError("");
    setMensaje("");
    try {
      const comprimido = await comprimirAvatar(archivo);
      const formulario = new FormData();
      formulario.set("foto", comprimido, comprimido.name);

      await solicitar("/auth/foto", { method: "POST", body: formulario });

      refrescarUsuarioActual();
      setMensaje("Foto de perfil actualizada correctamente.");
      await cargarUsuario();
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : "No se pudo subir la foto.");
    } finally {
      setSubiendoFoto(false);
      if (inputFotoRef.current) inputFotoRef.current.value = "";
    }
  }

  const inicial = usuario?.nombre?.trim()?.charAt(0)?.toUpperCase() ?? "A";

  if (cargando) {
    return (
      <LayoutDashboard enlaceActivo="/perfil">
        <p>Cargando perfil...</p>
      </LayoutDashboard>
    );
  }

  return (
    <LayoutDashboard enlaceActivo="/perfil">
      <section className={styles.encabezado}>
        <div>
          <p className={styles.etiqueta}>Cuenta</p>
          <h1>Perfil</h1>
        </div>
        <button className={styles.botonPrimario} onClick={() => setModalAbierto(true)} type="button">
          Editar Perfil
        </button>
      </section>

      <section className={styles.tarjeta} aria-label="Información de perfil">
        <div className={styles.contenedorAvatar}>
          <div className={styles.avatar} aria-hidden="true">
            {usuario?.foto_url ? (
              <img alt="Foto de perfil" className={styles.avatarImg} src={usuario.foto_url} />
            ) : (
              inicial
            )}
            {subiendoFoto && <span className={styles.avatarCargando}>subiendo</span>}
          </div>
          <button
            className={styles.botonFoto}
            disabled={subiendoFoto}
            onClick={() => inputFotoRef.current?.click()}
            type="button"
          >
            {subiendoFoto ? "Subiendo..." : "Cambiar foto"}
          </button>
          <input
            accept="image/*"
            aria-label="Cambiar foto de perfil"
            className={styles.inputOculto}
            onChange={(e) => void cambiarFoto(e)}
            ref={inputFotoRef}
            type="file"
          />
        </div>
        <div className={styles.datos}>
          <div className={styles.fila}>
            <span>Nombre</span>
            <strong>{usuario?.nombre ?? "—"}</strong>
          </div>
          <div className={styles.fila}>
            <span>Correo</span>
            <strong>{usuario?.correo ?? "—"}</strong>
          </div>
          <div className={styles.fila}>
            <span>Rol</span>
            <strong>{usuario?.rol ?? "—"}</strong>
          </div>
          <div className={styles.fila}>
            <span>Estado</span>
            <strong>{usuario?.estado ?? "—"}</strong>
          </div>
        </div>
      </section>

      {mensaje && <p className={styles.mensajeExito}>{mensaje}</p>}
      {error && <p className={styles.mensajeError} role="alert">{error}</p>}

      {modalAbierto && usuario && (
        <div className={styles.fondoModal} role="presentation">
          <section aria-labelledby="titulo-modal-perfil" className={styles.modal} role="dialog">
            <div className={styles.cabeceraModal}>
              <h2 id="titulo-modal-perfil">Editar perfil</h2>
              <button
                aria-label="Cerrar modal"
                className={styles.cerrarModal}
                onClick={() => setModalAbierto(false)}
                type="button"
              >
                ×
              </button>
            </div>

            <form className={styles.formulario} onSubmit={guardarPerfil}>
              <label>
                Nombre
                <input defaultValue={usuario.nombre} name="nombre" required />
              </label>
              <label>
                Correo
                <input defaultValue={usuario.correo} name="correo" required type="email" />
              </label>
              <label>
                Nueva contraseña
                <input minLength={6} name="contrasena" placeholder="Dejar vacío para mantener" type="password" />
              </label>
              <label>
                Rol
                <input defaultValue={usuario.rol} name="rol" readOnly />
              </label>
              <button className={styles.botonPrimario} disabled={guardando} type="submit">
                {guardando ? "Guardando..." : "Guardar"}
              </button>
            </form>
          </section>
        </div>
      )}
    </LayoutDashboard>
  );
}
