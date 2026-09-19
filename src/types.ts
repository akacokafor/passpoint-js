export const CHANNELS = ["card", "momo", "bank", "open_banking"] as const;
export type Channel = (typeof CHANNELS)[number];

export type TransactionResult = {
  status: "success" | "failed";
  providerStatus?: "NEW" | "PENDING" | "PROCESSING" | "SUCCESSFUL" | "FAILED";
  reference: string;
  transactionId: string;
  message: string;
  channel: Channel;
  amount: number;
  currency: string;
  paidAt?: string;
  gatewayResponse?: string;
};

export type PasspointPopOptions = {
  key: string;
  email: string;
  /** Amount in the smallest currency unit (kobo, pesewas, cents). */
  amount: number;
  currency?: string;
  ref?: string;
  reference?: string;
  channels?: string[];
  metadata?: Record<string, unknown>;
  firstName?: string;
  lastName?: string;
  phone?: string;
  label?: string;
  callback_url?: string;
  callbackUrl?: string;
  merchantName?: string;
  /**
   * Host of the Passpoint checkout app (scheme + host, no trailing slash).
   * Defaults to `window.location.origin`. Set this when the script is loaded
   * from a CDN on a different site.
   */
  origin?: string;
  onSuccess?: (transaction: TransactionResult) => void;
  onCancel?: () => void;
  onClose?: () => void;
  onLoad?: () => void;
  callback?: (response: TransactionResult) => void;
};
