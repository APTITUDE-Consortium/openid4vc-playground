import { z } from 'zod'
import { zFunkeQesTransactionData } from './transactionDataFunkeQes'
import { zAccountAccess, zEMandate, zLogin, zPayment, zUnknownTransaction } from './transactionDataTs12'

export const zTransactionDataSchema = z.discriminatedUnion('type', [
  zPayment,
  zLogin,
  zAccountAccess,
  zEMandate,
  zFunkeQesTransactionData,
  zUnknownTransaction,
])

export type TransactionData = z.infer<typeof zTransactionDataSchema>
