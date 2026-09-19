import { PasspointPop } from "./passpoint-pop";

const g = globalThis as typeof globalThis & { PasspointPop?: typeof PasspointPop };
g.PasspointPop = PasspointPop;
