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

const app = express()
app.config = JSON.parse(fs.readFileSync("config.json"))
app.sessionParser = session({
	resave: false,
	saveUninitialized: false,
	secret: app.config.secret
})

// view engine setup
app.set("views", path.join(__dirname, "views"))
app.set("view engine", "pug")

app.use(logger("dev"))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(express.static(path.join(__dirname, "public")))
app.use(app.sessionParser)
app.use(steam.middleware({
    realm: "http://localhost:3000/",
    verify: "http://localhost:3000/verify",
    apiKey: app.config.apikey}
))
app.use((req, res, next) => {
    res.locals.user = req.user;
    next();
});

/* GET home page. */

function ifAuthed(req, res, callback) {
	if (!req.session.steamUser) {
		if (res)
			req.session.from = req.path
			res.redirect("/authenticate")
	} else {
		if (app.config.admins.includes(req.session.steamUser.steamid)) {
			callback()
		} else {
			if (res)
				res.render("denied")
		}
	}
}
app.get("/", function(req, res) {
	// console.log(req.session)
	ifAuthed(req, res, function() {
		var sq = new SourceQuery(1000)
		var address = app.config.server.match(/^([^\:]+):?(\d+)?$/gi)
		var ip = address[0]
			port = address[1] || 27015
		// console.log(ip, port)
		sq.open(ip, port)
		var server = {}
		sq.getInfo(function(err, info) {
			server.info = info

			sq.getPlayers(function(err, players) {
				server.players = players

				res.render("index", {
					server: server,
					util: util
				})
			})
		})

		// console.log(JSON.stringify(req.user, null, 4))
	})
})
function runCommand(data, target, req) {
	var res = target
	switch (target.constructor.name) {
		case "ServerResponse": {
			res.send = target.write
			res.close = target.end
			break
		}
		case "WebSocket": {
			break
		}
	}

	var command = (data && data.cmd) ? commands[data.cmd] : undefined
	if (command) {
		command.callback(res, req)
	} else if (data.cmd !== undefined) {
		res.send("Invalid input!\n\n")
		commands.help.callback(res, req)
	}
}
app.post("/", function(req, res, next) {
	if (app.config.authorized.includes(req.get("Authorization"))) {
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

app.get("/authenticate", steam.authenticate(), function(req, res) {
	res.redirect(req.session.from || "/")
	req.session.from = undefined
})
app.get("/verify", steam.verify(), function(req, res) {
	res.locals.user = req.user
	res.redirect(req.session.from || "/")
	req.session.from = undefined
	// res.send(req.user).end()
})
app.get("/logout", steam.enforceLogin("/"), function(req, res) {
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
	res.locals.error = req.app.get("env") === "development" ? err : {}

	// render the error page
	res.status(err.status || 500)
	res.render("error")
})

const server = http.createServer(app)
app.server = server
app.wss = new WebSocket.Server({
	verifyClient: (info, done) => {
		app.sessionParser(info.req, {}, () => {
			done(info.req.session.steamUser)
		})
	},
	server
})

const commands = require("./commands.js")
app.wss.on("connection", (ws, req) => {
	ws.on("message", (message) => {
		var data
		try {
			data = JSON.parse(message)
		} catch (e) {

		}

		var config = (data && data.config) ? data.config : undefined
		if (config) {
			for (option in config) {
				if (app.config[option]) {
					app.config[option] = config[option]
				}
			}
			fs.writeFileSync("config.json", JSON.stringify(app.config, null, 4))
			ws.send("Config saved successfully!")
			ws.close()
			return
		}

		runCommand(data, ws, req)
	})
})

module.exports = app
