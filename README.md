# passpoint.js

Paystack-style collection SDK for [Passpoint](https://docs.dev.mypasspoint.com/). Drop `PasspointPop` into a page, pass a public key, and collect cards, mobile money, virtual accounts, and Open Banking.

The widget never sees merchant secrets. It opens a checkout session against **your** Passpoint checkout host.

| Package | Repo |
| --- | --- |
| Browser widget | this repo (`passpoint.js` on npm) |
| Go backend | [`akacokafor/passpoint-go`](https://github.com/akacokafor/passpoint-go) |
| Checkout host | [`akacokafor/passpoint.js`](https://github.com/akacokafor/passpoint.js) (private) · live [passpoint-js.vercel.app](https://passpoint-js.vercel.app) |

## Install from npm

```bash
npm install passpoint.js
```

```js
import { PasspointPop } from "passpoint.js";

const pop = new PasspointPop();
pop.newTransaction({
  key: "pk_live_your_public_key",
  email: "customer@email.com",
  amount: 500000, // kobo — ₦5,000.00
  currency: "NGN",
  channels: ["card", "momo", "bank", "open_banking"],
  origin: "https://pay.yourdomain.com", // checkout host; omit on same origin
  onSuccess(txn) {
    // UX only — verify on your server (see passpoint-go)
    console.log(txn.reference);
  },
  onCancel() {},
});
```

CommonJS:

```js
const { PasspointPop } = require("passpoint.js");
```

## Install from a CDN (npmcdn / unpkg / jsDelivr)

Pin a version in production.

```html
<script src="https://unpkg.com/passpoint.js@0.2.0/dist/passpoint.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/passpoint.js@0.2.0/dist/passpoint.min.js"></script>
<script src="https://npmcdn.com/passpoint.js@0.2.0/dist/passpoint.min.js"></script>
```

Shorthand (`"unpkg"` / `"jsdelivr"` fields):

```html
<script src="https://unpkg.com/passpoint.js@0.2.0"></script>
```

## `origin`

When you omit the hooks below, the SDK posts to `{origin}/api/checkout/initialize` and iframes `{origin}/checkout/{accessCode}`.

| How you load the SDK | `origin` |
| --- | --- |
| Script hosted on the same checkout app | omit — defaults to the current site |
| `npm install` or CDN on a merchant site | **required** — set it to your checkout host |

Hosted demo origin: `https://passpoint-js.vercel.app`

## Integrator hooks

Merchants who already host checkout on their own origin can own initialize and the iframe URL. The SDK stays generic — prefix the routes however you like.

Iframe `src` is `initialize`'s `checkoutUrl` if returned, otherwise `checkoutUrl(accessCode)` if provided, otherwise `{origin}/checkout/{accessCode}`.

```js
import { PasspointPop } from "passpoint.js";

new PasspointPop().newTransaction({
  key: "pk_live_your_public_key",
  email: "customer@email.com",
  amount: 500000,
  currency: "NGN",
  async initialize(payload) {
    // payload is the same body the SDK would POST to /api/checkout/initialize
    const res = await fetch("/internal/billing/passpoint/initialize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const { accessCode } = await res.json();
    return { accessCode };
  },
  checkoutUrl: (accessCode) => `/passpoint/checkout/${accessCode}`,
  onSuccess(txn) {
    console.log(txn.reference);
  },
});
```

`initialize` may also return the iframe URL directly:

```js
async initialize(payload) {
  const { accessCode } = await createSession(payload);
  return { accessCode, checkoutUrl: `/passpoint/checkout/${accessCode}` };
}
```

If `initialize` is omitted, the SDK still POSTs to `{origin}/api/checkout/initialize`.

## Paystack-compatible API

v2:

```js
new PasspointPop().newTransaction({ key, email, amount, onSuccess, onCancel });
```

v1:

```js
const handler = PasspointPop.setup({ key, email, amount, callback, onClose });
handler.openIframe();
```

`amount` is the smallest currency unit. Paystack channel aliases (`bank_transfer`, `mobile_money`, `ussd`) are accepted.

`onSuccess` is not settlement. Verify on a backend with [`passpoint-go`](https://github.com/akacokafor/passpoint-go) or `GET {origin}/api/checkout/verify/{ref}`.

## Build

```bash
npm install
npm run build
npm test
```

## License

MIT
