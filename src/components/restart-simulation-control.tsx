"use client";

import { restartSimulationAction } from "@/app/teacher/actions";

interface RestartSimulationControlProps {
  sessionId: string;
  sessionCode: string;
}

export function RestartSimulationControl({
  sessionId,
  sessionCode,
}: RestartSimulationControlProps) {
  return (
    <form
      action={restartSimulationAction}
      onSubmit={(event) => {
        const confirmed = window.confirm(
          "Riavviare l’intera simulazione " +
            sessionCode +
            "?\n\n" +
            "Verranno eliminate tutte le decisioni, i risultati e gli output finali della run corrente. " +
            "Team, membri e materiali resteranno invariati. Tutti gli studenti torneranno alla lobby pre-avvio.",
        );

        if (!confirmed) {
          event.preventDefault();
        }
      }}
    >
      <input name="session_id" type="hidden" value={sessionId} />
      <button className="button-danger restart-simulation-button" type="submit">
        Riavvia simulazione
      </button>
    </form>
  );
}
