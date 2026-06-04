# Sandbox image for running inbound filter programs under bun.
# Base provides the Sandbox control server (+ Node 20); we add bun so both the
# managed program and untrusted custom programs run with `bun`.
FROM docker.io/cloudflare/sandbox:0.11.0

RUN npm install -g bun
