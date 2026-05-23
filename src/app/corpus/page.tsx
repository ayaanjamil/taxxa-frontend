import { CORPUS_GROUPS } from '@/mock-data/corpus';

const COLOR_VAR: Record<string, string> = {
  blue:   'var(--tx-blue)',
  green:  'var(--tx-green)',
  orange: 'var(--tx-orange)',
};

export default function CorpusPage() {
  return (
    <div style={{ padding: '32px', maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24, color: 'var(--tx-text)' }}>
        Corpus
      </h1>
      {CORPUS_GROUPS.map((group) => (
        <div key={group.id} style={{ marginBottom: 28 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            marginBottom: 12, paddingBottom: 8,
            borderBottom: '1px solid var(--tx-border-faint)',
          }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: COLOR_VAR[group.color], flexShrink: 0 }} />
            <span style={{ fontWeight: 500, color: 'var(--tx-text)', fontSize: 14 }}>{group.label}</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--tx-text-3)', fontFamily: 'var(--font-jetbrains-mono)' }}>
              {group.count} documents
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {group.children.map((child) => (
              <div key={child.name} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', borderRadius: 6,
                background: 'var(--tx-bg-raised)', border: '1px solid var(--tx-border-faint)',
              }}>
                <div style={{ width: 5, height: 5, borderRadius: 1.5, background: COLOR_VAR[child.color], flexShrink: 0 }} />
                <span style={{ fontWeight: 500, color: 'var(--tx-text)', fontSize: 13 }}>{child.name}</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--tx-text-3)', fontFamily: 'var(--font-jetbrains-mono)' }}>
                  {child.detail}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
