import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAdmin } from '../contexts/AdminContext';

const PAD = 10;

interface TutorialStep {
  section: string;
  title: string;
  desc: string;
  targetId?: string;
  adminOnly?: boolean;
}

const ALL_STEPS: TutorialStep[] = [
  // ── Navigating ──────────────────────────────────────────────────────────────
  {
    section: 'Navigating the table map',
    title: 'Color-coded blocks',
    desc: 'Each block represents one project. Color indicates the primary author\'s department, grouped by college (AHE, ASC, ENG, etc.). The legend at the bottom of the map shows each department\'s color.',
    targetId: 'table-map-root',
  },
  {
    section: 'Navigating the table map',
    title: 'Click to open details',
    desc: 'Click any block to open a side panel with full project info — title, authors, advisor, classification, and abstract. Click the same block again or press × to close.',
    targetId: 'table-map-root',
  },
  {
    section: 'Navigating the table map',
    title: 'Hover tooltip',
    desc: 'Hovering a block shows the project title and co-author list in a floating tooltip without opening the full detail panel.',
    targetId: 'table-map-root',
  },
  {
    section: 'Navigating the table map',
    title: 'Keyboard navigation',
    desc: 'Blocks are focusable via Tab. Press Enter or Space on a focused block to open its detail panel — no mouse required.',
    targetId: 'table-map-root',
  },
  {
    section: 'Navigating the table map',
    title: 'Table layout direction',
    desc: 'Rows snake left-to-right then right-to-left. Small arrows in the center gap indicate direction for each row pair, mirroring the physical room layout.',
    targetId: 'table-map-root',
  },
  // ── Searching ───────────────────────────────────────────────────────────────
  {
    section: 'Searching',
    title: 'Search by Author',
    desc: 'Type a name into the "Search by Author" field. Matching names appear as suggestions — selecting one dims all non-matching projects so you can instantly spot a specific presenter.',
    targetId: 'author-search',
  },
  {
    section: 'Searching',
    title: 'Search by Advisor',
    desc: 'Works the same as author search but filters by faculty advisor name. Both searches can be active simultaneously to narrow results further.',
    targetId: 'advisor-search',
  },
  {
    section: 'Searching',
    title: 'Clearing a search',
    desc: 'Press the × button inside a search field to clear it, or delete the text manually. An active search is indicated by a brighter border on the input.',
    targetId: 'author-search',
  },
  // ── Filters ─────────────────────────────────────────────────────────────────
  {
    section: 'Filters',
    title: 'Filters panel',
    desc: 'Click Filters to open the filter panel. An orange dot on the button means at least one filter is active. Use "Clear all" inside the panel to reset everything at once.',
    targetId: 'filter-toggle-btn',
  },
  {
    section: 'Filters',
    title: 'Department & College',
    desc: 'Filter by the primary author\'s department — chips are grouped by college with a colored header label. Or select a whole college to filter all its departments at once.',
    targetId: 'filter-toggle-btn',
  },
  {
    section: 'Filters',
    title: 'Project type & Classification',
    desc: 'Narrow by project format (poster, oral, etc.) or by the primary author\'s academic level (undergraduate, graduate, etc.).',
    targetId: 'filter-toggle-btn',
  },
  {
    section: 'Filters',
    title: 'Highlight toggles',
    desc: 'Toggle-style flags for Publication Consent, Use of AI, Human Subjects (IRB), and Animal Subjects (IACUC). Non-matching blocks are dimmed rather than hidden, preserving spatial context.',
    targetId: 'filter-toggle-btn',
  },
  {
    section: 'Filters',
    title: 'IRB / IACUC labels on blocks',
    desc: 'When the Human or Animal Subjects toggles are active, matching blocks display a small "IRB" or "IACUC" label at the bottom of the block for quick visual reference.',
    targetId: 'table-map-root',
  },
  {
    section: 'Filters',
    title: 'AI details in tooltip',
    desc: 'When the Use of AI toggle is active, hovering a matching block also shows the project\'s AI use description in the tooltip alongside the title and author list.',
    targetId: 'table-map-root',
  },
  // ── Admin ───────────────────────────────────────────────────────────────────
  {
    section: 'Admin mode',
    title: 'Unlocking Admin mode',
    desc: 'Click the RCIS logo to begin listening, then enter the secret key sequence. Once unlocked, an Admin button appears in the header. Use "Exit Admin Mode" inside the panel to lock it again.',
    targetId: 'header-logo-btn',
    adminOnly: true,
  },
  {
    section: 'Admin mode',
    title: 'Faculty advisor load report',
    desc: 'A horizontal bar chart of all advisors in the current view, sorted by project count. Bar color reflects the advisor\'s majority college. Hover a row to see that advisor\'s project list.',
    targetId: 'admin-btn',
    adminOnly: true,
  },
  {
    section: 'Admin mode',
    title: 'Mass email tools',
    desc: 'Collects all unique author emails from the current view. "Copy all emails" puts them on your clipboard semicolon-delimited. For lists of 50 or fewer, "Open in mail client" builds a mailto: link.',
    targetId: 'admin-btn',
    adminOnly: true,
  },
  {
    section: 'Admin mode',
    title: 'Stats panel',
    desc: 'Shows flag counts (IRB, IACUC, AI use, publication consent) as percentage pills, a pie chart by project type, and a bar list by classification — all scoped to the current filtered view.',
    targetId: 'admin-btn',
    adminOnly: true,
  },
  {
    section: 'Admin mode',
    title: 'Per-author email chips',
    desc: 'In the detail panel, author and advisor names become clickable chips. Clicking opens a small popup to copy an individual\'s email address or open a compose window directly.',
    adminOnly: true,
  },
  {
    section: 'Admin mode',
    title: 'IRB / IACUC numbers on blocks',
    desc: 'When Human or Animal Subjects toggles are active, blocks show the full IRB or IACUC approval number (not just the label) for quicker cross-reference while reviewing.',
    targetId: 'table-map-root',
    adminOnly: true,
  },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function TutorialModal({ isOpen, onClose }: Props) {
  const isAdmin = useAdmin();
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const visibleSteps = ALL_STEPS.filter(s => !s.adminOnly || isAdmin);
  const current = visibleSteps[step] ?? visibleSteps[0];
  const totalSteps = visibleSteps.length;
  const isAdminSection = current?.section === 'Admin mode';

  // Reset to step 0 each time modal opens
  useEffect(() => {
    if (isOpen) setStep(0);
  }, [isOpen]);

  // Update spotlight target rect whenever step or open state changes
  useEffect(() => {
    if (!isOpen || !current?.targetId) {
      setTargetRect(null);
      return;
    }
    const el = document.getElementById(current.targetId);
    setTargetRect(el ? el.getBoundingClientRect() : null);
  }, [isOpen, step, current?.targetId]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowRight' && step < totalSteps - 1) setStep(s => s + 1);
      if (e.key === 'ArrowLeft' && step > 0) setStep(s => s - 1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, step, totalSteps, onClose]);

  if (!isOpen) return null;

  const accentColor = isAdminSection ? '#d4920c' : '#4b2e83';
  const accentRgb = isAdminSection ? '212,146,12' : '75,46,131';

  return createPortal(
    <>
      {/* ── Dark overlay with spotlight cutout ──────────────────────────────── */}
      <svg
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0,
          width: '100%', height: '100%',
          zIndex: 9050,
          pointerEvents: 'all',
        }}
      >
        {targetRect ? (
          <>
            <defs>
              <mask id="tut-spotlight-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect
                  style={{
                    x: targetRect.left - PAD,
                    y: targetRect.top - PAD,
                    width: targetRect.width + PAD * 2,
                    height: targetRect.height + PAD * 2,
                    transition: 'x 0.32s ease, y 0.32s ease, width 0.32s ease, height 0.32s ease',
                  } as React.CSSProperties}
                  rx="10"
                  fill="black"
                />
              </mask>
            </defs>
            <rect width="100%" height="100%" fill="rgba(0,0,0,0.7)" mask="url(#tut-spotlight-mask)" />
          </>
        ) : (
          <rect width="100%" height="100%" fill="rgba(0,0,0,0.55)" />
        )}
      </svg>

      {/* ── Glow ring around highlighted element ────────────────────────────── */}
      {targetRect && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            left: targetRect.left - PAD,
            top: targetRect.top - PAD,
            width: targetRect.width + PAD * 2,
            height: targetRect.height + PAD * 2,
            borderRadius: 10,
            border: `2px solid rgba(${accentRgb},0.85)`,
            boxShadow: `0 0 20px 4px rgba(${accentRgb},0.35), inset 0 0 12px rgba(${accentRgb},0.1)`,
            pointerEvents: 'none',
            zIndex: 9060,
            transition: 'left 0.32s ease, top 0.32s ease, width 0.32s ease, height 0.32s ease, border-color 0.25s, box-shadow 0.25s',
          }}
        />
      )}

      {/* ── Step card ───────────────────────────────────────────────────────── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Tutorial: ${current.title}`}
        style={{
          position: 'fixed',
          bottom: 28,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(480px, calc(100vw - 48px))',
          background: isAdminSection
            ? 'linear-gradient(160deg, #fffbf0 0%, #fef5dc 60%, #fdefd0 100%)'
            : 'linear-gradient(160deg, #ede9f8 0%, #e0daf0 60%, #d8d2ec 100%)',
          borderRadius: 14,
          border: `1px solid rgba(${accentRgb},0.2)`,
          boxShadow: '0 10px 48px rgba(20,8,60,0.3), 0 2px 10px rgba(0,0,0,0.12)',
          padding: '16px 20px 14px',
          zIndex: 9100,
          fontFamily: "'Nohemi', system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Top row: section badge + step dots + close */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 11 }}>
          <span style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            padding: '2px 8px',
            borderRadius: 10,
            background: `rgba(${accentRgb},0.1)`,
            color: isAdminSection ? '#7a5a00' : accentColor,
            flexShrink: 0,
          }}>
            {current.section}
          </span>

          {/* Progress dots */}
          <div style={{ display: 'flex', gap: 4, flex: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            {visibleSteps.map((s, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                aria-label={`Go to step ${i + 1}: ${s.title}`}
                style={{
                  width: i === step ? 16 : 6,
                  height: 6,
                  borderRadius: 3,
                  border: 'none',
                  background: i === step
                    ? accentColor
                    : i < step
                      ? `rgba(${accentRgb},0.35)`
                      : 'rgba(0,0,0,0.15)',
                  padding: 0,
                  cursor: 'pointer',
                  transition: 'width 0.2s ease, background 0.2s ease',
                  flexShrink: 0,
                }}
              />
            ))}
          </div>

          <button
            onClick={onClose}
            aria-label="Close tutorial"
            style={{
              background: 'none', border: 'none',
              cursor: 'pointer',
              color: '#9990b0',
              fontSize: 20, lineHeight: 1,
              padding: '0 2px',
              display: 'flex', alignItems: 'center',
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* Title */}
        <div style={{
          fontSize: 15,
          fontWeight: 600,
          color: '#1a1a2e',
          marginBottom: 7,
          letterSpacing: '0.01em',
        }}>
          {current.title}
        </div>

        {/* Description */}
        <div style={{
          fontSize: 13,
          color: '#4a4466',
          lineHeight: 1.62,
          marginBottom: 14,
        }}>
          {current.desc}
        </div>

        {/* Bottom row: step counter + nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: '#9990b0', letterSpacing: '0.02em' }}>
            {step + 1} / {totalSteps}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setStep(s => Math.max(0, s - 1))}
              disabled={step === 0}
              aria-label="Previous step"
              style={{
                height: 30, padding: '0 14px',
                borderRadius: 7,
                border: `1px solid rgba(${accentRgb},0.2)`,
                background: step === 0 ? 'rgba(0,0,0,0.04)' : `rgba(${accentRgb},0.08)`,
                color: step === 0 ? '#c0b8d0' : accentColor,
                cursor: step === 0 ? 'default' : 'pointer',
                fontSize: 12, fontWeight: 500,
                fontFamily: 'inherit',
                letterSpacing: '0.02em',
                transition: 'background 0.15s',
              }}
            >
              ← Prev
            </button>
            {step < totalSteps - 1 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                aria-label="Next step"
                style={{
                  height: 30, padding: '0 16px',
                  borderRadius: 7,
                  border: 'none',
                  background: accentColor,
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 12, fontWeight: 500,
                  fontFamily: 'inherit',
                  letterSpacing: '0.02em',
                  transition: 'opacity 0.15s',
                }}
              >
                Next →
              </button>
            ) : (
              <button
                onClick={onClose}
                style={{
                  height: 30, padding: '0 16px',
                  borderRadius: 7,
                  border: 'none',
                  background: accentColor,
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 12, fontWeight: 600,
                  fontFamily: 'inherit',
                  letterSpacing: '0.02em',
                }}
              >
                Done ✓
              </button>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
