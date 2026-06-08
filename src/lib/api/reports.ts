import { supabase } from "@/lib/supabase/client";

export type ReportRow = Record<string, unknown>;
export type ProductionLogRow = Record<string, unknown>;
export type ReclamationZoneRow = Record<string, unknown>;

export async function fetchReports(): Promise<ReportRow[]> {
  try {
    const { data, error } = await supabase
      .from("ai_decisions")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(20);

    if (error) throw error;
    return data ?? [];
  } catch (error) {
    console.error("Failed to fetch reports:", error);
    return [];
  }
}

export async function saveReport(data: ReportRow): Promise<ReportRow | null> {
  try {
    const report = data.report as Record<string, unknown> | undefined;
    const decisionText =
      typeof data.executive_summary === "string" ? data.executive_summary :
      typeof data.summary === "string" ? data.summary :
      "Laporan MineOS berhasil dibuat.";

    const { data: inserted, error } = await supabase
      .from("ai_decisions")
      .insert({
        decision_text: decisionText,
        priority_level: "INFO",
        triggered_agents: ["LLM Report"],
        fleet_summary: report?.fleet ? JSON.stringify(report.fleet) : null,
        safety_summary: report?.safety ? JSON.stringify(report.safety) : null,
        emission_summary: report?.emission ? JSON.stringify(report.emission) : null,
        reclamation_summary: report?.reclamation ? JSON.stringify(report.reclamation) : null,
        scenario: "manual_report",
        llm_engine: "mock-llm",
      })
      .select()
      .single();

    if (error) throw error;
    return inserted ?? null;
  } catch (error) {
    console.error("Failed to save report:", error);
    return null;
  }
}

export async function fetchProductionLogs(days = 7): Promise<ProductionLogRow[]> {
  try {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceDate = since.toISOString();

    const { data, error } = await supabase
      .from("emission_logs")
      .select("*")
      .gte("timestamp", sinceDate)
      .order("timestamp", { ascending: true });

    if (error) throw error;
    return data ?? [];
  } catch (error) {
    console.error("Failed to fetch production logs:", error);
    return [];
  }
}

export async function fetchReclamationZones(): Promise<ReclamationZoneRow[]> {
  try {
    const { data, error } = await supabase
      .from("reclamation_zones")
      .select("*")
      .order("area", { ascending: true });

    if (error) throw error;
    return data ?? [];
  } catch (error) {
    console.error("Failed to fetch reclamation zones:", error);
    return [];
  }
}
