# melvor-corruption
Allow multiple corruptions to stack, in random or user-specified order.

## Corruption Juggernaut rework

A customizable rework of `corruption_reworked_juggernaut-1brl`: each time the player
gets corrupted, a new guaranteed-random corruption is applied and the Corruption
Counter's threshold grows. Two settings (under "Corruption Juggernaut" in Mod
Settings) control the threshold math:

- **Growth Multiplier** (default `1.44`) — scales the Corruption Counter threshold
  each time a corruption is applied.
- **Initial Multiplier** (default `1`) — a one-time scale applied to the vanilla
  threshold the moment it is first granted, before any corruption has happened
  this fight.

## Corruption Order panel

A **Configure Activation Order** button is added into the game's own
"Corruption" box in the combat screen (next to "Automatically Corrupt
Monsters on Spawn?"). Clicking it opens a popup listing your
already-unlocked corruptions (with their real descriptions, not just the
generic "Corrupted" name) — each with an on/off switch, and draggable into a
custom order. A **Randomize Activation Order** checkbox at the top of the
popup (default on, matching the original behavior) switches between picking
randomly among your unlocked, enabled corruptions and applying the first
eligible corruption from your dragged order — when it's on, the drag handles
grey out since order doesn't matter. Disabled corruptions are never picked in
either mode. Order, enabled state, and the randomize choice all persist per
character.
