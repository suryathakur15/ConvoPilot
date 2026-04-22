import { TAG_CONFIG } from '@/constants/tags.js';

export default function TagChip({ tag }) {
  const config = TAG_CONFIG[tag] || TAG_CONFIG.general;
  return (
    <span className={`badge ${config.color}`}>
      {config.label}
    </span>
  );
}
