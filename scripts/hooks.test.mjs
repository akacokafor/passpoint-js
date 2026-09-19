import assert from "node:assert/strict";
import { test } from "node:test";
import { PasspointPop, buildInitializePayload, createCheckoutSession, resolveCheckoutFrameSrc } from "../dist/index.js";

const origin = "https://pay.example.com";

function baseOpts(extra = {}) {
  return {
    key: "pk_test_123",
    email: "buyer@example.com",
    amount: 500000,
    currency: "NGN",
    ref: "PSK_FIXED",
    channels: ["card", "momo"],
    metadata: { orderId: "ord_1" },
    firstName: "Ada",
    lastName: "Lovelace",
    phone: "+2348000000000",
    label: "Invoice 12",
    callbackUrl: "https://merchant.example/return",
    merchantName: "Robase",
    ...extra,
  };
}

function mockFetch(handler) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return handler(url, init);
  };
  return { fetchImpl, calls };
}

function jsonResponse(body) {
  return {
    json: async () => body,
  };
}

test("legacy origin path POSTs initialize and iframes /checkout/{accessCode}", async () => {
  const { fetchImpl, calls } = mockFetch(() =>
    jsonResponse({ data: { accessCode: "acc_legacy" } }),
  );
  const session = await createCheckoutSession(baseOpts(), origin, fetchImpl);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, origin + "/api/checkout/initialize");
  assert.equal(calls[0].init.method, "POST");
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    key: "pk_test_123",
    email: "buyer@example.com",
    amount: 500000,
    currency: "NGN",
    ref: "PSK_FIXED",
    channels: ["card", "momo"],
    metadata: { orderId: "ord_1" },
    firstName: "Ada",
    lastName: "Lovelace",
    phone: "+2348000000000",
    label: "Invoice 12",
    callbackUrl: "https://merchant.example/return",
    merchantName: "Robase",
  });
  assert.equal(session.accessCode, "acc_legacy");
  assert.equal(session.iframeSrc, origin + "/checkout/acc_legacy");
});

test("legacy origin path uses checkoutUrl hook after fetch", async () => {
  const { fetchImpl, calls } = mockFetch(() =>
    jsonResponse({ data: { accessCode: "acc_prefixed" } }),
  );
  const session = await createCheckoutSession(
    baseOpts({ checkoutUrl: (code) => `/passpoint/checkout/${code}` }),
    origin,
    fetchImpl,
  );
  assert.equal(calls.length, 1);
  assert.equal(session.iframeSrc, "/passpoint/checkout/acc_prefixed");
});

test("legacy origin path surfaces initialize errors", async () => {
  const { fetchImpl } = mockFetch(() => jsonResponse({ responseMessage: "bad key" }));
  await assert.rejects(
    () => createCheckoutSession(baseOpts(), origin, fetchImpl),
    /bad key/,
  );
});

test("initialize hook is called with the same body fields and skips fetch", async () => {
  const { fetchImpl, calls } = mockFetch(() => {
    throw new Error("fetch should not run when initialize is provided");
  });
  let received;
  const session = await createCheckoutSession(
    baseOpts({
      async initialize(payload) {
        received = payload;
        return { accessCode: "acc_hook" };
      },
    }),
    origin,
    fetchImpl,
  );
  assert.equal(calls.length, 0);
  assert.deepEqual(received, buildInitializePayload(baseOpts()));
  assert.equal(session.iframeSrc, origin + "/checkout/acc_hook");
});

test("initialize result.checkoutUrl wins over checkoutUrl hook and origin", async () => {
  const { fetchImpl, calls } = mockFetch(() => {
    throw new Error("fetch should not run");
  });
  const session = await createCheckoutSession(
    baseOpts({
      async initialize() {
        return {
          accessCode: "acc_result",
          checkoutUrl: "/passpoint/checkout/acc_result?src=result",
        };
      },
      checkoutUrl: (code) => `/passpoint/checkout/${code}?src=hook`,
    }),
    origin,
    fetchImpl,
  );
  assert.equal(calls.length, 0);
  assert.equal(session.iframeSrc, "/passpoint/checkout/acc_result?src=result");
});

test("checkoutUrl hook is used when initialize omits checkoutUrl", async () => {
  const session = await createCheckoutSession(
    baseOpts({
      async initialize() {
        return { accessCode: "acc_merchant" };
      },
      checkoutUrl: (code) => `/passpoint/checkout/${code}`,
    }),
    origin,
    async () => {
      throw new Error("fetch should not run");
    },
  );
  assert.equal(session.iframeSrc, "/passpoint/checkout/acc_merchant");
});

