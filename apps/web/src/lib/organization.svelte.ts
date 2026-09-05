import { createContext } from 'svelte';

export type OrganizationState = {
  organization: any | null;
  membership: any | null;
  isLoading: boolean;
  error: string;
  signingOut: boolean;
};

export const [getOrganization, setOrganization] = createContext<OrganizationState>();
