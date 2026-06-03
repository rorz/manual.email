#!/usr/bin/env bash
# Send the sample message to a locally-running ingress Worker, twice, to prove
# the queue consumer dedupes the redelivery. Run `bun --filter @manual.email/ingress dev`
# first, then: ./apps/ingress/test/send.sh
set -euo pipefail
PORT="${PORT:-10130}"
EML="$(dirname "$0")/sample.eml"
for i in 1 2; do
  echo "--- POST #$i"
  curl -fsS --request POST "http://localhost:${PORT}/cdn-cgi/handler/email" \
    --url-query 'from=sender@example.com' \
    --url-query 'to=hello@manual.email' \
    --header 'Content-Type: message/rfc822' \
    --data-binary "@${EML}"
  echo
done
echo "Both delivered. The consumer should have processed message 1 and skipped 2."
