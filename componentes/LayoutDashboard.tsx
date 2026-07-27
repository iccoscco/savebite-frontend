"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import {
  IconLayoutDashboard,
  IconBox,
  IconUsers,
  IconUsersGroup,
  IconShoppingCart,
  IconTag,
  IconUserCircle,
  IconLogout
} from "@tabler/icons-react";
import { cerrarSesion, esAdministrador, obtenerUsuarioActual, type UsuarioActual } from "../utilidades/api";
import styles from "./LayoutDashboard.module.css";

type LayoutDashboardProps = {
  children: ReactNode;
  enlaceActivo?: string;
};

type Enlace = {
  etiqueta: string;
  href: string;
  soloAdmin?: boolean;
  Icono: React.ElementType;
};

const enlaces: Enlace[] = [
  { etiqueta: "Dashboard", href: "/dashboard", Icono: IconLayoutDashboard },
  { etiqueta: "Productos", href: "/productos", Icono: IconBox },
  { etiqueta: "Usuarios", href: "/usuarios", soloAdmin: true, Icono: IconUsers },
  { etiqueta: "Clientes", href: "/clientes", soloAdmin: true, Icono: IconUsersGroup },
  { etiqueta: "Pedidos", href: "/pedidos", Icono: IconShoppingCart },
  { etiqueta: "Ofertas", href: "/ofertas", Icono: IconTag },
  { etiqueta: "Perfil", href: "/perfil", Icono: IconUserCircle },
];

export default function LayoutDashboard({ children, enlaceActivo = "/dashboard" }: LayoutDashboardProps) {
  const [usuario, setUsuario] = useState<UsuarioActual | null>(null);

  useEffect(() => {
    let activo = true;
    obtenerUsuarioActual().then((u) => {
      if (activo) setUsuario(u);
    });
    return () => {
      activo = false;
    };
  }, []);

  const enlacesVisibles = enlaces.filter((enlace) => !enlace.soloAdmin || esAdministrador(usuario));
  const inicial = usuario?.nombre?.trim()?.charAt(0)?.toUpperCase() ?? "A";

  return (
    <div className={styles.panel}>
      <aside className={styles.sidebar} aria-label="Navegación principal">
        <Link className={styles.marca} href="/dashboard">
          <Image
            src="/savebite.png"
            alt="SaveBite Logo"
            width={32}
            height={32}
            className={styles.sidebarLogo}
            priority
          />
          <span>SaveBite</span>
        </Link>

        <nav className={styles.navegacion}>
          {enlacesVisibles.map((enlace) => (
            <Link
              className={enlace.href === enlaceActivo ? `${styles.enlace} ${styles.activo}` : styles.enlace}
              href={enlace.href}
              key={enlace.href}
            >
              <enlace.Icono size={20} className={styles.iconoEnlace} />
              <span>{enlace.etiqueta}</span>
            </Link>
          ))}
        </nav>

        <button className={styles.cerrarSesion} onClick={() => cerrarSesion()} type="button">
          <IconLogout size={20} className={styles.iconoEnlace} />
          <span>Cerrar sesión</span>
        </button>
      </aside>

      <div className={styles.contenido}>
        <header className={styles.navbar}>
          <p>Panel administrativo SaveBite</p>
          <div className={styles.avatar} aria-label="Perfil de usuario" title={usuario?.nombre}>
            {usuario?.foto_url ? (
              <img
                src={usuario.foto_url}
                alt="Foto de perfil"
                className={styles.avatarImg}
                style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  console.error("Error avatar header:", usuario?.foto_url);
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.textContent = inicial;
                  }
                }}
              />
            ) : (
              inicial
            )}
          </div>
        </header>
        <main className={styles.principal}>{children}</main>
      </div>
    </div>
  );
}
