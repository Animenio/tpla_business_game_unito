# Aurora Tyres World Model v0.4 — Implementation Specification

Source of truth: `CFO_AI_Business_Game_World_Model_v04_Aurora_Tyres.xlsx`.

This document freezes every model element that is explicitly exposed by the workbook parser before formula translation begins. No formula below is invented: where the workbook exposes only calculated values and not the original Excel expression, implementation remains intentionally pending.

## 1. Game horizon

The economic horizon is 2026–2030, compressed into three decision rounds:

| Round | Period | Phase duration |
| --- | --- | ---: |
| 1 | 2026 | 1 year |
| 2 | 2027–2028 | 2 years |
| 3 | 2029–2030 | 2 years |

The same nine decision levers are used in every round. Decisions in Rounds 2 and 3 apply to the full two-year phase.

The winner metric is final simulated equity value based on five-year DCF, adjusted by risk penalties.

## 2. Student decision contract

| Key | Student label | Min | Max | Step | Unit |
| --- | --- | ---: | ---: | ---: | --- |
| `hv_price_change` | Prezzo prodotti Premium | -0.10 | 0.15 | 0.01 | % |
| `std_price_change` | Prezzo prodotti Standard | -0.15 | 0.10 | 0.01 | % |
| `marketing_change` | Budget marketing | -0.50 | 1.00 | 0.05 | % vs baseline |
| `rnd_pct` | Spesa in R&S | 0.02 | 0.08 | 0.005 | % ricavi |
| `capex_pct` | Investimenti (CapEx) | 0.03 | 0.10 | 0.005 | % ricavi |
| `inventory_days` | Scorte di magazzino | 90 | 170 | 5 | giorni |
| `receivable_days` | Tempo medio di incasso dai clienti | 25 | 60 | 1 | giorni |
| `natural_rubber_hedge` | Copertura del costo della gomma | 0.00 | 0.80 | 0.05 | % exposure |
| `connected_rnd_allocation` | R&S su pneumatici connessi | 0.00 | 0.60 | 0.05 | % R&S |

Reference/Balanced decision set currently present in the workbook:

| Decision | R1 | R2 | R3 |
| --- | ---: | ---: | ---: |
| Premium price | 0.02 | 0.03 | 0.02 |
| Standard price | 0.00 | -0.03 | -0.02 |
| Marketing | 0.00 | 0.15 | 0.10 |
| R&D / revenue | 0.046 | 0.055 | 0.060 |
| CapEx / revenue | 0.065 | 0.070 | 0.070 |
| Inventory days | 135 | 150 | 135 |
| Receivable days | 34 | 33 | 32 |
| Natural rubber hedge | 0.50 | 0.70 | 0.60 |
| Connected R&D allocation | 0.20 | 0.30 | 0.40 |

## 3. 2025 baseline

Monetary values are on the Aurora Tyres scale, obtained through the workbook's 0.83 anonymisation factor.

| Metric | Value |
| --- | ---: |
| Commercial revenue | 5,624.246 €m |
| Premium share | 79% |
| Standard share | 21% |
| Adjusted EBITDA | 1,285.089 €m |
| Adjusted EBITDA margin | 22.8% |
| Adjusted EBIT | 897.562 €m |
| Adjusted EBIT margin | 16.0% |
| Net income | 440.481 €m |
| CapEx | 348.351 €m |
| R&D expense | 259.541 €m |
| Net debt | 914.660 €m |
| Fixed-assets / invested-capital basis | 7,132.273 €m |
| Inventories | 1,208.065 €m |
| Trade receivables | 521.655 €m |
| Trade payables | 1,728.392 €m |
| Net working capital | -58.017 €m |
| Net invested capital | 7,074.256 €m |
| Equity | 5,359.061 €m |
| Provisions | 800.535 €m |
| Production capacity index | 1.05 |
| Base connected R&D allocation | 20% |

Important reconciliation rule: the engine uses commercial sales/services revenue, not student-workbook Total Revenues including other operating income.

## 4. External scenarios

### Round 1 — 2026 · Cresce il Premium

