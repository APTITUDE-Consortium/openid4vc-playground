/**
 * TEMPORARY: This is a combined implementation of the integrity protection suite.
 * It is intended for use while the following PR is not merged:
 * https://github.com/openwallet-foundation/sd-jwt-js/pull/344
 */

// --- integrity.ts (Types) ---

type Prettify<T> = { [K in keyof T]: T[K] } & {}

export type IntegrityHashAlg = 'sha256' | 'sha384' | 'sha512' | (string & {})
type WSP = ' ' | '\t' | '\n' | '\r'

export type IntegrityDigest = `${IntegrityHashAlg}-${string}` | `${IntegrityHashAlg}-${string}?${string}`

export type IntegrityMetadata = IntegrityDigest | `${IntegrityDigest}${WSP}${string}`

type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
type Lower0 = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j'
type Lower1 = 'k' | 'l' | 'm' | 'n' | 'o' | 'p' | 'q' | 'r' | 's' | 't'
type Lower = 'u' | 'v' | 'w' | 'x' | 'y' | 'z' | Lower0 | Lower1
type Upper = Uppercase<Lower>
type ValidStart = Lower | Upper | '_' | '$'
type ValidChar = ValidStart | Digit

type IsClean<S extends string> = S extends ''
  ? true
  : S extends `${infer Char}${infer Rest}`
    ? Char extends ValidChar
      ? IsClean<Rest>
      : false
    : false

type IsValidIdentifier<S extends string> = S extends `${infer First}${string}`
  ? First extends ValidStart
    ? IsClean<S>
    : false
  : false

type FormatSegment<Key extends string | number> = Key extends number
  ? `[${Key}]`
  : Key extends `${number}`
    ? `[${Key}]`
    : IsValidIdentifier<Key & string> extends true
      ? `.${Key}`
      : `['${Key}']`

export type _StripDot<S extends string> = S extends `.${infer R}` ? R : S

type ParsePath<T, P extends string, Out extends string = ''> = P extends `['${infer K}']${infer Rest}`
  ? HandleNext<T, K, _StripDot<Rest>, Out>
  : P extends `["${infer K}"]${infer Rest}`
    ? HandleNext<T, K, _StripDot<Rest>, Out>
    : P extends `[*]${infer Rest}`
      ? HandleNext<T, '*', _StripDot<Rest>, Out>
      : P extends `[${infer K extends number}]${infer Rest}`
        ? HandleNext<T, `${K}`, _StripDot<Rest>, Out>
        : P extends `${infer HeadBracket}[${infer RestBracket}`
          ? P extends `${infer HeadDot}.${infer RestDot}`
            ? HeadBracket extends `${string}.${string}`
              ? HandleNext<T, HeadDot, RestDot, Out>
              : HandleNext<T, HeadBracket, `[${RestBracket}`, Out>
            : HandleNext<T, HeadBracket, `[${RestBracket}`, Out>
          : P extends `${infer HeadDot}.${infer RestDot}`
            ? HandleNext<T, HeadDot, RestDot, Out>
            : P extends keyof T
              ? HandleNext<T, P & string, '', Out>
              : never

type HandleNext<T, K extends string, Rest extends string, Out extends string> = K extends '*'
  ? T extends readonly unknown[]
    ? Rest extends ''
      ? `${Out}[${number}]#integrity`
      : ParsePath<T[number], Rest, `${Out}[${number}]`>
    : T extends object
      ? keyof T extends infer Key
        ? Key extends keyof T & (string | number)
          ? Rest extends ''
            ? `${Out}${FormatSegment<Key>}#integrity`
            : ParsePath<T[Key], Rest, `${Out}${FormatSegment<Key>}`>
          : never
        : never
      : never
  : K extends keyof T
    ? Rest extends ''
      ? `${Out}${FormatSegment<K>}#integrity`
      : ParsePath<T[K], Rest, `${Out}${FormatSegment<K>}`>
    : never

export type IntegrityKeys<T, Paths extends string> = _StripDot<ParsePath<T, Paths>>

export type Integrity<T, Paths extends string> = Prettify<
  T & {
    [K in Paths as _StripDot<ParsePath<T, K>>]?: IntegrityMetadata
  }
>

// --- integrity_calculator.ts (Logic) ---

type GetValue<T, K> = K extends keyof T ? T[K] : never
type PathValue<T, P extends string> = P extends `['${infer K}']${infer Rest}`
  ? PathValue<GetValue<T, K>, _StripDot<Rest>>
  : P extends `["${infer K}"]${infer Rest}`
    ? PathValue<GetValue<T, K>, _StripDot<Rest>>
    : P extends `[*]${infer Rest}`
      ? T extends readonly unknown[]
        ? PathValue<T[number], _StripDot<Rest>>
        : PathValue<GetValue<T, keyof T>, _StripDot<Rest>>
      : P extends `*${infer Rest}`
        ? T extends readonly unknown[]
          ? PathValue<T[number], _StripDot<Rest>>
          : PathValue<GetValue<T, keyof T>, _StripDot<Rest>>
        : P extends `[${infer K extends number}]${infer Rest}`
          ? T extends readonly unknown[]
            ? PathValue<T[K], _StripDot<Rest>>
            : never
          : P extends `${infer HeadBracket}[${infer RestBracket}`
            ? P extends `${infer HeadDot}.${infer RestDot}`
              ? HeadBracket extends `${string}.${string}`
                ? PathValue<GetValue<T, HeadDot>, RestDot>
                : PathValue<GetValue<T, HeadBracket>, `[${RestBracket}`>
              : PathValue<GetValue<T, HeadBracket>, `[${RestBracket}`>
            : P extends `${infer HeadDot}.${infer RestDot}`
              ? PathValue<GetValue<T, HeadDot>, RestDot>
              : P extends keyof T
                ? T[P]
                : never

