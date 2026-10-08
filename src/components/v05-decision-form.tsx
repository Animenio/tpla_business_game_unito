import { reviewDecisionsAction } from "@/app/rounds/actions";
import { DecisionInfoPopover } from "@/src/components/decision-info-popover";
import {
  ROUND_OBJECTIVES,
} from "@/src/domain/game/round-content";
import {
  V05_DECISION_BASELINE_CONTEXT,
  V05_DECISION_HELP,
  V05_ORIENTATION_GUIDE,
  V05_ORIENTATION_LABELS,
  V05_RESILIENCE_GUIDE,
  V05_RESILIENCE_LABELS,
  v05OrientationOptions,
} from "@/src/domain/game/round-content-v05";
import {
  decisionFromStoredRow,
  type StoredDecisionRow,
} from "@/src/domain/simulation/v05/storage";
import {
  DECISION_DEFINITIONS,
  type DecisionSet,
  type ResiliencePolicy,
  type RndOrientation,
  type RoundNumber,
} from "@/src/domain/simulation/v05/spec";

interface V05DecisionFormProps {
  round: RoundNumber;
  roundId: string;
  draft: (StoredDecisionRow & { objective?: string | null }) | null;
  selectedObjective: string | null;
}

function percentInput(value: number | undefined) {
  return value === undefined ? undefined : value * 100;
}

function numericInput(
  key:
    | "premium_price_positioning"
    | "standard_price_positioning"
    | "marketing_change"
    | "rnd_pct"
    | "capex_pct",
  value: number | undefined,
) {
  const definition = DECISION_DEFINITIONS[key];
  const min = (definition.min ?? 0) * 100;
  const max = (definition.max ?? 0) * 100;
  const step = (definition.step ?? 0.01) * 100;

  return (
    <div className="decision-value-input">
      <input
        defaultValue={percentInput(value)}
        id={key}
        inputMode="decimal"
        max={max}
        min={min}
        name={key}
        placeholder="Valore"
        required
        step={step}
        type="number"
      />
      <span>%</span>
    </div>
  );
}

function cardInfo(key: keyof DecisionSet) {
  return (
    <DecisionInfoPopover
      description={V05_DECISION_HELP[key]}
      reference={V05_DECISION_BASELINE_CONTEXT[key]}
    />
  );
}

function orientationGuide(round: RoundNumber) {
  return (
    <div className="decision-choice-guide">
      {(v05OrientationOptions(round) as readonly RndOrientation[]).map((item) => (
        <p key={item}>
          <strong>{item}:</strong> {V05_ORIENTATION_GUIDE[item]}
        </p>
      ))}
    </div>
  );
}

function resilienceGuide() {
  return (
    <div className="decision-choice-guide">
      {(["Snella", "Standard", "Robusta"] as const).map((item) => (
        <p key={item}>
          <strong>{item}:</strong> {V05_RESILIENCE_GUIDE[item]}
        </p>
      ))}
    </div>
  );
}

