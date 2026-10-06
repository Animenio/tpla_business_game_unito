import {
  openRoundAction,
} from "@/app/teacher/round-actions";

interface RoundSummary {
  id: string;
  round_number: number;
  period_label: string;
  scenario_title: string;
  status: "scheduled" | "open" | "closed";
}

interface TeacherRoundControlsProps {
  rounds: RoundSummary[];
  sessionStatus: string;
}

function label(status: RoundSummary["status"]) {
  if (status === "open") return "LIVE";
  if (status === "closed") return "CHIUSO";
  return "PROGRAMMATO";
}

export function TeacherRoundControls({
  rounds,
  sessionStatus,
}: TeacherRoundControlsProps) {
  if (sessionStatus !== "live") {
    return null;
  }

  return (
    <section className="teacher-rounds-card">
      <div className="teacher-section-heading">
        <div>
          <div className="card-eyebrow">SIMULAZIONE</div>
          <h2>Round strategici</h2>
        </div>
        <span>3 round · 2026–2030</span>
      </div>

      <div className="teacher-round-list">
        {rounds.map((round, index) => {
          const previousClosed =
            index === 0 || rounds[index - 1]?.status === "closed";
          const anotherOpen = rounds.some(
            (candidate) =>
              candidate.status === "open" &&
              candidate.id !== round.id,
          );
          const canOpen =
            round.status === "scheduled" &&
            previousClosed &&
            !anotherOpen;

          return (
            <article className="teacher-round-row" key={round.id}>
              <div className="teacher-round-number">
                <strong>R{round.round_number}</strong>
                <span>{round.period_label}</span>
              </div>
              <div className="teacher-round-copy">
                <strong>{round.scenario_title}</strong>
                <span>{label(round.status)}</span>
              </div>
              <div className="teacher-round-row-action">
                {round.status === "open" ? (
                  <a
                    className="button-primary"
                    href={`/teacher/rounds/${round.round_number}`}
                  >
                    Apri console
                  </a>
                ) : round.status === "closed" ? (
                  <a
                    className="button-secondary"
                    href={`/teacher/rounds/${round.round_number}`}
                  >
                    Vedi risultati
                  </a>
                ) : (
                  <form action={openRoundAction}>
                    <input name="round_id" type="hidden" value={round.id} />
                    <input
                      name="round_number"
                      type="hidden"
                      value={round.round_number}
                    />
                    <input
                      name="window_minutes"
                      type="hidden"
                      value="12"
                    />
                    <button
                      className="button-primary"
                      disabled={!canOpen}
                      type="submit"
                    >
                      Apri round
                    </button>
                  </form>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
