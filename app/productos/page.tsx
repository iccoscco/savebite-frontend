"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import LayoutDashboard from "../../componentes/LayoutDashboard";
import { solicitar as solicitarApi } from "../../utilidades/api";
import styles from "./Productos.module.css";

type Producto = {
  id: number;
  nombre: string;
  categoria: string;
  precio: number;
  stock: number;
  fecha_vencimiento: string;
  imagen_url: string | null;
};

async function comprimirImagen(archivo: File): Promise<File> {
  if (!archivo.type.startsWith("image/")) {
    throw new Error("Selecciona un archivo de imagen válido.");
  }

  const imagen = await createImageBitmap(archivo);
  const escala = Math.min(1, 1600 / Math.max(imagen.width, imagen.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(imagen.width * escala);
  canvas.height = Math.round(imagen.height * escala);
  canvas.getContext("2d")?.drawImage(imagen, 0, 0, canvas.width, canvas.height);
  imagen.close();

  const contenido = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("No se pudo procesar la imagen."))), "image/jpeg", 0.82);
  });

  const nombre = archivo.name.replace(/\.[^/.]+$/, "");
  return new File([contenido], `${nombre}.jpg`, { type: "image/jpeg" });
}

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [productoEnEdicion, setProductoEnEdicion] = useState<Producto | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  async function cargarProductos() {
    setCargando(true);
    setError("");
    try {
      const respuesta = await solicitarApi("/productos/");
      setProductos(await respuesta.json());
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : "No se pudieron cargar los productos.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    void cargarProductos();
  }, []);

  const productosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return productos;
    return productos.filter((producto) =>
      `${producto.nombre} ${producto.categoria}`.toLowerCase().includes(termino),
    );
  }, [busqueda, productos]);

  function abrirNuevoProducto() {
    setProductoEnEdicion(null);
    setError("");
    setModalAbierto(true);
  }

  function abrirEdicion(producto: Producto) {
    setProductoEnEdicion(producto);
    setError("");
    setModalAbierto(true);
  }

  async function guardarProducto(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setGuardando(true);
    setError("");

    try {
      const formulario = new FormData(evento.currentTarget);
      const imagen = formulario.get("imagen");
      if (imagen instanceof File && imagen.size > 0) {
        const imagenComprimida = await comprimirImagen(imagen);
        formulario.set("imagen", imagenComprimida, imagenComprimida.name);
      } else {
        formulario.delete("imagen");
      }

      const editando = productoEnEdicion !== null;
      await solicitarApi(editando ? `/productos/${productoEnEdicion.id}` : "/productos/", {
        method: editando ? "PUT" : "POST",
        body: formulario,
      });
      setModalAbierto(false);
      setMensaje(editando ? "Producto actualizado correctamente." : "Producto registrado correctamente.");
      await cargarProductos();
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : "No se pudo guardar el producto.");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminarProducto(producto: Producto) {
    if (!window.confirm(`¿Eliminar "${producto.nombre}"?`)) return;

    setError("");
    try {
      await solicitarApi(`/productos/${producto.id}`, { method: "DELETE" });
      setMensaje("Producto eliminado correctamente.");
      await cargarProductos();
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : "No se pudo eliminar el producto.");
    }
  }

  const categoriasOficiales = [
    "Panadería",
    "Bebidas",
    "Frutas",
    "Comidas",
    "Lácteos",
    "Postres",
    "Snacks"
  ];

  return (
    <LayoutDashboard enlaceActivo="/productos">
      <section className={styles.encabezado}>
        <div>
          <p className={styles.etiqueta}>Catálogo</p>
          <h1>Productos</h1>
        </div>
        <button className={styles.botonPrimario} onClick={abrirNuevoProducto} type="button">
          Nuevo Producto
        </button>
      </section>

      <section className={styles.panel} aria-label="Listado de productos">
        <input
          aria-label="Buscar productos"
          className={styles.buscador}
          onChange={(evento) => setBusqueda(evento.target.value)}
          placeholder="Buscar productos"
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
                <th>Producto</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th>Stock</th>
                <th>Vencimiento</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr><td colSpan={7} className={styles.estadoTabla}>Cargando productos...</td></tr>
              ) : productosFiltrados.length === 0 ? (
                <tr><td colSpan={7} className={styles.estadoTabla}>No se encontraron productos.</td></tr>
              ) : (
                productosFiltrados.map((producto) => (
                  <tr key={producto.id}>
                    <td>
                      {producto.imagen_url ? (
                        <img alt={`Imagen de ${producto.nombre}`} className={styles.imagenProducto} src={producto.imagen_url} />
                      ) : (
                        <span className={styles.sinImagen}>Sin imagen</span>
                      )}
                    </td>
                    <td>{producto.nombre}</td>
                    <td>{producto.categoria}</td>
                    <td>S/ {Number(producto.precio).toFixed(2)}</td>
                    <td>{producto.stock}</td>
                    <td>{new Date(`${producto.fecha_vencimiento}T00:00:00`).toLocaleDateString("es-PE")}</td>
                    <td>
                      <div className={styles.acciones}>
                        <button className={styles.botonSecundario} onClick={() => abrirEdicion(producto)} type="button">Editar</button>
                        <button className={styles.botonEliminar} onClick={() => void eliminarProducto(producto)} type="button">Eliminar</button>
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
          <section aria-labelledby="titulo-modal-producto" className={styles.modal} role="dialog">
            <div className={styles.cabeceraModal}>
              <h2 id="titulo-modal-producto">{productoEnEdicion ? "Editar producto" : "Nuevo producto"}</h2>
              <button aria-label="Cerrar modal" className={styles.cerrarModal} onClick={() => setModalAbierto(false)} type="button">×</button>
            </div>

            <form className={styles.formulario} key={productoEnEdicion?.id ?? "nuevo"} onSubmit={guardarProducto}>
              <label>Nombre<input defaultValue={productoEnEdicion?.nombre} name="nombre" required /></label>
              <label>
                Categoría
                <select defaultValue={productoEnEdicion?.categoria} name="categoria" required>
                  <option value="" disabled>Selecciona una categoría</option>
                  {categoriasOficiales.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </label>
              <label>Precio<input defaultValue={productoEnEdicion?.precio} min="0" name="precio" required step="0.01" type="number" /></label>
              <label>Stock<input defaultValue={productoEnEdicion?.stock} min="0" name="stock" required type="number" /></label>
              <label>Fecha de vencimiento<input defaultValue={productoEnEdicion?.fecha_vencimiento} name="fecha_vencimiento" required type="date" /></label>
              <label>Imagen del producto<input accept="image/*" className={styles.inputArchivo} name="imagen" type="file" /></label>
              <p className={styles.ayudaImagen}>La imagen se reduce automáticamente antes de guardarse.</p>
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
