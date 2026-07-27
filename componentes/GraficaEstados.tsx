"use client";

import styles from "./Graficas.module.css";

export type SegmentoDonut = { etiqueta: string; valor: number; color: string };

type Props = {
  titulo: string;
  datos: SegmentoDonut[];
};

export default function GraficaEstados({ titulo, datos }: Props) {
  const total = datos.reduce((acc, d) => acc + d.valor, 0);
  const radio = 50;
  const circunferencia = 2 * Math.PI * radio;
  let offset = 0;

  return (
    <article className={styles.grafica}>
      <h3 className={styles.titulo}>{titulo}</h3>
      <div className={styles.donutContenedor}>
        <svg className={styles.svgDonut} viewBox="0 0 140 140">
          {/* Segmentos */}
          {datos.map((d) => {
            const proporcion = d.valor / total;
            const longitud = proporcion * circunferencia;
            const gap = 4; // separación entre segmentos
            const dashArray = `${Math.max(longitud - gap, 0)} ${circunferencia - Math.max(longitud - gap, 0)}`;
            const dashOffset = -offset;
            offset += longitud;

            if (d.valor === 0) return null;

            return (
              <circle
                key={d.etiqueta}
                cx={70}
                cy={70}
                r={radio}
                fill="none"
                stroke={d.color}
                strokeWidth={16}
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                transform="rotate(-90 70 70)"
              />
            );
          })}
          {/* Centro */}
          <text x={70} y={66} textAnchor="middle" className={styles.donutTotal}>
            {total}
          </text>
          <text x={70} y={82} textAnchor="middle" className={styles.donutSubtitulo}>
            Total
          </text>
        </svg>

        {/* Leyenda */}
        <ul className={styles.leyenda}>
          {datos.map((d) => (
            <li key={d.etiqueta}>
              <span className={styles.leyendaColor} style={{ background: d.color }} />
              <span className={styles.leyendaTexto}>
                {d.etiqueta} ({d.valor})
              </span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
