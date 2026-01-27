# TODO list

Here are all the things this game is missing to be complete, in priority order from top (highest priority) to bottom (lowest). Feel free to remove them once one of them is done:

- add new settings: there must be a way to pick the level of sensibility of movements when in the main dashboard screen
- add a settings screen (accessible from the UI) where all the more complex settings (like sensibility of movement detection) can be accessed. In the future, other settings will be accessed through this screen
- think of the best way for this application to store relevant data. Here, I'm talking about settings, which should be able to persist even when server is restarted. Of course there should be a way to flush settings in order to be able to run tests without having weird settings on. Remember to write tests to check persistence of settings works
- rewrite docs so that they include every relevant information and so that they don't include outdated data