export function V05DecisionForm({
  round,
  roundId,
  draft,
  selectedObjective,
}: V05DecisionFormProps) {
  const decisions = draft
    ? decisionFromStoredRow(draft, round)
    : ({} as Partial<DecisionSet>);

  const orientation =
    decisions.rnd_orientation ?? "Bilanciato";
  const resilience =
    decisions.resilience_policy ?? "Standard";

  return (
    <form action={reviewDecisionsAction}>
      <input name="round_id" type="hidden" value={roundId} />
      <input name="round_number" type="hidden" value={round} />

      <div className="decision-columns">
        <section className="decision-column">
          <h2>MERCATO</h2>
          <div className="decision-card-stack">
            <article className="decision-card">
              <div className="decision-card-top">
                <label htmlFor="premium_price_positioning">
                  {DECISION_DEFINITIONS.premium_price_positioning.label}
                </label>
                {cardInfo("premium_price_positioning")}
                {numericInput(
                  "premium_price_positioning",
                  decisions.premium_price_positioning,
                )}
              </div>
              <div className="decision-range">
                <strong>Range consentito (limiti):</strong> da −10% a +10% rispetto
                ai concorrenti · incrementi di 1 p.p.
              </div>
            </article>

            <article className="decision-card">
              <div className="decision-card-top">
                <label htmlFor="standard_price_positioning">
                  {DECISION_DEFINITIONS.standard_price_positioning.label}
                </label>
                {cardInfo("standard_price_positioning")}
                {numericInput(
                  "standard_price_positioning",
                  decisions.standard_price_positioning,
                )}
              </div>
              <div className="decision-range">
                <strong>Range consentito (limiti):</strong> da −10% a +10% rispetto
                ai concorrenti · incrementi di 1 p.p.
              </div>
            </article>

            <article className="decision-card">
              <div className="decision-card-top">
                <label htmlFor="marketing_change">
                  {DECISION_DEFINITIONS.marketing_change.label}
                </label>
                {cardInfo("marketing_change")}
                {numericInput(
                  "marketing_change",
                  decisions.marketing_change,
                )}
              </div>
              <div className="decision-range">
                <strong>Range consentito (limiti):</strong> da −50% a +100% rispetto
                al baseline · incrementi di 5 p.p.
              </div>
            </article>
          </div>
        </section>

        <section className="decision-column">
          <h2>INNOVAZIONE E INVESTIMENTI</h2>
          <div className="decision-card-stack">
            <article className="decision-card decision-card-tall">
              <div className="decision-card-top">
                <label htmlFor="rnd_pct">R&S / Ricavi</label>
                {cardInfo("rnd_pct")}
                {numericInput("rnd_pct", decisions.rnd_pct)}
              </div>
              <div className="decision-range">
                <strong>Range consentito (limiti):</strong> dal 2% all’8% dei
                ricavi · incrementi di 0,5 p.p.
              </div>

              <div className="decision-subcontrol">
                <div className="decision-card-top">
                  <label htmlFor="rnd_orientation">
                    Orientamento R&S
                  </label>
                  {cardInfo("rnd_orientation")}
                  <div className="decision-value-input decision-select-input">
                    <select
                      defaultValue={orientation}
                      id="rnd_orientation"
                      name="rnd_orientation"
                      required
                    >
                      {v05OrientationOptions(round).map((item) => (
                        <option key={item} value={item}>
                          {V05_ORIENTATION_LABELS[item]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {orientationGuide(round)}
              </div>
            </article>

            <article className="decision-card">
              <div className="decision-card-top">
                <label htmlFor="capex_pct">
                  {DECISION_DEFINITIONS.capex_pct.label}
                </label>
                {cardInfo("capex_pct")}
                {numericInput("capex_pct", decisions.capex_pct)}
              </div>
              <div className="decision-range">
                <strong>Range consentito (limiti):</strong> dal 3% al 10% dei
                ricavi · incrementi di 0,5 p.p.
              </div>
            </article>
          </div>
        </section>

        <section className="decision-column">
          <h2>RESILIENZA</h2>
          <div className="decision-card-stack">
            <article className="decision-card decision-card-tall">
              <div className="decision-card-top">
                <label htmlFor="resilience_policy">
                  Politica di resilienza della supply chain
                </label>
                {cardInfo("resilience_policy")}
                <div className="decision-value-input decision-select-input">
                  <select
                    defaultValue={resilience}
                    id="resilience_policy"
                    name="resilience_policy"
                    required
                  >
                    {(
                      ["Snella", "Standard", "Robusta"] as const satisfies readonly ResiliencePolicy[]
                    ).map((item) => (
                      <option key={item} value={item}>
                        {V05_RESILIENCE_LABELS[item]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="decision-range">
                <strong>Scelta categoriale:</strong> selezionate il livello di
                protezione coerente con la vostra strategia.
              </div>
              {resilienceGuide()}
            </article>
          </div>
        </section>
      </div>

      <section className="decision-objective-card">
        <div>
          <h2>Obiettivo principale del round</h2>
          <p>
            Indicate quale priorità ha guidato maggiormente la vostra scelta.
            Non modifica direttamente il World Model.
          </p>
        </div>
        <div className="objective-options">
          {ROUND_OBJECTIVES.map((objective) => (
            <label key={objective.value}>
              <input
                defaultChecked={
                  selectedObjective === objective.value
                }
                name="objective"
                required
                type="radio"
                value={objective.value}
              />
              <span>{objective.label}</span>
            </label>
          ))}
        </div>
      </section>

      <div className="decisions-submit-row">
        <div>
          <strong>6 decisioni economiche</strong>
          <span>
            R&S include l’orientamento; resilienza unifica scorte e copertura.
          </span>
        </div>
        <button className="button-primary" type="submit">
          Rivedi decisioni →
        </button>
      </div>
    </form>
  );
}
