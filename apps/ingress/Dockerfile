# Sandbox image for running inbound filter programs under bun.
# Base provides the Sandbox control server (+ Node 20); we add bun so both the
# managed program and untrusted custom programs run with `bun`.
FROM docker.io/cloudflare/sandbox:0.11.0

RUN npm install -g bun

WORKDIR /work
RUN bun init -y && bun add ai@6.0.196 @ai-sdk/google@3.0.80 zod@4.4.3
