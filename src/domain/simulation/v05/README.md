# Aurora Tyres World Model v0.5.2

TypeScript port of the frozen v0.5.2 workbook model.

Source-of-truth hierarchy for this version:

1. `Aurora_Tyres_World_Model_v0_5_2.xlsx` (frozen workbook).
2. The 27 deterministic parity vectors generated from seed `20261007`, tolerance `1e-6` €m FGV.
3. The Python reference twin, used only as a porting oracle.

The v0.4 implementation remains untouched. v0.5.2 intentionally uses the reduced student decision set: Premium price positioning, Standard price positioning, marketing, R&D plus orientation, CapEx, and resilience policy. Receivable days are fixed at 34.

Important v0.5.2 structural choices:

- annual steps inside biennial rounds;
- demand in levels with calibrated price elasticities;
- unit-volume variable costs and semi-fixed Opex;
- one-year lag from CapEx to productive capacity;
- inventory shortage affects sales rather than plant capacity;
- smooth capacity allocation with a 50% contractual Standard tier;
- dual-threshold smooth OEM effect, gated by technology opportunity;
- forward-vs-spot natural-rubber hedge economics;
- explicit 2031 continuation year;
- terminal value = sustainable core value + finite asset-health excess + finite intangible excess;
- continuous expected distress cost rather than threshold penalties.

The engine exposes `simulateGame`, `simulateAnnualPath`, and `simulateIntermediateValue`. The intermediate value uses actual decisions/scenarios through the completed round and a neutral policy plus the 2031 expected scenario thereafter.

Frozen default anchors:

- final FGV: 13,103.4989267348 €m;
- intermediate value after R1: 10,119.126298273353 €m;
- intermediate value after R2: 12,182.31091630062 €m.

The test suite also checks all frozen G12 archetypes, annual revenue/EBITDA/service/debt anchors, balance-sheet identity, service-factor bounds, and determinism.
