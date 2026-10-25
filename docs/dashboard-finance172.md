# Cost-to-ledger entry

The pictured annual domain cost was optional, so the old monthly shortcut skipped it. There was no per-row way to prepare a payment. Separately, USD/THB/status blur handlers replaced the table, which could consume the next click on a row action.

Every nonzero cost now has **Record expense**, independent of budget status or cycle. It prepares the normal expense form with the actual THB amount, payer, description and matching category. The user reviews the date/amount and explicitly submits; preparing a draft never writes a ledger transaction. Annual costs keep their full payment amount rather than being divided by twelve. Default dates use the Thai calendar day.

Inline edits keep their row alive and update the budget KPI without replacing the focused controls. Baht fields accept decimals. The monthly shortcut now matches its label: only active monthly costs, with categories preserved. Annual/one-time payments use the row action. Saving a transaction switches an incompatible income/expense filter so the new row is visible. Empty saved cost lists remain empty after reload.

Existing localStorage keys, stored records, import/export and Firebase admin gate are retained. No live financial record was added, edited or deleted during development. Browser tests use a disposable local storage seed and a local-only auth fixture; all real service requests are blocked.

Validation: annual optional domain at USD 11 with manually entered THB 365.50 and payer Chok; review without posting; submit; reload persistence; total 465.50 after adding only the THB 100 monthly host cost; four viewport sizes; zero-cost action disabled; i18n and pure rule tests.
