"use client";

import styles from "./Graficas.module.css";

export type PuntoBarras = { etiqueta: string; valor: number };

type Props = {
  titulo: string;
  datos: PuntoBarras[];
  /** Color principal de las barras (default #1769e0). */
  color?: string;
};

export default function GraficaBarras({ titulo, datos, color = "#1769e0" }: Props) {
  const maxValor = Math.max(...datos.map((d) => d.valor), 1);

  return (
    <article className={styles.grafica}>
      <h3 className={styles.titulo}>{titulo}</h3>
      <svg className={styles.svgBarras} viewBox={`0 0 ${datos.length * 56} 160`} preserveAspectRatio="xMidYMid meet">
        {datos.map((d, i) => {
          const altura = Math.max((d.valor / maxValor) * 120, 2);
          const x = i * 56 + 12;
          const y = 140 - altura;
          return (
            <g key={d.etiqueta}>
              <rect x={x} y={y} width={32} height={altura} rx={6} fill={color} opacity={0.9} />
              <text x={x + 16} y={154} textAnchor="middle" className={styles.etiquetaEje}>
                {d.etiqueta}
              </text>
              <text x={x + 16} y={y - 6} textAnchor="middle" className={styles.valorEje}>
                {d.valor}
              </text>
            </g>
          );
        })}
      </svg>
    </article>
  );
}
