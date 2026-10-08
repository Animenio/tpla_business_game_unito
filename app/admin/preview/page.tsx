import { redirect } from "next/navigation";
import { AdminGamePreview } from "@/src/components/admin-game-preview";
import { ROUND_CONTENT, roundNumber } from "@/src/domain/game/round-content";
import { simulateGame } from "@/src/domain/simulation/v053/engine";
import {
  DEFAULT_DECISIONS,
  MODEL_VERSION as V053_MODEL_VERSION,
  type RoundNumber,
} from "@/src/domain/simulation/v053/spec";
import { requireTeacherGameContext } from "@/src/lib/game/context";

interface AdminPreviewPageProps {
  searchParams: Promise<{
    screen?: string | string[];
    round?: string | string[];
  }>;
}

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminPreviewPage({
  searchParams,
}: AdminPreviewPageProps) {
  const { supabase, profile, membership, session } =
    await requireTeacherGameContext();

  if (membership.role !== "admin") {
    redirect("/teacher");
  }

  const search = await searchParams;
  const screen = param(search.screen) ?? "registration";

  let round: RoundNumber = 1;
  try {
    round = roundNumber(Number(param(search.round) ?? "1"));
  } catch {
    round = 1;
  }

  const [{ data: rounds }, { data: materials }] = await Promise.all([
    supabase
      .from("game_rounds")
      .select(
        "id, round_number, period_label, scenario_title, scenario_summary, decision_window_minutes",
      )
      .eq("session_id", session.id)
      .order("round_number", { ascending: true }),
    supabase
      .from("session_materials")
      .select("id, title, description, file_type, source_url, required")
      .eq("session_id", session.id)
      .order("sort_order", { ascending: true }),
  ]);

  const game = simulateGame(DEFAULT_DECISIONS);
  const previewRound = rounds?.find((item) => item.round_number === round);
  const roundContent = ROUND_CONTENT[round];

  const yearsByRound: Record<RoundNumber, number> = {
    1: 2026,
    2: 2028,
    3: 2030,
  };
  const annual = game.annual[yearsByRound[round] as 2026 | 2028 | 2030];

  return (
    <AdminGamePreview
      annual={{
        revenue: annual.totalRevenue,
        ebitdaMargin: annual.adjustedEbitdaMargin,
        netDebt: annual.netDebt,
        premiumShare: annual.premiumRevenueShare,
        strategicHealth: annual.strategicHealth,
        competitivePosition: annual.competitivePosition,
        cumulativeUfcf:
          game.annual[2026].unleveredFreeCashFlow +
          game.annual[2027].unleveredFreeCashFlow +
          game.annual[2028].unleveredFreeCashFlow +
          game.annual[2029].unleveredFreeCashFlow +
          game.annual[2030].unleveredFreeCashFlow,
      }}
      final={{
        finalGameValue: game.valuation.finalGameValue,
        enterpriseValue: game.valuation.enterpriseValue,
        impliedEquityValue: game.valuation.impliedEquityValue,
        riskPenalty: game.valuation.pvExpectedDistressCost,
        pvExplicitUfcf: game.valuation.pvExplicitUfcf,
        pvTerminalValue: game.terminal.pvTerminalValue,
        finalRevenue: game.annual[2030].totalRevenue,
        finalEbitdaMargin: game.annual[2030].adjustedEbitdaMargin,
        finalPremiumShare: game.annual[2030].premiumRevenueShare,
        finalNetDebt: game.annual[2030].netDebt,
        competitivePosition: game.annual[2030].competitivePosition,
        strategicHealth: game.annual[2030].strategicHealth,
      }}
      materials={(materials ?? []).map((material) => ({
        id: material.id,
        title: material.title,
        description: material.description,
        material_type: material.file_type,
        source_url: material.source_url,
        required: material.required,
      }))}
      modelVersion={session.model_version}
      previewModelVersion={V053_MODEL_VERSION}
      profileName={profile.full_name}
      round={round}
      roundInfo={{
        period: previewRound?.period_label ?? roundContent.period,
        title: previewRound?.scenario_title ?? roundContent.title,
        summary: previewRound?.scenario_summary ?? roundContent.body,
        decisionWindowMinutes: previewRound?.decision_window_minutes ?? 12,
      }}
      screen={screen}
      sessionCode={session.code}
      sessionTitle={session.title}
    />
  );
}
