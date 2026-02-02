# TODO list

Here are all the things this game is missing to be complete, in priority order from top (highest priority) to bottom (lowest). Feel free to remove them once one of them is done:

- classic mode (but maybe it is a bug of role mode too), on the winner screen always shows 2/2 players ready (in a 2 player game) as soon as the game ends. Then if one shakes to be ready, it correctly refreshes to 1/2. It should start from 0/2
- add a qr code on the lobby screen that redirects to the basepath/join. This will be used by players to connect
- add a settings screen (accessible from the UI) where all the more complex settings (like sensibility of movement detection) can be accessed. In the future, other settings will be accessed through this screen
- think of the best way for this application to store relevant data. Here, I'm talking about settings, which should be able to persist even when server is restarted. Of course there should be a way to flush settings in order to be able to run tests without having weird settings on. Remember to write tests to check persistence of settings works
- game should remember last used settings after game is over and keep them like this (maybe fixed by previous point)
