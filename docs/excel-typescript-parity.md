# Excel → TypeScript parity notes

The original `.xlsx` was inspected with formulas intact.

The following sheets are translated directly into code:

- `06_MODEL_ENGINE` → `engine.ts / calculateOperating()`
- `07_FINANCIALS` → `engine.ts / calculateFinancials()` and terminal valuation
- `08_DASHBOARD` → final DCF/risk-penalty calculation

## Formula parity

The TypeScript implementation preserves:

- phase-duration exponents (1 / 2 / 2 years)
- all MAX/MIN clamps
- prior-round vs current-round stock dependencies
- Round-3-only OEM qualification effect
- capacity and safety-stock service factor
- natural-rubber hedge effectiveness and hedge premium
- D&A geometric persistence formula
- repeated annual cash flow inside two-year phases
- explicit 5-year DCF weights
- terminal normalized EBIT margin
- strategic-health terminal growth/franchise factor
- dashboard risk penalty

## Workbook inconsistencies preserved/flagged

### 1. R&D UI step vs reference decision

`12_WEB_APP_SCHEMA` declares:

- R&D minimum: 2%
- step: 0.5 percentage points

but `04_DECISIONS` uses **4.6%** in Round 1 for the Balanced reference.

Therefore the numerical model accepts any bounded value. A separate
`validateStudentDecisionSet()` enforces the UI step grid. The final UI policy
must be resolved before classroom release.

### 2. World-model sheet title

The workbook is v0.4, but the visible title of sheet `03_WORLD_MODEL` still
says "World Model v0.3". This is treated as a label-only inconsistency.

### 3. Risk-penalty constants

`08_DASHBOARD!B10` contains two hardcoded constants not exposed on the
assumptions sheet:

- 124.5 €m per year per unit of leverage above the 2.5x threshold
- 166 €m per year per unit of service factor below 0.90

They are represented as named constants in TypeScript to retain exact parity.

## Acceptance target

For the workbook Balanced decision set the TypeScript engine must reproduce:

- Final Game Value: **8,541.720849945874 €m**
- Enterprise Value: **9,456.380849945874 €m**
- PV terminal value: **7,541.689316935605 €m**
- PV explicit UFCF: **1,914.6915330102684 €m**

No formula has been inferred from outputs: the implementation follows the
original Excel formulas cell by cell.
