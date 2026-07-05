import Image from "next/image";

// A premium, continuously-drifting gallery strip (Zoom-style "motion on content").
// Pure CSS marquee — no client JS. Pauses on hover, halts for reduced-motion.
const SHOTS: { img: string; label: string }[] = [
  { img: "/images/iesr-13.jpg", label: "Field operations" },
  { img: "/images/iesr-5.jpg", label: "Practical labs" },
  { img: "/images/iesr-16.jpg", label: "Classroom training" },
  { img: "/images/iesr-2.jpg", label: "Trainers on the ground" },
  { img: "/images/iesr-10.jpg", label: "On the grid" },
  { img: "/images/iesr-7.jpg", label: "Command centre" },
  { img: "/images/iesr-12.jpg", label: "Hands-on work" },
  { img: "/images/iesr-6.jpg", label: "Substations" },
];

function Card({ img, label }: { img: string; label: string }) {
  return (
    <figure className="group relative h-52 w-72 shrink-0 overflow-hidden rounded-3xl shadow-soft ring-1 ring-black/5 sm:h-60 sm:w-80">
      <Image src={img} alt={label} fill sizes="320px" className="object-cover transition duration-700 group-hover:scale-105" />
      <div className="absolute inset-0 bg-gradient-to-t from-kplc-navy/75 via-kplc-navy/10 to-transparent" />
      <figcaption className="absolute bottom-4 left-4 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-kplc-yellow" />
        <span className="text-sm font-semibold text-white drop-shadow">{label}</span>
      </figcaption>
    </figure>
  );
}

export function Marquee() {
  return (
    <section className="overflow-hidden py-20 sm:py-28">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow text-kplc-blue">In the field</p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Kenya Power, on the ground</h2>
          <p className="mt-4 text-lg text-slate-600">
            The crews, classrooms and infrastructure the register keeps visible — every day, across every programme.
          </p>
        </div>
      </div>

      {/* edge-masked, infinitely-drifting strip */}
      <div className="marquee-mask mt-12 flex select-none overflow-hidden">
        <div className="animate-marquee flex shrink-0 gap-5 pr-5">
          {SHOTS.map((s) => <Card key={s.label} {...s} />)}
        </div>
        <div className="animate-marquee flex shrink-0 gap-5 pr-5" aria-hidden="true">
          {SHOTS.map((s) => <Card key={`${s.label}-dup`} {...s} />)}
        </div>
      </div>
    </section>
  );
}
