interface StudentFinalLeaderboardRow {
  rank_position: number;
  team_id: string;
  team_name: string;
  final_game_value: number;
  cumulative_ufcf: number;
  strategic_health: number;
}

interface StudentFinalLeaderboardProps {
  currentTeamId: string;
  modelVersion: string;
  rows: StudentFinalLeaderboardRow[];
}

function moneyBn(value: number) {
  const absolute = Math.abs(value / 1000);
  return `${value < 0 ? "−" : ""}€${absolute.toFixed(2)}bn`;
}

function modelLabel(modelVersion: string) {
  return modelVersion.replace("aurora-tyres-", "");
}

export function StudentFinalLeaderboard({
  currentTeamId,
  modelVersion,
  rows,
}: StudentFinalLeaderboardProps) {
  const first = rows[0];
  const second = rows[1];
  const third = rows[2];
  const podium = [
    second ? { row: second, className: "second" } : null,
    first ? { row: first, className: "first" } : null,
    third ? { row: third, className: "third" } : null,
  ].filter(
    (
      entry,
    ): entry is {
      row: StudentFinalLeaderboardRow;
      className: "first" | "second" | "third";
    } => Boolean(entry),
  );

  return (
    <div className="page-main student-results-main">
      <section className="student-results-heading">
        <div>
          <div className="card-eyebrow">RISULTATI PUBBLICATI</div>
          <h1>Classifica finale</h1>
          <p>
            3 round completati · periodo simulato 2026–2030 · classifica
            determinata dal World Model {modelLabel(modelVersion)}.
          </p>
        </div>
        <div className="status-badge green">
          <span className="status-dot" />
          Classifica visibile
        </div>
      </section>

      <section className="student-podium-card" aria-label="Podio finale">
        <div className="student-podium-title">PODIO</div>
        <div className="student-podium-grid">
          {podium.map(({ row, className }) => (
            <article
              className={`student-podium-entry ${className}`}
              key={row.team_id}
            >
              <span>{row.rank_position}°</span>
              <strong>{row.team_name.toUpperCase()}</strong>
              <small>{moneyBn(Number(row.final_game_value))}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="student-ranking-card">
        <div className="student-ranking-heading">
          <div>
            <div className="card-eyebrow">CLASSIFICA</div>
            <h2>Classifica completa</h2>
          </div>
          <span>{rows.length} team</span>
        </div>

        <div className="student-ranking-scroll">
          <div className="student-ranking-grid header">
            <span>#</span>
            <span>Team</span>
            <span>Valore finale</span>
            <span>FCF cumulato</span>
            <span>Solidità strategica</span>
          </div>

          <div className="student-ranking-rows">
            {rows.map((row) => {
              const own = row.team_id === currentTeamId;

              return (
                <div
                  className={
                    own
                      ? "student-ranking-grid row own"
                      : "student-ranking-grid row"
                  }
                  key={row.team_id}
                >
                  <strong>{row.rank_position}</strong>
                  <div>
                    <strong>{row.team_name}</strong>
                    {own ? <small>Il tuo team</small> : null}
                  </div>
                  <strong>{moneyBn(Number(row.final_game_value))}</strong>
                  <span>{moneyBn(Number(row.cumulative_ufcf))}</span>
                  <span>{Number(row.strategic_health).toFixed(2)}x</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="student-results-actions">
        <a className="button-secondary" href="/final">
          Apri il report dettagliato del tuo team
        </a>
      </div>
    </div>
  );
}
