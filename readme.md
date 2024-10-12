### Configuration files

```
├── api
│   ├── .dev.vars
│   └── wrangler.toml
├── app
│   ├── .env
│   └── .env.production
├── mda
│   └── wrangler.toml
└── readme.md
```
Secrets in Cloudflare
- CF_API_TOKEN
- RS_API_TOKEN

### JMAP documentation
- [Core Spec](https://jmap.io/spec-core.html)

### SPF record
|type|name|value|
|-|-|-|
|TXT|@|v=spf1 include:_spf.mx.cloudflare.net include:relay.mailchannels.net ~all|

### Domain lockdown
|type|name|value|
|-|-|-|
|TXT|_mailchannels|v=mc1 cfid=*fill*.workers.dev cfid=*example.domain.com*|

## TODO
