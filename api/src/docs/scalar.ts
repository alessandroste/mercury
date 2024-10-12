import html from './scalar.html'

export function getScalarUI(schemaUrl: string, clientId: string) {
  const cleanSchemaUrl = schemaUrl.replace(/\/+(\/|$)/g, '$1') // strip double & trailing splash
  return html
    .replace('{{ cleanSchemaUrl }}', cleanSchemaUrl)
    .replace('{{ clientId }}', clientId)
}
