import { useState } from "react";

type Room = { title: string; text: string; exits: [string, string][] };

/** Six rooms, wired as a loop rather than a tree: every exit leads somewhere real. */
const ROOMS: Record<string, Room> = {
  platform: {
    title: "Platform six",
    text: "The last train has gone. The lights are on a timer nobody has reset since the spring.",
    exits: [["stairs", "Take the stairs down"], ["kiosk", "Walk to the lit kiosk"]]
  },
  stairs: {
    title: "The stairwell",
    text: "It turns twice and arrives one floor below the floor it promised.",
    exits: [["tunnel", "Push the door at the bottom"], ["platform", "Climb back up"]]
  },
  kiosk: {
    title: "The kiosk",
    text: "Open, unstaffed, the till counted to the penny and left on the counter.",
    exits: [["tunnel", "Follow the corridor behind it"], ["platform", "Return along the ramp"]]
  },
  tunnel: {
    title: "The service tunnel",
    text: "Warm, and lettered along one wall with the names of stations that were never built.",
    exits: [["office", "Try the only door"], ["bridge", "Take the ladder up"], ["stairs", "Go back to the stairwell"]]
  },
  office: {
    title: "The office",
    text: "One chair, tomorrow's timetable, and a window onto the platform you started from.",
    exits: [["platform", "Step through the window"], ["tunnel", "Back into the tunnel"]]
  },
  bridge: {
    title: "The footbridge",
    text: "From up here the station is plainly a loop, and your own route across it is obvious.",
    exits: [["platform", "Down to platform six"], ["kiosk", "Down to the kiosk"]]
  }
};

const START = "platform";

export function Labyrinth() {
  const [trail, setTrail] = useState<string[]>([START]);
  const here = trail[trail.length - 1];
  const room = ROOMS[here];
  const visits = trail.filter((id) => id === here).length;

  return (
    <div className="playground__maze">
      <nav aria-label="Your route so far">
        <ol className="playground__maze-trail" role="list">
          {trail.map((id, step) => (
            <li key={step} aria-current={step === trail.length - 1 ? "step" : undefined}>
              {ROOMS[id].title}
            </li>
          ))}
        </ol>
      </nav>
      <div className="playground__maze-room" aria-live="polite">
        <h4>{room.title}</h4>
        <p>{room.text}</p>
        {visits > 1 ? <p className="playground__case-note">{`You have stood here ${visits} times.`}</p> : null}
      </div>
      <ul className="playground__maze-exits" role="list">
        {room.exits.map(([to, label]) => (
          <li key={to}>
            <button type="button" onClick={() => setTrail((previous) => [...previous, to])}>
              {label}
              {trail.includes(to) ? <span className="playground__maze-seen">seen</span> : null}
            </button>
          </li>
        ))}
      </ul>
      <div className="playground__case-controls">
        <button type="button" disabled={trail.length === 1} onClick={() => setTrail((p) => p.slice(0, -1))}>
          Step back
        </button>
        <button type="button" disabled={trail.length === 1} onClick={() => setTrail([START])}>
          Return to the start
        </button>
      </div>
    </div>
  );
}
