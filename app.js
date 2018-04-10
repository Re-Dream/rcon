var http = require("http")
var ws = require("ws")
var createError = require("http-errors")
var express = require("express")
var session = require("express-session")
var path = require("path")
var logger = require("morgan")
var steam = require("steam-login")
var fs = require("fs")
var util = require("util")
var cp = require("child_process")

var app = express()
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

/* to be reused later
var commands = {
	help: {
		name: "help",
		callback: function(req, res) {
			var buf = "Available commands:\n"
			for (name in commands) {
				var command = commands[name]
				buf += util.format("	<b>%s</b>%s\n", name, command.help ? ": " + command.help : "")
			}
			res.render("index", {
				output: buf
			})
		},
		help: "Displays this."
	},
}
*/
function ifAuthed(req, res, callback) {
	if (req.session.steamUser) {
		if (res)
			res.redirect("/authenticate")
	} else {
		if (app.config.admins.includes(req.user.steamid)) {
			callback()
		} else {
			if (res)
				res.render("denied")
		}
	}
}
app.get("/", function(req, res) {
	console.log(req.session)
	ifAuthed(req, res, function() {
		res.render("index", {
			name: req.user.username,
		})
		// console.log(JSON.stringify(req.user, null, 4))
	})
})

app.get("/authenticate", steam.authenticate(), function(req, res) {
    res.redirect("/")
})
app.get("/verify", steam.verify(), function(req, res) {
	res.locals.user = req.user
	res.redirect("/")
	// res.send(req.user).end()
})
app.get("/logout", steam.enforceLogin("/"), function(req, res) {
	req.logout()
	res.locals.user = undefined
    res.render("logout")
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
app.wss = new ws.Server({
	verifyClient: (info, done) => {
		app.sessionParser(info.req, {}, () => {
			done(info.req.session.steamUser)
		})
	},
	server
})
app.wss.on("connection", (ws, req) => {
	ws.on("message", (message) => {
		console.log(req.session)
	})
})

module.exports = app
