---
title: The inventory of the landing
calamus: 1
lang: en
variables:
  keeping:
    type: boolean
    default: true
    control: toggle
    control-at: panel
    # The label names the mark class and the word it claims, both of which are
    # the author's. There is no phrase here because there is nothing to choose.
    label: The pass that keeps "door"
  striking:
    type: boolean
    default: true
    control: toggle
    control-at: panel
    label: The pass that strikes "empty"
marks:
  kept:   { as: highlight, note: kept by the second clerk }
  struck: { as: strike,    note: struck by the second clerk }
names:
  # `marked-spans` is a group the schema keeps of this document's own marked
  # spans, the way it keeps the trail. Without it the sentence below cannot
  # count anything: the marks live in the prose, not in a group.
  showing: count(marked-spans)
  markable: count(marked-spans of any)
phrases:
  marking:
    on: showing
    cases:
      - when: "showing == 0"
        say: No pass is marking. The paragraph is the first clerk's alone.
      - say: >-
          {showing} of {markable} words marked: kept words are highlighted and
          underlined, struck words are ruled through.
---

The inventory lists one :mark[door]{as=kept when=keeping} on the landing. The
clerk who signed it wrote that the landing stood
:mark[empty]{as=struck when=striking}, and the clerk who countersigned it wrote
that the :mark[door]{as=kept when=keeping} had been counted twice and that the
landing was never :mark[empty]{as=struck when=striking} at all.

:with{live=status}
{marking}
