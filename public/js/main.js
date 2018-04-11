
document.addEventListener("DOMContentLoaded", function() {
	var app = new Vue({
		el: "#app",
		data: {
			displayAuthorized: "password",
			displayApiKey: "password",
			displaySecret: "password",

			cmd: "",
			output: "",

			config: pugLocals.config
		},
		methods: {
			sendCommand: function() {
				var app = this
				sendData(function() {
					ws.send(JSON.stringify({
						cmd: app.cmd
					}))
				})
			},
			sendConfig: function() {
				var app = this
				sendData(function() {
					ws.send(JSON.stringify({
						config: app.config
					}))
				})
			},
		}
	})

	var ws
	function sendData(callback) {
		if (!ws) {
			app.output = ""
			ws = new WebSocket("ws://" + location.host)

			ws.onopen = function(event) {
				console.log("Connection opened")

				callback()
			}

			ws.onerror = function(event) {
				console.log("Connection error")
			}
			ws.onmessage = function(event) {
				app.output += event.data
				// console.log(event.data)
			}
			ws.onclose = function(event) {
				ws = undefined
				console.log("Connection closed")
			}
		}
	}
})

