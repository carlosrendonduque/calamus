---
title: Platform six
lang: en
# `opens:` is both the start node and the initial trail. The start node is in the
# trail, so visits(platform) is 1 before the reader has touched anything, which
# is what the component does.
opens:
  trail: [platform]
groups:
  # A log is a group that grows: the trail keeps repeats, and only the last step
  # can be taken back.
  trail: { fields: [], keeps: duplicates, removes: last }
names:
  stands: visits(here)
phrases:
  # The component only prints this above one visit, so its singular case was
  # never written and the "1 times" bug was never seen. Written out, the bug
  # cannot happen.
  stood:
    on: stands
    cases:
      - { is: 1, say: "" }
      - { say: "You have stood here {stands} times." }
  # `seen` needs the exit it is printed on. A phrase cannot take one, so this
  # reads the call site.
  seen:
    of: exit
    cases:
      - { when: "visited(exit.to)", say: seen }
      - { say: "" }
---

```calamus
each: trail
heading: Your route so far
```

{item.title}

```calamus
end
```

```calamus
node: platform
title: Platform six
exits:
  - { to: stairs,   label: Take the stairs down,  note: "{seen}" }
  - { to: kiosk,    label: Walk to the lit kiosk, note: "{seen}" }
  - { to: back,     label: Step back }
  - { to: start,    label: Return to the start, resets: trail }
```

The last train has gone. The lights are on a timer nobody has reset since the
spring.

{stood}

```calamus
node: stairs
title: The stairwell
exits:
  - { to: tunnel,   label: Push the door at the bottom, note: "{seen}" }
  - { to: platform, label: Climb back up, note: "{seen}" }
  - { to: back,     label: Step back }
  - { to: start,    label: Return to the start, resets: trail }
```

It turns twice and arrives one floor below the floor it promised.

{stood}

```calamus
node: kiosk
title: The kiosk
exits:
  - { to: tunnel,   label: Follow the corridor behind it, note: "{seen}" }
  - { to: platform, label: Return along the ramp, note: "{seen}" }
  - { to: back,     label: Step back }
  - { to: start,    label: Return to the start, resets: trail }
```

Open, unstaffed, the till counted to the penny and left on the counter.

{stood}

```calamus
node: tunnel
title: The service tunnel
exits:
  - { to: office,   label: Try the only door, note: "{seen}" }
  - { to: bridge,   label: Take the ladder up, note: "{seen}" }
  - { to: stairs,   label: Go back to the stairwell, note: "{seen}" }
  - { to: back,     label: Step back }
  - { to: start,    label: Return to the start, resets: trail }
```

Warm, and lettered along one wall with the names of stations that were never
built.

{stood}

```calamus
node: office
title: The office
exits:
  - { to: platform, label: Step through the window, note: "{seen}" }
  - { to: tunnel,   label: Back into the tunnel, note: "{seen}" }
  - { to: back,     label: Step back }
  - { to: start,    label: Return to the start, resets: trail }
```

One chair, tomorrow's timetable, and a window onto the platform you started
from.

{stood}

```calamus
node: bridge
title: The footbridge
exits:
  - { to: platform, label: Down to platform six, note: "{seen}" }
  - { to: kiosk,    label: Down to the kiosk, note: "{seen}" }
  - { to: back,     label: Step back }
  - { to: start,    label: Return to the start, resets: trail }
```

From up here the station is plainly a loop, and your own route across it is
obvious.

{stood}
