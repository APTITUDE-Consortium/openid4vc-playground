import { z } from 'zod'

/**
 * **Common Transaction Data Fields**
 * * Includes fields that are common to all transaction types defined in EUDI TS12.
 * This covers both the technical payload fields (Section 4.3) and the UI rendering
 * fields required for Dynamic Linking (Section 5).
 * * @see {@link https://github.com/eu-digital-identity-wallet/eudi-doc-standards-and-technical-specifications EUDI TS12 Specifications}
 */
export const zCommonFields = z.object({
  // --- Payload Fields (TS12 Section 4.3) ---

  /**
   * **Transaction ID**
   * Unique identifier of the Relying Party's interaction with the User.
   * @source TS12 Section 4.3 (REQUIRED for all types)
   */
  transaction_id: z.string().describe("Unique identifier of the Relying Party's interaction"),

  /**
   * **Date Time**
   * The date and time when the Relying Party started to interact with the User.
   * @format ISO 8601
   * @source TS12 Section 4.3 (OPTIONAL)
   */
  date_time: z.iso.datetime().optional(),

  // --- UI / Display Fields (TS12 Section 5 - Dynamic Linking) ---

  /**
   * **Transaction Title**
   * A short, human-readable title for the transaction displayed to the user.
   * @example "Authorize Payment"
   * @source TS12 Section 5
   */
  transaction_title: z.string().max(50).optional(),

  /**
   * **Subtitle**
   * Additional context displayed below the title.
   * @example "Merchant: Amazon DE"
   * @source TS12 Section 5
   */
  subtitle: z.string().optional(),

  /**
   * **Affirmative Action Label**
   * Custom text for the button the user taps to approve the transaction.
   * @example "Pay €50.00"
   * @source TS12 Section 5
   */
  affirmative_action_label: z.string().max(30).optional(),

  /**
   * **Denial Action Label**
   * Custom text for the rejection/cancellation button.
   * @example "Cancel"
   * @source TS12 Section 5
   */
  denial_action_label: z.string().max(30).optional(),

  /**
   * **Security Hint**
   * An anti-phishing hint known only to the user and issuer.
   * @example "Your pet's name is Fluffy"
   * @source TS12 Section 5
   */
  security_hint: z.string().max(250).optional(),
})

/**
 * **Payment Transaction Data**
 * * Represents a financial transaction requiring Strong Customer Authentication (SCA).
 * Defined in TS12 under URN `urn:eudi:sca:payment:1`.
 * * @see TS12 Section 4.3.1
 */
export const zPayment = zCommonFields.extend({
  /**
   * **Discriminator**
   * Uniquely identifies this schema as a TS12 Payment.
   */
  type: z.literal('urn:eudi:sca:payment:1'),

  /**
   * **Payee**
   * The name of the merchant or entity receiving the funds.
   * @source TS12 Section 4.3.1
   */
  payee: z.string(),

  /**
   * **Amount**
   * The monetary value and currency of the transaction.
   */
  amount: z.object({
    /**
     * **Currency**
     * 3-letter currency code.
     * @see ISO 4217
     */
    currency: z.string().length(3),

    /**
     * **Value**
     * The positive numerical amount of the transaction.
     */
    value: z.number().positive(),
  }),

  /**
   * **PISP (Payment Initiation Service Provider)**
   * Optional details if the payment is initiated by a third-party provider.
   * @source TS12 Section 4.3.1
   */
  pisp: z
    .object({
      /**
       * **Legal Name**
       * The registered legal name of the PISP.
       */
      legal_name: z.string(),

      /**
       * **Brand Name**
       * The consumer-facing brand name of the PISP.
       */
      brand_name: z.string().optional(),

      /**
       * **Domain Name**
       * The domain name secured by the PISP's QWAC certificate (eIDAS).
       */
      domain_name: z.string().optional(),
    })
    .optional(),

  /**
   * **MIT (Merchant Initiated Transaction) Options**
   * Configuration for recurring or variable payments initiated by the merchant.
   * @source TS12 Section 4.3.1
   */
  mit_options: z
    .object({
      /**
       * **Amount Variable**
       * If true, indicates future transaction amounts may vary.
       */
      amount_variable: z.boolean().optional(),

      /**
       * **Minimum Amount**
       * The minimum expected amount for future transactions.
       */
      min_amount: z.number().optional(),
    })
    .optional(),
})

