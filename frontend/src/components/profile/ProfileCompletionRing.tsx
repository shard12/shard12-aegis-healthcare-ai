import { motion } from 'framer-motion';

export function ProfileCompletionRing({ percent }: { percent: number }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  const color = percent >= 80 ? '#30D158' : percent >= 50 ? '#0A84FF' : '#FF9F0A';

  return (
    <motion.div
      className="relative grid h-28 w-28 place-items-center"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
    >
      <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
        <motion.circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="font-display text-2xl font-extrabold">{percent}%</div>
        <div className="text-[10px] font-bold tracking-widest text-white/45">COMPLETE</div>
      </div>
    </motion.div>
  );
}
