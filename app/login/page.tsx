"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { IconMail, IconLock, IconAlertCircle, IconArrowRight } from "@tabler/icons-react";
import styles from "./Login.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function LoginPage() {
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setCargando(true);
    setError("");

    try {
      const respuesta = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, contrasena }),
      });
      const cuerpo = await respuesta.json().catch(() => null);
      if (!respuesta.ok) {
        throw new Error(cuerpo?.detail ?? "Credenciales incorrectas.");
      }

      window.localStorage.setItem("access_token", cuerpo.access_token);
      router.push("/dashboard");
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : "No se pudo conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className={styles.pagina}>
      <div className={styles.contenedorForm}>
        <div className={styles.cabeceraLogin}>
          <Image
            src="/savebite.png"
            alt="SaveBite Logo"
            width={120}
            height={120}
            className={styles.logoImagen}
            priority
          />
          <p className={styles.etiqueta}>Sistema de Gestión</p>
          <h1>Panel Administrativo</h1>
          <p className={styles.descripcion}>Ingresa tus credenciales para acceder al sistema SaveBite.</p>
        </div>

        <form className={styles.formulario} onSubmit={manejarEnvio}>
          <div className={styles.campo}>
            <label htmlFor="correo">Correo Electrónico</label>
            <div className={styles.inputContenedor}>
              <div className={styles.iconoInput}>
                <IconMail size={20} />
              </div>
              <input
                id="correo"
                name="correo"
                placeholder="nombre@savebite.com"
                onChange={(evento) => setCorreo(evento.target.value)}
                required
                type="email"
                value={correo}
              />
            </div>
          </div>

          <div className={styles.campo}>
            <label htmlFor="contrasena">Contraseña</label>
            <div className={styles.inputContenedor}>
              <div className={styles.iconoInput}>
                <IconLock size={20} />
              </div>
              <input
                id="contrasena"
                name="contrasena"
                placeholder="••••••••"
                onChange={(evento) => setContrasena(evento.target.value)}
                required
                type="password"
                value={contrasena}
              />
            </div>
          </div>

          {error && (
            <div className={styles.error} role="alert">
              <IconAlertCircle size={20} /> {error}
            </div>
          )}

          <button className={styles.boton} disabled={cargando} type="submit">
            {cargando ? "Verificando..." : (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                Entrar al Panel <IconArrowRight size={20} />
              </span>
            )}
          </button>
        </form>

        <footer className={styles.footer}>
          © 2026 SaveBite - Todos los derechos reservados.
        </footer>
      </div>
    </main>
  );
}
