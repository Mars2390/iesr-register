// Shared brand mark. No "use client" — safe to render in server OR client components.
type Props = { className?: string };

export function Logo({ className = "h-8 w-8" }: Props) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden>
      <rect width="32" height="32" rx="8" fill="url(#iesr-logo-g)" />
      <path d="M9 16.5l4.5 4.5L23 11" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <defs>
        <linearGradient id="iesr-logo-g" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0b66ff" />
          <stop offset="1" stopColor="#00c8ff" />
        </linearGradient>
      </defs>
    </svg>
  );
}
