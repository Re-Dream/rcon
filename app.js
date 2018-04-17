const http = require("http")
const WebSocket = require("ws")
const createError = require("http-errors")
const express = require("express")
const session = require("express-session")
const path = require("path")
const logger = require("morgan")
const steam = require("steam-login")
const fs = require("fs")
const util = require("util")
const SourceQuery = require("sourcequery")
const RateLimit = require("express-rate-limit");

const app = express()
app.config = JSON.parse(fs.readFileSync("config.json"))
app.sessionParser = session({
	resave: false,
	saveUninitialized: false,
	secret: app.config.secret
})
app.enable('trust proxy')

// Hack to send all desired locals in one JSON string so the client can also read them
var badLocals = [
	"message",
	"error",
	"values"
]
var _render = app.response.render
app.response.render = function(view, options, ...args) {
	var res = this
	var locals = {}
	for (var name in res.locals) {
		if (!badLocals.includes(name)) {
			locals[name] = res.locals[name]
		}
	}
	for (var name in options) {
		locals[name] = options[name]
	}
	res.locals.values = JSON.stringify(locals) || "{}"
	_render.call(res, view, options, ...args)
}

// view engine setup
app.set("views", path.join(__dirname, "views"))
app.set("view engine", "pug")

app.use(logger("dev"))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(express.static(path.join(__dirname, "public")))
app.use(new RateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100,
	delayMs: 0 // disabled
}))
app.use(app.sessionParser)
var realm = app.config.realm || "http://localhost:" + (process.env.PORT || "3000")
app.use(steam.middleware({
    realm: realm,
    verify: realm + "/verify",
    apiKey: app.config.apikey}
))
const devMode = process.env.NODE_ENV !== "production"
app.use(function(req, res, next) {
	res.locals.devMode = devMode
	res.locals.user = req.user
	next()
})

/* GET home page. */

function ifAuthed(req, res, callback) {
	if (!req.session.steamUser && !devMode) {
		if (res)
			req.session.from = "." + req.path
			res.redirect("./authenticate")
	} else {
		if (devMode || app.config.admins.includes(req.session.steamUser.steamid)) {
			callback()
		} else {
			if (res)
				res.render("denied")
		}
	}
}
function getServerInfo() {
	var sq = new SourceQuery(1000)
	var address = app.config.server.match(/^([^\:]+):?(\d+)?$/gi)
	var ip = address[0]
		port = address[1] || 27015
	sq.open(ip, port)
	var server = {}

	return new Promise(function(resolve, reject) {
		sq.getInfo(function(err, info) {
			if (err) { reject(err) }
			server.info = info

			sq.getPlayers(function(err, players) {
				if (err) { reject(err) }

				for (var k in players) {
					if (players[k].name === "") {
						players.splice(k, 1)
					}
				}
				server.players = players

				resolve(server)
			})
		})
	})
}
app.get("/api/server", function(req, res) {
	getServerInfo().then(function(data) {
		res.type("json")
		res.send(JSON.stringify(data))
	})
})
app.get("/", function(req, res) {
	ifAuthed(req, res, function() {
		res.render("index")
	})
})

app.get("/authenticate", steam.authenticate(), function(req, res) {
	// res.redirect(req.session.from || "/")
	// req.session.from = undefined
})
app.get("/verify", steam.verify(), function(req, res) {
	res.locals.user = req.user
	res.redirect(req.session.from || "./")
	req.session.from = undefined
})
app.get("/logout", steam.enforceLogin("./"), function(req, res) {
	req.logout()
	res.locals.user = undefined
    res.render("logout")
})

app.get("/config", function(req, res) {
	ifAuthed(req, res, function() {
		res.render("config", {
			config: app.config
		})
	})
})

// catch 404 and forward to error handler
app.use(function(req, res, next) {
	next(createError(404))
})

// error handler
app.use(function(err, req, res, next) {
	// set locals, only providing error in development
	res.locals.message = err.message
	res.locals.error = devMode ? err : {}

	// render the error page
	res.status(err.status || 500)
	res.render("error")
})

const server = http.createServer(app)
app.server = server
app.wss = new WebSocket.Server({
	verifyClient: function(info, done) {
		app.sessionParser(info.req, {}, function() {
			done(info.req.session.steamUser || devMode)
		})
	},
	server
})

const commands = require("./commands.js")
function runCommand(data, target, req) {
	var res = Object.create(target)
	switch (target.constructor.name) {
		case "ServerResponse": {
			res.send = function(data, ...args) {
				target.write(JSON.stringify(data), ...args)
			}
			res.close = target.end
			break
		}
		case "WebSocket": {
			res.send = function(data, ...args) {
				target.send(JSON.stringify(data), ...args)
			}
			break
		}
	}

	var command = (data && data.cmd) ? commands[data.cmd] : undefined
	if (command) {
		command.callback(res, req)
	} else if (data.cmd !== undefined) {
		res.send({
			output: "Invalid input!\n\n",
			success: false
		})
		commands.help.callback(res, req)
	}
}
app.post("/", function(req, res, next) {
	if (app.config.authorizations.includes(req.get("Authorization"))) {
		var data
		try {
			data = req.body
		} catch (e) {

		}

		runCommand(data, res, req)
	} else {
		next(createError(403))
	}
})
app.wss.on("connection", function(ws, req) {
	ws.on("message", function(message) {
		var data
		try {
			data = JSON.parse(message)
		} catch (e) {

		}

		var config = (data && data.config) ? data.config : undefined
		if (config) {
			for (var option in config) {
				if (app.config[option]) {
					app.config[option] = config[option]
				}
			}
			fs.writeFileSync("config.json", JSON.stringify(app.config, null, 4))
			ws.send(JSON.stringify({
				output: "Config saved successfully!",
				success: true
			}))
			ws.close()
			return
		}

		runCommand(data, ws, req)
	})
})

module.exports = app
