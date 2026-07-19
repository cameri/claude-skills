# Correspondent → ActualBudget Account Map

Maps paperless-ngx correspondents and document title patterns to ActualBudget account IDs.

Title patterns use the last-4 digits embedded in RBC statement titles to disambiguate between accounts belonging to different people.

| Paperless Correspondent | Title Pattern | Account Name | ActualBudget ID | On-Budget | Notes |
|---|---|---|---|---|---|
| RBC Royal Bank | `Joint Account Statement-1080` | RBC Joint Account | `ab9cc94f-501b-4bdd-b138-54ffdc2a0432` | Yes | |
| RBC Royal Bank | `Personal Chequing Statement-2377` | RBC Chequing Arturo | `4adfea6d-c8d1-4e14-a20b-40f28c09ea3c` | Yes | Confirm last-4 matches |
| RBC Royal Bank | `MasterCard Statement-5852` | RBC Mastercard | `e4e7ef94-3139-4e12-ad46-d3c8984bcc4a` | Yes | |
| RBC Royal Bank | `Visa Statement-0785` | RBC Visa Arturo | `644ab3e7-7b9e-4125-bfad-4d240af46770` | Yes | Confirm last-4 matches |
| RBC Royal Bank | `Mortgage*` | — | — | — | Mortgage accounts not in ActualBudget |
| Tangerine | `Chequing*` | Tangerine Chequing Arturo | `0eba4a6e-1e92-4cce-8389-5c134ad01cc0` | Yes | No statements received yet |
| Tangerine | `Mastercard*` | Tangerine Mastercard | `4a6b933e-9b04-4b6b-aa32-1301e89a5964` | Yes | No statements received yet |
| Tangerine | `Line of Credit*` | Tangerine Line of Credit | `01b0f900-053f-430f-bff5-556236a6cdf2` | Yes | No statements received yet |

## Notes

- **RBC Chequing Gina** (`f6f2a536-44bf-45ca-987e-5acf14563156`): no paperless statements observed yet; title pattern unknown
- **RBC Visa Gina** (`dcf706ad-3209-4c00-80d0-2a2e08c13d02`): no paperless statements observed yet; title pattern unknown
- **CIBC Mastercard** (`6760a23e-9acb-4e03-a120-089071fbcc98`): no CIBC correspondent in paperless yet
- All on-budget RBC accounts require cent-exact closing balance reconciliation
- Off-budget accounts (EQ, Questrade, ShakePay, Bitkey, Ledn) do not appear as paperless correspondents and are not reconciled by this skill

## Paperless correspondent IDs (for API calls)

| Correspondent | Paperless ID |
|---|---|
| RBC Royal Bank | 354 |
| Tangerine | 355 |
| EQBank | 356 |
| Ottawa Hydro | 358 |
