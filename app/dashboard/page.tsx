"use client";

import { useEffect, useState } from "react";
import LayoutDashboard from "../../componentes/LayoutDashboard";
import GraficaBarras from "../../componentes/GraficaBarras";
import GraficaEstados from "../../componentes/GraficaEstados";
import { solicitar } from "../../utilidades/api";
import styles from "./Dashboard.module.css";

type Stats = {
  ventas_semana: { fecha: string; total: number }[];
  pedidos_por_estado: Record<string, number>;
  total_productos: number;
  total_usuarios: number;
  total_ofertas: number;
  ultimos_pedidos: { numero_pedido: string; cliente: string; total: number; estado: string }[];
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [cargando, setCargando] = useState(true);

  async function cargarStats() {
    try {
      const resp = await solicitar("/pedidos/stats");
      if (resp.ok) {
        setStats(await resp.json());
      }
    } catch (e) {
      console.error("Error cargando dashboard:", e);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    void cargarStats();
  }, []);

  if (cargando || !stats) {
    return (
      <LayoutDashboard enlaceActivo="/dashboard">
        <div style={{ padding: "40px", textAlign: "center" }}>Cargando estadísticas...</div>
      </LayoutDashboard>
    );
  }

  // Formatear datos para gráficas
  const diasSemana = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const datosBarras = stats.ventas_semana.map(v => {
    const d = new Date(v.fecha + "T12:00:00");
    return {
      etiqueta: diasSemana[d.getDay()],
      valor: v.total
    };
  });

  const datosEstados = [
    { etiqueta: "Pendiente", valor: stats.pedidos_por_estado["Pendiente"] || 0, color: "#f59e0b" },
    { etiqueta: "Pagado", valor: stats.pedidos_por_estado["Pagado"] || 0, color: "#1769e0" },
    { etiqueta: "Completado", valor: stats.pedidos_por_estado["Completado"] || 0, color: "#16a34a" },
    { etiqueta: "Cancelado", valor: stats.pedidos_por_estado["Cancelado"] || 0, color: "#ef4444" },
  ];

  const resumen = [
    { etiqueta: "Productos registrados", valor: stats.total_productos },
    { etiqueta: "Usuarios registrados", valor: stats.total_usuarios },
    { etiqueta: "Ofertas activas", valor: stats.total_ofertas },
    { etiqueta: "Pedidos en total", valor: Object.values(stats.pedidos_por_estado).reduce((a, b) => a + b, 0) },
  ];

  return (
    <LayoutDashboard enlaceActivo="/dashboard">
      <section className={styles.encabezado}>
        <div>
          <p className={styles.etiqueta}>Vista general</p>
          <h1>Dashboard Real</h1>
        </div>
      </section>

      {/* Gráficas */}
      <section className={styles.graficas} aria-label="Resumen gráfico">
        <GraficaBarras titulo="Ventas de la semana (S/)" datos={datosBarras} color="#1769e0" />
        <GraficaEstados titulo="Pedidos por estado" datos={datosEstados} />
      </section>

      {/* Tarjetas */}
      <section className={styles.tarjetas} aria-label="Resumen general">
        {resumen.map((item) => (
          <article className={styles.tarjeta} key={item.etiqueta}>
            <p>{item.etiqueta}</p>
            <strong>{item.valor}</strong>
          </article>
        ))}
      </section>

      {/* Últimos pedidos */}
      <section className={styles.pedidos} aria-labelledby="ultimos-pedidos">
        <h2 id="ultimos-pedidos">Últimos pedidos</h2>
        <div className={styles.contenedorTabla}>
          <table className={styles.tabla}>
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {stats.ultimos_pedidos.map((pedido, idx) => (
                <tr key={idx}>
                  <td>{pedido.numero_pedido}</td>
                  <td>{pedido.cliente}</td>
                  <td>S/ {pedido.total.toFixed(2)}</td>
                  <td>
                    <span className={`${styles.estado} ${
                      pedido.estado === 'Pendiente' ? styles.estadoPendiente :
                      pedido.estado === 'Pagado' ? styles.estadoPagado :
                      pedido.estado === 'Completado' ? styles.estadoCompletado :
                      styles.estadoCancelado
                    }`}>{pedido.estado}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </LayoutDashboard>
  );
}
