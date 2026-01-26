# TODO list

Here are all the things this game is missing to be complete, in priority order from top (highest priority) to bottom (lowest). Feel free to remove them once one of them is done:

- finish feature "shake to ready" and implement tests to avoid regression. Make sure main game can still be run in development without the need for the browser tab to actually provide sensor data (easier development process)
- write tests that specifically target frontend components. Pick the library you think fits best for the need. The main goal is to make Claude as independant as possible by providing all the useful information
- add new settings: there must be a way to pick the level of sensibility of movements when in the main dashboard screen
- add a settings screen (accessible from the UI) where all the more complex settings (like sensibility of movement detection) can be accessed. In the future, other settings will be accessed through this screen
- think of the best way for this application to store relevant data. Here, I'm talking about settings, which should be able to persist even when server is restarted. Of course there should be a way to flush settings in order to be able to run tests without having weird settings on. Remember to write tests to check persistence of settings works
- rewrite docs so that they include every relevant information and so that they don't include outdated data
