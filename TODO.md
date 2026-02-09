# TODO list

Here are all the things this game is missing to be complete. PRIORITIES shows next todo points in priority order from top (highest priority) to bottom (lowest). Feel free to remove them once one of them is done. Below are the future tasks divided by their subject.

- PRIORITIES:

- IMPROVEMENTS:
    - victory music
    - introduce the possibility of having different background music tracks that are picked at random for a certain mode

- FEATURES:
    - handle disconnection (I have to do tests myself for this to understand when it fails)
    - UI: add a settings screen (accessible from the UI) where all the more complex settings (like sensibility of movement detection) can be accessed. In the future, other settings will be accessed through this screen

- BUGS:
    - sometimes all players have the skull at the end of the round. Points are not cumulative. I have to track down when this happens
    - sometimes I hear "respawning in" "respawning in" "3" "3" "2" "2" "1" "1" when player respawns. Still haven't figured out how to reproduce this
    - no sound on iOS chrome: it's fine, iOS users can use safari

- Classic mode specific:

- Role mode specific:
    - optional through config (and useful for role): hear a sound whenever another player is dead (useful when fighting another one with the earbud on -> without earbuds you would hear his death sound from his phone) 
    - charges should be hidden from the screen. Actually right now we have this bug but we can bypass it. I'll leave it here as history: charges are shown on player screen even though he has no charges (0/1). Maybe this happens when being ironclad in the first round and beast/beasthunter in the second.
    - sound from dashboard with player number: it should say 7 eliminated
    - TTS doesn't work on iOS -> it's fine, we'll replace it with real voice

<!-- - I want better handling for player stats (e.g. toughness or dangerThreshold). I want to add dangerThresholdMultiplier as a new prop for the player (configurable for roles). This should multiply the base dangerThreshold. But we have an issue if we do it like this: we aren't able to handle multiplier from game events (e.g. speed shift) together with player multiplier. I think we should in general expect these two to coexist. Not only for this new multiplier, but also for others in the future (and for toughnessMultiplier). Also, I would remove dangerThreshold from player props, since we don't ever want to override globally configured dangerThreshold. The multiplier will be enough. -->