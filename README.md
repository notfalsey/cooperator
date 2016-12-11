# cooperator
This project is a node.js web application for interfacing with and controlling a chicken coop controller.  It is designed to run on a raspberry pi that communicates with an arduino over an i2c bus.  It gets the current sunrise/sunset information using [suncalc](https://github.com/mourner/suncalc).  The arduino reports state on the door from the coop over an i2c bus and takes commands to operate the door.  See [coop](https://github.com/notfalsey/coop) for the arduino code and circuit. 

The front-end of the application uses angular and bootstrap.

![Alt text](/screenshot.jpg?raw=true "Cooperator screenshot")
