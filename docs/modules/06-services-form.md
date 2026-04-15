# Service Form — field & tooltip reference

This doc is the single source of truth for the "Create New Service / Edit
Service" dialog at [components/services/ServiceForm.tsx](../../components/services/ServiceForm.tsx).
Layout is a copy of the reference prototype (`bigdental.aoikumo.com/services` →
"Create New Service") so that returning Aoikumo operators feel at home.
Every tooltip string below is **quoted verbatim** from the live reference so
we can reuse them word-for-word in our implementation.

Status legend for each section / field:
- **✅ Wired** — already functional against the current Supabase schema.
- **🟡 Placeholder** — rendered in the UI per the screenshot, but the data is
  static/disabled. Implementation ticket pending.
- **⏭ Deferred** — intentionally out of scope for Phase 1; may be removed or
  permanently stubbed.

---

## Layout

Two-column grid inside a centered dialog. Header title:
`CREATE NEW SERVICE` (create) / `EDIT SERVICE / <S(R)> <NAME>` (edit).

```
┌──────────────────────────────────┬──────────────────────────────────┐
│ General                          │ Pricing for <OUTLET_ORG_NAME>    │
│ Consumables                      │ Outlets                          │
│ Medications                      │ Coverage Payor                   │
│                                  │ Hands-On Incentive               │
└──────────────────────────────────┴──────────────────────────────────┘
```

---

## 1. General — ✅ Wired (mostly)

### 1.1 Service Image
- Square uploader, stacked layout, size `size-24`.
- Entity = `services`, `entityId` = service id (null on create).
- **Status:** ✅ Wired via `ImageUpload` + `image_url` column.

### 1.2 Service Name (required) — ✅ Wired
- Input placeholder: `EG: BODY MASSAGE`
- Validation: "Invalid Service Name" on blank/too short.
- Bound to `name`.

### 1.3 SKU (required) — ✅ Wired
- Input placeholder: `EG: BME-0001`
- Disabled + hint `SKU is immutable.` in edit mode.
- Bound to `sku`.

### 1.4 Category (required) — ✅ Wired
- Rounded `<select>` with a green `＋` button to the right that opens a
  "New category" mini-dialog.
- **Tooltip:**
  > Give this service a category.
  > Example: Facial, Aesthetics, Dental, Wellness
- Bound to `category_id`.
- **Current state:** dropdown works; the `＋` add-category shortcut is
  **🟡 Placeholder** until we wire it to an inline category-create flow.

### 1.5 Duration (required) — ✅ Wired
- Rounded input with `−` / `＋` stepper, 5-minute granularity.
  Display format: `<n> Minutes`.
- **Tooltip:**
  > The default duration this service will take whenever an appointment is
  > made.
  > This can be adjusted during the said appointment creation.
- Bound to `duration_min` (integer, minutes).

### 1.6 Case Note Template — 🟡 Placeholder (Phase 2)
- Disabled `<select>` showing `PLEASE CHOOSE...`.
- **Tooltip:**
  > If this Service is selected during Case Notes billing, the selected Case
  > Notes template will automatically be inserted into Case Notes.
- **Blocked on:** clinical sub-module (case notes) — Phase 2.

### 1.7 e-Invoice Classification Code — 🟡 Placeholder (Phase 2)
- Disabled `<select>` showing `PLEASE CHOOSE...`.
- **Tooltip:**
  > Classification code list defines the category of products or services
  > being billed as a result of a commercial transaction.
- **Blocked on:** MY e-Invoice (LHDN) integration — Phase 2.

### 1.8 Retail-item checkbox — ✅ Wired
- Single checkbox, **default checked**:
  `This is a Service Retail item, S (R) (sellable on its own)`.
- **Ticked → `type = retail`** (S (R)). The service sells on its own.
- **Unticked → `type = non_retail`** (S (NR)). A note appears below
  explaining:
  > This service is assumed to only be sold as part of a promotion or
  > package and will be tagged as S (NR) Services (Non-Retail).
- The selling-price field stays editable in both states — a non-retail
  service may still have a notional price used inside promotions/packages.
- **Tooltip (keep short; the 19-type legend from the reference is not
  copied over — only S (R) and S (NR) matter here):**
  > When ticked, this service is a Services (Retail) item — S (R) —
  > meaning it can be sold on its own.
  > When unticked, this service is assumed to only be sold as part of a
  > promotion or package and will be tagged as S (NR) — Services
  > (Non-Retail).

