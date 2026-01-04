import { z } from "zod";

// --- Funke / German EUDI QES Profile ---
// Used in the SPRIND Funke prototypes
export const zFunkeQesTransactionData = z.object({
    type: z.literal("qes_authorization"), // Note: Not a URN like TS12

    credential_ids: z.array(z.string()).min(1)
        .describe("List of credential IDs the wallet should use/select for signing"),

    transaction_data_hashes_alg: z.array(z.string())
        .describe("Algorithms used for hashing (e.g. ['sha-256'])"),

    signatureQualifier: z.enum(["eu_eidas_qes", "eu_eidas_aes"]) // "aes" = Advanced, "qes" = Qualified
        .describe("The level of signature required"),

    documentDigests: z.array(z.object({
        label: z.string().describe("Human readable filename (e.g. 'Contract.pdf')"),
        hash: z.string().describe("Base64 encoded hash of the document"),
        hashAlgorithmOID: z.string().optional().describe("OID of the hash algorithm (optional in some implementations)"),
    })).min(1),
});
