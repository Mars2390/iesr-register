import Image from "next/image";

// "See the system in action" — classic browser-framed preview of the real app.
// Auto-detected assets (passed from the server page): a marking video takes the
// stage when present; otherwise the admin dashboard + teacher register sit side
// by side. Missing assets fall back to a branded IESR panel — never a broken image.

type Props = {
  video: string | null;      // /images/screenshots/marking.mp4 (or null)
  adminShot: string | null;  // real admin-dashboard screenshot (or null)
  teacherShot: string | null; // real teacher-register screenshot (or null)
};

const IconLock = () => (
  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none"><rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M8 11V8a4 4 0 018 0v3" stroke="currentColor" strokeWidth="2" /></svg>
);

function BrowserFrame({ address, children, className }: { address: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 ${className ?? ""}`}>
      <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
        <span className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </span>
        <span className="mx-auto flex items-center gap-1.5 rounded-md bg-white px-3 py-1 text-[11px] font-medium text-slate-400 ring-1 ring-slate-200">
          <IconLock />
          {address}
        </span>
      </div>
      <div className="relative bg-slate-100">{children}</div>
    </div>
  );
}

function BrandedPanel({ label }: { label: string }) {
  return (
    <div className="flex aspect-[16/10] items-center justify-center bg-gradient-to-br from-kplc-navy to-kplc-blue">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="relative h-16 w-16 overflow-hidden rounded-2xl ring-2 ring-white/25">
          <Image src="/images/iesr-4.jpg" alt="IESR" fill sizes="64px" className="object-cover" />
        </span>
        <span className="text-sm font-semibold text-white/90">{label}</span>
      </div>
    </div>
  );
}

function Shot({ src, alt, label }: { src: string | null; alt: string; label: string }) {
  if (!src) return <BrandedPanel label={label} />;
  return (
    <div className="relative aspect-[16/10]">
      <Image src={src} alt={alt} fill sizes="(max-width:1024px) 100vw, 50vw" className="object-cover object-top" />
      <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-kplc-navy backdrop-blur">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-kplc-green" /> Live
      </span>
    </div>
  );
}

export function Showcase({ video, adminShot, teacherShot }: Props) {
  return (
    <section className="bg-slate-50 py-20 sm:py-28">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow text-kplc-blue">Live preview</p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">See the system in action</h2>
          <p className="mt-4 text-lg text-slate-600">
            The real register — the admin command centre and the trainer&apos;s marking grid, exactly as the institute uses them.
          </p>
        </div>

        {/* hero: the live marking recording (when present) */}
        {video && (
          <div className="mx-auto mt-12 max-w-4xl">
            <BrowserFrame address="iesr-register.vercel.app/teacher">
              {/* muted autoplay loop — motion on content, no controls chrome */}
              <video className="block w-full" autoPlay muted loop playsInline poster={teacherShot ?? adminShot ?? undefined}>
                <source src={video} type={video.endsWith(".webm") ? "video/webm" : "video/mp4"} />
              </video>
              <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-kplc-navy/90 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white backdrop-blur">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-kplc-green" /> Live demo
              </span>
            </BrowserFrame>
            <p className="mt-4 text-center text-sm text-slate-500">Marking a class register, live — Present · Absent · Late in a tap.</p>
          </div>
        )}

        {/* the two command surfaces, side by side */}
        <div className="mt-10 grid items-start gap-6 lg:grid-cols-2">
          <div>
            <BrowserFrame address="iesr-register.vercel.app/admin">
              <Shot src={adminShot} alt="IESR admin analytics dashboard" label="Admin dashboard" />
            </BrowserFrame>
            <p className="mt-3 text-center text-sm font-medium text-slate-600">Admin — analytics &amp; insights command centre</p>
          </div>
          <div>
            <BrowserFrame address="iesr-register.vercel.app/teacher">
              <Shot src={teacherShot} alt="IESR teacher marking register" label="Teacher register" />
            </BrowserFrame>
            <p className="mt-3 text-center text-sm font-medium text-slate-600">Trainer — the weekly marking grid</p>
          </div>
        </div>
      </div>
    </section>
  );
}
