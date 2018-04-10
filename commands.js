
const util = require("util")

var commands = {
	help: {
		callback: function(ws, req) {
			var buf = "Available commands:\n"
			for (name in commands) {
				var command = commands[name]
				buf += util.format("	<b>%s</b>%s\n", name, command.help ? ": " + command.help : "")
			}
			ws.send(buf)
			ws.close()
		},
		help: "Displays this."
	}
}

var custom_commands
try {
	custom_commands = require("./custom_commands.js") // Load our private stuff!
} catch (e) {

}
if (custom_commands) {
	for (name in custom_commands) {
		if (!commands[name]) {
			commands[name] = custom_commands[name]
		}
	}
}

module.exports = commands

