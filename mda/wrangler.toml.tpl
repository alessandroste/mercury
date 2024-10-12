name = "mercury-mda"
main = "src/worker.ts"
compatibility_date = "2024-08-27"
compatibility_flags = [ "nodejs_compat" ]
workers_dev = false

kv_namespaces = [
  { binding = "messageMetadata", id = "{{ messageMetadataKV }}", preview_id = "{{ messageMetadataKVP }}" },
  { binding = "indexLabels", id = "{{ indexLabelsKV }}", preview_id = "{{ indexLabelsKVP }}" }
]

r2_buckets = [
  { binding = "messageBlob", bucket_name = "{{ messageBlobName }}", preview_bucket_name="{{ messageBlobPreviewName }}" }
]

[observability]
enabled = true

[vars]
FORWARD_EMAIL = "{{ forwardEmail }}"
