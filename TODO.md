# TODO list

Here are all the things this game is missing to be complete. PRIORITIES shows next todo points in priority order from top (highest priority) to bottom (lowest). Feel free to remove them once one of them is done. Below are the future tasks divided by their subject.

- PRIORITIES:
    - selecting a team mode from dropdown makes players disappear (they show up again in the following sections)

- IMPROVEMENTS:
    - victory music
    - numbers of deaths in death count mode should be highly visible from a distance. We could also consider showing them on the player screen (or maybe showing a trophy or somthing like that on the player ahead)
    - introduce the possibility of having different background music tracks that are picked at random for a certain mode

- FEATURES:
    - UI: add a settings screen (accessible from the UI) where all the more complex settings (like sensibility of movement detection) can be accessed. In the future, other settings will be accessed through this screen

- BUGS:
    - sometimes all players have the skull at the end of the round. Points are not cumulative. I have to track down when this happens
    - in classic mode, it happened that game didn't start even though everyone put ready
    - TTS doesn't work on iOS -> it's fine, we'll replace it with real voice

- Classic mode specific:

- Death count mode specific:
    - starting screen should be blue (it is gray)
    - all players have a trophy at the end of the round. This should only show up for the player with the most points in this round

- Team mode specific:
    - end of round scoreboard is confusing: it should list players in order of round points. We should also find a way to represent total points for the entire teams
    - points at the end of round should exclude points made by the lowest scoring players. This doesn't happen when all team have the same amount of players. Though, when we have 3, 2 and 2 in teams, team with 3 players will statistically score +50% points compared to other teams. So, we'll just exclude the worst player from their score count as a way to lower the disparity. We can think of other ways to compensate

- Role mode specific:
    - optional through config (and useful for role): hear a sound whenever another player is dead (useful when fighting another one with the earbud on -> without earbuds you would hear his death sound from his phone) 
    - charges should be hidden from the screen. Actually right now we have this bug but we can bypass it. I'll leave it here as history: charges are shown on player screen even though he has no charges (0/1). Maybe this happens when being ironclad in the first round and beast/beasthunter in the second.
    - sound from dashboard with player number: it should say 7 eliminated
    - record sounds for audio to avoid using tts on iPhone (doesn't work)

- New roles (E = easy, M = medium, H = hard):
    - (E) survivor: gain 1 point every 30s alive. Time should be adjusted depending on player number -> lame but good as an introductory role
    - (E) executioner: has a target to kill. If target dies, he gains 2 points and gains a new target.
    - (E) bodyguard/angel: protect another player. 4 points if the other player is in the first 3. Bonus for being last alive is reduced to 2 points. No points rewarded if dying before his target because he could kill himself just to do that
    - (E) berserker: when taking damage, he has tough skin for 3 seconds -> highest threshold (harder to hit) -> promotes going all in and finishing the target/retaliation
    - (E) troll: every time they take damage, they recover it after 8 seconds, unless they get hit again -> promotes chip damage playstyle. After they are discovered by other players, they could be focused. There should be a visual cue when someone gains life back. It's like berserker but promotes opposite gameplay
    - (E) masochist: while under 30% HP, he gains 1 point every 10 seconds
    - (E) ninja: higher sensitivity threshold to take damage, but gets oneshotted. Can gain points differently depending on the increased/decreased difficulty
    - (M) vampire: every 20 seconds he enters bloodlust -> for 5 seconds, he gains 1 point and gains 20% HP if someone else takes damage during this mode
    - (M) jester: his life changes by showing wrong things, like healing or losing more life than he should when he gets hit.
    - (M) hunted: similar to survivor. Every 20s, players will hear "The hunter is alive" and the hunter's screen flashes to make it clear he is the hunter. Flashing lasts 5 seconds. Every time he survives the flashes, he gains 2 points
    - (M) siblings: two players, they know each other and when one loses HP, the other one does the same. They have +50% the life of every other player
    - (M) vulture: gains 2 point every time another player dies within 5 seconds from another death while he is alive -> promotes predatory gameplay
    - (M) sayan: every time he takes damage under 40% life, for the next 5 seconds, if a player dies he gains back 20% life and gains 2 points.
    - (H) lifestealer (alternative to sayan): when he is under 50% life, a player dying gives him a charge. Use one charge to gain 20% life. Gain 1 point for each player that dies when he is under 50% life
    - (H) timewarper: when he taps, sensitivity for every player is changed like fast speed in speedShift. Every player that dies in that mode gives him 2 points. He can take someone off guard with this skill -> risks frustrating players
    - (H) the bomb: after 3 players died, he can tap to activate a timer -> his role will be revealed on his screen (plus audio cue for every player), and after 8 seconds, if he's alive, everyone else will take 50% damage
    - (H) bomb faker: after 3 players died, he can tap to activate a fake bomb -> another player screen will show like he is the bomb and he is about to explode. If that player is killed before timer's up, he gains 4 points

<!-- - I want better handling for player stats (e.g. toughness or dangerThreshold). I want to add dangerThresholdMultiplier as a new prop for the player (configurable for roles). This should multiply the base dangerThreshold. But we have an issue if we do it like this: we aren't able to handle multiplier from game events (e.g. speed shift) together with player multiplier. I think we should in general expect these two to coexist. Not only for this new multiplier, but also for others in the future (and for toughnessMultiplier). Also, I would remove dangerThreshold from player props, since we don't ever want to override globally configured dangerThreshold. The multiplier will be enough. -->