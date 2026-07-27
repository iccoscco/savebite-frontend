"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import LayoutDashboard from "../../componentes/LayoutDashboard";
import { solicitar } from "../../utilidades/api";
import styles from "./Ofertas.module.css";

type Oferta = {
  id: number;
  nombre: string;
  descuento: string | number;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  producto_id: number;
  imagen_url: string | null;
  nombre_producto: string | null;
  precio_original: string | number | null;
  stock_producto: number | null;
};

type Producto = {
  id: number;
  nombre: string;
  categoria: string;
  precio: number;
  stock: number;
  fecha_vencimiento: string;
  imagen_url: string | null;
};

type TipoModal = "nueva" | "existente" | "editar" | null;

/** Calcula el precio con el descuento aplicado. */
function precioOferta(precio: number, descuento: number): number {
  return Math.max(precio * (1 - descuento / 100), 0);
}

/** Comprime la imagen en el navegador antes de subirla (igual que en Productos). */
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

export default function OfertasPage() {
  const [ofertas, setOfertas] = useState<Oferta[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [tipoModal, setTipoModal] = useState<TipoModal>(null);
  const [ofertaEnEdicion, setOfertaEnEdicion] = useState<Oferta | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  // Campos controlados del modal "Agregar existente" (para mostrar precio en vivo).
  const [productoSelId, setProductoSelId] = useState<string>("");
  const [descuentoExistente, setDescuentoExistente] = useState<string>("");
  // Campo controlado del modal "Agregar oferta" para preview de precio.
  const [descuentoNuevo, setDescuentoNuevo] = useState<string>("");
  const [precioNuevo, setPrecioNuevo] = useState<string>("");

  const categorias = [
    "Panadería",
    "Bebidas",
    "Frutas",
    "Comidas",
    "Lácteos",
    "Postres",
    "Snacks"
  ];

  async function cargarOfertas() {
    setCargando(true);
    setError("");
    try {
      const respuesta = await solicitar("/ofertas/");
      setOfertas(await respuesta.json());
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : "No se pudieron cargar las ofertas.");
    } finally {
      setCargando(false);
    }
  }

  async function cargarProductos() {
    try {
      const respuesta = await solicitar("/productos/");
      setProductos(await respuesta.json());
    } catch {
      // Si falla, el modal de existente simplemente no listará productos.
    }
  }

  useEffect(() => {
    void cargarOfertas();
  }, []);

  function abrirExistente() {
    setTipoModal("existente");
    setError("");
    setProductoSelId("");
    setDescuentoExistente("");
    void cargarProductos();
  }

  function abrirNueva() {
    setTipoModal("nueva");
    setError("");
    setDescuentoNuevo("");
    setPrecioNuevo("");
  }

  function abrirEdicion(oferta: Oferta) {
    setOfertaEnEdicion(oferta);
    setTipoModal("editar");
    setError("");
  }

  function cerrarModal() {
    setTipoModal(null);
    setOfertaEnEdicion(null);
  }

  const productosFiltrados = useMemo(() => {
    // Excluye los productos que ya están en oferta para no duplicar.
    const idsEnOferta = new Set(ofertas.map((o) => o.producto_id));
    return productos.filter((p) => !idsEnOferta.has(p.id));
  }, [productos, ofertas]);

  const ofertasFiltradas = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return ofertas;
    return ofertas.filter((o) =>
      `${o.nombre} ${o.nombre_producto ?? ""}`.toLowerCase().includes(termino),
    );
  }, [busqueda, ofertas]);

  const productoSeleccionado = productos.find((p) => String(p.id) === productoSelId);
  const precioExistenteCalculado = productoSeleccionado && descuentoExistente
    ? precioOferta(Number(productoSeleccionado.precio), Number(descuentoExistente))
    : null;
  const precioNuevoCalculado = descuentoNuevo && precioNuevo
    ? precioOferta(Number(precioNuevo), Number(descuentoNuevo))
    : null;

  async function guardarNueva(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setGuardando(true);
    setError("");
    try {
      const formulario = new FormData(evento.currentTarget);
      const imagen = formulario.get("imagen");
      if (imagen instanceof File && imagen.size > 0) {
        const comprimida = await comprimirImagen(imagen);
        formulario.set("imagen", comprimida, comprimida.name);
      } else {
        formulario.delete("imagen");
      }
      await solicitar("/ofertas/", { method: "POST", body: formulario });
      cerrarModal();
      setMensaje("Oferta registrada correctamente.");
      await cargarOfertas();
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : "No se pudo guardar la oferta.");
    } finally {
      setGuardando(false);
    }
  }

  async function guardarExistente(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setGuardando(true);
    setError("");
    try {
      const formulario = new FormData(evento.currentTarget);
      const datos = {
        producto_id: Number(formulario.get("producto_id")),
        nombre: String(formulario.get("nombre") ?? ""),
        descuento: Number(formulario.get("descuento")),
        fecha_inicio: String(formulario.get("fecha_inicio")),
        fecha_fin: String(formulario.get("fecha_fin")),
        estado: String(formulario.get("estado") ?? "Activa"),
      };
      await solicitar("/ofertas/existente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      cerrarModal();
      setMensaje("Oferta registrada correctamente.");
      await cargarOfertas();
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : "No se pudo guardar la oferta.");
    } finally {
      setGuardando(false);
    }
  }

  async function guardarEdicion(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!ofertaEnEdicion) return;
    setGuardando(true);
    setError("");
    try {
      const formulario = new FormData(evento.currentTarget);
      const datos = {
        nombre: String(formulario.get("nombre")),
        descuento: Number(formulario.get("descuento")),
        fecha_inicio: String(formulario.get("fecha_inicio")),
        fecha_fin: String(formulario.get("fecha_fin")),
        estado: String(formulario.get("estado")),
      };
      await solicitar(`/ofertas/${ofertaEnEdicion.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      cerrarModal();
      setMensaje("Oferta actualizada correctamente.");
      await cargarOfertas();
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : "No se pudo actualizar la oferta.");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminarOferta(oferta: Oferta) {
    if (!window.confirm(`¿Eliminar la oferta "${oferta.nombre}"?`)) return;
    setError("");
    try {
      await solicitar(`/ofertas/${oferta.id}`, { method: "DELETE" });
      setMensaje("Oferta eliminada correctamente.");
      await cargarOfertas();
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : "No se pudo eliminar la oferta.");
    }
  }

  return (
    <LayoutDashboard enlaceActivo="/ofertas">
      <section className={styles.encabezado}>
        <div>
          <p className={styles.etiqueta}>Promociones</p>
          <h1>Ofertas</h1>
        </div>
        <div className={styles.botones}>
          <button className={styles.botonPrimario} onClick={abrirNueva} type="button">
            Agregar oferta
          </button>
          <button className={styles.botonSecundarioGrande} onClick={abrirExistente} type="button">
            Agregar existente
          </button>
        </div>
      </section>

      <section className={styles.panel} aria-label="Listado de ofertas">
        <input
          aria-label="Buscar ofertas"
          className={styles.buscador}
          onChange={(evento) => setBusqueda(evento.target.value)}
          placeholder="Buscar ofertas"
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
                <th>Oferta</th>
                <th>Producto</th>
                <th>Descuento</th>
                <th>Precio</th>
                <th>Vigencia</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr><td colSpan={8} className={styles.estadoTabla}>Cargando ofertas...</td></tr>
              ) : ofertasFiltradas.length === 0 ? (
                <tr><td colSpan={8} className={styles.estadoTabla}>No se encontraron ofertas.</td></tr>
              ) : (
                ofertasFiltradas.map((oferta) => {
                  const precioOrig = Number(oferta.precio_original ?? 0);
                  const desc = Number(oferta.descuento);
                  return (
                    <tr key={oferta.id}>
                      <td>
                        {oferta.imagen_url ? (
                          <img alt={`Imagen de ${oferta.nombre_producto ?? oferta.nombre}`} className={styles.imagenProducto} src={oferta.imagen_url} />
                        ) : (
                          <span className={styles.sinImagen}>Sin imagen</span>
                        )}
                      </td>
                      <td>{oferta.nombre}</td>
                      <td>{oferta.nombre_producto ?? "—"}</td>
                      <td>{Number(desc)}%</td>
                      <td>
                        <span className={styles.precioAnterior}>S/ {precioOrig.toFixed(2)}</span>
                        <span className={styles.precioOferta}>S/ {precioOferta(precioOrig, desc).toFixed(2)}</span>
                      </td>
                      <td>{oferta.fecha_inicio} → {oferta.fecha_fin}</td>
                      <td>{oferta.estado}</td>
                      <td>
                        <div className={styles.acciones}>
                          <button className={styles.botonSecundario} onClick={() => abrirEdicion(oferta)} type="button">Editar</button>
                          <button className={styles.botonEliminar} onClick={() => void eliminarOferta(oferta)} type="button">Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal: Agregar oferta (producto nuevo + oferta) */}
      {tipoModal === "nueva" && (
        <div className={styles.fondoModal} role="presentation">
          <section aria-labelledby="titulo-modal-nueva" className={styles.modal} role="dialog">
            <div className={styles.cabeceraModal}>
              <h2 id="titulo-modal-nueva">Agregar oferta</h2>
              <button aria-label="Cerrar modal" className={styles.cerrarModal} onClick={cerrarModal} type="button">×</button>
            </div>
            <form className={styles.formulario} onSubmit={guardarNueva}>
              <p className={styles.subtituloForm}>Producto</p>
              <label>Nombre<input name="nombre_producto" required /></label>
              <label>Categoría
                <select defaultValue="" name="categoria" required>
                  <option value="" disabled>Selecciona una categoría</option>
                  {categorias.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </label>
              <label>Precio
                <input min="0" name="precio" onChange={(e) => setPrecioNuevo(e.target.value)} required step="0.01" type="number" />
              </label>
              <label>Stock<input min="0" name="stock" required type="number" /></label>
              <label>Fecha de vencimiento<input name="fecha_vencimiento" required type="date" /></label>
              <label>Imagen del producto<input accept="image/*" className={styles.inputArchivo} name="imagen" type="file" /></label>

              <p className={styles.subtituloForm}>Oferta</p>
              <label>Nombre de la oferta<input name="nombre_oferta" required /></label>
              <label>Descuento (%)
                <input max="100" min="0" name="descuento" onChange={(e) => setDescuentoNuevo(e.target.value)} required step="0.01" type="number" />
              </label>
              {precioNuevoCalculado !== null && (
                <p className={styles.preview}>Precio en oferta: <strong>S/ {precioNuevoCalculado.toFixed(2)}</strong></p>
              )}
              <label>Fecha de inicio<input name="fecha_inicio" required type="date" /></label>
              <label>Fecha de fin<input name="fecha_fin" required type="date" /></label>
              <label>Estado
                <select defaultValue="Activa" name="estado">
                  <option value="Activa">Activa</option>
                  <option value="Programada">Programada</option>
                  <option value="Finalizada">Finalizada</option>
                </select>
              </label>
              <button className={styles.botonPrimario} disabled={guardando} type="submit">
                {guardando ? "Guardando..." : "Guardar"}
              </button>
            </form>
          </section>
        </div>
      )}

      {/* Modal: Agregar existente */}
      {tipoModal === "existente" && (
        <div className={styles.fondoModal} role="presentation">
          <section aria-labelledby="titulo-modal-existente" className={styles.modal} role="dialog">
            <div className={styles.cabeceraModal}>
              <h2 id="titulo-modal-existente">Agregar existente</h2>
              <button aria-label="Cerrar modal" className={styles.cerrarModal} onClick={cerrarModal} type="button">×</button>
            </div>
            <form className={styles.formulario} onSubmit={guardarExistente}>
              <label>Producto
                <select name="producto_id" onChange={(e) => setProductoSelId(e.target.value)} required value={productoSelId}>
                  <option value="" disabled>Selecciona un producto</option>
                  {productosFiltrados.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre} — S/ {Number(p.precio).toFixed(2)}</option>
                  ))}
                </select>
              </label>
              {productoSeleccionado && (
                <p className={styles.preview}>
                  Precio actual: <strong>S/ {Number(productoSeleccionado.precio).toFixed(2)}</strong>
                </p>
              )}
              <label>Nombre de la oferta<input name="nombre" required /></label>
              <label>Descuento (%)
                <input max="100" min="0" name="descuento" onChange={(e) => setDescuentoExistente(e.target.value)} required step="0.01" type="number" />
              </label>
              {precioExistenteCalculado !== null && (
                <p className={styles.preview}>Precio en oferta: <strong>S/ {precioExistenteCalculado.toFixed(2)}</strong></p>
              )}
              <label>Fecha de inicio<input name="fecha_inicio" required type="date" /></label>
              <label>Fecha de fin<input name="fecha_fin" required type="date" /></label>
              <label>Estado
                <select defaultValue="Activa" name="estado">
                  <option value="Activa">Activa</option>
                  <option value="Programada">Programada</option>
                  <option value="Finalizada">Finalizada</option>
                </select>
              </label>
              <button className={styles.botonPrimario} disabled={guardando || !productoSelId} type="submit">
                {guardando ? "Guardando..." : "Guardar"}
              </button>
            </form>
          </section>
        </div>
      )}

      {/* Modal: Editar oferta */}
      {tipoModal === "editar" && ofertaEnEdicion && (
        <div className={styles.fondoModal} role="presentation">
          <section aria-labelledby="titulo-modal-editar" className={styles.modal} role="dialog">
            <div className={styles.cabeceraModal}>
              <h2 id="titulo-modal-editar">Editar oferta</h2>
              <button aria-label="Cerrar modal" className={styles.cerrarModal} onClick={cerrarModal} type="button">×</button>
            </div>
            <form className={styles.formulario} key={ofertaEnEdicion.id} onSubmit={guardarEdicion}>
              <label>Nombre de la oferta<input defaultValue={ofertaEnEdicion.nombre} name="nombre" required /></label>
              <label>Descuento (%)<input defaultValue={Number(ofertaEnEdicion.descuento)} max="100" min="0" name="descuento" required step="0.01" type="number" /></label>
              <label>Fecha de inicio<input defaultValue={ofertaEnEdicion.fecha_inicio} name="fecha_inicio" required type="date" /></label>
              <label>Fecha de fin<input defaultValue={ofertaEnEdicion.fecha_fin} name="fecha_fin" required type="date" /></label>
              <label>Estado
                <select defaultValue={ofertaEnEdicion.estado} name="estado">
                  <option value="Activa">Activa</option>
                  <option value="Programada">Programada</option>
                  <option value="Finalizada">Finalizada</option>
                </select>
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
