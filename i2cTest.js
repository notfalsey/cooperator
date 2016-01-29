var async = require('async'),
	i2c = require('i2c');


var address = 0x05;
var wire = new i2c(address, {device: '/dev/i2c-1'}); // point to your i2c address, debug provides REPL interface

wire.scan(function(err, data) {
  // result contains an array of addresses
  console.log('scan result: ' + JSON.stringify(data));
});

var testNum = process.argv[2];
var count = 1;
var error = false;

/*async.whilst(
	function() { return count <= testNum && !error; },
	function(callback) {
		console.log('checking :  ' + count);
		setTimeout(function() {
			wire.writeByte(count, function(err) {
				if(err) {
					error = true;
					callback(err);
					console.log('err writing: ' + err);
				} else {
					wire.read(function(err, res) {
						if(err) {
							error = true;
							callback(err);
							console.log('err reading: ' + err);
						} else {
							if(res !== count) {
								error = true;
								callback(new Error('Error reading data back'));
							} else {
								count++;
								callback();	
							}
						}
					});	
				}
			});
		}, 1000);
	},
	function(err, n){
		if(err) {
			console.log('err: ' + err);
			if(n !== testNum) {
				console.log('Did not return all test results correctly, only returned: ' + n);
			} else {
				console.log('Returned all test results correctly');
			}
		}
	}
);*/

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
			wire.read(2, function(err, readBytes) {
				if(err) {
					console.log('err reading: ' + err);
				} else {
					console.log('read: ' + JSON.stringify(readBytes));
					var reading = readBytes[0]*256 + readBytes[1];
					console.log('into: ' + reading);				
				}
			});
		}, 1000);
	}
});



