import type { ConnectorManifest } from '@enlazia/shared';
import { readableTextOn } from '../lib/format';
import { cx } from './ui';

function initials(name: string): string {
  const words = name.replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? `${words[0]![0]}${words[1]![0]}` : name.slice(0, 2);
  return letters.toUpperCase();
}

export function ConnectorAvatar({ connector, size = 'md' }: { connector: Pick<ConnectorManifest, 'name' | 'color'>; size?: 'sm' | 'md' }) {
  const color = connector.color ?? '#1b2640';
  return (
    <div
      aria-hidden
      className={cx(
        'flex shrink-0 items-center justify-center rounded-lg font-mono font-semibold',
        size === 'sm' ? 'size-8 text-xs' : 'size-10 text-sm',
      )}
      style={{ backgroundColor: color, color: readableTextOn(color) }}
    >
      {initials(connector.name)}
    </div>
  );
}
