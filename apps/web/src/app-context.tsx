import type { ConnectorManifest, Meta } from '@enlazia/shared';
import { createContext, useContext } from 'react';

export type AppContextValue = {
  meta: Meta;
  connectors: ConnectorManifest[];
  connectorById: Map<string, ConnectorManifest>;
  refreshMeta: () => Promise<void>;
};

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside AppContext');
  return value;
}

export const LINKS = {
  repo: 'https://github.com/CharlyDesigner/enlazia',
  contributing: 'https://github.com/CharlyDesigner/enlazia/blob/main/CONTRIBUTING.md',
  connectorGuide: 'https://github.com/CharlyDesigner/enlazia/blob/main/docs/connectors.md',
  author: 'https://carlosnavarro.site',
} as const;
