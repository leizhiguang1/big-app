/**
 * Tooltip copy for the service create/edit form.
 *
 * Strings pulled verbatim from the reference prototype
 * (bigdental.aoikumo.com/services) on 2026-04-15 via the live Tooltipster
 * data. Keep them here so the UI has one place to import from and future
 * translators have a single source.
 *
 * Escaped HTML has been flattened to plain text; multi-paragraph tooltips
 * are broken into paragraphs.
 */

export type ServiceFormTooltipKey =
	| "category"
	| "duration"
	| "caseNoteTemplate"
	| "eInvoiceCode"
	| "retailItem"
	| "allowRedemptionWithoutPayment"
	| "consumables"
	| "medications"
	| "medicationsMax"
	| "allowCashPriceRange"
	| "otherFees"
	| "individualDiscountCapping"
	| "coveragePayor"
	| "handsOnIncentive"
	| "incentivePosition"
	| "incentivePoints"
	| "incentivePositionAndPoints"
	| "specializedService";

export const SERVICE_FORM_TOOLTIPS: Record<ServiceFormTooltipKey, string[]> = {
	category: [
		"Give this service a category.",
		"Example: Facial, Aesthetics, Dental, Wellness",
	],
	duration: [
		"The default duration this service will take whenever an appointment is made.",
		"This can be adjusted during the said appointment creation.",
	],
	caseNoteTemplate: [
		"If this Service is selected during Case Notes billing, the selected Case Notes template will automatically be inserted into Case Notes.",
	],
	eInvoiceCode: [
		"Classification code list defines the category of products or services being billed as a result of a commercial transaction.",
	],
	retailItem: [
		"When ticked, this service is a Services (Retail) item — S (R) — meaning it can be sold on its own.",
		"When unticked, this service is assumed to only be sold as part of a promotion or package and will be tagged as S (NR) — Services (Non-Retail).",
	],
	allowRedemptionWithoutPayment: [
		"Enable this option if the service can be redeemed even when full payment is not made. This is commonly used when the customer is allowed to make payments in a staggered manner for the service.",
		"NOTE: If there is outstanding payment detected for this service at the point the appointment is completed, the system will remind the user to request payment from the customer.",
		"BILLING EFFECT: When OFF (default), Collect Payment requires this line to be allocated to its full net — partial payment on the bill cannot leave any outstanding on this line. When ON, staff may allocate less than the line total during Collect Payment.",
	],
	consumables: [
		"Set the default consumables and their quantities used to render this service to the customer.",
		"Consumables are disposable inventory items used when this service is rendered to the customer (such as Gloves, Syringes, Ampoule).",
		"NOTE: Consumables and their quantities can be changed when the service is being completed in Appointments.",
	],
	medications: [
		"Set the default medications and their quantities so that they are sold together with this service.",
		"Medications are drug inventory items that can be included with the sale of this service.",
		"NOTE: Medication and its quantities can be changed when the service is added to the sales cart.",
	],
	medicationsMax: ["You've reached the maximum of 15 medications."],
	allowCashPriceRange: [
		"Enable if this service can be sold within a range.",
		"Example: MYR 10,000.00 – 18,000.00",
	],
	otherFees: [
		"When a value for Other Fees is set, the Hands-On Incentive will be calculated after deducting the Other Fees value from the Selling Price.",
		"TIP: Click the MYR button if the Other Fees is to be based on a % of the Selling Price.",
		"NOTE: This rule only applies to the Position, % based Hands-On Incentive.",
	],
	individualDiscountCapping: [
		"Set a maximum discount that can be given for this service.",
		"Note: When applying Individual Discount Capping along with other discount types, the following priorities are observed:",
		"1. Drop-Down Menu Discount — Config › Sales › Discounts",
		"2. Promo Ala-Carte Discount — Services › Promo › Ala-Carte",
		"3. Individual Discount Capping — each item in Services / Inventory",
		"4. Outlet Discount Capping — Config › Sales › Discounts",
		"Example: If an Individual Discount Capping (priority #3) is configured along with a Promo Ala-Carte Discount (priority #2), the Promo Ala-Carte Discount will be applied during billing, not the Individual Discount Capping.",
	],
	coveragePayor: [
		"Tie this service to a Coverage Payor and its Policies.",
		"When tied and this service is added to the cart for a customer with the same Coverage Payor and Policies, the Policy Co-Insurance / Co-Payment and Cap Per Claim rules will automatically calculate for the customer.",
		"NOTE: Coverage Payor, Policies, Co-Insurance / Co-Payment and Cap Per Claim rules are configured in Config › Clinical Features › Coverage Payors.",
	],
	handsOnIncentive: [
		"Set the incentives given to Employees when they render this service to the customer.",
		"Incentives can be based on a monetary fixed value or % of the Selling Price (after discounts).",
		"There is also a Points-based incentive that converts points to monetary value.",
	],
	incentivePosition: [
		"Provide incentives based on the employee's Position (set under Employees › Position).",
		"Incentives can be given as a MYR value or % of the Selling Price.",
		"Different amounts can be set when the service is rendered for a Male or Female customer.",
		"TIP: Click the MYR button to switch between a value-based or percentage-based incentive.",
		"NOTE: When this service is being completed in Appointments, only 1 employee who rendered this service can be selected.",
	],
	incentivePoints: [
		"Provide incentives to a group of employees (maximum 4) based on Points.",
		"Example: Value is set to MYR 1,000.00 and Total Points to 50.",
		"A maximum of 50 points can be disbursed among the employees based on the work they put in to render this service.",
		"If Employee 1 enters 20 points, Employee 2 enters 5 points and Employee 3 enters 25 points, they receive MYR 400.00, MYR 100.00 and MYR 500.00 respectively (every point is worth MYR 20 = 1,000 / 50).",
		"NOTE: Up to 4 employees can be selected when completing the Appointment with Points-based Hands-On Incentive.",
	],
	incentivePositionAndPoints: [
		"Provide incentives based on a mix of Position and Points.",
	],
	specializedService: [
		"Enable this if this service is only able to be rendered by the employees within the Position.",
		"NOTE: A red text reminder will appear when this service is being completed in Appointments, asking the user to only select employees within the Specialized Service.",
		"You may still opt to not select an employee within the Specialized Service.",
	],
};
