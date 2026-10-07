"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTeacherGameContext } from "@/src/lib/game/context";
import type { RoundNumber } from "@/src/domain/simulation/v04/spec";
import {
  createSessionOpeningState,
  simulateSessionGame,
  simulateSessionRound,
  type SessionOpeningState,
} from "@/src/domain/simulation/session-engine";
import type { StoredDecisionRow } from "@/src/domain/simulation/v05/storage";
import { roundNumber } from "@/src/domain/game/round-content";
import type { Json } from "@/src/types/database";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function routeError(path: string, message: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}error=${encodeURIComponent(message)}`;
}

function teacherRoundError(message: string) {
  if (message.includes("FORBIDDEN")) {
    return "Non hai i permessi per controllare questo round.";
  }
  if (message.includes("SESSION_NOT_LIVE")) {
    return "La simulazione non è ancora attiva.";
  }
  if (message.includes("ROUND_NOT_SCHEDULED")) {
    return "Il round è già stato aperto o chiuso.";
  }
  if (message.includes("ANOTHER_ROUND_OPEN")) {
    return "È già aperto un altro round.";
  }
  if (message.includes("PREVIOUS_ROUND_NOT_CLOSED")) {
    return "Chiudi il round precedente prima di procedere.";
  }
  if (
    message.includes("ROUND_STILL_IN_PROGRESS") ||
    message.includes("TEAMS_MISSING_SUBMISSION")
  ) {
    return "Tutti i team attivi devono inviare prima della chiusura del round.";
  }
  if (message.includes("ROUND_NOT_OPEN")) {
    return "Il round non è aperto.";
  }
  if (message.includes("RESULT_COUNT_MISMATCH")) {
    return "Il numero di risultati calcolati non coincide con gli invii ricevuti.";
  }
  return "Operazione sul round non completata. Riprova.";
}

function storedDecision(row: {
  hv_price_change: number;
  std_price_change: number;
  marketing_change: number;
  rnd_pct: number;
  capex_pct: number;
  inventory_days: number;
  receivable_days: number;
  natural_rubber_hedge: number;
  connected_rnd_allocation: number;
}): StoredDecisionRow {
  return {
    hv_price_change: Number(row.hv_price_change),
    std_price_change: Number(row.std_price_change),
    marketing_change: Number(row.marketing_change),
    rnd_pct: Number(row.rnd_pct),
    capex_pct: Number(row.capex_pct),
    inventory_days: Number(row.inventory_days),
    receivable_days: Number(row.receivable_days),
    natural_rubber_hedge: Number(row.natural_rubber_hedge),
    connected_rnd_allocation: Number(row.connected_rnd_allocation),
  };
}

export async function openRoundAction(formData: FormData) {
  const roundId = value(formData, "round_id");
  const numericRound = Number(value(formData, "round_number"));
  const windowMinutes = Number(value(formData, "window_minutes") || "12");
  let round: RoundNumber;

  try {
    round = roundNumber(numericRound);
  } catch {
    redirect(routeError("/teacher", "Numero round non valido."));
  }

  const { supabase, session } = await requireTeacherGameContext();

  const { data: targetRound } = await supabase
    .from("game_rounds")
    .select("id")
    .eq("id", roundId)
    .eq("session_id", session.id)
    .eq("round_number", round)
    .maybeSingle();

  if (!targetRound) {
    redirect(routeError("/teacher", "Round non trovato."));
  }

  const { error } = await supabase.rpc("teacher_open_round", {
    p_round_id: roundId,
    p_window_minutes: windowMinutes,
  });

  if (error) {
    redirect(routeError("/teacher", teacherRoundError(error.message)));
  }

  revalidatePath("/teacher");
  revalidatePath("/case-study");
  redirect(`/teacher/rounds/${round}`);
}

export async function extendRoundAction(formData: FormData) {
  const roundId = value(formData, "round_id");
  const numericRound = Number(value(formData, "round_number"));
  let round: RoundNumber;

  try {
    round = roundNumber(numericRound);
  } catch {
    redirect("/teacher");
  }

  const { supabase, session } = await requireTeacherGameContext();

  const { data: targetRound } = await supabase
    .from("game_rounds")
    .select("id")
    .eq("id", roundId)
    .eq("session_id", session.id)
    .maybeSingle();

  if (!targetRound) {
    redirect(routeError("/teacher", "Round non trovato."));
  }

  const { error } = await supabase.rpc("teacher_extend_round", {
    p_round_id: roundId,
    p_minutes: 2,
  });

  if (error) {
    redirect(
      routeError(
        `/teacher/rounds/${round}`,
        teacherRoundError(error.message),
      ),
    );
  }

  revalidatePath(`/teacher/rounds/${round}`);
  redirect(`/teacher/rounds/${round}`);
}

export async function finalizeRoundAction(formData: FormData) {
  const roundId = value(formData, "round_id");
  const numericRound = Number(value(formData, "round_number"));
  let round: RoundNumber;

  try {
    round = roundNumber(numericRound);
  } catch {
    redirect("/teacher");
  }

  const { supabase, session } = await requireTeacherGameContext();

  const { data: gameRound } = await supabase
    .from("game_rounds")
    .select("id, session_id, round_number, status")
    .eq("id", roundId)
    .eq("session_id", session.id)
    .eq("round_number", round)
    .maybeSingle();

  if (!gameRound || gameRound.status !== "open") {
    redirect(
      routeError(
        `/teacher/rounds/${round}`,
        "Il round non è aperto.",
      ),
    );
  }

  const { data: submissions, error: submissionError } = await supabase
    .from("team_round_decisions")
    .select(
      "team_id, hv_price_change, std_price_change, marketing_change, rnd_pct, capex_pct, inventory_days, receivable_days, natural_rubber_hedge, connected_rnd_allocation",
    )
    .eq("round_id", roundId)
    .eq("status", "submitted");

  if (submissionError) {
    redirect(
      routeError(
        `/teacher/rounds/${round}`,
        "Impossibile leggere le decisioni inviate.",
      ),
    );
  }

  let previousRoundId: string | null = null;

  if (round > 1) {
    const { data: previousRound } = await supabase
      .from("game_rounds")
      .select("id")
      .eq("session_id", session.id)
      .eq("round_number", round - 1)
      .eq("status", "closed")
      .maybeSingle();

    if (!previousRound) {
      redirect(
        routeError(
          `/teacher/rounds/${round}`,
          "Il risultato del round precedente non è disponibile.",
        ),
      );
    }

    previousRoundId = previousRound.id;
  }

  const resultPayload: Array<Record<string, Json | string | number>> = [];

  for (const submission of submissions ?? []) {
    let openingState: SessionOpeningState;

    if (round === 1) {
      openingState = createSessionOpeningState(session.model_version);
    } else {
      const { data: previousResult } = await supabase
        .from("team_round_results")
        .select("result")
        .eq("round_id", previousRoundId!)
        .eq("team_id", submission.team_id)
        .maybeSingle();

      const parsedPrevious =
        previousResult?.result as unknown as
          | { closingState?: SessionOpeningState }
          | undefined;

      if (!parsedPrevious?.closingState) {
        redirect(
          routeError(
            `/teacher/rounds/${round}`,
            "Manca lo stato economico del round precedente per almeno un team.",
          ),
        );
      }

      openingState = parsedPrevious.closingState;
    }

    const result = simulateSessionRound(
      session.model_version,
      openingState,
      storedDecision(submission),
      round,
    );

    resultPayload.push({
      team_id: submission.team_id,
      model_version: result.modelVersion,
      result: result.rawResult as unknown as Json,
      total_revenue: result.totalRevenue,
      adjusted_ebitda_margin: result.adjustedEbitdaMargin,
      unlevered_free_cash_flow: result.unleveredFreeCashFlow,
      net_debt: result.netDebt,
      premium_revenue_share: result.premiumRevenueShare,
      strategic_health: result.strategicHealth,
    });
  }

  let finalScores: Json | null = null;

  if (round === 3) {
    const [{ data: roundRows }, { data: activeTeams }] = await Promise.all([
      supabase
        .from("game_rounds")
        .select("id, round_number")
        .eq("session_id", session.id)
        .order("round_number", { ascending: true }),
      supabase
        .from("teams")
        .select("id")
        .eq("session_id", session.id)
        .eq("status", "active"),
    ]);

    const roundIds = (roundRows ?? []).map((item) => item.id);

    const { data: allDecisions } = roundIds.length
      ? await supabase
          .from("team_round_decisions")
          .select(
            "round_id, team_id, status, hv_price_change, std_price_change, marketing_change, rnd_pct, capex_pct, inventory_days, receivable_days, natural_rubber_hedge, connected_rnd_allocation",
          )
          .in("round_id", roundIds)
          .eq("status", "submitted")
      : { data: [] };

    const roundNumberById = new Map(
      (roundRows ?? []).map((item) => [
        item.id,
        roundNumber(item.round_number),
      ]),
    );

    const finalScorePayload: Array<
      Record<string, Json | string | number>
    > = [];

    for (const team of activeTeams ?? []) {
      const teamDecisions = (allDecisions ?? []).filter(
        (item) => item.team_id === team.id,
      );

      if (teamDecisions.length !== 3) {
        redirect(
          routeError(
            "/teacher/rounds/3",
            "Ogni team deve avere tre set di decisioni inviati prima del calcolo finale.",
          ),
        );
      }

      const decisionsByRound = {} as Record<RoundNumber, StoredDecisionRow>;

      for (const item of teamDecisions) {
        const decisionRound = roundNumberById.get(item.round_id);

        if (!decisionRound) {
          redirect(
            routeError(
              "/teacher/rounds/3",
              "Impossibile ricostruire la sequenza dei round.",
            ),
          );
        }

        decisionsByRound[decisionRound] = storedDecision(item);
      }

      if (
        !decisionsByRound[1] ||
        !decisionsByRound[2] ||
        !decisionsByRound[3]
      ) {
        redirect(
          routeError(
            "/teacher/rounds/3",
            "Lo storico decisionale del team è incompleto.",
          ),
        );
      }

      const game = simulateSessionGame(
        session.model_version,
        decisionsByRound,
      );

      finalScorePayload.push({
        team_id: team.id,
        model_version: game.modelVersion,
        full_game_result: game.rawResult as Json,
        final_game_value: game.finalGameValue,
        enterprise_value: game.enterpriseValue,
        implied_equity_value: game.impliedEquityValue,
        risk_penalty: game.riskPenalty,
        pv_explicit_ufcf: game.pvExplicitUfcf,
        pv_terminal_value: game.pvTerminalValue,
        cumulative_ufcf: game.cumulativeUfcf,
        final_revenue: game.finalRevenue,
        final_ebitda_margin: game.finalEbitdaMargin,
        final_premium_share: game.finalPremiumShare,
        final_net_debt: game.finalNetDebt,
        competitive_position: game.competitivePosition,
        strategic_health: game.strategicHealth,
      });
    }

    finalScores = finalScorePayload as unknown as Json;
  }

  const { error } = await supabase.rpc("teacher_finalize_round", {
    p_round_id: roundId,
    p_results: resultPayload as unknown as Json,
    p_final_scores: finalScores,
  });

  if (error) {
    redirect(
      routeError(
        `/teacher/rounds/${round}`,
        teacherRoundError(error.message),
      ),
    );
  }

  revalidatePath("/teacher");
  revalidatePath(`/teacher/rounds/${round}`);
  revalidatePath(`/rounds/${round}/submitted`);
  revalidatePath(`/rounds/${round}/results`);
  revalidatePath("/final");
  revalidatePath("/teacher/leaderboard");

  if (round === 3) {
    redirect("/teacher/leaderboard");
  }

  redirect(`/teacher/rounds/${round}`);
}
