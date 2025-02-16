{
  "name": "mercury-api",
  "main": "src/worker.ts",
  "compatibility_date": "2024-09-23",
  "compatibility_flags": [
    "nodejs_compat"
  ],
  "kv_namespaces": [
    {
      "binding": "messageMetadata",
      "id": "{{ messageMetadataKV }}",
      "preview_id": "{{ messageMetadataKVP }}"
    },
    {
      "binding": "indexLabels",
      "id": "{{ indexLabelsKV }}",
      "preview_id": "{{ indexLabelsKVP }}"
    }
  ],
  "r2_buckets": [
    {
      "binding": "messageBlob",
      "bucket_name": "{{ messageBlobName }}",
      "preview_bucket_name": "{{ messageBlobPreviewName }}"
    }
  ],
  "observability": {
    "enabled": true
  },
  "vars": {
    "HOST_APP": "{{ hostWebApp }}",
    "AUTH_CLIENT_ID": "{{ authClientId }}",
    "AUTH_ALLOWED": "{{ authAllowed }}"
  }
}
