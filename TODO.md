# TODO list

Here are all the things this game is missing to be complete. PRIORITIES shows next todo points in priority order from top (highest priority) to bottom (lowest). Feel free to remove them once one of them is done. Below are the future tasks divided by their subject.

- PRIORITIES:
    - docs: add docs for sounds auto discover and for mode specific sounds with general directory as a fallback
    - docs: update audio docs (zustand is now used instead of useAudio)
    - fix client audio tests
    - docs: write full documentation for player:tap event and player abilities in general
    - speed shift event: there should be 1 second of threshold transition when going from fast to slow. This means that when we hear the sound from going from fast to slow, high movement threshold should persist for 1 extra second before shifting to slow. This gives time to players adapting when they hear the sound.

- IMPROVEMENTS:
    - victory music
    - remove ready sound from dashboard
    - remove countdown sound from phones
    - introduce the possibility of having different background music tracks that are picked at random for a certain mode

- FEATURES:
    - implement death count mode: Players respawn automatically. Who died the least amount of times at the end of the round wins. 
    - implement team mode: players are divided in N teams and their points are summed to see who wins. We should be able to have team mode both for the death count mode and for the classic mode
    - handle disconnection (I have to do tests myself for this to understand when it fails)
    - UI: add a settings screen (accessible from the UI) where all the more complex settings (like sensibility of movement detection) can be accessed. In the future, other settings will be accessed through this screen

- BUGS:
    - points on player screen always show 0 -> hide them
    - GO from the countdown is immediately hidden as soon as it appears: fix this
    - preloaded x sounds is logged multiple times in the console: maybe it's doing unnecessary operations
    - sometimes all players have the skull at the end of the round. Points are not cumulative. I have to track down when this happens
    - no sound on iOS chrome: it's fine, iOS users can use safari

- Classic mode specific:

- Role mode specific:
    - optional through config (and useful for role): hear a sound whenever another player is dead (useful when fighting another one with the earbud on -> without earbuds you would hear his death sound from his phone) 
    - charges should be hidden from the screen. Actually right now we have this bug but we can bypass it. I'll leave it here as history: charges are shown on player screen even though he has no charges (0/1). Maybe this happens when being ironclad in the first round and beast/beasthunter in the second.
    - sound from dashboard with player number: it should say 7 eliminated
    - TTS doesn't work on iOS -> it's fine, we'll replace it with real voice

<!-- - I want better handling for player stats (e.g. toughness or dangerThreshold). I want to add dangerThresholdMultiplier as a new prop for the player (configurable for roles). This should multiply the base dangerThreshold. But we have an issue if we do it like this: we aren't able to handle multiplier from game events (e.g. speed shift) together with player multiplier. I think we should in general expect these two to coexist. Not only for this new multiplier, but also for others in the future (and for toughnessMultiplier). Also, I would remove dangerThreshold from player props, since we don't ever want to override globally configured dangerThreshold. The multiplier will be enough. -->