- duration: 1 year
- Premium market growth: 5.0%
- Standard market growth: -2.0%
- natural rubber index: 1.07
- synthetic rubber index: 1.04
- energy/logistics index: 1.10
- FX effect: -3.5%
- cost of debt: 4.5%
- competition price pressure: 0%
- EV share of new cars: 28%
- technology opportunity index: 0.10
- regulatory/compliance burden: 0.2%
- global macro growth: 2.9%
- supply-disruption index: 0.10
- market Premium price change: +2.0%
- market Standard price change: +1.0%

### Round 2 — 2027–2028 · Crisi costi + guerra prezzi

- duration: 2 years
- Premium market growth: 7.1%
- Standard market growth: -9.76%
- natural rubber index: 1.30
- synthetic rubber index: 1.18
- energy/logistics index: 1.25
- FX effect: -0.5%
- cost of debt: 5.0%
- competition price pressure: 10%
- EV share of new cars: 34%
- technology opportunity index: 0.45
- regulatory/compliance burden: 0.5%
- global macro growth: 2.9%
- supply-disruption index: 1.00
- market Premium price change: +9.14%
- market Standard price change: -1.3%

### Round 3 — 2029–2030 · Opportunità tech + stress finale

- duration: 2 years
- Premium market growth: 12.2%
- Standard market growth: -13.76%
- natural rubber index: 1.22
- synthetic rubber index: 1.15
- energy/logistics index: 1.18
- FX effect: -0.75%
- cost of debt: 4.0%
- competition price pressure: 7%
- EV share of new cars: 40%
- technology opportunity index: 1.00
- regulatory/compliance burden: 1.4%
- global macro growth: 2.75%
- supply-disruption index: 0.60
- market Premium price change: +5.06%
- market Standard price change: -3.0%

## 5. Calibrated model parameters

The workbook exposes the following parameters:

- High Value annual price elasticity: 0.40
- Standard annual price elasticity: 0.85
- High Value relative-price sensitivity: 0.55
- Standard relative-price sensitivity: 0.85
- Immediate marketing response — High Value: 0.015
- Immediate marketing response — Standard: 0.008
- Brand → High Value demand: 0.12
- Brand → Standard demand: 0.06
- Innovation → High Value demand: 0.16
- Digital readiness → tech opportunity: 0.18
- Asset health → High Value demand: 0.03
- Competition sensitivity — High Value: 0.18
- Competition sensitivity — Standard: 0.70
- Pricing-power benefit from Brand: 0.30
- Pricing-power benefit from Innovation: 0.30
- Innovation stock decay: 0.92
- Innovation R&D coefficient: 4.5
- Connected allocation general-R&D trade-off: 0.25
- Brand stock decay: 0.90
- Brand marketing coefficient: 0.18
- Digital-readiness decay: 0.90
- Digital-readiness coefficient: 5.0
- Asset-health decay: 0.94
- Asset-health CapEx coefficient: 3.0
- Natural rubber share of variable cost: 0.25
- Synthetic rubber share of variable cost: 0.15
- Energy + freight share of variable cost: 0.10
- Other variable-cost share: 0.50
- Hedge effectiveness: 0.60
- Hedge premium: 0.01
- Capacity response to effective CapEx: 0.90
- Maintenance CapEx / revenue: 0.05
- Asset-health cost efficiency: 0.08
- Tax rate: 0.30
- WACC: 0.08
- Base terminal growth: 0.02
- Strategic-health terminal-growth coefficient: 0.02
- Strategic-health terminal-value factor: 0.80
- Maximum net debt / EBITDA: 2.50
- Inventory-shortage sensitivity: 0.0025
- Customer-credit demand sensitivity: 0.0006
- Base required safety inventory: 115 days
- Supply-shock safety-stock add-on: 25 days × disruption index
- OEM qualification weights: Innovation 0.35, Digital 0.45, Asset 0.20
- OEM win threshold: 1.08
- OEM fail threshold: 0.92
- OEM demand bonus: +0.08
- OEM demand penalty: -0.06
- Strategic Health weights: Innovation 0.28, Brand 0.24, Digital 0.23, Asset 0.25
- Competitive Position weights: Brand 0.28, Innovation 0.30, Digital 0.17, Asset 0.15, market share 0.10

