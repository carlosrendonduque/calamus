---
title: The inventory and the landing
calamus: 1
lang: en
groups:
  passes:
    fields: [id, verb, note, as]
    items:
      - id: door
        verb: keeps
        note: kept by the second clerk
        as: mark
      - id: empty
        verb: strikes
        note: struck by the second clerk
        as: strike
    control: toggle
    control-label: "The pass that {item.verb} \"{item.id}\""
    default-on: yes
marks:
  door: { from: passes, pass: door }
  empty: { from: passes, pass: empty }
names:
  marked: count(marks where on)
  total: count(marks)
phrases:
  count:
    cases:
      - when: marked == 0
        say: No pass is marking. The paragraph is the first clerk's alone.
      - say: >-
          {marked} of {total} words marked: kept words are highlighted and
          underlined, struck words are ruled through.
---

The inventory lists one :mark[door]{kind=door} on the landing. The clerk who
signed it wrote that the landing stood :mark[empty]{kind=empty}, and the clerk
who countersigned it wrote that the :mark[door]{kind=door} had been counted
twice and that the landing was never :mark[empty]{kind=empty} at all.

:with{live=polite}
{count}
