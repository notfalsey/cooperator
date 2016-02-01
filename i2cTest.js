var async = require('async'),
	i2c = require('i2c');


var address = 0x05;
var wire = new i2c(address, {device: '/dev/i2c-1', debug: false}); // point to your i2c address, debug provides REPL interface

/*wire.scan(function(err, data) {
  // result contains an array of addresses
  console.log('scan result: ' + JSON.stringify(data));
});*/

var command = process.argv[2];
var args = [];
for(var i = 3 ; i < process.argv.length; i++) {
	args.push(process.argv[i]);
}
var command = process.argv[2];
console.log('sending command: ' + command + ', args: ' + args);

wire.writeBytes(command, args, function(err) {
	if(err) {
		console.log('err writing: ' + err);
	} else {
		setTimeout(function() {
			wire.read(4, function(err, readBytes) {
				if(err) {
					console.log('err reading: ' + err);
				} else {
					console.log('read: ' + JSON.stringify(readBytes));
					
					var reading = (readBytes[0]<<24) + (readBytes[1]<<16) + (readBytes[2]<<8) + readBytes[3];
					//var reading = (readBytes[0]<<8) + readBytes[1];
					console.log('into: ' + reading);				
				}
			});
		}, 50);
	}
});



