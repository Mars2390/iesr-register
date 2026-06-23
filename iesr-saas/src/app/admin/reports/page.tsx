import { getSession } from "@/lib/auth/session";
import { getReportOptions, getAnalyticsRows } from "@/lib/data/reports";
import { computeOverview, computeInsights, computeProblematic } from "@/lib/analytics";
import { formatDate, addDays, noon } from "@/lib/dates";
import { ReportsClient } from "@/components/admin/ReportsClient";

export default async function ReportsPage() {
  const session = (await getSession())!;
  const to = formatDate(new Date());
  const from = formatDate(addDays(noon(to), -30));

  const [options, rows] = await Promise.all([
    getReportOptions(session),
    getAnalyticsRows(session, { from, to }),
  ]);

  const initial = {
    overview: computeOverview(rows),
    insights: computeInsights(rows),
    problematic: computeProblematic(rows, 3),
  };

  return <ReportsClient options={options} initial={JSON.parse(JSON.stringify(initial))} from={from} to={to} />;
}
