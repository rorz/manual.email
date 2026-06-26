/** oRPC contract for the mail pipeline. The contract is the source of truth;
 *  worker queue payload types are inferred from it. */

import { type InferContractRouterInputs, oc } from "@orpc/contract";
import {
  ackSchema,
  inboundMessageSchema,
  outboundMessageSchema,
} from "./schema";

export const contract = {
  egress: { send: oc.input(outboundMessageSchema).output(ackSchema) },
  ingress: { accept: oc.input(inboundMessageSchema).output(ackSchema) },
};

type Inputs = InferContractRouterInputs<typeof contract>;

/** Payload on the `manual-email-ingress` queue. */
export type IngressMessage = Inputs["ingress"]["accept"];

/** Payload on the `manual-email-egress` queue. */
export type EgressMessage = Inputs["egress"]["send"];
