import type { OPMLOutline } from './types'

interface OPMLParsedOutline {
  '@_text'?: string
  '@_title'?: string
  '@_xmlUrl'?: string
  '@_htmlUrl'?: string
  '@_type'?: string
  outline?: OPMLParsedOutline | OPMLParsedOutline[]
}

function flattenOutlines(
  outlines: OPMLParsedOutline[],
  parentFolder?: string
): OPMLOutline[] {
  const results: OPMLOutline[] = []

  for (const outline of outlines) {
    if (outline['@_xmlUrl']) {
      results.push({
        title: outline['@_title'] ?? outline['@_text'] ?? 'Untitled',
        xmlUrl: outline['@_xmlUrl'],
        htmlUrl: outline['@_htmlUrl'],
        folder: parentFolder,
      })
    } else if (outline.outline) {
      const folderName = outline['@_title'] ?? outline['@_text'] ?? 'Untitled'
      const children = Array.isArray(outline.outline)
        ? outline.outline
        : [outline.outline]
      results.push(...flattenOutlines(children, folderName))
    }
  }

  return results
}

export async function parseOPML(xmlContent: string): Promise<OPMLOutline[]> {
  const { XMLParser } = await import('fast-xml-parser')

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  })

  const parsed = parser.parse(xmlContent)
  const body = parsed.opml?.body

  if (!body?.outline) {
    throw new Error('Invalid OPML file: no outlines found')
  }

  const outlines: OPMLParsedOutline[] = Array.isArray(body.outline)
    ? body.outline
    : [body.outline]

  return flattenOutlines(outlines)
}
