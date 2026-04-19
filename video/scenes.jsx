// Scrubbable animation scenes for the Interactive Bible.
// Each scene is a Sprite with its own local-time progress; keyframes drive
// the book primitives (FlipLayer, Tabs/Flyout, Ribbon) through their states.

const SCENES = [
  { id: "forward",  start: 0,  end: 4.0,  label: "Forward page flip",  sub: "rightIdx → nextLeftIdx, angle 0→−180°" },
  { id: "backward", start: 4.0, end: 8.0, label: "Backward page flip", sub: "leftIdx → prevRightIdx, angle 0→+180°" },
  { id: "tabs",     start: 8.0, end: 13.0, label: "Thumb-index tabs",  sub: "hover opens flyout, click picks a book" },
  { id: "ribbon",   start: 13.0, end: 19.0, label: "Ribbon bookmark",  sub: "drag places · click jumps (w/ riffle)" },
];
const TOTAL = SCENES[SCENES.length - 1].end;

// -- Shared page content variants used across scenes -------------------------
const PAGE_GENESIS_1  = { side: "left",  book: "GENESIS",     chapter: 1, pageNum: 1, verses: GENESIS_1 };
const PAGE_GENESIS_1B = { side: "right", book: "GENESIS",     chapter: null, pageNum: 2, verses: GENESIS_1B };
const PAGE_GENESIS_2  = { side: "left",  book: "GENESIS",     chapter: 2, pageNum: 3, verses: GENESIS_2 };
const PAGE_PSALMS_23  = { side: "right", book: "PSALMS",      chapter: 23, pageNum: 812, verses: PSALMS_23 };
const PAGE_PSALMS_24  = { side: "left",  book: "PSALMS",      chapter: 24, pageNum: 813, verses: PSALMS_24 };

// Keyframe helpers ----------------------------------------------------------
const kf = (input, output, ease) => interpolate(input, output, ease || Easing.linear);

// Simple wrapper that adds the cover/paper modifier classes BookTilt omits.
function StyledBook({ children }) {
  return (
    <BookTilt>
      <div className="cover-brown paper-aged" style={{ display: "contents" }} />
      {children}
    </BookTilt>
  );
}

// Apply cover/paper to the .book element (BookTilt renders `.book` directly,
// so we augment it via a class hook).
function ensureBookClasses() {
  document.querySelectorAll('.book').forEach(b => {
    b.classList.add('cover-brown');
    b.classList.add('paper-aged');
  });
}

// ---- Scene 1: Forward flip ------------------------------------------------
function SceneForwardFlip() {
  const { localTime } = useSprite();
  React.useEffect(ensureBookClasses, [localTime]);

  // Keyframes:
  //   0.0–0.6  idle, cursor hidden
  //   0.6–1.0  cursor slides in from bottom-right toward corner, corner lifts
  //   1.0–1.1  click pulse
  //   1.1–3.2  flip progress 0→1 with easeInOutQuint
  //   3.2–4.0  settled
  const cornerLift   = kf([0.6, 1.0, 1.1, 1.15], [0, 0.8, 1.0, 0],     Easing.easeOutCubic)(localTime);
  const flipProgress = kf([1.1, 3.2],             [0, 1],               Easing.easeInOutQuint || Easing.easeInOutCubic)(localTime);
  const cursorVisible = localTime > 0.55 && localTime < 1.3;
  const cursorX = kf([0.6, 1.0], [PAGE_W * 2 + 60, PAGE_W * 2 - 34], Easing.easeOutCubic)(localTime);
  const cursorY = kf([0.6, 1.0], [PAGE_H + 80,     PAGE_H - 22],     Easing.easeOutCubic)(localTime);
  const clicking = localTime >= 1.0 && localTime <= 1.08;

  const flipping = flipProgress > 0.001 && flipProgress < 0.999;

  return (
    <StyledBook>
      <BookShell>
        {/* Static left: unchanged through the flip. Static right: destination's right (revealed). */}
        <Page {...PAGE_GENESIS_1} />
        <Page {...(flipping || flipProgress >= 1 ? PAGE_PSALMS_23 : PAGE_GENESIS_1B)} />
      </BookShell>
      <FlipLayer
        progress={flipProgress}
        direction="forward"
        front={<Page {...PAGE_GENESIS_1B} />}
        back={<Page {...PAGE_GENESIS_2} />}
      />
      {cornerLift > 0.01 && <CornerHint side="right" lift={cornerLift} />}
      <Cursor x={cursorX} y={cursorY} visible={cursorVisible} clicking={clicking} />
    </StyledBook>
  );
}

