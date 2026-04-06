import { DeptStat, CollegeInfo, COLLEGES } from '../utils/colorMap';

interface LegendProps {
  items: DeptStat[];
  highlightedDept: string | null;
  onHighlight: (dept: string | null) => void;
}

export function Legend({ items, highlightedDept, onHighlight }: LegendProps) {
  // Group items by college prefix, preserving the COLLEGES order
  const byCollege = new Map<string, DeptStat[]>();
  for (const item of items) {
    const list = byCollege.get(item.college) ?? [];
    list.push(item);
    byCollege.set(item.college, list);
  }

  const hasFilter = highlightedDept !== null;

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '4px 20px',
      padding: '8px 16px',
      background: '#f5f5f7',
      borderBottom: '1px solid #d0d0d8',
      alignItems: 'flex-start',
    }}>
      {COLLEGES.map((college: CollegeInfo) => {
        const depts = byCollege.get(college.prefix);
        if (!depts || depts.length === 0) return null;
        return (
          <div key={college.prefix} style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
            {/* College label */}
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#fff',
              background: college.headerColor,
              padding: '2px 6px',
              borderRadius: 3,
              whiteSpace: 'nowrap',
              letterSpacing: '0.03em',
            }}>
              {college.prefix}
            </span>

            {/* Department chips */}
            {depts.map(({ dept, count, color }) => {
              const isHighlighted = highlightedDept === dept;
              const isDimmed = hasFilter && !isHighlighted;
              return (
                <button
                  key={dept}
                  onClick={() => onHighlight(isHighlighted ? null : dept)}
                  title={`${dept} — ${count} project${count !== 1 ? 's' : ''}. Click to ${isHighlighted ? 'clear' : 'highlight'}.`}
                  aria-pressed={isHighlighted}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '2px 7px',
                    borderRadius: 4,
                    border: isHighlighted ? '2px solid #333' : '1px solid rgba(0,0,0,0.2)',
                    background: color.bg,
                    cursor: 'pointer',
                    opacity: isDimmed ? 0.35 : 1,
                    fontFamily: 'inherit',
                    fontSize: 11,
                    color: color.text,
                    transition: 'opacity 0.15s, border-color 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {dept}
                  <span style={{ opacity: 0.65 }}>({count})</span>
                </button>
              );
            })}
          </div>
        );
      })}

      {hasFilter && (
        <button
          onClick={() => onHighlight(null)}
          style={{
            alignSelf: 'center',
            padding: '2px 8px',
            borderRadius: 4,
            border: '1px solid #bbb',
            background: '#e8e8e8',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: 11,
            color: '#555',
          }}
        >
          Clear
        </button>
      )}
    </div>
  );
}