test("initialize hook without accessCode throws", async () => {
  await assert.rejects(
    () =>
      createCheckoutSession(
        baseOpts({
          async initialize() {
            return {};
          },
        }),
        origin,
        async () => {
          throw new Error("fetch should not run");
        },
      ),
    /Unable to initialize Passpoint checkout/,
  );
});

test("resolveCheckoutFrameSrc prefers result, then hook, then origin", () => {
  assert.equal(
    resolveCheckoutFrameSrc(origin, "acc", "https://app.example/passpoint/checkout/acc", (code) => `/x/${code}`),
    "https://app.example/passpoint/checkout/acc",
  );
  assert.equal(
    resolveCheckoutFrameSrc(origin, "acc", undefined, (code) => `/passpoint/checkout/${code}`),
    "/passpoint/checkout/acc",
  );
  assert.equal(resolveCheckoutFrameSrc(origin, "acc"), origin + "/checkout/acc");
});

test("buildInitializePayload maps callback_url and reference aliases", () => {
  const payload = buildInitializePayload({
    key: "pk",
    email: "a@b.c",
    amount: 1,
    reference: "ref_alias",
    callback_url: "https://cb.example",
  });
  assert.equal(payload.ref, "ref_alias");
  assert.equal(payload.callbackUrl, "https://cb.example");
  assert.equal(payload.currency, "NGN");
});

function installDom(locationOrigin = "https://shop.example") {
  class FakeElement {
    constructor(tagName) {
      this.tagName = tagName;
      this.style = {};
      this.children = [];
      this.id = "";
      this.src = "";
      this.onclick = null;
      this._html = "";
      this._iframe = null;
      this._backdrop = null;
    }
    set innerHTML(html) {
      this._html = html;
      this._iframe = Object.setPrototypeOf(new FakeElement("IFRAME"), HTMLIFrameElement.prototype);
      this._backdrop = Object.setPrototypeOf(new FakeElement("DIV"), HTMLElement.prototype);
    }
    get innerHTML() {
      return this._html;
    }
    querySelector(sel) {
      if (sel === "iframe") return this._iframe;
      if (sel === "[data-pp-backdrop]") return this._backdrop;
      return null;
    }
    appendChild(node) {
      this.children.push(node);
      return node;
    }
  }

  class HTMLElement extends FakeElement {}
  class HTMLDivElement extends HTMLElement {}
  class HTMLIFrameElement extends HTMLElement {}

  const byId = new Map();
  const body = new HTMLElement("BODY");
  const document = {
    body,
    getElementById(id) {
      return byId.get(id) ?? null;
    },
    createElement(tag) {
      const el = tag === "div" ? new HTMLDivElement("DIV") : new HTMLElement(String(tag).toUpperCase());
      Object.defineProperty(el, "id", {
        configurable: true,
        get() {
          return this._id || "";
        },
        set(value) {
          this._id = value;
          if (value) byId.set(value, el);
        },
      });
      return el;
    },
  };

  globalThis.HTMLElement = HTMLElement;
  globalThis.HTMLDivElement = HTMLDivElement;
  globalThis.HTMLIFrameElement = HTMLIFrameElement;
  globalThis.document = document;
  globalThis.window = {
    location: { origin: locationOrigin },
    addEventListener() {},
    removeEventListener() {},
  };
  return { document };
}

test("PasspointPop.openIframe uses hook checkout URL and does not fetch origin", async () => {
  installDom();
  const fetches = [];
  globalThis.fetch = async (url) => {
    fetches.push(url);
    throw new Error("origin fetch should not run");
  };

  const pop = PasspointPop.setup({
    ...baseOpts({
      origin,
      async initialize() {
        return { accessCode: "acc_iframe", checkoutUrl: "/passpoint/checkout/acc_iframe" };
      },
    }),
  });
  await pop.openIframe();

  assert.equal(fetches.length, 0);
  const root = document.getElementById("passpoint-js-root");
  const iframe = root.querySelector("iframe");
  assert.equal(iframe.src, "/passpoint/checkout/acc_iframe");
  assert.equal(root.style.display, "block");
});

test("PasspointPop.openIframe uses legacy origin initialize + checkout paths", async () => {
  installDom();
  const fetches = [];
  globalThis.fetch = async (url, init) => {
    fetches.push({ url, init });
    return jsonResponse({ data: { accessCode: "acc_origin" } });
  };

  await PasspointPop.setup({
    ...baseOpts({ origin }),
  }).openIframe();

  assert.equal(fetches.length, 1);
  assert.equal(fetches[0].url, origin + "/api/checkout/initialize");
  const iframe = document.getElementById("passpoint-js-root").querySelector("iframe");
  assert.equal(iframe.src, origin + "/checkout/acc_origin");
});
