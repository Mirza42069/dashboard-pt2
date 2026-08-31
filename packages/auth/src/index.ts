import { createAuthInstance } from "./factory";

export function createAuth() {
  return createAuthInstance();
}

export const auth = createAuth();
