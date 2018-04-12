
document.addEventListener("DOMContentLoaded", function() {
	// return

	var pad = function(num) {
		return ("00" + num).slice(-2)
	}

	var app
	var ws
	var timeout
	function sendData(callback) {
		var hadSuccess
		if (!ws) {
			app.output = ""
			app.finished = false
			app.success = false
			app.failed = false
			app.reason = ""
			if (timeout) {
				clearTimeout(timeout)
			}

			ws = new WebSocket("ws://" + location.host)

			ws.onopen = function(event) {
				console.log("Connection opened")

				callback()
			}

			ws.onerror = function(event) {
				app.failed = true
				app.reason = "Websocket encountered an error."
				hadSuccess = true
				console.log("Connection error")
			}
			ws.onmessage = function(event) {
				var data
				try {
					data = JSON.parse(event.data)
				} catch (e) {

				}

				if (data !== undefined) {
					app.output += data.output || ""
					if (data.success && !app.failed) {
						app.success = true
						app.reason = "Task completed successfully!"
						hadSuccess = true
					} else if (data.success == false) {
						app.success = false
						app.failed = true
						app.reason = "Task failed!"
						hadSuccess = true
					}
				} else {
					app.success = false
					app.failed = true
					app.reason = "Invalid data from the Websocket, can't parse results"
				}
				// console.log(event.data)
			}
			ws.onclose = function(event) {
				app.finished = true
				if (hadSuccess) {
					app.success = !app.failed
				} else {
					app.success = false
					app.failed = true
					app.reason = "Task didn't ever state success?"
				}
				timeout = setTimeout(function() {
					app.finished = false
					app.success = false
					app.failed = false
					app.reason = ""
				}, 5000);
				ws = undefined
				console.log("Connection closed")
			}
		}
	}

	var darkTheme = JSON.parse(Cookies.get("darkTheme"))
	app = new Vue({
		el: "#app",
		data: {
			cmd: "",
			output: "",

			display: {
				authorizations: "password",
				apikey: "password",
				secret: "password"
			},

			server: pugLocals ? pugLocals.server : undefined,
			config: pugLocals ? pugLocals.config : undefined,

			finished: false,
			failed: false,
			success: false,
			reason: "",

			onlineAdd: 0,

			darkTheme: darkTheme !== undefined ? darkTheme : true,
		},
		methods: {
			sendCommand: function() {
				var app = this // Needed
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
			niceTime: function() {
				var server = this.server
				for (k in server.players) {
					var ply = server.players[k]

					var online = ply.online + this.onlineAdd
					var h = Math.floor(online / 60 / 60)
					var m = Math.floor(online / 60 - h * 60)
					var s = Math.floor(online - m * 60 - h * 60 * 60)
					var time = h > 1 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`

					return time
				}
			},
			saveTheme: function() {
				Cookies.set("darkTheme", this.darkTheme)
				console.log(Cookies.get("darkTheme"))
			}
		}
	})
	if (!app.config) {
		setInterval(function() {
			app.onlineAdd++
		}, 1000)
	}
})

