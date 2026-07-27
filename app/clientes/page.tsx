"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import LayoutDashboard from "../../componentes/LayoutDashboard";
import { solicitar } from "../../utilidades/api";
import styles from "./Clientes.module.css";

type Estado = "Activo" | "Inactivo";

type Cliente = {
  id: string;
  nombre: string;
  correo: string;
  estado: Estado;
  fecha_registro: string;
};

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [clienteEnEdicion, setClienteEnEdicion] = useState<Cliente | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void cargarClientes();
  }, []);

  async function cargarClientes() {
    setCargando(true);
    setError("");
    try {
      const respuesta = await solicitar("/clientes/");
      if (!respuesta.ok) throw new Error("No se pudieron cargar los clientes.");
      setClientes(await respuesta.json());
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : "Error al cargar clientes.");
    } finally {
      setCargando(false);
    }
  }

  const clientesFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return clientes;
    return clientes.filter((cliente) =>
      `${cliente.nombre} ${cliente.correo}`
        .toLowerCase()
        .includes(termino),
    );
  }, [busqueda, clientes]);

  function abrirEdicion(cliente: Cliente) {
    setClienteEnEdicion(cliente);
    setError("");
    setModalAbierto(true);
  }

  async function guardarCliente(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!clienteEnEdicion) return;

    setGuardando(true);
    setError("");

    try {
      const formulario = new FormData(evento.currentTarget);
      const datos: Record<string, unknown> = {
        nombre: String(formulario.get("nombre") ?? ""),
        correo: String(formulario.get("correo") ?? ""),
        estado: String(formulario.get("estado") ?? ""),
      };

      const contrasena = String(formulario.get("contrasena") ?? "");
      if (contrasena) {
        datos.contrasena = contrasena;
      }

      const respuesta = await solicitar(`/clientes/${clienteEnEdicion.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });

      if (!respuesta.ok) {
        const cuerpo = await respuesta.json();
        throw new Error(cuerpo.detail || "No se pudo actualizar el cliente.");
      }

      setModalAbierto(false);
      setMensaje("Cliente actualizado correctamente.");
      await cargarClientes();
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : "No se pudo guardar el cliente.");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminarCliente(cliente: Cliente) {
    if (!window.confirm(`¿Eliminar al cliente "${cliente.nombre}"?`)) return;

    setError("");
    try {
      const respuesta = await solicitar(`/clientes/${cliente.id}`, { method: "DELETE" });
      if (!respuesta.ok) throw new Error("No se pudo eliminar el cliente.");
      setMensaje("Cliente eliminado correctamente.");
      await cargarClientes();
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : "No se pudo eliminar el cliente.");
    }
  }

  return (
    <LayoutDashboard enlaceActivo="/clientes">
      <section className={styles.encabezado}>
        <div>
          <p className={styles.etiqueta}>App Móvil</p>
          <h1>Clientes</h1>
        </div>
      </section>

      <section className={styles.panel} aria-label="Listado de clientes">
        <input
          aria-label="Buscar clientes"
          className={styles.buscador}
          onChange={(evento) => setBusqueda(evento.target.value)}
          placeholder="Buscar clientes por nombre o correo"
          type="search"
          value={busqueda}
        />

        {mensaje && <p className={styles.mensajeExito}>{mensaje}</p>}
        {error && <p className={styles.mensajeError} role="alert">{error}</p>}

        <div className={styles.contenedorTabla}>
          <table className={styles.tabla}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Estado</th>
                <th>Fecha Registro</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr><td colSpan={5} className={styles.estadoTabla}>Cargando clientes...</td></tr>
              ) : clientesFiltrados.length === 0 ? (
                <tr><td colSpan={5} className={styles.estadoTabla}>No se encontraron clientes.</td></tr>
              ) : (
                clientesFiltrados.map((cliente) => (
                  <tr key={cliente.id}>
                    <td>{cliente.nombre}</td>
                    <td>{cliente.correo}</td>
                    <td>{cliente.estado}</td>
                    <td>{cliente.fecha_registro ? new Date(cliente.fecha_registro).toLocaleDateString() : "-"}</td>
                    <td>
                      <div className={styles.acciones}>
                        <button className={styles.botonSecundario} onClick={() => abrirEdicion(cliente)} type="button">
                          Editar
                        </button>
                        <button className={styles.botonEliminar} onClick={() => void eliminarCliente(cliente)} type="button">
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
          <section aria-labelledby="titulo-modal-cliente" className={styles.modal} role="dialog">
            <div className={styles.cabeceraModal}>
              <h2 id="titulo-modal-cliente">Editar cliente</h2>
              <button aria-label="Cerrar modal" className={styles.cerrarModal} onClick={() => setModalAbierto(false)} type="button">×</button>
            </div>

            <form className={styles.formulario} onSubmit={guardarCliente}>
              <label>Nombre
                <input defaultValue={clienteEnEdicion?.nombre} name="nombre" required />
              </label>
              <label>Correo
                <input defaultValue={clienteEnEdicion?.correo} name="correo" required type="email" />
              </label>
              <label>Estado
                <select defaultValue={clienteEnEdicion?.estado ?? "Activo"} name="estado" required>
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </label>
              <label>
                Nueva contraseña (opcional)
                <input
                  minLength={8}
                  name="contrasena"
                  placeholder="Mínimo 8 caracteres"
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
  );
}