export type DigestFn<T, K extends string> = (
  key: IntegrityKeys<T, K>,
  value: PathValue<T, K>
) => Promise<IntegrityDigest> | IntegrityDigest

export function _splitPath(path: string): string[] {
  const regex = /(\['[^']+']|\["[^"]+"]|\[\d+]|\[\*]|\*|[a-zA-Z0-9_$]+)/g
  return (path.match(regex) || []).map((it) => {
    if (it === '*' || it === '[*]') return '*'
    return it.startsWith('[') ? it.replace(/^\[['"]?|['"]?]$/g, '') : it
  })
}

function resolvePaths(
  currentVal: unknown,
  segments: string[],
  currentPath: string
): Array<{ path: string; value: unknown }> {
  if (segments.length === 0) {
    return [{ path: currentPath, value: currentVal }]
  }

  const toSegment = (key: string) =>
    /^[0-9]*$/.test(key) ? `[${key}]` : /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? `.${key}` : `['${key}']`

  const toNextPath = (key: string) =>
    currentPath ? `${currentPath}${toSegment(key)}` : toSegment(key).replace(/^\./, '')

  const [head, ...tail] = segments
  const results: Array<{ path: string; value: unknown }> = []

  let toResolve: { key: string; nextPath: string }[] = []
  if (head === '*') {
    if (typeof currentVal === 'object' && currentVal !== null) {
      toResolve = Object.keys(currentVal).map((key) => ({
        key: key,
        nextPath: toNextPath(key),
      }))
    }
  } else {
    toResolve = [{ key: head, nextPath: toNextPath(head) }]
  }

  for (const { key, nextPath } of toResolve) {
    if (currentVal && typeof currentVal === 'object' && key in currentVal) {
      const obj = currentVal as Record<string, unknown>
      results.push(...resolvePaths(obj[key], tail, nextPath))
    }
  }
  return results
}

export async function calculateIntegrity<T extends Record<string, unknown>, const P extends readonly string[]>(
  payload: T,
  paths: P,
  hasher: DigestFn<T, P[number]>
): Promise<Integrity<T, P[number]>> {
  const result = { ...payload } as Integrity<T, P[number]>

  const all = paths.flatMap((pathStr) => {
    const segments = _splitPath(pathStr)
    const matches = resolvePaths(payload, segments, '')
    return matches.map(async ({ path, value }) => {
      const key = `${path}#integrity`
      return {
        [key]: await hasher(key as IntegrityKeys<T, P[number]>, value as PathValue<T, P[number]>),
      }
    })
  })

  for (const obj of await Promise.all(all)) {
    Object.assign(result, obj)
  }

  return result
}

// --- integrity_parser.ts (Parsing) ---

export interface IntegrityPart {
  alg: IntegrityHashAlg
  hash: string
  options?: string
}

export interface IntegrityPartError {
  error: string
}

export interface IntegrityCheckResult {
  key: string
  value: unknown
  integrity: (IntegrityPart | IntegrityPartError)[]
}

export function parseIntegrityString(input: IntegrityMetadata): (IntegrityPart | IntegrityPartError)[] {
  const result: (IntegrityPart | IntegrityPartError)[] = []
  const items = input.trim().split(/\s+/)
  for (const item of items) {
    if (!item) continue
    const expressionAndOptions = item.split('?')
    const algorithmExpression = expressionAndOptions[0]
    const firstHyphenIndex = algorithmExpression.indexOf('-')

    if (firstHyphenIndex === -1) {
      result.push({
        error: `Malformed integrity part '${item}': missing hyphen separator`,
      })
      continue
    }

    const algorithm = algorithmExpression.slice(0, firstHyphenIndex) as IntegrityHashAlg
    if (!algorithm) {
      result.push({
        error: `Malformed integrity part '${item}': missing algorithm`,
      })
      continue
    }

    const base64Value = algorithmExpression.slice(firstHyphenIndex + 1)
    const options = expressionAndOptions[1]
    result.push({
      alg: algorithm,
      hash: base64Value,
      options,
    })
  }
  return result
}

export function extractIntegrity(target: object): IntegrityCheckResult[] {
  if (!target || typeof target !== 'object') return []

  return Object.entries(target).flatMap(([key, val]) => {
    const err = (error: string) => [
      {
        key,
        value: undefined,
        integrity: [{ error }],
      } satisfies IntegrityCheckResult,
    ]

    if (typeof val === 'object' && val !== null) return extractIntegrity(val)
    if (!key.endsWith('#integrity')) return []

    const fullPath = key.replace(/#integrity$/, '')
    if (!val || typeof val !== 'string') {
      return err(`sd-jwt integrity '${key}' should be string: ${JSON.stringify(val)}`)
    }

    const rawValue = val as IntegrityMetadata
    const path = _splitPath(fullPath)
    let value = target as Record<string, unknown>
    for (const step of path) {
      if (typeof value === 'object' && value !== null && step in value) {
        value = value[step] as Record<string, unknown>
      } else {
        return err(`sd-jwt integrity for '${fullPath}' has no value in payload`)
      }
    }
    return [
      {
        key,
        value: value as unknown,
        integrity: parseIntegrityString(rawValue),
      },
    ]
  })
}