// ---- Scene 2: Backward flip ----------------------------------------------
function SceneBackwardFlip() {
  const { localTime } = useSprite();
  React.useEffect(ensureBookClasses, [localTime]);

  // Starting spread: Genesis 2 (left) / Psalms 23 (right). Flip back reveals
  // Genesis 1 (left) / Genesis 1b (right).
  const cornerLift   = kf([0.6, 1.0, 1.1, 1.15], [0, 0.8, 1.0, 0], Easing.easeOutCubic)(localTime);
  const flipProgress = kf([1.1, 3.2],             [0, 1],           Easing.easeInOutQuint || Easing.easeInOutCubic)(localTime);
  const cursorVisible = localTime > 0.55 && localTime < 1.3;
  const cursorX = kf([0.6, 1.0], [-60, 34],              Easing.easeOutCubic)(localTime);
  const cursorY = kf([0.6, 1.0], [PAGE_H + 80, PAGE_H - 22], Easing.easeOutCubic)(localTime);
  const clicking = localTime >= 1.0 && localTime <= 1.08;

  const flipping = flipProgress > 0.001 && flipProgress < 0.999;

  return (
    <StyledBook>
      <BookShell>
        {/* Static left: destination (Genesis 1) shown during flip. Static right: unchanged. */}
        <Page {...(flipping || flipProgress >= 1 ? PAGE_GENESIS_1 : PAGE_GENESIS_2)} />
        <Page {...PAGE_PSALMS_23} />
      </BookShell>
      <FlipLayer
        progress={flipProgress}
        direction="backward"
        front={<Page {...PAGE_GENESIS_2} />}
        back={<Page {...PAGE_GENESIS_1B} />}
      />
      {cornerLift > 0.01 && <CornerHint side="left" lift={cornerLift} />}
      <Cursor x={cursorX} y={cursorY} visible={cursorVisible} clicking={clicking} />
    </StyledBook>
  );
}

// ---- Scene 3: Tabs with flyout -------------------------------------------
function SceneTabs() {
  const { localTime } = useSprite();
  React.useEffect(ensureBookClasses, [localTime]);

  // 0.0–0.6   cursor enters toward right tabs
  // 0.6–1.0   hover on "prophets" tab, flyout opens
  // 1.0–2.0   cursor moves into flyout area, hovers through books
  // 2.0–3.0   hover settles on "Isaiah", pulse
  // 3.0–3.3   click pulse
  // 3.3–5.0   flyout fades out
  const tabsRightX = PAGE_W * 2 + 17; // rough x of right-edge tabs
  const cursorX = kf(
    [0.0, 0.6, 1.0, 1.6, 2.0, 3.0, 3.3, 5.0],
    [PAGE_W * 2 + 120, tabsRightX, tabsRightX + 30, tabsRightX + 140, tabsRightX + 150, tabsRightX + 150, tabsRightX + 150, PAGE_W * 2 + 300],
    Easing.easeInOutCubic
  )(localTime);
  const cursorY = kf(
    [0.0, 0.6, 1.0, 1.6, 2.0, 3.0, 3.3, 5.0],
    [PAGE_H * 0.35, PAGE_H * 0.55, PAGE_H * 0.55, PAGE_H * 0.35, PAGE_H * 0.45, PAGE_H * 0.45, PAGE_H * 0.45, PAGE_H * 0.30],
    Easing.easeInOutCubic
  )(localTime);

  const flyoutOpen = kf([0.85, 1.05, 3.3, 3.7], [0, 1, 1, 0], Easing.easeOutCubic)(localTime);
  const clicking = localTime >= 3.0 && localTime <= 3.15;
  // Highlight cycles through books in the prophets group between 1.6s and 3.0s
  const BOOKS = ['Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel'];
  let highlight = null;
  if (localTime >= 1.6 && localTime < 3.0) {
    const i = Math.min(BOOKS.length - 1, Math.floor(((localTime - 1.6) / 1.4) * BOOKS.length));
    highlight = BOOKS[i];
  } else if (localTime >= 3.0 && localTime < 3.5) {
    highlight = 'Isaiah';
  }

  return (
    <StyledBook>
      <BookShell>
        <Page {...PAGE_GENESIS_1} />
        <Page {...PAGE_GENESIS_1B} />
      </BookShell>
      <Tabs side="right" highlight={localTime > 0.6 ? 'prophets' : null} current="pentateuch" />
      <Flyout side="right" group="prophets" open={flyoutOpen} highlight={highlight} current={null} />
      <Cursor x={cursorX} y={cursorY} visible={localTime > 0.0 && localTime < 4.5} clicking={clicking} />
    </StyledBook>
  );
}

