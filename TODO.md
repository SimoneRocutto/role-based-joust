# TODO list

Here are all the things this game is missing to be complete, in priority order from top (highest priority) to bottom (lowest). Feel free to remove them once one of them is done:

- points on player screen always show 0
- fix client useSocket tests
- GO from the countdown is immediately hidden as soon as it appears
- handle disconnection
- charges should be hidden from the screen. Actually right now we have this bug but we can bypass it. I'll leave it here as history: charges are shown on player screen even though he has no charges (0/1). Maybe this happens when being ironclad in the first round and beast/beasthunter in the second.
- add docs for sounds auto discover and for mode specific sounds with general directory as a fallback
- classic mode: change dashboard background color on slow/fast
- write full documentation for player:tap event and player abilities in general
- I want better handling for player stats (e.g. toughness or dangerThreshold). I want to add dangerThresholdMultiplier as a new prop for the player (configurable for roles). This should multiply the base dangerThreshold. But we have an issue if we do it like this: we aren't able to handle multiplier from game events (e.g. speed shift) together with player multiplier. I think we should in general expect these two to coexist. Not only for this new multiplier, but also for others in the future (and for toughnessMultiplier). Also, I would remove dangerThreshold from player props, since we don't ever want to override globally configured dangerThreshold. The multiplier will be enough.
- add visual feedback on phone screen when the player gets hit
- add a settings screen (accessible from the UI) where all the more complex settings (like sensibility of movement detection) can be accessed. In the future, other settings will be accessed through this screen
- music loop doesn't work -> maybe it's already solved
- TTS doesn't work on iOS -> it's fine, we'll replace it with real voice
- no sound on iOS chrome
