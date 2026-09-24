import { useState } from "react";
import "./structure.css";

type Exhibit = { id: string; title: string; body: string };

const EXHIBITS: Exhibit[] = [
  {
    id: "A",
    title: "Exhibit A, site note, 3 March",
    body: "The boundary wall stands four metres and ten from the gatepost. Measured twice, in company."
  },
  {
    id: "B",
    title: "Exhibit B, letter to the council, 19 March",
    body: "There is no wall on that side of the plot, and there has been none in my lifetime."
  },
  {
    id: "C",
    title: "Exhibit C, transcript, 2 April",
    body: "— We took it down in April. — Which April? — That is the question the file keeps asking."
  }
];

export function PathPacket() {
  const [openId, setOpenId] = useState(EXHIBITS[0].id);
  const [read, setRead] = useState<string[]>([EXHIBITS[0].id]);
  const open = EXHIBITS.find((exhibit) => exhibit.id === openId);
  const next = EXHIBITS.find((exhibit) => !read.includes(exhibit.id));

  /* One sheet at a time. Closing a sibling fires that sibling's own toggle, so the
     update tests the current value instead of assuming this handler caused it. */
  const toggle = (id: string, isOpen: boolean) => {
    setOpenId((current) => (isOpen ? id : current === id ? "" : current));
    if (isOpen) {
      setRead((previous) => (previous.includes(id) ? previous : [...previous, id]));
    }
  };

  return (
    <div className="playground__packet">
      <p>
        Three sheets came in one envelope, with the first already on top. They do not agree with each
        other, and nothing in the file says which of them was ever read.
      </p>
      {EXHIBITS.map((exhibit) => (
        <details
          key={exhibit.id}
          className="playground__packet-sheet"
          open={openId === exhibit.id}
          onToggle={(event) => toggle(exhibit.id, event.currentTarget.open)}
        >
          <summary>
            {exhibit.title}
            {read.includes(exhibit.id) ? <span className="playground__packet-mark">opened</span> : null}
          </summary>
          <p>{exhibit.body}</p>
        </details>
      ))}
      <p className="playground__case-note" role="status">
        {`${open ? `${open.title} is open. ` : "The envelope is shut. "}${read.length} of ${
          EXHIBITS.length
        } sheets opened.`}
      </p>
      <div className="playground__case-controls">
        <button type="button" disabled={!open} onClick={() => setOpenId("")}>
          Shut the envelope
        </button>
        <button type="button" disabled={!next} onClick={() => next && toggle(next.id, true)}>
          Open the next unread sheet
        </button>
      </div>
    </div>
  );
}
