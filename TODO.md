# TODO list

Here are all the things this game is missing to be complete, in priority order from top (highest priority) to bottom (lowest). Feel free to remove them once one of them is done:

- there should be a way for the admin to stop and exit the current game, returning to main dashboard screen. Of course this should reset everything like it was before game start
- on round end, when returning to lobby, players are already marked as ready. This should not occur, players ready state should be reset to not ready if an admin clicks on the button to return to the dashboard main screen. Also, if all players get ready on game end, a new game with the same players should be started.
- add a settings screen (accessible from the UI) where all the more complex settings (like sensibility of movement detection) can be accessed. In the future, other settings will be accessed through this screen
- think of the best way for this application to store relevant data. Here, I'm talking about settings, which should be able to persist even when server is restarted. Of course there should be a way to flush settings in order to be able to run tests without having weird settings on. Remember to write tests to check persistence of settings works
