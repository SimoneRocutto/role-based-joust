# TODO list

Here are all the things this game is missing to be complete. PRIORITIES shows next todo points in priority order from top (highest priority) to bottom (lowest). Feel free to remove them once one of them is done. Below are the future tasks divided by their subject.

- PRIORITIES:

- SHORT TERM PRIORITIES:
    - rework round end/game end UI for death count and team matches in general
    - rework domination active game UI
    - write roles combinations for every number of players from 3 up to 16 for easy level of difficulty
    - write roles combinations for every number of players from 3 up to 16 for medium level of difficulty
    - record sounds and replace every TTS entry
    - maybe allow multiple audio tracks for background music
    - maybe implement timeshift role and the bomb/bomb faker
    - maybe implement king game mode

- IMPROVEMENTS:
    - victory music
    - numbers of deaths in death count mode should be highly visible from a distance. We could also consider showing them on the player screen (or maybe showing a trophy or somthing like that on the player ahead)
    - introduce the possibility of having different background music tracks that are picked at random for a certain mode
    - teams mode should not be able to start with empty teams
    - use special animations/cool backgrounds to distinguish between speedshift slow and fast phases. Red and blue will be mistaken for red and blue team colors. We should use a different way to convey velocity info to players

- FEATURES:

- BUGS:
    - sometimes all players have the skull at the end of the round. Points are not cumulative. I have to track down when this happens
    - in classic mode, it happened that game didn't start even though everyone put ready
    - TTS doesn't work on iOS -> it's fine, we'll replace it with real voice

- Classic mode specific:

- Death count mode specific:

- Domination mode specific:
    - check for exact number of bases before starting (or, instead, remove number of bases setting)

- Team mode specific:
    - end of round scoreboard is confusing: it should list players in order of round points. We should also find a way to represent total points for the entire teams
    - points at the end of round should exclude points made by the lowest scoring players. This doesn't happen when all team have the same amount of players. Though, when we have 3, 2 and 2 in teams, team with 3 players will statistically score +50% points compared to other teams. So, we'll just exclude the worst player from their score count as a way to lower the disparity. We can think of other ways to compensate

- Roles to implement:

- Role mode specific:
    - charges should be hidden from the screen. Actually right now we have this bug but we can bypass it. I'll leave it here as history: charges are shown on player screen even though he has no charges (0/1). Maybe this happens when being ironclad in the first round and beast/beasthunter in the second.
    - sound from dashboard with player number: it should say 7 eliminated

- New roles (E = easy, M = medium, H = hard):
    - (M) vampire: every 20 seconds he enters bloodlust -> for 5 seconds, he gains 1 point and gains 20% HP if someone else dies during this mode
    - (M) jester: his life changes by showing wrong things, like healing or losing more life than he should when he gets hit.
    - (M) hunted: similar to survivor. Every 20s, players will hear "The hunted is alive" and the hunter's screen flashes to make it clear he is the hunted. Flashing lasts 5 seconds. Every time he survives the flashes, he gains 2 points
    - (M) sayan: every time he takes damage under 40% life, for the next 5 seconds, if a player dies he gains back 20% life and gains 2 points.
    - (M) suicide: if he dies by violent death, he gains 1 point
    - (H) lifestealer (alternative to sayan): when he is under 50% life, a player dying gives him a charge. Use one charge to gain 20% life. Gain 1 point for each player that dies when he is under 50% life
    - (H) timewarper: when he taps, sensitivity for every player is changed like fast speed in speedShift (for 10s). Every player that dies in that mode gives him 2 points. He can take someone off guard with this skill
    - (H) the bomb: after 15s from match start, he can tap to activate a timer -> his role will be revealed on his screen (plus audio cue from the dashboard), and after 8 seconds, if he's alive, everyone else will take 50% damage
    - (H) bomb faker: after 15s from match start, he can tap to activate a fake bomb -> another player screen will show like he is the bomb and he is about to explode. If that player is killed before timer's up, he gains 4 points

<!-- - I want better handling for player stats (e.g. toughness or dangerThreshold). I want to add dangerThresholdMultiplier as a new prop for the player (configurable for roles). This should multiply the base dangerThreshold. But we have an issue if we do it like this: we aren't able to handle multiplier from game events (e.g. speed shift) together with player multiplier. I think we should in general expect these two to coexist. Not only for this new multiplier, but also for others in the future (and for toughnessMultiplier). Also, I would remove dangerThreshold from player props, since we don't ever want to override globally configured dangerThreshold. The multiplier will be enough. -->