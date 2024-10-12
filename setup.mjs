import { spawnSync } from 'child_process'
import * as fs from 'fs'
import minimist from 'minimist'
import nunjucks from 'nunjucks'
import * as path from 'path'
const args = minimist(process.argv.slice(2))
const pkg = JSON.parse(fs.readFileSync('package.json'))
const { renderString } = nunjucks

const messageBlobName = pkg.name + '-message-blob'
const messageBlobPreviewName = messageBlobName + '-preview'

const messageMetadataKVNameSuffix = 'message-metadata'
const indexLabelsKVNameSuffix = 'index-labels'
const messageMetadataKVName = `${pkg.name}-${messageMetadataKVNameSuffix}`
const indexLabelsKVName = `${pkg.name}-${indexLabelsKVNameSuffix}`
const messageMetadataKVPreviewName = `${messageMetadataKVName}_preview`
const indexLabelsKVPreviewName = `${indexLabelsKVName}_preview`

const noPreview = !args['preview'] || false
console.log(`noPreview: ${noPreview}`)

async function runCommand(command) {
  return spawnSync(command, [], {
    shell: true,
    stdio: 'pipe',
    encoding: 'utf8'
  })
}

async function createKV(kvName, preview) {
  const { stdout, status } = await runCommand(`npx wrangler kv namespace create ${kvName} --preview=${preview}`)
  if (status !== 0) {
    console.debug(stdout)
  }
}

async function setup(args) {
  [
    // 'route-domain',
    // 'route-zone',
    'forward-email',
    'host-web-app',
    'auth-client-id',
    'auth-allowed'
  ]
    .filter(opt => !args[opt])
    .forEach(opt => console.warn(`Missing argument '--${opt}'`))

  const existingKvs = JSON.parse((await runCommand(`npx wrangler kv namespace list`)).stdout)

  if (!existingKvs.some(kv => kv.title === messageMetadataKVName)) {
    await createKV(messageMetadataKVNameSuffix, false)
  }

  if (!noPreview && !existingKvs.some(kv => kv.title === messageMetadataKVPreviewName)) {
    await createKV(messageMetadataKVNameSuffix, true)
  }

  if (!existingKvs.some(kv => kv.title === indexLabelsKVName)) {
    await createKV(indexLabelsKVNameSuffix, false)
  }

  if (!noPreview && !existingKvs.some(kv => kv.title === indexLabelsKVPreviewName)) {
    await createKV(indexLabelsKVNameSuffix, true)
  }

  const kvs = JSON.parse((await runCommand(`npx wrangler kv namespace list`)).stdout)

  // const existingBuckets = JSON.parse((await runCommand(`npx wrangler r2 bucket list`)).stdout)

  // if (!existingBuckets.some(b => b.name === messageBlobName)) {
  //   await runCommand(`npx wrangler r2 bucket create ${messageBlobName}`)
  // }

  // if (!noPreview && !existingBuckets.some(b => b.name === messageBlobPreviewName)) {
  //   await runCommand(`npx wrangler r2 bucket create ${messageBlobPreviewName}`)
  // }

  const messageMetadataKVId = kvs.find(kv => kv.title === messageMetadataKVName).id
  const messageMetadataKVPId = kvs.find(kv => kv.title === messageMetadataKVPreviewName)?.id
  const indexLabelsKVId = kvs.find(kv => kv.title === indexLabelsKVName).id
  const indexLabelsKVPId = kvs.find(kv => kv.title === indexLabelsKVPreviewName)?.id

  const context = {
    messageMetadataKV: messageMetadataKVId,
    messageMetadataKVP: noPreview ? messageMetadataKVId : messageMetadataKVPId,
    indexLabelsKV: indexLabelsKVId,
    indexLabelsKVP: noPreview ? indexLabelsKVId : indexLabelsKVPId,
    messageBlobName: messageBlobName,
    messageBlobPreviewName: noPreview ? messageBlobName : messageBlobPreviewName,
    routeDomain: args['route-domain'],
    routeZone: args['route-zone'],
    forwardEmail: args['forward-email'],
    hostWebApp: args['host-web-app'],
    authClientId: args['auth-client-id'],
    authAllowed: args['auth-allowed']
  }

  pkg.workspaces.forEach(workspace => {
    const files = fs.readdirSync(workspace).filter(fn => fn.endsWith('.tpl'))
    files.forEach((file) => {
      const originalFileName = path.join(workspace, file)
      const newFileName = path.join(workspace, file.replace(/\.tpl$/, ''))
      const result = renderString(fs.readFileSync(originalFileName).toString(), context)
      fs.writeFileSync(newFileName, result)
      console.log('Processed file: ' + newFileName)
    })
  })
}

async function clean() {
  const existingKvs = JSON.parse((await runCommand(`npx wrangler kv namespace list`)).stdout)
  const kvs = existingKvs.filter(kv => [
    `${pkg.name}-${messageMetadataKVNameSuffix}`,
    `${pkg.name}-${messageMetadataKVNameSuffix}_preview`,
    `${pkg.name}-${indexLabelsKVNameSuffix}`,
    `${pkg.name}-${indexLabelsKVNameSuffix}_preview`
  ].find(i => i === kv.title) !== undefined)

  const deletionTasks = [
    runCommand(`npx wrangler r2 bucket delete ${messageBlobName}`),
    runCommand(`npx wrangler r2 bucket delete ${messageBlobPreviewName}`),
    ...kvs.map(kv =>
      runCommand(`npx wrangler kv namespace delete --namespace-id ${kv.id}`)
    )
  ]

  const results = await Promise.all(deletionTasks)
  results.forEach(r => console.log(r))

  pkg.workspaces.forEach(workspace => {
    const files = fs.readdirSync(workspace).filter(fn => fn.endsWith('.toml'))
    files.forEach(file => {
      const filePath = path.join(workspace, file)
      fs.rmSync(filePath)
      console.log(`Removed: ${filePath}`)
    })
  })
}

async function main() {
  switch (args._[0]) {
    case 'setup': return await setup(args)
    case 'clean': return await clean()
  }
}

await main()
