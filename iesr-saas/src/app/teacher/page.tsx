import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { getAssignedClasses } from "@/lib/data/teacher";

export default async function TeacherHome() {
  const session = (await getSession())!; // guaranteed by layout
  const classes = await getAssignedClasses(session);
  const firstName = session.name.split(" ")[0] || session.name;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">Welcome, {firstName}</h1>
        <p className="mt-1 text-slate-600">Choose a class to mark attendance.</p>
      </div>

      {classes.length === 0 ? (
        <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
              <path d="M4 19V6a2 2 0 012-2h9l5 5v10a2 2 0 01-2 2H6a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-semibold">No classes assigned yet</h3>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            Ask your administrator to assign you to one or more classes. They&apos;ll appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => (
            <Link
              key={c.id}
              href={`/teacher/mark/${c.id}`}
              className="card group flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <span className="badge">{c.category}</span>
                <span className="text-sm font-medium text-slate-500">
                  {c.studentCount} student{c.studentCount === 1 ? "" : "s"}
                </span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">{c.displayName}</h3>
              <p className="mt-0.5 font-mono text-sm text-slate-500">{c.code}</p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 group-hover:gap-2.5 transition-all">
                Mark attendance
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
