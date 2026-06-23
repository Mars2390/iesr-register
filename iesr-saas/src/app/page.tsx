import Link from "next/link";

/* ------------------------------------------------------------------ icons */
/* Inline SVGs — no icon dependency. Each takes className for sizing/color. */
type IconProps = { className?: string };
const Logo = ({ className = "h-8 w-8" }: IconProps) => (
  <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden>
    <rect width="32" height="32" rx="8" fill="url(#g)" />
    <path d="M9 16.5l4.5 4.5L23 11" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
        <stop stopColor="#0b66ff" /><stop offset="1" stopColor="#00c8ff" />
      </linearGradient>
    </defs>
  </svg>
);
const IconCheck = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const IconPulse = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none"><path d="M3 12h4l2 6 4-14 2 8h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const IconChart = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const IconFlag = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none"><path d="M5 21V4m0 0h11l-2 4 2 4H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const IconDoc = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none"><path d="M7 3h7l5 5v13H7zM14 3v5h5M9 13h6M9 17h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const IconShield = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
);
const IconArrow = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

/* ------------------------------------------------------------------ data */
const FEATURES = [
  { icon: IconCheck, title: "One-tap marking", body: "Present, Absent, Late or Unmarked per student, per session — designed for fast, error-free registers on any device." },
  { icon: IconPulse, title: "Live monitoring", body: "See exactly who is marking which class right now, refreshed every few seconds. No more chasing teachers for registers." },
  { icon: IconChart, title: "Insight & momentum", body: "Automatic attendance intelligence: at-risk students, class trends and teacher marking momentum — computed for you." },
  { icon: IconFlag, title: "Flags & issues", body: "Teachers raise issues from the register; admins triage and resolve them from a single tracked queue." },
  { icon: IconDoc, title: "PDF & CSV reports", body: "Export weekly, monthly and termly reports — branded PDFs and clean CSVs — straight from the dashboard." },
  { icon: IconShield, title: "PIN access, by role", body: "Teachers and admins sign in with a secure PIN. Teachers see only their assigned classes; admins see everything." },
];

const STEPS = [
  { n: "01", title: "Sign in with a PIN", body: "No usernames to remember. A valid PIN identifies the teacher; the admin PIN unlocks full control." },
  { n: "02", title: "Mark the register", body: "Pick the date and session, tap statuses, add notes or behaviour tags, and submit — synced to the cloud instantly." },
  { n: "03", title: "Monitor & report", body: "Admins watch attendance land in real time, track flags, and export the reports leadership needs." },
];

/* ------------------------------------------------------------------ page */
export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* nav */}
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <nav className="container-page flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo />
            <span className="text-lg font-bold tracking-tight text-slate-900">IESR</span>
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-slate-900">Features</a>
            <a href="#how" className="text-sm font-medium text-slate-600 hover:text-slate-900">How it works</a>
            <a href="#roles" className="text-sm font-medium text-slate-600 hover:text-slate-900">For teams</a>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn-ghost hidden sm:inline-flex">Log in</Link>
            <Link href="/login" className="btn-primary">Get started <IconArrow className="h-4 w-4" /></Link>
          </div>
        </nav>
      </header>

      <main className="flex-1">
        {/* hero */}
        <section className="bg-hero-glow">
          <div className="container-page grid gap-12 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
            <div className="animate-fade-up">
              <span className="badge"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Real-time school attendance</span>
              <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] text-slate-900 sm:text-5xl lg:text-6xl">
                Attendance that's <span className="gradient-text">fast to mark</span> and impossible to lose.
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
                IESR replaces paper registers and brittle spreadsheets with a clean, cloud-backed platform —
                tap to mark, monitor every class live, and turn registers into reports in seconds.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/login" className="btn-primary btn-lg">Log in to mark attendance <IconArrow className="h-5 w-5" /></Link>
                <a href="#features" className="btn-outline btn-lg">Explore features</a>
              </div>
              <dl className="mt-10 grid max-w-md grid-cols-3 gap-6">
                {[["4", "status types"], ["Live", "monitoring"], ["0", "spreadsheets"]].map(([k, v]) => (
                  <div key={v}>
                    <dt className="font-display text-2xl font-bold text-slate-900">{k}</dt>
                    <dd className="text-xs uppercase tracking-wide text-slate-500">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* product mock */}
            <div className="animate-fade-up lg:justify-self-end">
              <RegisterMock />
            </div>
          </div>
        </section>

        {/* features */}
        <section id="features" className="border-t border-slate-200/70 bg-white py-20">
          <div className="container-page">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold sm:text-4xl">Everything a register should be</h2>
              <p className="mt-4 text-lg text-slate-600">Built from real classroom workflows — the speed of paper, the power of the cloud.</p>
            </div>
            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.title} className="card p-6 transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <f.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* how it works */}
        <section id="how" className="bg-slate-50 py-20">
          <div className="container-page">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold sm:text-4xl">From PIN to report in three steps</h2>
            </div>
            <div className="mt-14 grid gap-8 md:grid-cols-3">
              {STEPS.map((s) => (
                <div key={s.n} className="relative">
                  <span className="font-display text-5xl font-bold text-brand-100">{s.n}</span>
                  <h3 className="mt-2 text-xl font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* roles / CTA */}
        <section id="roles" className="py-20">
          <div className="container-page">
            <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 to-brand-600 px-8 py-14 text-center shadow-soft sm:px-16">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">Ready to mark smarter?</h2>
              <p className="mx-auto mt-4 max-w-xl text-brand-100">
                Teachers get a focused register for their classes. Admins get a live command centre for the whole school.
              </p>
              <div className="mt-8 flex justify-center">
                <Link href="/login" className="btn btn-lg bg-white text-brand-700 hover:bg-slate-100">
                  Log in <IconArrow className="h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="container-page flex flex-col items-center justify-between gap-4 py-8 sm:flex-row">
          <div className="flex items-center gap-2">
            <Logo className="h-6 w-6" />
            <span className="text-sm font-semibold text-slate-700">IESR</span>
            <span className="text-sm text-slate-400">· Smart School Attendance</span>
          </div>
          <p className="text-xs text-slate-500">© {new Date().getFullYear()} IESR. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

/* A static, decorative mock of the marking grid — pure presentation. */
function RegisterMock() {
  const rows = [
    { name: "A. Kiprono", status: "P" },
    { name: "B. Odhiambo", status: "P" },
    { name: "C. Wanjiru", status: "L" },
    { name: "D. Mutua", status: "A" },
    { name: "E. Chebet", status: "P" },
  ];
  const map: Record<string, { label: string; cls: string }> = {
    P: { label: "Present", cls: "bg-emerald-100 text-emerald-700" },
    A: { label: "Absent", cls: "bg-rose-100 text-rose-700" },
    L: { label: "Late", cls: "bg-amber-100 text-amber-700" },
  };
  return (
    <div className="card w-full max-w-md p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">CEEMAY2025R · Electrical</p>
          <p className="text-xs text-slate-500">Mon · Session 1 · 08:00–10:00</p>
        </div>
        <span className="badge"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Live</span>
      </div>
      <div className="mt-4 space-y-2">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
            <span className="text-sm font-medium text-slate-700">{r.name}</span>
            <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${map[r.status].cls}`}>{map[r.status].label}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between rounded-xl bg-brand-50 px-3 py-2.5">
        <span className="text-xs font-medium text-brand-700">3 present · 1 late · 1 absent</span>
        <span className="text-xs font-semibold text-brand-700">Submitted ✓</span>
      </div>
    </div>
  );
}
