import { motion } from "framer-motion";

/**
 * Medidor "Combustível do Dia" — arco circular estilo velocímetro.
 * value 0..1
 */
export function Gauge({
  value,
  label,
  sub,
  size = 200,
}: {
  value: number;
  label: string;
  sub?: string;
  size?: number;
}) {
  const v = Math.max(0, Math.min(1, value));
  const strokeW = 14;
  const r = (size - strokeW) / 2;
  const c = 2 * Math.PI * r;
  const arcTotal = c * 0.75; // 270deg
  const arcFilled = arcTotal * v;

  const color =
    v < 0.34 ? "var(--racing)" : v < 0.75 ? "var(--amber)" : "var(--flag)";

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-[135deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="color-mix(in oklab, white 10%, transparent)"
          strokeWidth={strokeW}
          strokeLinecap="round"
          strokeDasharray={`${arcTotal} ${c}`}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeW}
          strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${c}` }}
          animate={{ strokeDasharray: `${arcFilled} ${c}` }}
          transition={{ type: "spring", stiffness: 60, damping: 18 }}
          style={{ filter: `drop-shadow(0 0 12px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="num-hud text-5xl leading-none">{Math.round(v * 100)}<span className="text-2xl opacity-60">%</span></div>
          <div className="mt-1 text-xs uppercase tracking-[0.18em] opacity-70">{label}</div>
          {sub && <div className="mt-1 text-xs opacity-60">{sub}</div>}
        </div>
      </div>
    </div>
  );
}
