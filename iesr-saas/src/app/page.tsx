import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Reveal } from "@/components/landing/Reveal";
import { Counter } from "@/components/landing/Counter";

/* ------------------------------------------------------------ icons */
type I = { className?: string };
const IconCheck = ({ className }: I) => (<svg viewBox="0 0 24 24" className={className} fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>);
const IconPulse = ({ className }: I) => (<svg viewBox="0 0 24 24" className={className} fill="none"><path d="M3 12h4l2 6 4-14 2 8h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>);
const IconChart = ({ className }: I) => (<svg viewBox="0 0 24 24" className={className} fill="none"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>);
const IconFlag = ({ className }: I) => (<svg viewBox="0 0 24 24" className={className} fill="none"><path d="M5 21V4m0 0h11l-2 4 2 4H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>);
const IconDoc = ({ className }: I) => (<svg viewBox="0 0 24 24" className={className} fill="none"><path d="M7 3h7l5 5v13H7zM14 3v5h5M9 13h6M9 17h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>);
const IconShield = ({ className }: I) => (<svg viewBox="0 0 24 24" className={className} fill="none"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>);
const IconArrow = ({ className }: I) => (<svg viewBox="0 0 24 24" className={className} fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>);

const FEATURES = [
  { icon: IconCheck, title: "One-tap marking", body: "Present, Absent, Late or Unmarked per student, per session — fast, accurate registers on any device." },
  { icon: IconPulse, title: "Live monitoring", body: "See who is marking which class right now, refreshed every few seconds. No more chasing registers." },
  { icon: IconChart, title: "Insight & momentum", body: "Automatic intelligence: at-risk learners, class trends and trainer marking momentum — computed for you." },
  { icon: IconFlag, title: "Flags & issues", body: "Trainers raise issues from the register; administrators triage and resolve from one tracked queue." },
  { icon: IconDoc, title: "PDF & CSV reports", body: "Export weekly, monthly and termly reports — branded PDFs and clean CSVs — straight from the dashboard." },
  { icon: IconShield, title: "Secure PIN access", body: "Trainers and admins sign in with a secure PIN. Trainers see only their classes; admins see everything." },
];

const SHOWCASE = [
  { img: "/images/iesr-7.jpg", eyebrow: "Command centre", title: "Every register, in real time", body: "Administrators watch attendance land as it happens — active sessions, today's totals and a live activity feed — so nothing slips through the cracks.", reverse: false },
  { img: "/images/iesr-5.jpg", eyebrow: "Intelligence", title: "Insight that finds at-risk learners", body: "Momentum scoring, problematic-student detection and class comparisons surface the trainees who need attention — before attendance becomes a problem.", reverse: true },
  { img: "/images/iesr-16.jpg", eyebrow: "Built for IESR", title: "From the field to the classroom", body: "Designed around real training workflows at the Institute of Energy Studies & Research — multi-session days, subject timetables and class–trainer relationships.", reverse: false },
];

const STEPS = [
  { n: "01", t: "Sign in with a PIN", d: "No usernames to remember. A valid PIN identifies the trainer; the admin PIN unlocks full control." },
  { n: "02", t: "Mark the register", d: "Pick the day and session, tap statuses, add notes, and submit — synced to the cloud instantly." },
  { n: "03", t: "Monitor & report", d: "Admins watch attendance live, triage flags, and export the reports leadership needs." },
];

const AUDIENCES = [
  { img: "/images/iesr-2.jpg", role: "Trainers", body: "A focused register for your assigned classes — mark fast, raise issues, review your own history." },
  { img: "/images/iesr-13.jpg", role: "Administrators", body: "A live command centre: monitor marking, manage classes & trainees, triage flags, export reports." },
  { img: "/images/iesr-10.jpg", role: "Parents & sponsors", body: "Clear visibility into a trainee's attendance and engagement — present, absent and late at a glance." },
];

const TESTIMONIALS = [
  { img: "/images/iesr-8.jpeg", quote: "We replaced a fragile spreadsheet with a platform the whole institute trusts. Marking takes seconds and the reports write themselves.", who: "Training Administrator", role: "IESR" },
  { img: "/images/iesr-9.jpeg", quote: "Seeing who is marking, live, changed how we run the day. Issues get flagged and resolved before they grow.", who: "Department Lead", role: "Institute of Energy Studies & Research" },
];

export default function LandingPage() {
  return (
    <div className="overflow-x-hidden bg-white">
      <Navbar />
      <Hero />

      {/* trust strip */}
      <section className="border-b border-slate-100 bg-white">
        <div className="container-page flex flex-col items-center justify-between gap-4 py-6 sm:flex-row">
          <div className="flex items-center gap-3">
            <span className="relative h-10 w-10 overflow-hidden rounded-full ring-1 ring-slate-200">
              <Image src="/images/iesr-3.jpg" alt="Kenya Power IESR" fill sizes="40px" className="object-cover" />
            </span>
            <p className="text-sm font-medium text-slate-600">An initiative of <span className="font-bold text-kplc-navy">Kenya Power</span> · Institute of Energy Studies &amp; Research</p>
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Secure · Cloud-backed · Real-time</p>
        </div>
      </section>

      {/* stats band */}
      <section className="relative overflow-hidden">
        <Image src="/images/iesr-14.jpg" alt="" fill sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-kplc-navy/90" />
        <div className="container-page relative py-16 sm:py-20">
          <div className="grid grid-cols-2 gap-8 text-center text-white lg:grid-cols-4">
            {[
              { to: 4, suffix: "", label: "Attendance statuses" },
              { to: 5, suffix: "s", label: "Live refresh" },
              { to: 100, suffix: "%", label: "Cloud-backed" },
              { to: 24, suffix: "/7", label: "Always available" },
            ].map((s) => (
              <Reveal key={s.label}>
                <Counter to={s.to} suffix={s.suffix} className="font-display text-5xl font-bold text-kplc-yellow sm:text-6xl" />
                <p className="mt-2 text-sm font-medium uppercase tracking-wide text-white/70">{s.label}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* features */}
      <section id="features" className="bg-slate-50 py-20 sm:py-28">
        <div className="container-page">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="eyebrow text-kplc-blue">What it does</p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Everything a modern register should be</h2>
            <p className="mt-4 text-lg text-slate-600">Built from real classroom workflows — the speed of paper, the power of the cloud.</p>
          </Reveal>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 0.08}>
                <div className="card h-full p-6 transition hover:-translate-y-1 hover:shadow-md">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-kplc-blue to-kplc-navy text-white">
                    <f.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.body}</p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* feature image card */}
          <Reveal className="mt-6">
            <div className="card relative grid items-center gap-6 overflow-hidden p-0 lg:grid-cols-2">
              <div className="relative aspect-[4/3] lg:aspect-auto lg:h-full">
                <Image src="/images/iesr-12.jpg" alt="Hands-on training at IESR" fill sizes="(max-width:1024px) 100vw, 50vw" className="object-cover" />
              </div>
              <div className="p-8 lg:p-10">
                <p className="eyebrow text-kplc-green">Hands-on, tracked</p>
                <h3 className="mt-3 text-2xl font-bold">Attendance that respects how IESR trains</h3>
                <p className="mt-3 text-slate-600">Practical labs, field work and classroom sessions all roll up into one accurate record — per student, per session, per subject.</p>
                <Link href="/login" className="btn-primary mt-6">Open the register <IconArrow className="h-4 w-4" /></Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* showcase rows */}
      <section className="py-20 sm:py-28">
        <div className="container-page space-y-20 sm:space-y-28">
          {SHOWCASE.map((s) => (
            <Reveal key={s.title}>
              <div className="grid items-center gap-10 lg:grid-cols-2">
                <div className={`relative aspect-[4/3] overflow-hidden rounded-3xl shadow-soft ${s.reverse ? "lg:order-2" : ""}`}>
                  <Image src={s.img} alt={s.title} fill sizes="(max-width:1024px) 100vw, 50vw" className="object-cover" />
                </div>
                <div className={s.reverse ? "lg:order-1" : ""}>
                  <p className="eyebrow text-kplc-blue">{s.eyebrow}</p>
                  <h3 className="mt-3 text-3xl font-bold sm:text-4xl">{s.title}</h3>
                  <p className="mt-4 text-lg leading-relaxed text-slate-600">{s.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* parallax divider */}
      <section className="relative h-[42vh] overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundAttachment: "fixed", backgroundImage: "url(/images/iesr-6.jpg)", backgroundSize: "cover", backgroundPosition: "center" }} />
        <div className="absolute inset-0 bg-gradient-to-r from-kplc-navy/90 to-kplc-navy/70" />
        <div className="container-page relative flex h-full items-center">
          <Reveal>
            <p className="max-w-3xl text-2xl font-semibold leading-snug text-white sm:text-4xl">
              &ldquo;Powering Kenya takes precision. So does training the people who do it.&rdquo;
            </p>
          </Reveal>
        </div>
      </section>

      {/* how it works */}
      <section id="how" className="bg-slate-50 py-20 sm:py-28">
        <div className="container-page">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="eyebrow text-kplc-blue">How it works</p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">From PIN to report in three steps</h2>
          </Reveal>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.1}>
                <div className="relative rounded-2xl border border-slate-200 bg-white p-7">
                  <span className="font-display text-5xl font-bold text-transparent [-webkit-text-stroke:1.5px_#1466b8]">{s.n}</span>
                  <h3 className="mt-3 text-xl font-semibold">{s.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* who is it for */}
      <section id="who" className="py-20 sm:py-28">
        <div className="container-page">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="eyebrow text-kplc-green">For everyone</p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">One platform, every role</h2>
          </Reveal>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {AUDIENCES.map((a, i) => (
              <Reveal key={a.role} delay={i * 0.08}>
                <div className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft transition hover:-translate-y-1 hover:shadow-md">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <Image src={a.img} alt={a.role} fill sizes="(max-width:768px) 100vw, 33vw" className="object-cover transition duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-kplc-navy/80 to-transparent" />
                    <h3 className="absolute bottom-4 left-5 text-xl font-bold text-white">{a.role}</h3>
                  </div>
                  <p className="p-5 text-sm leading-relaxed text-slate-600">{a.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* about / brand */}
      <section id="about" className="bg-kplc-navy py-20 text-white sm:py-28">
        <div className="container-page grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <p className="eyebrow text-kplc-yellow">About IESR</p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Trusted by the people who keep the lights on</h2>
            <p className="mt-4 text-lg leading-relaxed text-white/80">
              The Institute of Energy Studies &amp; Research is Kenya Power&apos;s training arm — building the engineers,
              technicians and craftspeople behind the national grid. The IESR Register brings that same standard of
              rigour to attendance: secure, accountable and built to scale across every programme.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="btn bg-white text-kplc-navy hover:bg-white/90">Get started <IconArrow className="h-4 w-4" /></Link>
              <a href="#features" className="btn glass text-white hover:bg-white/20">See features</a>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-3xl ring-1 ring-white/15">
              <Image src="/images/iesr-15.jpg" alt="IESR training" fill sizes="(max-width:1024px) 80vw, 33vw" className="object-cover" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* testimonials */}
      <section className="py-20 sm:py-28">
        <div className="container-page">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="eyebrow text-kplc-blue">In their words</p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Built for real training days</h2>
            <p className="mt-3 text-sm text-slate-400">Illustrative of the roles the platform serves.</p>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {TESTIMONIALS.map((t) => (
              <Reveal key={t.who}>
                <figure className="card flex h-full flex-col p-6">
                  <blockquote className="flex-1 text-lg font-medium leading-relaxed text-slate-700">&ldquo;{t.quote}&rdquo;</blockquote>
                  <figcaption className="mt-6 flex items-center gap-3">
                    <span className="relative h-12 w-12 overflow-hidden rounded-full ring-1 ring-slate-200">
                      <Image src={t.img} alt="" fill sizes="48px" className="object-cover" />
                    </span>
                    <div>
                      <p className="font-semibold text-slate-800">{t.who}</p>
                      <p className="text-sm text-slate-500">{t.role}</p>
                    </div>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="relative overflow-hidden">
        <Image src="/images/iesr-11.jpg" alt="" fill sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-kplc-navy/95 to-kplc-blue/85" />
        <div className="container-page relative py-24 text-center text-white">
          <Reveal>
            <h2 className="mx-auto max-w-3xl text-3xl font-bold sm:text-5xl">Ready to modernise attendance at IESR?</h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">Trainers get a focused register. Admins get a live command centre. Everyone gets the truth, in real time.</p>
            <Link href="/login" className="btn btn-lg mt-8 bg-kplc-yellow text-kplc-navy shadow-lg hover:brightness-95">
              Log in now <IconArrow className="h-5 w-5" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* footer — real IESR institutional details */}
      <footer className="bg-[#0a1326] pt-16 text-white/80">
        <div className="container-page grid gap-10 pb-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <FooterHeading>Courses</FooterHeading>
            <ul className="mt-4 space-y-2 text-sm text-white/70">
              {["Safety Competency in Power Systems", "Project Management", "Advanced Excel", "Leadership and Supervision", "Renewable Energy–Solar PV System"].map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>

          <div>
            <FooterHeading>Links</FooterHeading>
            <ul className="mt-4 space-y-2 text-sm">
              {[
                ["IESR", "https://www.iesr.ac.ke"],
                ["KPLC", "https://www.kplc.co.ke"],
                ["RES4AFRICA", "https://www.res4africa.org"],
                ["RES4MED", "https://www.res4africa.org"],
              ].map(([label, href]) => (
                <li key={label}>
                  <a href={href} target="_blank" rel="noreferrer" className="text-white/70 transition-colors hover:text-kplc-yellow">{label}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <FooterHeading>About us</FooterHeading>
            <p className="mt-4 text-sm leading-relaxed text-white/70">
              The Institute of Energy Studies and Research (IESR) was established in 1957 with the aim of developing
              technical and supervisory skills to the then East African Power and Lighting Company employees.
            </p>
          </div>

          <div>
            <FooterHeading>Contact us</FooterHeading>
            <ul className="mt-4 space-y-1.5 text-sm text-white/70">
              <li className="font-medium text-white/85">Institute of Energy Studies &amp; Research</li>
              <li>P. O. Box 10355 – 00100, Nairobi</li>
              <li>Tel: +254 020 266348/6, 0725 559900</li>
              <li>Email: <a href="mailto:info@iesr.ac.ke" className="text-white/80 hover:text-kplc-yellow">info@iesr.ac.ke</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="container-page flex flex-col items-center justify-between gap-3 py-6 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <span className="relative h-8 w-8 overflow-hidden rounded-full bg-white ring-1 ring-white/30">
                <Image src="/images/iesr-3.jpg" alt="IESR" fill sizes="32px" className="object-cover" />
              </span>
              <span className="text-sm font-semibold text-white">IESR Attendance System</span>
            </div>
            <p className="text-center text-xs text-white/50">
              © {new Date().getFullYear()} Institute of Energy Studies &amp; Research · Kenya Power. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-kplc-yellow">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" /><path d="M12 11v5M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
      {children}
    </h3>
  );
}
