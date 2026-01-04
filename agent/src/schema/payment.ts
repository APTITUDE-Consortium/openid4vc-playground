import { z } from 'zod'

/**
 * @name PaymentConfirmationSchema
 * @description Zod schema for transaction data type urn:eudi:sca:payment:1.
 * Used for SCA Attestations representing an account or card.
 * @version EUDI ARF v1.4.0 (Annex 4, Section 4.3.1)
 * @see ISO8601, ISO4217, ISO20022, RFC2397
 */
export const PaymentConfirmationSchema = z
  .object({
    /** REQUIRED: Unique identifier of the Relying Party's interaction with the User. */
    transaction_id: z.string(),

    /** OPTIONAL: [ISO8601] date and time when the Relying Party started to interact with the User. */
    date_time: z.string().datetime({ offset: true }).optional(),

    payee: z.object({
      /** REQUIRED: Name of the Payee to whom the payment is being made. */
      name: z.string(),
      /** REQUIRED: Identifier of the Payee understood by the payment system. */
      id: z.string(),
      /** OPTIONAL: Resolvable or Data (as per [RFC2397]) URL of the Payee logo. */
      logo: z
        .string()
        .url()
        .or(z.string().regex(/^data:/))
        .optional(),
      /** OPTIONAL: Resolvable URL of the Payee's website. */
      website: z.string().url().optional(),
    }),

    /** OPTIONAL: If present, indicates payment is facilitated by a Payment Initiation Service Provider. */
    pisp: z
      .object({
        /** REQUIRED: Legal name of the PISP. */
        legal_name: z.string(),
        /** REQUIRED: Brand name of the PISP. */
        brand_name: z.string(),
        /** REQUIRED: Domain name of the PISP as secured by the [eIDAS] QWAC certificate. */
        domain_name: z.string(),
      })
      .optional(),

    /** * CONDITIONAL: MUST NOT be present when recurrence is present.
     * [ISO8601] date of the payment's execution. MUST NOT lie in the past.
     */
    execution_date: z
      .string()
      .datetime()
      .refine((date) => new Date(date) >= new Date(), {
        message: 'Execution date must not lie in the past',
      })
      .optional(),

    /** REQUIRED: Currency of the payment(s) as [ISO4217] Alpha-3 code. */
    currency: z.string().length(3),

    /** REQUIRED: Amount consisting of major currency units and optional decimal part. */
    amount: z.number(),

    /** OPTIONAL: In case of an MIT, indicates that the amount is estimated. */
    amount_estimated: z.boolean().optional(),

    /** OPTIONAL: In case of an MIT, indicates that the Payee earmarks the amount immediately. */
    amount_earmarked: z.boolean().optional(),

    /** OPTIONAL: Indicates request for SEPA Instant Credit Transfer execution. */
    sct_inst: z.boolean().optional(),

    /** OPTIONAL: If present, indicates a recurring payment. */
    recurrence: z
      .object({
        /** OPTIONAL: [ISO8601] date of the first payment's execution. */
        start_date: z.string().datetime().optional(),
        /** OPTIONAL: [ISO8601] date of the last payment's execution. */
        end_date: z.string().datetime().optional(),
        /** OPTIONAL: Number of recurring payments. */
        number: z.number().int().positive().optional(),
        /** * REQUIRED: [ISO20022] codes:
         * INDA(Intraday), DAIL(Daily), WEEK(Weekly), TOWK(Bi-weekly), TWMN(Twice-month),
         * MNTH(Monthly), TOMN(Bi-monthly), QUTR(Quarterly), FOMN(Every 4 months),
         * SEMI(Twice-year), YEAR(Yearly), TYEA(Every 2 years).
         */
        frequency: z.enum([
          'INDA',
          'DAIL',
          'WEEK',
          'TOWK',
          'TWMN',
          'MNTH',
          'TOMN',
          'QUTR',
          'FOMN',
          'SEMI',
          'YEAR',
          'TYEA',
        ]),
      })
      .optional(),

    /** OPTIONAL: Object holding options for recurring Merchant Initiated Transactions (MITs). */
    mit_options: z
      .object({
        /** OPTIONAL: Indicates if subsequent transactions may have a different amount. */
        amount_variable: z.boolean().optional(),
        /** OPTIONAL: The minimum amount of a single payment. */
        min_amount: z.number().optional(),
        /** OPTIONAL: The maximum amount of a single payment. */
        max_amount: z.number().optional(),
        /** OPTIONAL: The total amount of all payments under this transaction. */
        total_amount: z.number().optional(),
        /** OPTIONAL: Deviating amount for a fixed number of initial instances. */
        initial_amount: z.number().optional(),
        /** OPTIONAL: Number of initial instances with a deviating amount. */
        initial_amount_number: z.number().int().optional(),
        /** OPTIONAL: Annual Percentage Rate of the installment. */
        apr: z.number().optional(),
      })
      .optional(),
  })
  .refine((data) => !(data.recurrence && data.execution_date), {
    message: 'execution_date MUST NOT be present when recurrence is present (ARF 4.3.1)',
    path: ['execution_date'],
  })

export type PaymentConfirmation = z.infer<typeof PaymentConfirmationSchema>
export const paymentConfirmationUrn = 'urn:eudi:sca:payment:1'
