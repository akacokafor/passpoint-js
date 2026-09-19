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
<script src="https://unpkg.com/passpoint.js@0.1.0/dist/passpoint.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/passpoint.js@0.1.0/dist/passpoint.min.js"></script>
<script src="https://npmcdn.com/passpoint.js@0.1.0/dist/passpoint.min.js"></script>
```

Shorthand (`"unpkg"` / `"jsdelivr"` fields):

```html
<script src="https://unpkg.com/passpoint.js@0.1.0"></script>
```

## `origin`

The SDK posts to `{origin}/api/checkout/initialize` and iframes `{origin}/checkout/{accessCode}`.

| How you load the SDK | `origin` |
| --- | --- |
| Script hosted on the same checkout app | omit — defaults to the current site |
| `npm install` or CDN on a merchant site | **required** — set it to your checkout host |

Hosted demo origin: `https://passpoint-js.vercel.app`

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