## 6. Endogenous engine state

The TypeScript state contract must preserve these workbook outputs:

### Strategic / operating state

- Premium price index
- Standard price index
- Market Premium price index
- Market Standard price index
- Premium relative price gap
- Standard relative price gap
- Innovation Stock
- Brand Strength
- Digital Readiness
- Asset Health
- OEM qualification score
- OEM contract demand effect
- Premium demand-volume index
- Standard demand-volume index
- Effective CapEx ratio for capacity
- Production capacity index
- Demand before capacity constraint
- Required safety inventory days
- Service / fulfilment factor
- Realized Premium volume index
- Realized Standard volume index
- External Premium market index
- External Standard market index
- Relative Premium market-share index
- Relative Standard market-share index
- Competitive Position
- Premium revenue
- Standard revenue
- Total revenue
- Premium revenue share
- Effective natural-rubber cost index
- Weighted variable-cost inflation index
- Premium variable cost
- Standard variable cost
- Marketing expense
- R&D expense
- Fixed opex
- Regulatory cost
- Adjusted EBITDA
- Adjusted EBITDA margin
- D&A
- Adjusted EBIT
- Adjusted EBIT margin
- Strategic Health

### Financial / valuation state

- Net financial expense / income
- Profit before tax
- Tax
- Net income
- Trade receivables
- Inventories
- Trade payables
- Operating NWC
- Other working capital
- Net working capital
- Change in NWC
- CapEx
- D&A
- Unlevered free cash flow
- Levered cash-flow proxy
- Net debt / net cash
- Net debt / EBITDA
- Opening fixed-assets proxy
- Closing fixed-assets proxy
- Net invested capital proxy
- Provisions proxy
- Equity funding proxy
- PV weight of phase UFCF
- PV of phase UFCF
- Terminal normalized EBIT margin
- Terminal strategic health
- Terminal growth
- Terminal value
- PV terminal value

## 7. Golden baseline

The workbook's Balanced strategy must be reproduced numerically before the TypeScript engine can be accepted.

Final reference values:

- PV explicit UFCF: 1,914.691533 €m
- PV terminal value: 7,541.689317 €m
- Enterprise value: 9,456.380850 €m
- Opening net debt: 914.660000 €m
- Implied equity value: 8,541.720850 €m
- Risk penalty: 0
- FINAL GAME VALUE: 8,541.720850 €m

Round 3 reference:

- Revenue: 6,788.550215 €m
- EBITDA margin: 17.223900%
- EBIT margin: 11.212926%
- Premium share: 88.460466%
- UFCF: 632.775582 €m
- Net debt / net cash: -1,463.558095 €m
- Innovation Stock: 1.144528885
- Brand Strength: 1.079740000
- Digital Readiness: 1.206488585
- Asset Health: 1.098258171
- Competitive Position: 1.113681214
- Strategic Health: 1.131662605

## 8. Validation envelope

Seven archetypes were tested in v0.4, ranked:

1. Premium Innovator — 9,437.994175 €m
2. Balanced — 8,541.720850 €m
3. Resilient Hedger — 8,280.341560 €m
4. Cost Defender — 6,953.383615 €m
5. Volume Player — 6,564.478875 €m
6. Overinvestor — 6,319.323414 €m
7. Cash Maximizer — 5,708.799928 €m

A 5,000-strategy random stress test produced:

- minimum: 3,207.688848 €m
- P10: 5,754.367371 €m
- median: 7,102.107789 €m
- P90: 8,488.664090 €m
- maximum: 10,859.351084 €m

These numbers are regression targets, not values to optimise directly in application code.

## 9. Formula translation gate

The workbook content currently exposed to this implementation context provides calculated values and parameter definitions, but not the original Excel formula strings.

Therefore:

- constants, schemas, bounds, baseline, scenarios and golden outputs are frozen now;
- numerical engine formulas are **not** to be reverse-engineered from output values;
- formula modules remain pending until original formula expressions can be read/exported;
- no guessed formula may be merged under the v0.4 model identifier.

This preserves one-to-one traceability between the authoritative workbook and the server-side engine.