### 1.9 Allow Redemption Without Payment — ✅ Wired
- Checkbox, **independent** of the retail toggle above.
- Meaning: at Appointment completion time, the appointment can be marked
  complete even if the customer has not paid in full. This is for
  staggered-payment flows (e.g. deposit now, settle later).
- **Tooltip:**
  > Enable this option if the service can be redeemed even when full payment
  > is not made. This is commonly used when the customer is allowed to make
  > payments in a staggered manner for the service.
  >
  > NOTE: If there is outstanding payment detected for this service at the
  > point the appointment is completed, the system will remind the user to
  > request payment from the customer.
- Bound to `allow_redemption_without_payment` (default: true).

---

## 2. Consumables — 🟡 Placeholder

- Panel body: `No entry found.` / `Add New?` link (blue).
- Clicking `Add New?` opens `mdlConsumable` in the reference — a modal to
  pick from inventory consumables and set qty.
- **Tooltip:**
  > Set the default consumables and its quantities used to render this
  > service to the customer.
  > Consumables are disposable inventory items used when this service is
  > rendered to the customer (such as Gloves, Syringes, Ampoule).
  >
  > NOTE: Consumables and its quantities can be changed when the service is
  > being completed in Appointments.
- **Blocked on:** inventory / consumables module — Phase 2 deep.
- **Schema impact (future):** junction table `service_consumables`
  `(service_id, inventory_item_id, default_qty)`.

---

## 3. Medications — 🟡 Placeholder

- Panel body: `No entry found.` / `Add New?` link.
- Reference max: **15** medications per service (tooltip
  `You've reached the maximum of 15 medications.` shown by the
  `maxTiedMedications` hint — enforce same cap).
- **Tooltip:**
  > Set the default medications and its quantities so that it is sold
  > together with this service.
  > Medications are drug inventory items that can be included with the sale
  > of this service.
  >
  > NOTE: Medication and its quantities can be changed when the service is
  > added to the sales cart.
- **Blocked on:** medication / prescription sub-module — Phase 2.
- **Schema impact (future):** `service_medications`
  `(service_id, medication_id, default_qty)` + cap check.

---

## 4. Pricing for `<OUTLET_ORG_NAME>` — ✅ Wired (core)

Title interpolates the business name — for us, read from
`settings.business.name` (or fall back to `"Pricing"`).

### 4.1 Allow cash selling price range for this service — ✅ Wired
- Rounded check at the top of the section.
- **Tooltip:**
  > Enable if this service can be sold within a range.
  >
  > Example: MYR 10,000.00 - 18,000.00
- Bound to `allow_cash_price_range`. When ON, replaces `Selling Price` with
  `Min Price` / `Max Price`.

### 4.2 Selling Price (required) — ✅ Wired
- Rounded input with suffix `MYR` pill. Default `0.00`.
- Bound to `price`.
- **Range mode (4.1 ticked):** the single Selling Price input is replaced
  with two inputs separated by the word `to`, still under the one
  `Selling Price *` label (matching the screenshot):
  `[ 1,000.00 MYR ] to [ 2,000.00 MYR ]`.
  Bound to `price_min` / `price_max`. The submit handler copies `price_min`
  into `price` so a default base price is always stored.

### 4.3 Other Fees — ✅ Wired (value-side) · 🟡 Placeholder (MYR/% toggle)
- Rounded input, default `0.00`, with a **blue `MYR` button** on the right
  that toggles between `MYR` (fixed amount) and `%` (percentage of selling
  price). Currently we only support fixed MYR.
- **Tooltip:**
  > When a value for Other Fees is set, the Hands-On Incentive will be
  > calculated after deducting the Other Fees value from the Selling Price.
  >
  > TIP: Click the MYR button in blue below if the Other Fees is to be
  > based on a % of the Selling Price.
  > NOTE: This rule is only applicable for the Position, % based Hands-On
  > Incentive.
- Bound to `other_fees`. Adds follow-up ticket: `other_fees_is_percentage`
  boolean.

### 4.4 Individual Discount Capping — ✅ Wired
- Checkbox (acts as the Enable toggle). When ticked, a **second labelled
  field** `Discount Cap Amount (%) *` appears directly below with a
  numeric `%` input — not a helper row next to the toggle.
