/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs')
const nunjucks = require('nunjucks')
const { spawnSync } = require('child_process')
const path = require('path')
const args = require('minimist')(process.argv.slice(2))
const pkg = require('./package.json')

const messageBlobName = pkg.name + '-message-blob'
const messageBlobPreviewName = messageBlobName + '-preview'

const messageMetadataKVName = 'message-metadata'
const indexLabelsKVName = 'index-labels'

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
    'route-domain',
    'route-zone',
    'forward-email',
    'host-web-app',
    'auth-client-id',
    'auth-allowed'
  ].forEach(opt => {
    if (args[opt] === undefined) {
      console.warn(`Missing argument '--${opt}'`)
    }
  })

  const existingKvs = JSON.parse((await runCommand(`npx wrangler kv namespace list`)).stdout)

  if (!existingKvs.some(kv => kv.title === `${pkg.name}-${messageMetadataKVName}`)) {
    await createKV(messageMetadataKVName, false)
  }

  if (!existingKvs.some(kv => kv.title === `${pkg.name}-${messageMetadataKVName}_preview`)) {
    await createKV(messageMetadataKVName, true)
  }

  if (!existingKvs.some(kv => kv.title === `${pkg.name}-${indexLabelsKVName}`)) {
    await createKV(indexLabelsKVName, false)
  }

  if (!existingKvs.some(kv => kv.title === `${pkg.name}-${indexLabelsKVName}_preview`)) {
    await createKV(indexLabelsKVName, true)
  }

  const kvs = JSON.parse((await runCommand(`npx wrangler kv namespace list`)).stdout)

  const existingBuckets = JSON.parse((await runCommand(`npx wrangler r2 bucket list`)).stdout)

  if (!existingBuckets.some(b => b.name === messageBlobName)) {
    await runCommand(`npx wrangler r2 bucket create ${messageBlobName}`)
  }

  if (!existingBuckets.some(b => b.name === messageBlobPreviewName)) {
    await runCommand(`npx wrangler r2 bucket create ${messageBlobPreviewName}`)
  }

  const context = {
    messageMetadataKV: kvs.find(kv => kv.title === `${pkg.name}-${messageMetadataKVName}`).id,
    messageMetadataKVP: kvs.find(kv => kv.title === `${pkg.name}-${messageMetadataKVName}_preview`).id,
    indexLabelsKV: kvs.find(kv => kv.title === `${pkg.name}-${indexLabelsKVName}`).id,
    indexLabelsKVP: kvs.find(kv => kv.title === `${pkg.name}-${indexLabelsKVName}_preview`).id,
    messageBlobName: messageBlobName,
    messageBlobPreviewName: messageBlobPreviewName,
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
      const result = nunjucks.renderString(fs.readFileSync(originalFileName).toString(), context)
      fs.writeFileSync(newFileName, result)
      console.log('Processed file: ' + newFileName)
    })
  })
}

async function clean() {
  const existingKvs = JSON.parse((await runCommand(`npx wrangler kv namespace list`)).stdout)
  const kvs = existingKvs.filter(kv => [
    `${pkg.name}-${messageMetadataKVName}`,
    `${pkg.name}-${messageMetadataKVName}_preview`,
    `${pkg.name}-${indexLabelsKVName}`,
    `${pkg.name}-${indexLabelsKVName}_preview`
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

main().then(() => { process.exit(0) }).catch((err) => { console.error(err); process.exit(1) })
