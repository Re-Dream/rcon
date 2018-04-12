
const util = require("util")

var commands = {
	help: {
		callback: function(target, req) {
			var buf = "Available commands:\n"
			for (var name in commands) {
				var command = commands[name]
				buf += util.format("	<b>%s</b>%s\n", name, command.help ? ": " + command.help : "")
			}
			target.send({
				output: buf,
				success: true
			})
			target.close()
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
	for (var name in custom_commands) {
		if (!commands[name]) {
			commands[name] = custom_commands[name]
		}
	}
}

module.exports = commands

