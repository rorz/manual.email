import { expect, test } from "bun:test";
import { extractBodies } from "../src/filter/body";

const bytes = (message: string): ArrayBuffer =>
  new TextEncoder().encode(message).buffer;

test("extracts plain text and decoded HTML bodies", async () => {
  const result = await extractBodies(
    bytes(`From: sender@example.com
To: hello@manual.email
Subject: Multipart
MIME-Version: 1.0
Content-Type: multipart/alternative; boundary="part"

--part
Content-Type: text/plain; charset="utf-8"

Plain copy
--part
Content-Type: text/html; charset="utf-8"

<main><strong>HTML copy</strong></main>
--part--`),
  );

  expect(result.body.trim()).toBe("Plain copy");
  expect(result.html?.trim()).toBe("<main><strong>HTML copy</strong></main>");
});

test("falls back to stripped text for HTML-only mail", async () => {
  const result = await extractBodies(
    bytes(`From: sender@example.com
To: hello@manual.email
Subject: HTML only
Content-Type: text/html; charset="utf-8"

<style>.x { color: red; }</style><p>HTML only copy</p>`),
  );

  expect(result.body).toBe("HTML only copy");
  expect(result.html?.trim()).toBe(
    "<style>.x { color: red; }</style><p>HTML only copy</p>",
  );
});
