---
title: Platform six
calamus: 1
lang: en
start: platform
exits:
  wayback:
    - to: back
      label: Step back
    - to: start
      label: Return to the start
      resets: trail
phrases:
  stood:
    on: visits(here)
    cases:
      - is: 1
        say: ""
      - say: You have stood here {n} times.
  seen:
    cases:
      - when: visited(exit.to)
        say: seen
      - say: ""
---

```calamus
each: trail
as: steps
label: Your route so far
```

{entry.node.title}

```calamus
node: platform
title: Platform six
exits:
  - to: stairs
    label: Take the stairs down
    note: "{seen}"
  - to: kiosk
    label: Walk to the lit kiosk
    note: "{seen}"
  also: wayback
```

The last train has gone. The lights are on a timer nobody has reset since the
spring.

:with{when="visits(here) > 1"}
{stood}

```calamus
node: stairs
title: The stairwell
exits:
  - to: tunnel
    label: Push the door at the bottom
    note: "{seen}"
  - to: platform
    label: Climb back up
    note: "{seen}"
  also: wayback
```

It turns twice and arrives one floor below the floor it promised.

:with{when="visits(here) > 1"}
{stood}

```calamus
node: kiosk
title: The kiosk
exits:
  - to: tunnel
    label: Follow the corridor behind it
    note: "{seen}"
  - to: platform
    label: Return along the ramp
    note: "{seen}"
  also: wayback
```

Open, unstaffed, the till counted to the penny and left on the counter.

:with{when="visits(here) > 1"}
{stood}

```calamus
node: tunnel
title: The service tunnel
exits:
  - to: office
    label: Try the only door
    note: "{seen}"
  - to: bridge
    label: Take the ladder up
    note: "{seen}"
  - to: stairs
    label: Go back to the stairwell
    note: "{seen}"
  also: wayback
```

Warm, and lettered along one wall with the names of stations that were never
built.

:with{when="visits(here) > 1"}
{stood}

```calamus
node: office
title: The office
exits:
  - to: platform
    label: Step through the window
    note: "{seen}"
  - to: tunnel
    label: Back into the tunnel
    note: "{seen}"
  also: wayback
```

One chair, tomorrow's timetable, and a window onto the platform you started
from.

:with{when="visits(here) > 1"}
{stood}

```calamus
node: bridge
title: The footbridge
exits:
  - to: platform
    label: Down to platform six
    note: "{seen}"
  - to: kiosk
    label: Down to the kiosk
    note: "{seen}"
  also: wayback
```

From up here the station is plainly a loop, and your own route across it is
obvious.

:with{when="visits(here) > 1"}
{stood}
