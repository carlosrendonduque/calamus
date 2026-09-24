// TODO: a gallery of hypertext pieces will mount here, from `playground/gallery/`.
// Until it exists this single Apollinaire demo stands in for it: it is the seam
// where the gallery replaces the children passed to `hypertext` mode.

type HypertextDemoProps = {
  lines: string[];
};

function RainLine({ index, children }: { index: number; children: string }) {
  return (
    <p className="playground__rain-line" style={{ marginInlineStart: `${index * 1.4}rem` }}>
      {children}
    </p>
  );
}

export function HypertextDemo({ lines }: HypertextDemoProps) {
  return (
    <div className="playground__hypertext-demo">
      <p>
        In hypertext mode the reader renders its header and then steps aside: everything below
        this point is your own markup, passed in as <code>children</code>. <code>content.body</code>{" "}
        is not rendered, and no reading time is shown.
      </p>
      <div className="playground__rain" lang="fr">
        {lines.map((line, index) => (
          <RainLine key={index} index={index}>
            {line}
          </RainLine>
        ))}
      </div>
      <blockquote className="playground__rotated-quote">
        <p>A layout is an argument about how a text wants to be read.</p>
      </blockquote>
      <p>
        On Apollinaire's page those lines fall as slanting columns of rain, one letter at a time.
        The library has no opinion about that, which is the point: it gives you the frame and the
        typography, and lets the piece keep its own shape. Nothing in this block is paginated,
        measured or reflowed by calamus.
      </p>
      <div className="playground__blinking-note">node /calligrammes/il-pleut — 1 direction: down</div>
    </div>
  );
}
