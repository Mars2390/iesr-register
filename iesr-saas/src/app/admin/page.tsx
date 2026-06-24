import { getSession } from "@/lib/auth/session";
import { getDashboardData } from "@/lib/data/dashboard";
import { getReportOptions } from "@/lib/data/reports";
import { formatDate, addDays, noon } from "@/lib/dates";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";

// Live analytics — never cache.
export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  const session = (await getSession())!;
  const to = formatDate(new Date());
  const from = formatDate(addDays(noon(to), -120)); // default "This term" window

  const [initial, options] = await Promise.all([
    getDashboardData(session, { from, to }),
    getReportOptions(session),
  ]);

  return (
    <AnalyticsDashboard
      initial={JSON.parse(JSON.stringify(initial))}
      classes={options.classes}
      initialRange="term"
    />
  );
}
