
$(function() {
	var ws

	$("button").click(function() {
		if (!ws) {
			ws = new WebSocket("ws://" + location.host)

			ws.onopen = function(event) {
				console.log("Connection opened")
				ws.send("hi")
			}

			ws.onerror = function(event) {
				console.log("Connection error")
			}

			ws.onmessage = function(event) {
				console.log(event.data)
			}

			ws.onclose = function(event) {
				ws = undefined
				console.log("Connection closed")
			}
		}
	})
})
