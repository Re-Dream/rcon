
$(function() {
	var ws

	$("input[name='cmd']").on("keyup", function(event) {
		if (event.key !== "Enter") return
		$("button[type='submit']").click()
		event.preventDefault()
	})

	$("input[type='checkbox']").change(function() {
		var option = $(this).parent()
		if (option[0] && option.hasClass("config-option")) {
			option.find("input[name='textinput']").attr("type", $(this).is(":checked") ? "text" : "password")
		}
	})

	function removeAdmin() {
		var admin = $(this).parent()
		if (admin[0] && admin.is("li")) {
			admin.remove()
		}
	}
	$("button[name='remove-admin']").click(removeAdmin)
	$("button[name='add-admin']").click(function() {
		var admins = $("div.config-option[name='admins'] ul")
		if (admins[0]) {
			var admin = $("<li>")
			var steamid = $("<input>")
				steamid.attr("type", "text")
				steamid.appendTo(admin)
			var remove = $("<button>")
				remove.attr("name", "remove-admin")
				remove.text("-")
				remove.click(removeAdmin)
				remove.appendTo(admin)
			admin.appendTo(admins)
		}
	})

	$("button[type='submit']").click(function() {
		if (!ws) {
			$("pre.output").empty()
			ws = new WebSocket("ws://" + location.host)

			ws.onopen = function(event) {
				console.log("Connection opened")

				switch (location.pathname) {
					case "/config": {
						var config = {}
						config.admins = []
						$("div.config-option[name='admins'] ul li input").map(function() {
							config.admins.push($(this).val())
						})
						config.apikey = $("div.config-option[name='apikey'] input[name='textinput']").val()
						config.secret = $("div.config-option[name='secret'] input[name='textinput']").val()
						config.server = $("div.config-option[name='server'] input[name='textinput']").val()
						var json = JSON.stringify({
							config: config
						})
						console.log(json)
						ws.send(json)
						break
					}
					case "/": {
						ws.send(JSON.stringify({
							cmd: $("input").val()
						}))
						break
					}
					default: {
						console.log("Nothing to do")
						ws.close()
					}
				}
			}

			ws.onerror = function(event) {
				console.log("Connection error")
			}
			ws.onmessage = function(event) {
				$("pre.output").append(event.data)
				// console.log(event.data)
			}
			ws.onclose = function(event) {
				ws = undefined
				console.log("Connection closed")
			}
		}
	})
})