/**
 * **Login / Risk Transaction Data**
 * * Represents a non-payment sensitive action or authentication request.
 * Defined in TS12 under URN `urn:eudi:sca:login_risk_transaction:1`.
 * * @see TS12 Section 4.3.2
 */
export const zLogin = zCommonFields.extend({
  type: z.literal('urn:eudi:sca:login_risk_transaction:1'),

  /**
   * **Service**
   * The name of the service triggering the operation.
   * @example "Superbank Online Banking"
   * @source TS12 Section 4.3.2 (Field: `service`)
   */
  service: z.string().optional(),

  /**
   * **Action**
   * Description of the action the user is consenting to.
   * @example "Log in to Online Banking"
   * @example "Change daily transaction limit to 10,000 EUR"
   * @source TS12 Section 4.3.2 (Field: `action`)
   */
  action: z.string().describe('Description of the action'),
})

/**
 * **Account Access Data (AIS)**
 * * Represents consent for accessing account information (PSD2 AIS).
 * This transaction data type is meant to be used in conjunction with an SCA Attestation that represents an account.
 * * @see TS12 Section 4.3.3
 */
export const zAccountAccess = zCommonFields.extend({
  type: z.literal('urn:eudi:sca:account_access:1'),

  /**
   * **AISP Details**
   * If present, it indicates that the account (information) access is being facilitated by an AISP.
   * @source TS12 Section 4.3.3
   */
  aisp: z
    .object({
      /**
       * **Legal Name**
       * Legal name of the AISP.
       */
      legal_name: z.string(),

      /**
       * **Brand Name**
       * Brand name of the AISP.
       */
      brand_name: z.string(),

      /**
       * **Domain Name**
       * Domain name of the AISP as secured by the eIDAS QWAC certificate.
       */
      domain_name: z.string(),
    })
    .optional(),

  /**
   * **Description**
   * Description of the account (information) access the User is agreeing to.
   * @source TS12 Section 4.3.3
   */
  description: z.string().optional(),
})

/**
 * **E-Mandate Data**
 * * Represents a mandate (e.g. SEPA Direct Debit).
 * This transaction data type is meant to be used in conjunction with an SCA Attestation that represents an account or a card.
 * * @see TS12 Section 4.3.4
 */
export const zEMandate = zCommonFields.extend({
  type: z.literal('urn:eudi:sca:emandate:1'),

  /**
   * **Start Date**
   * Date or date-time when the mandate becomes valid.
   * Absence indicates immediate validity.
   * @format ISO 8601
   * @source TS12 Section 4.3.4
   */
  start_date: z.iso.datetime().optional(),

  /**
   * **End Date**
   * Date or date-time when the mandate expires.
   * Absence indicates no defined end date.
   * @format ISO 8601
   * @source TS12 Section 4.3.4
   */
  end_date: z.iso.datetime().optional(),

  /**
   * **Reference Number**
   * A unique ID assigned to the specific mandate.
   * For SEPA Direct Debit, this is the Mandate Reference Number.
   * @source TS12 Section 4.3.4
   */
  reference_number: z.string().optional(),

  /**
   * **Creditor ID**
   * For a SEPA Direct Debit, this attribute holds the creditor identifier.
   * @source TS12 Section 4.3.4
   */
  creditor_id: z.string().optional(),

  /**
   * **Purpose**
   * Mandate text the User is supposed to consent to.
   * **Conditional:** REQUIRED when `payment_payload` is not present, else OPTIONAL.
   * @source TS12 Section 4.3.4
   */
  purpose: z.string().optional(),

  /**
   * **Payment Payload**
   * Object of type `urn:eudi:sca:payment:1`.
   * May be used to leverage that data structure to obtain a mandate for MITs.
   * @source TS12 Section 4.3.4
   */
  payment_payload: zPayment.omit({ type: true }).optional(),
})

export const zUnknownTransaction = z.object({ type: z.string() }).loose()
