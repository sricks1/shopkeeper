import AppShell from "@/components/AppShell";
import { IssueStatusBadge, SeverityBadge, ToolStatusBadge } from "@/components/StatusBadge";
import { canManageTools, getCurrentStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, timeAgo } from "@/lib/utils";
import {
  AlertTriangle,
  CalendarDays,
  ChevronRight,
  Download,
  ExternalLink,
  MapPin,
  Package,
  Pencil,
  Tag,
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

  // Fetch recent issues and repairs in parallel
  const [{ data: issues }, { data: repairs }] = await Promise.all([
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
  ]);

  const isDown = tool.status === "down";

  return (
    <AppShell>
      <div className="px-4 pb-4 pt-6">
        {/* Back */}
        <Link href="/tools" className="mb-4 flex items-center gap-1 text-sm text-zinc-500">
          <ChevronRight size={14} className="rotate-180" />
          All Tools
        </Link>

        {/* Tool header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-zinc-900">{tool.name}</h1>
            {(tool.manufacturer || tool.model) && (
              <p className="mt-0.5 text-sm text-zinc-500">
                {[tool.manufacturer, tool.model].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <ToolStatusBadge status={tool.status} />
        </div>

        {/* Down banner */}
        {isDown && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 ring-1 ring-red-200">
            <AlertTriangle size={16} className="shrink-0 text-red-600" />
            <p className="text-sm font-medium text-red-700">
              This tool is currently out of service.
            </p>
          </div>
        )}

        {/* CTA buttons */}
        <div className="mb-4 flex gap-2">
          <Link
            href={`/tools/${slug}/issues/new`}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#e06829] px-4 py-3 text-sm font-semibold text-white"
          >
            <AlertTriangle size={16} />
            Report Issue
          </Link>
          <Link
            href={`/tools/${slug}/repairs/new`}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#324168] px-4 py-3 text-sm font-semibold text-white"
          >
            <Wrench size={16} />
            Log Repair
          </Link>
        </div>

        {/* Metadata card */}
        <div className="mb-4 rounded-xl bg-white px-4 py-4 shadow-sm ring-1 ring-zinc-200">
          <div className="flex flex-col gap-3 text-sm">
            {tool.location && (
              <div className="flex items-center gap-2 text-zinc-600">
                <MapPin size={15} className="shrink-0 text-zinc-400" />
                {tool.location}
              </div>
            )}
            {tool.serial && (
              <div className="flex items-center gap-2 text-zinc-600">
                <Tag size={15} className="shrink-0 text-zinc-400" />
                S/N: {tool.serial}
              </div>
            )}
            {tool.purchase_date && (
              <div className="flex items-center gap-2 text-zinc-600">
                <CalendarDays size={15} className="shrink-0 text-zinc-400" />
                Purchased {formatDate(tool.purchase_date)}
              </div>
            )}
            {tool.manual_url && (
              <a
                href={tool.manual_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[#324168]"
              >
                <ExternalLink size={15} className="shrink-0" />
                View manual
              </a>
            )}
          </div>

          {tool.notes && (
            <p className="mt-3 border-t border-zinc-100 pt-3 text-sm text-zinc-500">
              {tool.notes}
            </p>
          )}
        </div>

        {/* Actions row: edit + consumables + QR */}
        <div className="mb-6 flex flex-wrap gap-2">
          {canManageTools(staff?.role) && (
            <>
              <Link
                href={`/tools/${slug}/edit`}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white py-2 text-sm font-medium text-zinc-700"
              >
                <Pencil size={14} />
                Edit Tool
              </Link>
              <Link
                href={`/tools/${slug}/consumables`}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white py-2 text-sm font-medium text-zinc-700"
              >
                <Package size={14} />
                Consumables
              </Link>
            </>
          )}
          <a
            href={`/api/qr/${slug}`}
            download={`qr-${slug}.png`}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white py-2 text-sm font-medium text-zinc-700"
          >
            <Download size={14} />
            Download QR
          </a>
        </div>

        {/* Recent Issues */}
        <section className="mb-4">
          <h2 className="mb-2 text-sm font-semibold text-zinc-500 uppercase tracking-wide">
            Recent Issues
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
                      <p className="text-sm font-medium text-zinc-800">{issue.title}</p>
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
          <h2 className="mb-2 text-sm font-semibold text-zinc-500 uppercase tracking-wide">
            Recent Repairs
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
