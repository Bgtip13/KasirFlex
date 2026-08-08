export default function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="kf-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10B981" />
          <stop offset="1" stopColor="#0D9488" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#kf-grad)" />
      <rect x="2" y="2" width="44" height="44" rx="12" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
      <path
        d="M16 14 V34 M16 24 L32 14 M16 24 L32 34"
        stroke="#fff"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
