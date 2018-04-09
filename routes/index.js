var express = require("express")
var steam = require("steam-login")
var router = express.Router()

/* GET home page. */

function isAuthed(req, res, callback) {

	if (req.user == null) {
		res.redirect("/authenticate")
	} else {
		callback()
	}
}

router.get("/", function(req, res) {
	isAuthed(req, res, function() {
		res.render("index", {
			name: req.user.username
		})
	})
})

router.get("/authenticate", steam.authenticate(), function(req, res) {
    res.redirect("/")
})

router.get("/verify", steam.verify(), function(req, res) {
	res.redirect("/")
	// res.send(req.user).end()
})

router.get("/logout", steam.enforceLogin("/"), function(req, res) {
    req.logout()
    res.redirect("/")
})

module.exports = router