- **Tooltip:**
  > Set a maximum discount that can be given for this service
  >
  > Note: When applying Individual Discount Capping along with other
  > discount types, the following priorities will be observed:
  > 1. **Drop-Down Menu Discount** — Config > Sales > Discounts
  > 2. **Promo Ala-Carte Discount** — Services > Promo > Ala-Carte
  > 3. **Individual Discount Capping** — each item in Services / Inventory
  > 4. **Outlet Discount Capping** — Config > Sales > Discounts
  >
  > Example: If an Individual Discount Capping (Priority #3) is configured
  > along with a Promo Ala-Carte Discount (Priority #2), the Promo
  > Ala-Carte Discount will be applied during billing, not the Individual
  > Discount Capping.
- Bound to `discount_cap` (number | null).

### 4.5 Taxes — ✅ Wired
- Header: `Taxes` with small italic helper
  `When enabled, the Selling Price is exclusive of the selected tax percentages.`
- **Selected taxes** render as chips inside a bordered container, each
  with an `×` button to remove. **Unselected active taxes** render below
  as dashed `+ TAX 10%` buttons — click to add. This makes it visually
  obvious which taxes are on vs. off without a dropdown.
- Bound to `tax_ids`. Active taxes are selected by default on create.

---

## 5. Outlets — 🟡 Placeholder

Per-outlet pricing override table. In the reference every service can be
sold at different cash prices per outlet (e.g. city vs. suburb branch).

### 5.1 "Apply above prices to all outlets" — 🟡 Placeholder
- Rounded check, default ON (green).
- When ON → per-outlet rows are **disabled** (read-only mirror of section 4).
- When OFF → per-outlet rows become editable.

### 5.2 Outlets table columns
| Col              | Content                                                                          |
| ---------------- | -------------------------------------------------------------------------------- |
| Outlet           | `(<CODE>)` + bold outlet name                                                    |
| Cash Price       | `Range` sub-toggle + numeric input (`0.00`)                                      |
| Other Charges    | numeric input (`0.00`) + MYR/% toggle pill                                       |
| Availability     | green check = sellable at that outlet; unchecked = not                           |
| Taxable          | chip multi-select over taxes (same UX as section 4.5) — **per outlet**           |

- **No tooltip on the section header.**
- **Blocked on:**
  - `outlets` already exists; per-outlet pricing table does not.
  - New junction table `service_outlet_pricing`
    `(service_id, outlet_id, override_enabled, price, price_min, price_max,
    other_fees, other_fees_is_percentage, is_available, tax_ids)`.
  - Flag on `services`: `apply_pricing_to_all_outlets bool default true`.

---

## 6. Coverage Payor — ⏭ Deferred (Phase 2+)

- Empty state: `No coverage panels created. Kindly create a coverage payor`
  + blue link `Config > Clinical Feature > Coverage Payors`.
- **Tooltip:**
  > Tie this service to a Coverage Payor and its Policies.
  > When tied and this service is added to the cart for a customer with the
  > same Coverage Payor and Policies, the Policy Co-Insurance / Policy
  > Co-Payment, Cap Per Claim rules will automatically calculate for the
  > said customer.
  >
  > NOTE: The Coverage Payor, Policies, Policy Co-Insurance / Policy
  > Co-Payment, Cap Per Claim rules are set within Config > Clinical
  > Features > Coverage Payors.
- **Blocked on:** clinical features module (insurance / corporate panels) —
  not on the Phase 1 roadmap. Render the empty state but keep the link
  inert for now.

---

## 7. Hands-On Incentive — 🟡 Placeholder (table UI) · ⏭ Deferred (calc)

Commission calculation itself is Phase 2, but the configuration UI belongs
in the form because operators expect to set it up during service creation.

### 7.1 Mode switch — 3 rounded radios
- **Position** (default) — tooltip:
  > Provide incentives based on the employee's Position set within
  > Employees > Position.
  > Incentives can be given based on MYR value or % of the Selling Price.
  > Different amounts can be set when the service is rendered for a Male or
  > Female customer.
  >
  > TIP: Click the MYR button in blue below to change the incentive between
  > a Value based or % of the Selling Price.
  > NOTE: When this service is being completed in Appointments, only 1
  > employee that rendered this service to the customer can be selected.
- **Points** — tooltip:
  > Provide incentives to a group of employees (Maximum 4) based on Points.
  >
  > Example: Value is set as MYR 1,000.00 and Total Points is set as 50.
  > This would mean a maximum of 50 Points can be disbursed among the
  > Employees, based on the amount of work they have put in when rendering
  > this service to the customer.
  > When this service is being completed in appointments, Employee 1
  > entered 20 Points, Employee 2 entered 5 Points and Employee 3 entered
  > 25 Points.
  > This would mean Employee 1 will have an incentive of MYR 400.00,
  > Employee 2 MYR 100.00 and Employee 3 MYR 500.00 as every point given
  > has a value of MYR 20 (MYR 1,000.00 / 50).
  >
  > NOTE: Up to 4 employees can be selected during completion of the
  > Appointment with Points based Hands-On Incentive.
- **Position & Points** — tooltip:
  > Provide incentives based on a mix of Position and Points.
- **Section tooltip:**
  > Set the incentives given to Employees when they render this service to
  > the customer.
  > Incentives can be based on a monetary fixed value or % of the Selling
  > Price (after discounts).
  > There is also Points based incentives that allow conversion of points
  > to monetary value.

### 7.2 Position mode — table
| Col                   | Content                                              |
| --------------------- | ---------------------------------------------------- |
| Specialized Service?  | green check toggle per row                           |
| Position              | position name (from `positions` table)               |
| Type                  | MYR / % toggle pill                                  |
| Male                  | numeric input (amount or %)                          |
| Female                | numeric input (amount or %)                          |

- **Specialized Service? tooltip:**
  > Enable this if this service is only able to be rendered by the
  > Employees within the Position.
  >
  > NOTE: A text reminder in red will appear when this service is being
  > completed in Appointments to only select Employees within the
  > Specialized Service. You may still opt to not select an Employee within
  > the Specialized Service.
- Rows are generated per active position. For our prototype fixture:
  `DENTAL ASSISTANT`, `LOCUM DOCTOR`, `RESIDENT DOCTOR`, `ACCOUNTANT`,
  `STANDARD`, `OPERATION`, `MARKETING`.

### 7.3 Points mode — two-field layout
- `(MYR)` amount input + `Total Points` integer input. No per-position
  table.

### 7.4 Position & Points mode
- Layout = section 7.2 table **plus** the Points fields from 7.3 stacked
  below. Confirm with a PO before building.

- **Blocked on:**
  - Phase 2 commission engine.
  - Schema additions:
    - `service_incentives` table with `mode enum('position','points','both')`
    - child `service_position_incentives` `(service_id, position_id,
      specialized_service, type enum('MYR','PERCENT'), male_value,
      female_value)`.
  - UI today should render the placeholder table backed by static rows.

---

## Tooltip copy — single source

All tooltip strings are wired through
[lib/constants/service-form-tooltips.ts](../../lib/constants/service-form-tooltips.ts),
keyed by `ServiceFormTooltipKey`. The UI imports
`SERVICE_FORM_TOOLTIPS[key]` and renders the paragraphs through the
`<InfoTip>` helper in `ServiceForm.tsx`. Update copy in that one file to
change every surface at once.

---

## Settled decisions (2026-04-15)

1. **Retail vs. non-retail is a single checkbox** — ticked = `retail`
   (S (R)), unticked = `non_retail` (S (NR)) with an explanatory
   paragraph. Default ticked. The selling-price field remains editable in
   both states.
2. **Allow Redemption Without Payment is independent** of the retail
   toggle — it only controls whether the Appointment completion flow lets
   the visit close without full payment.
3. **Price range** shows `[ min ] to [ max ]` under a single
   `Selling Price *` label; it does not repurpose the Other Fees column.
4. **Discount Cap** shows a dedicated `Discount Cap Amount (%) *` input
   beneath the Enable checkbox, not inline beside it.
5. **Taxes** render as chips — selected chips with `×` remove buttons,
   unselected taxes below as dashed `+` add buttons.
6. **Image upload** is click-to-upload on the placeholder itself. No
   separate Upload / Replace / Remove buttons. No "Save first" blocker —
   the dialog generates a client-side UUID on open and passes it as both
   the storage path prefix and the eventual `services.id`, so uploads
   work immediately for both create and edit.
7. **Placeholder sections** (Consumables, Medications, Outlets, Coverage
   Payor, Hands-On Incentive) are rendered as dashed-border empty states
   with `Phase 2` badges — visible for layout fidelity but deliberately
   non-functional until we pick them up.
8. **All controls use our own design system** — `Checkbox`, `Badge`,
   `Button`, `Input`, `Tooltip` from `components/ui/*`. No hand-rolled
   styled primitives inside the form. Layout follows Aoikumo; look-and-
   feel follows BIG.

---

## Remaining TODOs (non-blocking)

1. Inline "add category" from the Category select (+ button next to the
   dropdown).
2. `MYR ↔ %` toggle for Other Fees — requires a new
   `other_fees_is_percentage bool` column.
3. Per-outlet pricing table — new `service_outlet_pricing` junction table.
4. Hands-On Incentive table — new `service_position_incentives` junction.
5. Consumables / Medications pickers — blocked by Inventory module.
6. Coverage Payor — deferred to clinical-features phase.
7. Medications cap of 15 — enforce at the picker level when (5) lands.
