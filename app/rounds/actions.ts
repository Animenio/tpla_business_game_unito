"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStudentGameContext } from "@/src/lib/game/context";
import {
  ROUND_OBJECTIVES,
  roundNumber,
  type RoundObjective,
} from "@/src/domain/game/round-content";
import {
  type DecisionSet,
  type RoundNumber,
} from "@/src/domain/simulation/v04/spec";
import { validateStudentDecisionSet } from "@/src/domain/simulation/v04/validation";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function numeric(formData: FormData, key: string) {
  const parsed = Number(value(formData, key));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function asRatio(formData: FormData, key: string) {
  return numeric(formData, key) / 100;
}

function decisionError(round: number, message: string) {
  return `/rounds/${round}/decisions?error=${encodeURIComponent(message)}`;
}

function reviewError(round: number, message: string) {
  return `/rounds/${round}/review?error=${encodeURIComponent(message)}`;
}

function parseObjective(formData: FormData): RoundObjective | null {
  const objective = value(formData, "objective") as RoundObjective;
  return ROUND_OBJECTIVES.some((item) => item.value === objective)
    ? objective
    : null;
}

function parseDecisionSet(formData: FormData): DecisionSet {
  return {
    hv_price_change: asRatio(formData, "hv_price_change"),
    std_price_change: asRatio(formData, "std_price_change"),
    marketing_change: asRatio(formData, "marketing_change"),
    rnd_pct: asRatio(formData, "rnd_pct"),
    capex_pct: asRatio(formData, "capex_pct"),
    inventory_days: numeric(formData, "inventory_days"),
    receivable_days: numeric(formData, "receivable_days"),
    natural_rubber_hedge: asRatio(formData, "natural_rubber_hedge"),
    connected_rnd_allocation: asRatio(
      formData,
      "connected_rnd_allocation",
    ),
  };
}

export async function reviewDecisionsAction(formData: FormData) {
  const roundValue = Number(value(formData, "round_number"));
  let round: RoundNumber;

  try {
    round = roundNumber(roundValue);
  } catch {
    redirect("/case-study");
  }

  const roundId = value(formData, "round_id");
  const objective = parseObjective(formData);
  const decisions = parseDecisionSet(formData);

  if (!objective) {
    redirect(decisionError(round, "Seleziona l’obiettivo principale del round."));
  }

  const validation = validateStudentDecisionSet(decisions);

  if (!validation.valid) {
    redirect(
      decisionError(
        round,
        validation.errors.map((error) => error.message).join(" "),
      ),
    );
  }

  const { supabase, session, team } = await requireStudentGameContext();

  const { data: gameRound } = await supabase
    .from("game_rounds")
    .select("id, session_id, round_number, status, closes_at")
    .eq("id", roundId)
    .eq("session_id", session.id)
    .eq("round_number", round)
    .maybeSingle();

  if (!gameRound || gameRound.status !== "open") {
    redirect(decisionError(round, "Il round non è aperto."));
  }

  if (
    gameRound.closes_at &&
    new Date(gameRound.closes_at).getTime() < Date.now()
  ) {
    redirect(decisionError(round, "La finestra decisionale è scaduta."));
  }

  const { error } = await supabase.from("team_round_decisions").upsert(
    {
      round_id: gameRound.id,
      team_id: team.id,
      objective,
      ...decisions,
      status: "draft",
      submitted_at: null,
      submitted_by: null,
    },
    { onConflict: "round_id,team_id" },
  );

  if (error) {
    redirect(
      decisionError(
        round,
        "Non è stato possibile salvare la bozza. Il round potrebbe essere stato chiuso o il team potrebbe aver già inviato.",
      ),
    );
  }

  revalidatePath(`/rounds/${round}/decisions`);
  revalidatePath(`/rounds/${round}/review`);
  redirect(`/rounds/${round}/review`);
}

export async function submitDecisionsAction(formData: FormData) {
  const roundValue = Number(value(formData, "round_number"));
  let round: RoundNumber;

  try {
    round = roundNumber(roundValue);
  } catch {
    redirect("/case-study");
  }

  const roundId = value(formData, "round_id");
  const confirmed = value(formData, "confirm") === "yes";

  if (!confirmed) {
    redirect(
      reviewError(
        round,
        "Conferma di aver verificato le decisioni prima dell’invio.",
      ),
    );
  }

  const { supabase, session } = await requireStudentGameContext();

  const { data: gameRound } = await supabase
    .from("game_rounds")
    .select("id, session_id, round_number")
    .eq("id", roundId)
    .eq("session_id", session.id)
    .eq("round_number", round)
    .maybeSingle();

  if (!gameRound) {
    redirect(reviewError(round, "Round non trovato."));
  }

  const { error } = await supabase.rpc("submit_team_round_decision", {
    p_round_id: roundId,
  });

  if (error) {
    const message = error.message.includes("ROUND_NOT_OPEN")
      ? "Il round non è più aperto."
      : error.message.includes("DECISIONS_NOT_FOUND")
        ? "Non esiste una bozza da inviare."
        : "Invio non completato. Riprova.";
    redirect(reviewError(round, message));
  }

  revalidatePath(`/rounds/${round}/submitted`);
  redirect(`/rounds/${round}/submitted`);
}
