
$(function() {
	var ws

	$("input[name='cmd']").on("keyup", function(event) {
		if (event.key !== "Enter") return
		$("button[type='submit']").click()
		event.preventDefault()
	})

	function togglePassword() {
		var option = $(this).parent().siblings("input[name='textinput']")
		if (option[0]) {
			option.attr("type", $(this).is(":checked") ? "text" : "password")
		}
	}
	function removeItem() {
		var item = $(this).parent()
		if (item[0] && item.is("li")) {
			item.remove()
		}
	}
	$("input[type='checkbox']").change(togglePassword)
	$("button[name='remove']").click(removeItem)
	$("button[name='add']").click(function() {
		var option = $(this).parents("div.config-option")
		if (option[0]) {
			var item = $("<li>")

			var value = $("<input>")
				value.attr("type", option.attr("name") == "authorized" ? "password" : "text")
			value.appendTo(item)

			var remove = $("<button>")
				remove.attr("name", "remove")
				remove.text("-")
				remove.click(removeItem)
			remove.appendTo(item)

			if (option.attr("name") == "authorized") {
				value.attr("name", "textinput")

				var label = $("<label>")
					var checkbox = $("<input>", {
						type: "checkbox",
						autocomplete: "off"
					})
					checkbox.change(togglePassword)
					checkbox.appendTo(label)
					label.append("Show")
				label.appendTo(item)
			}
			item.appendTo(option.find("ul"))
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
						config.authorized = []
						$("div.config-option[name='authorized'] ul li input").map(function() {
							config.authorized.push($(this).val())
						})
						config.apikey = $("div.config-option[name='apikey'] input[name='textinput']").val()
						config.secret = $("div.config-option[name='secret'] input[name='textinput']").val()
						config.server = $("div.config-option[name='server'] input[name='textinput']").val()
						var json = JSON.stringify({
							config: config
						})
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
