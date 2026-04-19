/* Headless book visuals — pure props, no state.
   All the leather/paper/ribbon DOM from the main app, broken into
   small components you drive from animation scenes. */

const { useMemo } = React;

/* ===== Layout constants ===== */
const PAGE_W = 330;
const PAGE_H = 470;

function BookTilt({ tilt = 38, zoom = 1, rotateY = 0, children }) {
  return (
    <div className="stage">
      <div
        className="book-tilt"
        style={{
          transform: `rotateX(${tilt}deg) rotateY(${rotateY}deg) rotateZ(-0.5deg) scale(${zoom})`,
        }}
      >
        <div
          className="book"
          style={{
            width: PAGE_W * 2,
            height: PAGE_H,
            ['--page-w']: PAGE_W + 'px',
            ['--page-h']: PAGE_H + 'px',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/* ===== Closed book (for intro/outro) ===== */
function ClosedBook({ titleOpacity = 1 }) {
  return (
    <div
      className="closed-book"
      style={{
        position: 'relative',
        width: PAGE_W + 30,
        height: PAGE_H + 28,
        margin: '0 auto',
        borderRadius: '8px 14px 14px 8px',
        background:
          'linear-gradient(180deg, var(--leather-hi) 0%, var(--leather) 40%, var(--leather-dark) 100%)',
        boxShadow:
          'inset 0 0 0 2px rgba(0,0,0,0.4), inset 0 0 80px rgba(0,0,0,0.6), 0 40px 60px rgba(0,0,0,0.65)',
        transformStyle: 'preserve-3d',
      }}
    >
      {/* leather grain */}
      <div
        style={{
          position: 'absolute', inset: 8, borderRadius: 4,
          background:
            'repeating-radial-gradient(circle at 20% 30%, rgba(0,0,0,0.18) 0 2px, transparent 2px 5px),' +
            'repeating-radial-gradient(circle at 70% 80%, rgba(255,255,255,0.05) 0 1px, transparent 1px 4px),' +
            'repeating-linear-gradient(45deg, rgba(0,0,0,0.08) 0 3px, transparent 3px 7px)',
          opacity: 0.75,
          pointerEvents: 'none',
        }}
      />
      {/* gold border */}
      <div
        style={{
          position: 'absolute', inset: 14,
          border: '1.5px solid var(--gold-dark)',
          borderRadius: 3,
          boxShadow: 'inset 0 0 0 4px transparent, inset 0 0 0 5px var(--gold-dark)',
          pointerEvents: 'none',
        }}
      />
      {/* spine */}
      <div
        style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 10,
          background:
            'linear-gradient(90deg, var(--leather-dark) 0%, rgba(0,0,0,0.3) 40%, var(--leather) 100%)',
          borderRadius: '8px 0 0 8px',
          boxShadow: 'inset -2px 0 4px rgba(0,0,0,0.5)',
        }}
      />
      {/* title plate */}
      <div
        style={{
          position: 'absolute',
          top: '38%',
          left: 0, right: 0,
          textAlign: 'center',
          fontFamily: "'Cinzel', Georgia, serif",
          color: 'var(--gold-hi)',
          textShadow: '0 1px 0 rgba(0,0,0,0.6), 0 0 12px rgba(201,161,74,0.35)',
          letterSpacing: '0.4em',
          opacity: titleOpacity,
          pointerEvents: 'none',
        }}
      >
        <div style={{ fontSize: 11, marginBottom: 10, opacity: 0.7 }}>THE HOLY</div>
        <div style={{ fontSize: 34, fontWeight: 700 }}>BIBLE</div>
        <div style={{
          width: 120, height: 1, background: 'var(--gold-dark)',
          margin: '18px auto 14px',
        }} />
        <div style={{ fontSize: 9, opacity: 0.6, letterSpacing: '0.5em' }}>
          OLD · NEW TESTAMENT
        </div>
      </div>
      {/* page edges visible on closed book */}
      <div
        style={{
          position: 'absolute', right: -6, top: 10, bottom: 10, width: 8,
          background: 'repeating-linear-gradient(0deg, var(--paper-edge) 0 1px, var(--paper-shadow) 1px 2px, var(--paper-edge) 2px 3px)',
          borderRadius: '0 3px 3px 0',
          boxShadow: 'inset 0 0 6px rgba(0,0,0,0.4)',
        }}
      />
    </div>
  );
}

/* ===== Open book shell (base, edges, gutter) ===== */
function BookShell({ children }) {
  return (
    <>
      <div className="book-base" />
      <div className="page-edges" />
      <div className="spread">{children}</div>
      <div className="gutter" />
    </>
  );
}

/* ===== Page ===== */
function Page({ side, chapter, book, verses, pageNum }) {
  return (
    <div className={`page ${side}`}>
      <div className="page-inner">
        <div className="page-header">
          <span>{side === 'left' ? book : ''}</span>
          <span>{side === 'right' ? book : ''}</span>
        </div>
        {chapter && (
          <div style={{
            fontFamily: "'Cinzel', serif",
            textAlign: 'center',
            margin: '8px 0 18px',
            fontSize: 20,
            letterSpacing: '0.3em',
            color: 'var(--ink-soft)',
          }}>
            CHAPTER {chapter}
          </div>
        )}
        <div style={{
          columnCount: 1,
          fontSize: 13.5,
          lineHeight: 1.55,
          textAlign: 'justify',
          fontFamily: "'Cormorant Garamond', Georgia, serif",
        }}>
          {verses.map((v, i) => (
            <span key={i}>
              <sup style={{
                color: 'var(--rubric)',
                fontWeight: 700,
                fontFamily: "'Cinzel', serif",
                fontSize: 9,
                marginRight: 3,
              }}>{v.n}</sup>
              {v.t}{' '}
            </span>
          ))}
        </div>
        <div className="page-footer">
          <span>{pageNum}</span>
        </div>
      </div>
    </div>
  );
}

/* ===== Ribbon bookmark ===== */
function Ribbon({ offset = 0, length = 240, sway = 0 }) {
  /* offset = horizontal position as px from left of book.
     length = how far down it hangs. */
  return (
    <div
      className="ribbon"
      style={{
        left: offset,
        height: length,
        transform: `rotateZ(${sway}deg)`,
        transformOrigin: 'top center',
        transition: 'none',
      }}
    />
  );
}

/* ===== Thumb-index group tabs ===== */
const GROUPS = [
  { id: 'pentateuch', label: 'LAW', testament: 'ot' },
  { id: 'history',    label: 'HIST', testament: 'ot' },
  { id: 'wisdom',     label: 'WIS',  testament: 'ot' },
  { id: 'prophets',   label: 'PROP', testament: 'ot' },
  { id: 'gospels',    label: 'GOSP', testament: 'nt' },
  { id: 'epistles',   label: 'EPST', testament: 'nt' },
  { id: 'revelation', label: 'REV',  testament: 'nt' },
];

function Tabs({ side = 'right', highlight = null, current = null }) {
  return (
    <div className={`tabs ${side}`}>
      {GROUPS.map((g) => {
        const classes = [
          'group-tab',
          g.testament === 'ot' ? 'ot-group' : 'nt-group',
          highlight === g.id ? 'current' : '',
          current === g.id && highlight !== g.id ? 'current' : '',
        ].join(' ');
        return (
          <div key={g.id} className={classes}>{g.label}</div>
        );
      })}
    </div>
  );
}

/* ===== Fly-out book picker =====
   Positioned flush against the tab (via .flyout-right / .flyout-left class
   from styles.css), no hover dead zone. */
function Flyout({ side = 'right', group, open = 0, highlight = null, current = null }) {
  if (!group || open <= 0.01) return null;
  const books = GROUP_BOOKS[group] || [];
  const style = {
    opacity: open,
    transform: `translateX(${side === 'right' ? (1 - open) * 20 : -(1 - open) * 20}px)`,
  };
  return (
    <div className={`flyout flyout-${side}`} style={style}>
      <div className="flyout-title">{GROUP_LABELS[group]}</div>
      {books.map((b, i) => (
        <div
          key={b}
          className={[
            'flyout-book',
            highlight === b ? 'current' : '',
            current === b && highlight !== b ? 'current' : '',
          ].join(' ')}
        >
          <span className="num">{String(i + 1).padStart(2, '0')}</span>
          <span>{b}</span>
        </div>
      ))}
    </div>
  );
}

const GROUP_LABELS = {
  pentateuch: 'LAW · PENTATEUCH',
  history: 'HISTORICAL',
  wisdom: 'WISDOM',
  prophets: 'PROPHETS',
  gospels: 'GOSPELS',
  epistles: 'EPISTLES',
  revelation: 'APOCALYPSE',
};

const GROUP_BOOKS = {
  pentateuch: ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy'],
  history: ['Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel', '1 Kings', '2 Kings'],
  wisdom: ['Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon'],
  prophets: ['Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel'],
  gospels: ['Matthew', 'Mark', 'Luke', 'John'],
  epistles: ['Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians'],
  revelation: ['Revelation'],
};

/* ===== Flipping page layer =====
   progress: 0 = flat (no flip), 1 = fully flipped.
   direction: 'forward' (right→left) or 'backward' (left→right).
   Upgraded to match the main app: translateZ lift, drop-shadow that peaks at
   the midpoint, and front/back curl-shadow gradients so the leaf reads as
   an airborne page rather than a thin vanishing slice. */
function FlipLayer({ progress, direction = 'forward', front, back }) {
  if (progress <= 0.001) return null;
  const reverse = direction === 'backward';
  // Slight S-curve on the angle so the page sweeps quickly through 80-100° (the
  // near-invisible zone) and lingers on the visible angles.
  const ease = (t) => (t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2)/2);
  const swept = ease(progress);
  const angle = reverse ? swept * 180 : -swept * 180;
  const lift = Math.sin(Math.PI * progress);
  const z = lift * 84;
  // Tilt the flipping leaf so its face is never exactly perpendicular to the
  // viewer at 90° rotateY — catches light at mid-flip.
  const tiltX = lift * -8;
  const shadowSide = reverse ? 1 : -1;
  return (
    <div
      className={`flip-layer ${reverse ? 'reverse' : ''}`}
      style={{
        transform: `translateZ(${z}px) rotateY(${angle}deg) rotateX(${tiltX}deg)`,
        filter: `drop-shadow(${shadowSide * 14 * lift}px ${18 * lift}px ${24 + 48 * lift}px rgba(0,0,0,${lift * 0.75}))`,
      }}
    >
      <div className={`flip-face front page ${reverse ? 'left' : 'right'}`}>
        {front}
        <div className="curl-shadow" style={{
          opacity: progress < 0.5 ? progress * 1.1 : 0,
          background: reverse
            ? `linear-gradient(90deg,  rgba(0,0,0,${0.45 * progress}) 0%, rgba(0,0,0,${0.15 * progress}) 40%, transparent 72%)`
            : `linear-gradient(-90deg, rgba(0,0,0,${0.45 * progress}) 0%, rgba(0,0,0,${0.15 * progress}) 40%, transparent 72%)`,
        }}/>
      </div>
      <div className={`flip-face back page ${reverse ? 'right' : 'left'}`}>
        {back}
        <div className="curl-shadow" style={{
          opacity: progress > 0.5 ? (1 - progress) * 1.1 : 0,
          background: reverse
            ? `linear-gradient(-90deg, rgba(0,0,0,${0.45 * (1-progress)}) 0%, rgba(0,0,0,${0.15 * (1-progress)}) 40%, transparent 72%)`
            : `linear-gradient(90deg,  rgba(0,0,0,${0.45 * (1-progress)}) 0%, rgba(0,0,0,${0.15 * (1-progress)}) 40%, transparent 72%)`,
        }}/>
      </div>
    </div>
  );
}

/* ===== Corner drag hint ===== */
function CornerHint({ side = 'right', lift = 0 }) {
  /* lift 0..1 = how curled the corner is */
  if (lift <= 0.01) return null;
  const size = 60 + lift * 40;
  const style = {
    position: 'absolute',
    bottom: 0,
    [side]: 0,
    width: size,
    height: size,
    pointerEvents: 'none',
    background:
      side === 'right'
        ? `linear-gradient(135deg, transparent 50%, rgba(200,160,100,${0.25 + lift * 0.4}) 50%, rgba(120,80,30,${0.5 + lift * 0.3}) 100%)`
        : `linear-gradient(-135deg, transparent 50%, rgba(200,160,100,${0.25 + lift * 0.4}) 50%, rgba(120,80,30,${0.5 + lift * 0.3}) 100%)`,
    borderRadius: side === 'right' ? '0 0 4px 0' : '0 0 0 4px',
    boxShadow: `inset ${side === 'right' ? '-' : ''}4px -4px 12px rgba(0,0,0,${0.2 + lift * 0.3})`,
    transform: `translateY(${-lift * 4}px)`,
  };
  return <div style={style} />;
}

/* ===== Pointing cursor =====
   Rendered into the tilted book plane, so it lives in book-coord space.
   Beefed up: soft gold halo + inner dark stroke so it reads against pages
   and the leather cover at the small scales the canvas is rendered at. */
function Cursor({ x, y, clicking = false, visible = true }) {
  if (!visible) return null;
  return (
    <div style={{
      position: 'absolute',
      left: x, top: y,
      width: 34, height: 42,
      pointerEvents: 'none',
      zIndex: 500,
      transform: `scale(${clicking ? 0.82 : 1})`,
      transition: 'transform 80ms',
      filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.7))',
    }}>
      {/* soft halo so the cursor pops against any background */}
      <div style={{
        position: 'absolute',
        left: -10, top: -10,
        width: 54, height: 54,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,220,150,0.35) 0%, rgba(255,220,150,0) 65%)',
        pointerEvents: 'none',
      }} />
      <svg viewBox="0 0 22 28" width="34" height="42">
        <path
          d="M2 2 L2 22 L7 17 L10 25 L13 24 L10 16 L18 16 Z"
          fill="#fff8ea"
          stroke="#1a0f06"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
      {clicking && (
        <div style={{
          position: 'absolute',
          left: -12, top: -12,
          width: 58, height: 58,
          borderRadius: '50%',
          border: '2px solid rgba(255,220,150,0.9)',
          animation: 'click-ring 0.5s ease-out',
        }} />
      )}
    </div>
  );
}

