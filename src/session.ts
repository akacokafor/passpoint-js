import type {
  PasspointInitializePayload,
  PasspointInitializeResult,
  PasspointPopOptions,
} from "./types";

type InitializeResponse = {
  data?: { accessCode: string };
  responseMessage?: string;
};

export function randomRef() {
  return "PSK_" + Math.random().toString(36).slice(2, 12).toUpperCase();
}

export function checkoutHost(origin: string | undefined, fallback: string): string {
  return (origin || fallback).replace(/\/$/, "");
}

export function buildInitializePayload(opts: PasspointPopOptions): PasspointInitializePayload {
  return {
    key: opts.key,
    email: opts.email,
    amount: opts.amount,
    currency: opts.currency || "NGN",
    ref: opts.ref || opts.reference || randomRef(),
    channels: opts.channels,
    metadata: opts.metadata,
    firstName: opts.firstName,
    lastName: opts.lastName,
    phone: opts.phone,
    label: opts.label,
    callbackUrl: opts.callback_url || opts.callbackUrl,
    merchantName: opts.merchantName,
  };
}

export function resolveCheckoutFrameSrc(
  origin: string,
  accessCode: string,
  resultCheckoutUrl?: string,
  checkoutUrl?: (accessCode: string) => string,
): string {
  if (resultCheckoutUrl) return resultCheckoutUrl;
  if (checkoutUrl) return checkoutUrl(accessCode);
  return origin + "/checkout/" + accessCode;
}

export async function createCheckoutSession(
  opts: PasspointPopOptions,
  origin: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ accessCode: string; iframeSrc: string }> {
  const payload = buildInitializePayload(opts);
  const result = await initializeCheckout(opts, payload, origin, fetchImpl);
  return {
    accessCode: result.accessCode,
    iframeSrc: resolveCheckoutFrameSrc(origin, result.accessCode, result.checkoutUrl, opts.checkoutUrl),
  };
}

async function initializeCheckout(
  opts: PasspointPopOptions,
  payload: PasspointInitializePayload,
  origin: string,
  fetchImpl: typeof fetch,
): Promise<PasspointInitializeResult> {
  if (opts.initialize) {
    const result = await opts.initialize(payload);
    if (!result?.accessCode) {
      throw new Error("Unable to initialize Passpoint checkout");
    }
    return result;
  }

  const res = await fetchImpl(origin + "/api/checkout/initialize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = (await res.json()) as InitializeResponse;
  if (!json.data?.accessCode) {
    throw new Error(json.responseMessage || "Unable to initialize Passpoint checkout");
  }
  return { accessCode: json.data.accessCode };
}