// ---- Scene 4: Ribbon drag → flash → click → jump -------------------------
function SceneRibbon() {
  const { localTime } = useSprite();
  React.useEffect(ensureBookClasses, [localTime]);

  // 0.0–0.6  cursor approaches ribbon (ribbon hangs from spine)
  // 0.6–1.0  mousedown; cursor + ribbon drift slightly (drag)
  // 1.0–1.2  mouseup → BOOKMARKED flash
  // 1.2–2.4  flash visible, cursor idles
  // 2.4–3.0  cursor returns to ribbon, clicks
  // 3.0–4.5  riffle (scenes don't animate the full riffle; indicator only)
  // 4.5–6.0  settled
  const ribbonX = PAGE_W - 13; // centered on spine
  const ribbonLen = kf([0, 0.6, 1.0, 6.0], [240, 240, 240, 240], Easing.linear)(localTime);
  const sway = kf([0.6, 0.8, 1.0], [0, 18, 0], Easing.easeInOutCubic)(localTime);
  const flashOpacity = kf([1.0, 1.2, 2.0, 2.3], [0, 1, 1, 0], Easing.easeOutCubic)(localTime);

  const cursorX = kf(
    [0.0, 0.6, 1.0, 2.4, 3.0, 4.0],
    [PAGE_W + 180, ribbonX + 13, ribbonX + 26, ribbonX + 20, ribbonX + 13, PAGE_W + 60],
    Easing.easeInOutCubic
  )(localTime);
  const cursorY = kf(
    [0.0, 0.6, 1.0, 2.4, 3.0, 4.0],
    [PAGE_H * 0.2, 80, 110, 40, 80, 60],
    Easing.easeInOutCubic
  )(localTime);
  const grabbing = localTime >= 0.6 && localTime < 1.05;
  const clicking = localTime >= 3.0 && localTime <= 3.15;

  // Approximate riffle after click: a few quick flip-layer frames
  const riffleActive = localTime > 3.1 && localTime < 4.3;
  const riffleP = kf([3.1, 4.3], [0, 1], Easing.easeInOutCubic)(localTime);

  return (
    <StyledBook>
      <BookShell>
        <Page {...PAGE_GENESIS_1} />
        <Page {...PAGE_GENESIS_1B} />
      </BookShell>
      <Ribbon offset={ribbonX + sway} length={ribbonLen} sway={sway * 0.8} />
      {flashOpacity > 0.01 && (
        <div style={{
          position: "absolute",
          top: -8, left: "50%", transform: "translateX(-50%)",
          whiteSpace: "nowrap",
          fontFamily: "'Cinzel', Georgia, serif",
          fontSize: 13, letterSpacing: "0.25em",
          color: "var(--gold-hi)",
          textShadow: "0 1px 4px rgba(0,0,0,0.8), 0 0 20px rgba(201,161,74,0.4)",
          opacity: flashOpacity,
          pointerEvents: "none",
        }}>
          ⁂ BOOKMARKED ⁂
        </div>
      )}
      {/* cheap visual riffle: two rotating sheets */}
      {riffleActive && (
        <>
          <FlipLayer progress={Math.min(1, riffleP * 2)}     direction="forward" front={<Page {...PAGE_GENESIS_1B} />} back={<Page {...PAGE_GENESIS_2} />} />
          <FlipLayer progress={Math.max(0, riffleP * 2 - 1)} direction="forward" front={<Page {...PAGE_GENESIS_2} />}  back={<Page {...PAGE_PSALMS_24} />} />
        </>
      )}
      <Cursor x={cursorX} y={cursorY} visible={localTime < 4.3} clicking={clicking || grabbing} />
    </StyledBook>
  );
}

// ---- Top-level tape --------------------------------------------------------
function Tape() {
  const { time } = useTimeline();
  const active = SCENES.find(s => time >= s.start && time < s.end) || SCENES[0];

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div className="table-surface"></div>
      <div className="candle-light"></div>

      <Sprite start={0}     end={4.0}>  <SceneForwardFlip  /></Sprite>
      <Sprite start={4.0}   end={8.0}>  <SceneBackwardFlip /></Sprite>
      <Sprite start={8.0}   end={13.0}> <SceneTabs         /></Sprite>
      <Sprite start={13.0}  end={19.0}> <SceneRibbon       /></Sprite>

      <Caption text={active.label} sub={active.sub} position="top" />

      {/* Chapter markers on the timeline */}
      <div style={{
        position: "absolute", top: 10, right: 14,
        fontFamily: "'Cinzel', Georgia, serif",
        color: "var(--gold-hi)", fontSize: 9, letterSpacing: "0.25em",
        textShadow: "0 1px 4px rgba(0,0,0,0.8)",
        opacity: 0.7,
      }}>
        SCENE {SCENES.indexOf(active) + 1} / {SCENES.length}
      </div>
    </div>
  );
}

function App() {
  return (
    <Stage
      width={1100}
      height={700}
      duration={TOTAL}
      background="transparent"
      autoplay={true}
      loop={true}
      persistKey="bible-tape"
    >
      <Tape />
    </Stage>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
