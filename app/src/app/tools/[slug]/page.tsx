import AppShell from "@/components/AppShell";
import { IssueStatusBadge, SeverityBadge, ToolStatusBadge } from "@/components/StatusBadge";
import { canManageTools, getCurrentStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, timeAgo } from "@/lib/utils";
import { differenceInDays } from "date-fns";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  MapPin,
  Package,
  Pencil,
  Tag,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function ToolDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const staff = await getCurrentStaff();

  const { data: tool } = await supabase
    .from("tools")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!tool) notFound();

  const [{ data: issues }, { data: repairs }, { data: maintenanceTasks }] = await Promise.all([
    supabase
      .from("issues")
      .select("id, title, severity, status, created_at")
      .eq("tool_id", tool.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("repairs")
      .select("id, description, created_at")
      .eq("tool_id", tool.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("maintenance_tasks")
      .select("id, description, interval_days, last_performed_at")
      .eq("tool_id", tool.id)
      .order("created_at"),
  ]);

  function getTaskStatus(task: { interval_days: number | null; last_performed_at: string | null }) {
    if (!task.last_performed_at) return "never";
    if (!task.interval_days) return "ok";
    const next = new Date(task.last_performed_at);
    next.setDate(next.getDate() + task.interval_days);
    const days = differenceInDays(next, new Date());
    if (days < 0) return "overdue";
    if (days <= 14) return "due_soon";
    return "ok";
  }

  const overdueCount = (maintenanceTasks ?? []).filter((t) => getTaskStatus(t) === "overdue").length;
  const dueSoonCount = (maintenanceTasks ?? []).filter((t) => getTaskStatus(t) === "due_soon").length;

  const isDown = tool.status === "down";

  return (
    <AppShell>
      <div className="px-4 pb-6 pt-5">
        {/* Back */}
        <Link href="/tools" className="mb-4 flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-600">
          <ChevronRight size={14} className="rotate-180" />
          All Tools
        </Link>

        {/* Tool header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-zinc-900">{tool.name}</h1>
            {(tool.manufacturer || tool.model) && (
              <p className="mt-0.5 text-sm text-zinc-500">
                {[tool.manufacturer, tool.model].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <div className="mt-1 shrink-0">
            <ToolStatusBadge status={tool.status} />
          </div>
        </div>

        {/* Down banner */}
        {isDown && (
          <div className="mb-4 flex items-center gap-2.5 rounded-xl bg-red-50 px-4 py-3.5 ring-1 ring-red-200">
            <AlertTriangle size={16} className="shrink-0 text-red-500" />
            <p className="text-sm font-semibold text-red-700">
              This tool is currently out of service.
            </p>
          </div>
        )}

        {/* Primary CTAs */}
        <div className="mb-4 grid grid-cols-2 gap-2">
          <Link
            href={`/tools/${slug}/issues/new`}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#e06829] px-4 py-3.5 text-sm font-semibold text-white shadow-sm shadow-[#e06829]/20 transition-colors hover:bg-[#c55a22] active:bg-[#c55a22]"
          >
            <AlertTriangle size={16} className="shrink-0" />
            <span className="whitespace-nowrap">Report Issue</span>
          </Link>
          <Link
            href={`/tools/${slug}/repairs/new`}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#324168] px-4 py-3.5 text-sm font-semibold text-white shadow-sm shadow-[#324168]/20 transition-colors hover:bg-[#263352] active:bg-[#263352]"
          >
            <Wrench size={16} className="shrink-0" />
            <span className="whitespace-nowrap">Log Repair</span>
          </Link>
        </div>

        {/* Metadata card */}
        <div className="mb-4 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-zinc-200">
          <div className="flex flex-col divide-y divide-zinc-100">
            {tool.location && (
              <div className="flex items-center gap-3 px-4 py-3 text-sm">
                <MapPin size={14} className="shrink-0 text-zinc-400" />
                <span className="text-zinc-700">{tool.location}</span>
              </div>
            )}
            {tool.serial && (
              <div className="flex items-center gap-3 px-4 py-3 text-sm">
                <Tag size={14} className="shrink-0 text-zinc-400" />
                <span className="text-zinc-500">S/N</span>
                <span className="font-mono text-xs text-zinc-700">{tool.serial}</span>
              </div>
            )}
            {tool.purchase_date && (
              <div className="flex items-center gap-3 px-4 py-3 text-sm">
                <CalendarDays size={14} className="shrink-0 text-zinc-400" />
                <span className="text-zinc-700">Purchased {formatDate(tool.purchase_date)}</span>
              </div>
            )}
            {tool.manual_url && (
              <a
                href={tool.manual_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 text-sm text-[#324168]"
              >
                <ExternalLink size={14} className="shrink-0" />
                View manual
              </a>
            )}
          </div>
          {tool.notes && (
            <p className="border-t border-zinc-100 px-4 py-3 text-sm text-zinc-500 italic">
              {tool.notes}
            </p>
          )}
        </div>

        {/* Secondary actions */}
        <div className={`mb-6 grid gap-2 ${canManageTools(staff?.role) ? "grid-cols-4" : "grid-cols-3"}`}>
          {canManageTools(staff?.role) && (
            <Link
              href={`/tools/${slug}/edit`}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              <Pencil size={14} className="shrink-0" />
              <span className="whitespace-nowrap">Edit</span>
            </Link>
          )}
          <Link
            href={`/tools/${slug}/consumables`}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            <Package size={14} className="shrink-0" />
            <span className="whitespace-nowrap">Parts</span>
          </Link>
          <Link
            href={`/tools/${slug}/maintenance`}
            className="relative flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            <Wrench size={14} className="shrink-0" />
            <span className="whitespace-nowrap">Maint.</span>
            {(overdueCount > 0 || dueSoonCount > 0) && (
              <span className={`absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white ${overdueCount > 0 ? "bg-red-500" : "bg-orange-400"}`}>
                {overdueCount + dueSoonCount}
              </span>
            )}
          </Link>
          <a
            href={`/api/qr/${slug}`}
            download={`qr-${slug}.png`}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            <Download size={14} className="shrink-0" />
            <span className="whitespace-nowrap">QR</span>
          </a>
        </div>

        {/* Maintenance summary */}
        {maintenanceTasks && maintenanceTasks.length > 0 && (overdueCount > 0 || dueSoonCount > 0) && (
          <section className="mb-5">
            <h2 className="mb-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400">
              <span className="h-px flex-1 bg-zinc-200" />
              Maintenance
              <span className="h-px flex-1 bg-zinc-200" />
            </h2>
            <ul className="flex flex-col gap-2">
              {maintenanceTasks
                .filter((t) => ["overdue", "due_soon"].includes(getTaskStatus(t)))
                .map((task) => {
                  const status = getTaskStatus(task);
                  return (
                    <li key={task.id}>
                      <Link
                        href={`/tools/${slug}/maintenance`}
                        className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-zinc-200 transition-colors active:bg-zinc-50"
                      >
                        {status === "overdue"
                          ? <TriangleAlert size={15} className="shrink-0 text-red-500" />
                          : <Clock size={15} className="shrink-0 text-orange-400" />
                        }
                        <span className="flex-1 text-sm font-medium text-zinc-800">{task.description}</span>
                        <span className={`text-xs font-semibold ${status === "overdue" ? "text-red-500" : "text-orange-500"}`}>
                          {status === "overdue" ? "Overdue" : "Due soon"}
                        </span>
                        <ChevronRight size={13} className="shrink-0 text-zinc-300" />
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </section>
        )}

        {/* Recent Issues */}
        <section className="mb-5">
          <h2 className="mb-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400">
            <span className="h-px flex-1 bg-zinc-200" />
            Recent Issues
            <span className="h-px flex-1 bg-zinc-200" />
          </h2>
          {!issues?.length ? (
            <p className="rounded-xl bg-white px-4 py-4 text-sm text-zinc-400 ring-1 ring-zinc-200">
              No issues reported.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {issues.map((issue) => (
                <li key={issue.id}>
                  <Link
                    href={`/tools/${slug}/issues/${issue.id}`}
                    className="flex flex-col rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-zinc-200 transition-colors active:bg-zinc-50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-zinc-800">{issue.title}</p>
                      <IssueStatusBadge status={issue.status} />
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <SeverityBadge severity={issue.severity} />
                      <span className="text-xs text-zinc-400">{timeAgo(issue.created_at)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent Repairs */}
        <section>
          <h2 className="mb-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400">
            <span className="h-px flex-1 bg-zinc-200" />
            Recent Repairs
            <span className="h-px flex-1 bg-zinc-200" />
          </h2>
          {!repairs?.length ? (
            <p className="rounded-xl bg-white px-4 py-4 text-sm text-zinc-400 ring-1 ring-zinc-200">
              No repairs logged.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {repairs.map((repair) => (
                <li
                  key={repair.id}
                  className="rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-zinc-200"
                >
                  <p className="text-sm font-medium text-zinc-800 line-clamp-2">
                    {repair.description}
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">{timeAgo(repair.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
