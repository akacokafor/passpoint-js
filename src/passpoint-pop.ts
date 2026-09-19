import { checkoutHost, createCheckoutSession } from "./session";
import type { PasspointPopOptions, TransactionResult } from "./types";

const SOURCE = "passpoint";

type CheckoutEvent =
  | { source: string; event: "success"; data: TransactionResult }
  | { source: string; event: "cancel" | "close" };

function ensureOverlay(): HTMLDivElement {
  const existing = document.getElementById("passpoint-js-root");
  if (existing instanceof HTMLDivElement) return existing;

  const root = document.createElement("div");
  root.id = "passpoint-js-root";
  Object.assign(root.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483000",
    display: "none",
  });
  root.innerHTML = `
      <div data-pp-backdrop style="position:absolute;inset:0;background:rgba(22,18,24,.5)"></div>
      <div data-pp-frame style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:16px">
        <iframe title="Passpoint checkout" allow="payment" style="width:min(440px,100%);height:min(720px,92dvh);border:0;border-radius:18px;background:#fffdfa;box-shadow:0 24px 80px -32px rgba(22,18,24,.45)"></iframe>
      </div>`;
  document.body.appendChild(root);
  return root;
}

export class PasspointPop {
  private opts: PasspointPopOptions | null = null;

  static setup(options: PasspointPopOptions): PasspointPop {
    const pop = new PasspointPop();
    pop.opts = options;
    return pop;
  }

  newTransaction(options: PasspointPopOptions): void {
    this.opts = options;
    void this.openIframe();
  }

  async openIframe(): Promise<void> {
    const opts = this.opts;
    if (!opts) throw new Error("PasspointPop: call setup() or newTransaction() first");
    const origin = checkoutHost(opts.origin, window.location.origin);
    const session = await createCheckoutSession(opts, origin);
    const root = ensureOverlay();
    const iframe = root.querySelector("iframe");
    const backdrop = root.querySelector("[data-pp-backdrop]");
    if (!(iframe instanceof HTMLIFrameElement)) {
      throw new Error("PasspointPop: checkout frame missing");
    }
    iframe.src = session.iframeSrc;
    root.style.display = "block";
    document.body.style.overflow = "hidden";
    window.addEventListener("message", this.onMessage);
    if (backdrop instanceof HTMLElement) {
      backdrop.onclick = () => this.close("cancel");
    }
    opts.onLoad?.();
  }

  private onMessage = (event: MessageEvent<CheckoutEvent>): void => {
    const data = event.data;
    if (!data || data.source !== SOURCE) return;
    if (data.event === "success") {
      this.opts?.onSuccess?.(data.data);
      this.opts?.callback?.(data.data);
      this.teardown();
    }
    if (data.event === "cancel") this.close("cancel");
    if (data.event === "close") this.close("close");
  }

  private close(kind: "cancel" | "close"): void {
    if (kind === "cancel") this.opts?.onCancel?.();
    this.opts?.onClose?.();
    this.teardown();
  }

  private teardown(): void {
    window.removeEventListener("message", this.onMessage);
    const root = document.getElementById("passpoint-js-root");
    if (root) root.style.display = "none";
    document.body.style.overflow = "";
  }
}
