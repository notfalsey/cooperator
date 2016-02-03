# coopweb
This project is a node.js web application for interfacing with and controlling a chicken coop controller.  It is designed to run on a raspberry pi that communicates with an arduino over an i2c bus.  It collects current sunrise/sunset information for the local area from the weatherunderground REST API.  The arduino reports state on the door from the coop over an i2c bus and takes commands to operate the door.  See https://github.com/notfalsey/coop for the arduino code and circuit. 

The front-end of the application uses angular and bootstrap.

![Alt text](/screenshot.jpg?raw=true "Cooperator screenshot")
