export type XMLText = string | number | {
  __cdata?: string
  '#text'?: string | number
}

/** Normalize XML text nodes before they reach storage or React rendering. */
export function readXMLText(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return String(value)
  if (value && typeof value === 'object') {
    const node = value as Record<string, unknown>
    return readXMLText(node.__cdata) || readXMLText(node['#text'])
  }
  return ''
}
