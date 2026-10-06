"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTeacherGameContext } from "@/src/lib/game/context";
import {
  createOpeningState,
  simulateRound,
  type OpeningState,
  type RoundResult,
} from "@/src/domain/simulation/v04/engine";
import {
  type DecisionSet,
  type RoundNumber,
} from "@/src/domain/simulation/v04/spec";
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
  if (message.includes("ROUND_STILL_IN_PROGRESS")) {
    return "Non tutti i team hanno inviato e il tempo non è ancora scaduto.";
  }
  if (message.includes("ROUND_NOT_OPEN")) {
    return "Il round non è aperto.";
  }
  if (message.includes("RESULT_COUNT_MISMATCH")) {
    return "Il numero di risultati calcolati non coincide con gli invii ricevuti.";
  }
  return "Operazione sul round non completata. Riprova.";
}

function decisionSet(row: {
  hv_price_change: number;
  std_price_change: number;
  marketing_change: number;
  rnd_pct: number;
  capex_pct: number;
  inventory_days: number;
  receivable_days: number;
  natural_rubber_hedge: number;
  connected_rnd_allocation: number;
}): DecisionSet {
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
    let openingState: OpeningState;

    if (round === 1) {
      openingState = createOpeningState();
    } else {
      const { data: previousResult } = await supabase
        .from("team_round_results")
        .select("result")
        .eq("round_id", previousRoundId!)
        .eq("team_id", submission.team_id)
        .maybeSingle();

      const parsedPrevious =
        previousResult?.result as unknown as RoundResult | undefined;

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

    const result = simulateRound(
      openingState,
      decisionSet(submission),
      round,
    );

    resultPayload.push({
      team_id: submission.team_id,
      model_version: result.modelVersion,
      result: result as unknown as Json,
      total_revenue: result.operating.totalRevenue,
      adjusted_ebitda_margin: result.operating.adjustedEbitdaMargin,
      unlevered_free_cash_flow:
        result.financial.unleveredFreeCashFlow,
      net_debt: result.financial.netDebt,
      premium_revenue_share: result.operating.premiumRevenueShare,
      strategic_health: result.operating.strategicHealth,
    });
  }

  const { error } = await supabase.rpc("teacher_finalize_round", {
    p_round_id: roundId,
    p_results: resultPayload as unknown as Json,
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
  redirect(`/teacher/rounds/${round}`);
}