/* ===== Caption (overlays the scene) ===== */
function Caption({ text, sub, opacity = 1, position = 'bottom' }) {
  const pos = position === 'top'
    ? { top: '8%' }
    : { bottom: '9%' };
  return (
    <div style={{
      position: 'absolute',
      left: 0, right: 0,
      ...pos,
      textAlign: 'center',
      opacity,
      pointerEvents: 'none',
      zIndex: 600,
    }}>
      <div style={{
        display: 'inline-block',
        fontFamily: "'Cinzel', Georgia, serif",
        color: 'var(--gold-hi)',
        fontSize: 26,
        letterSpacing: '0.18em',
        textShadow: '0 2px 12px rgba(0,0,0,0.9), 0 0 20px rgba(201,161,74,0.25)',
        padding: '8px 24px',
      }}>
        {text}
      </div>
      {sub && (
        <div style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          color: 'rgba(255, 240, 200, 0.75)',
          fontSize: 15,
          fontStyle: 'italic',
          letterSpacing: '0.1em',
          marginTop: 4,
          textShadow: '0 2px 8px rgba(0,0,0,0.9)',
        }}>
          {sub}
        </div>
      )}
    </div>
  );
}

Object.assign(window, {
  PAGE_W, PAGE_H,
  BookTilt, ClosedBook, BookShell, Page,
  Ribbon, Tabs, Flyout, FlipLayer, CornerHint,
  Cursor, Caption,
  GROUPS, GROUP_LABELS, GROUP_BOOKS,
});
