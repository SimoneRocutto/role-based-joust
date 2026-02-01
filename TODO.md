# TODO list

Here are all the things this game is missing to be complete, in priority order from top (highest priority) to bottom (lowest). Feel free to remove them once one of them is done:

- in dashboard main screen, when a player disconnects and then a new one enters, the new number should be the lowest possible number. E.g. players #1 and #2 enter. Then player 2 exits. After that, if a new player enters, it will be #3. That's a bug: it should be #2. When handling this, of course keep in mind this should play nice with reconnection handling (which btw should only be taken care during an active game)
- add a settings screen (accessible from the UI) where all the more complex settings (like sensibility of movement detection) can be accessed. In the future, other settings will be accessed through this screen
- think of the best way for this application to store relevant data. Here, I'm talking about settings, which should be able to persist even when server is restarted. Of course there should be a way to flush settings in order to be able to run tests without having weird settings on. Remember to write tests to check persistence of settings works
