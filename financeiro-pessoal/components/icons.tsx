const PATHS: Record<string, string> = {
  casa: "M3 11l9-7 9 7 M5 10v9h14v-9",
  usuarios: "M9 8a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8z M2.5 20c0-4 3-6.5 6.5-6.5S15.5 16 15.5 20 M17.5 9a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2z M15.6 13.3c2.9.4 4.9 2.6 4.9 6.2",
  comida: "M6 8h12l-1 12H7L6 8z M9 8a3 3 0 0 1 6 0",
  transporte:
    "M5 13l1.6-4.2h10.8L19 13 M4 13h16v4H4z",
  financeiro: "M3 6h18v12H3z M3 10h18",
  educacao: "M12 4L2 9l10 5 10-5-10-5z M6 11v4c0 1.2 2.7 2.6 6 2.6s6-1.4 6-2.6v-4",
  lazer: "M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0 M10 8.2l6 3.8-6 3.8z",
  saude: "M12 20s-7-4.4-9-9a4.5 4.5 0 0 1 9-2 4.5 4.5 0 0 1 9 2c-2 4.6-9 9-9 9z",
  banco: "M3 9l9-5 9 5 M5 9v8m4-8v8m6-8v8m4-8v8 M3 19h18",
  carteira: "M3 6h18v13H3z M3 10h14a2 2 0 0 1 2 2v0",
  importar: "M12 3v10 M8 9l4 4 4-4 M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3",
  comprovante: "M6 3h12v18l-3-2-3 2-3-2-3 2z M9 8h6M9 12h6",
  alerta: "M12 4l9 16H3z M12 10v4 M12 17.2v.2",
  check: "M5 12.5l4 4L19 7",
  chev: "M9 6l6 6-6 6",
  inicio: "M3 11l9-8 9 8 M5 10v10h14V10",
  pagar: "M3 5h18v14H3z M3 10h18",
  cartoes: "M2 5h20v14H2z M2 10h20",
  mais: "M5 12h.01 M12 12h.01 M19 12h.01",
  plus: "M12 5v14M5 12h14",
  transferencia: "M7 4L3 8l4 4 M3 8h13a4 4 0 0 1 4 4 M17 20l4-4-4-4 M21 16H8a4 4 0 0 1-4-4",
  sair: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
  config: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
  calendario: "M3 5h18v16H3z M3 10h18M8 3v4M16 3v4",
  carrinho: "M9 20a1.4 1.4 0 1 0 0-2.8 1.4 1.4 0 0 0 0 2.8z M18 20a1.4 1.4 0 1 0 0-2.8 1.4 1.4 0 0 0 0 2.8z M2 3h2l2.4 12.4a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 2-1.6L21 7H6",
  painel: "M3 3h8v8H3z M13 3h8v5h-8z M13 12h8v9h-8z M3 14h8v7H3z",
  default: "M12 12m-3.4 0a3.4 3.4 0 1 0 6.8 0a3.4 3.4 0 1 0 -6.8 0",
};

export function Icon({
  name,
  className,
  style,
}: {
  name: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const d = PATHS[name] || PATHS.default;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      {d.split(" M").map((seg, i) => (
        <path key={i} d={i === 0 ? seg : "M" + seg} />
      ))}
    </svg>
  );
}

/** Ilustração de personagem em traço (line-art), usada em onboarding e telas vazias — nunca emoji. */
export function PersonArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 214" fill="none" className={className}>
      <ellipse cx="120" cy="128" rx="90" ry="70" fill="currentColor" opacity=".1" />
      <g
        stroke="currentColor"
        strokeWidth={3.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <path d="M101 60c0-16 38-16 38 0" />
        <circle cx="120" cy="66" r="18" />
        <circle cx="114" cy="66" r="2.4" fill="currentColor" />
        <circle cx="126" cy="66" r="2.4" fill="currentColor" />
        <path d="M116 74c3 3 5 3 8 0" />
        <path d="M120 84c-16 2-25 12-27 30" />
        <path d="M120 84c16 2 25 12 27 30" />
        <path d="M100 100c-10 6-14 16-12 26" />
        <path d="M140 100c10 6 14 16 12 26" />
        <path d="M96 132h48l7 26h-62z" fillOpacity=".14" fill="currentColor" />
        <path d="M86 162h68" />
        <path d="M96 172c6 12 42 12 48 0" />
      </g>
    </svg>
  );
}
