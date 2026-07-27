"use client";

import { FormEvent, useEffect, useState } from "react";
import LayoutDashboard from "../../componentes/LayoutDashboard";
import { solicitar } from "../../utilidades/api";
import styles from "./Pedidos.module.css";

type Pedido = {
  id: number;
  numero_pedido: string;
  cliente_id: number;
  cliente_nombre: string;
  fecha: string;
  total: number;
  estado: string;
};

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [pedidoEnEdicion, setPedidoEnEdicion] = useState<Pedido | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function cargarPedidos() {
    setCargando(true);
    setError("");
    try {
      const respuesta = await solicitar("/pedidos/");
      setPedidos(await respuesta.json());
    } catch (causa) {
      setError("No se pudieron cargar los pedidos.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    void cargarPedidos();
    // Refresco automático cada 30 segundos para ver nuevos carritos (Pendientes)
    const intervalo = setInterval(() => {
      void cargarPedidos();
    }, 30000);
    return () => clearInterval(intervalo);
  }, []);

  async function eliminarPedido(id: number) {
    if (!window.confirm("¿Eliminar este pedido permanentemente?")) return;
    try {
      await solicitar(`/pedidos/${id}`, { method: "DELETE" });
      setMensaje("Pedido eliminado.");
      await cargarPedidos();
    } catch {
      setError("No se pudo eliminar el pedido.");
    }
  }

  async function guardarEdicion(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!pedidoEnEdicion) return;
    setGuardando(true);
    try {
      const form = new FormData(evento.currentTarget);
      const datos = {
        estado: form.get("estado"),
        total: Number(form.get("total")),
      };
      await solicitar(`/pedidos/${pedidoEnEdicion.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      setPedidoEnEdicion(null);
      setMensaje("Pedido actualizado correctamente.");
      await cargarPedidos();
    } catch {
      setError("Error al actualizar el pedido.");
    } finally {
      setGuardando(false);
    }
  }

  function obtenerClaseEstado(estado: string) {
    switch (estado) {
      case "Pendiente": return styles.estadoPendiente;
      case "Pagado": return styles.estadoPagado;
      case "Completado": return styles.estadoCompletado;
      case "Cancelado": return styles.estadoCancelado;
      default: return "";
    }
  }

  return (
    <LayoutDashboard enlaceActivo="/pedidos">
      <section className={styles.encabezado}>
        <div>
          <p className={styles.etiqueta}>Operaciones</p>
          <h1>Pedidos</h1>
        </div>
      </section>

      <section className={styles.panel} aria-label="Listado de pedidos">
        {mensaje && <p className={styles.mensajeExito}>{mensaje}</p>}
        {error && <p className={styles.mensajeError}>{error}</p>}

        <div className={styles.contenedorTabla}>
          <table className={styles.tabla}>
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr><td colSpan={6} className={styles.estadoTabla}>Cargando...</td></tr>
              ) : pedidos.length === 0 ? (
                <tr><td colSpan={6} className={styles.estadoTabla}>No hay pedidos registrados.</td></tr>
              ) : (
                pedidos.map((pedido) => (
                  <tr key={pedido.id}>
                    <td><strong>{pedido.numero_pedido}</strong></td>
                    <td>{pedido.cliente_nombre}</td>
                    <td>{new Date(pedido.fecha).toLocaleString()}</td>
                    <td>S/ {Number(pedido.total).toFixed(2)}</td>
                    <td><span className={`${styles.estado} ${obtenerClaseEstado(pedido.estado)}`}>{pedido.estado}</span></td>
                    <td>
                      <div className={styles.acciones}>
                        <button className={styles.botonSecundario} onClick={() => setPedidoEnEdicion(pedido)} type="button">Editar</button>
                        <button className={styles.botonEliminar} onClick={() => void eliminarPedido(pedido.id)} type="button">Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {pedidoEnEdicion && (
        <div className={styles.fondoModal}>
          <section className={styles.modal}>
            <div className={styles.cabeceraModal}>
              <h2>Editar {pedidoEnEdicion.numero_pedido}</h2>
              <button className={styles.cerrarModal} onClick={() => setPedidoEnEdicion(null)}>×</button>
            </div>
            <form className={styles.formulario} onSubmit={guardarEdicion}>
              <label>Cliente
                <input disabled value={pedidoEnEdicion.cliente_nombre} />
              </label>
              <label>Total (S/)
                <input defaultValue={pedidoEnEdicion.total} name="total" required step="0.01" type="number" />
              </label>
              <label>Estado
                <select defaultValue={pedidoEnEdicion.estado} name="estado">
                  <option value="Pendiente">Pendiente (En carrito)</option>
                  <option value="Pagado">Pagado</option>
                  <option value="Completado">Completado</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </label>
              <button className={styles.botonPrimario} disabled={guardando} type="submit">
                {guardando ? "Guardando..." : "Guardar cambios"}
              </button>
            </form>
          </section>
        </div>
      )}
    </LayoutDashboard>
  );
}
