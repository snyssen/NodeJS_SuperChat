'use strict';
var http = require('http');
var express = require('express');
var morgan = require('morgan');
var fs = require('fs');
var ent = require('ent');
// cookies du serveur Express
var session = require("express-session")({
	secret: "lW6RR8%i6r!7",
	resave: true,
	saveUninitialized: true
});
// cookies du socket
var sharedsession = require("express-socket.io-session");

var app = express();
var Server = http.Server(app);

// Création des cookies du socket
var io_session = require("express-session")({
	secret: "@7@KaO43xDPN",
	resave: true,
	saveUninitialized: true
});

app.use(morgan('combined')) // logs du serveur
	.use(session) // On active les cookies
	// Génère un nouvel historique si aucun n'est connu
	.use(function (req, res, next) {
		if (typeof (req.session.history) == 'undefined') {
			req.session.history = [];
		}
		next();
	})
	// page principale
	.get('/', function (req, res) {
		fs.readFile('./index.html', 'utf-8', function (error, content) {
			res.writeHead(200, { "Content-Type": "text/html" });
			res.end(content);
		})
	})
	// Renvoie le stylesheet de la page
	.get('/style.css', function (req, res) {
		fs.readFile('./style.css', 'utf-8', function (error, content) {
			res.writeHead(200, { "Content-Type": "text/css" });
			res.end(content);
		})
	})
	// Redirection des mauvaises url vers la page principale
	.use(function (req, res) {
		res.redirect('/');
	});

// Chargement de socket.io
var io = require('socket.io').listen(Server);

// On active les cookies
io.use(sharedsession(session, {
	autoSave: true
})); 

io.sockets.on('connection', function (socket) {
	console.log('nouvelle connexion au socket !');
	//Connexion d'un utilisateur
	socket.on("login", function (userdata) {
		userdata = ent.encode(userdata);
		socket.handshake.session.userdata = userdata;
		socket.broadcast.emit('new connection', userdata);
		socket.handshake.session.save();
	});
	// Non utilisé, mais permet de déconnecter un utilisateur
	socket.on("logout", function (userdata) {
		if (socket.handshake.session.userdata) {
			delete socket.handshake.session.userdata;
			socket.handshake.session.save();
		}
	});        

	// Envoi d'un message
	socket.on("send message", function (sent_msg, callback) {
		sent_msg = ent.encode(sent_msg);
		sent_msg = "<p> [" + socket.handshake.session.userdata + "] @ [ " + getCurrentDate() + " ]: " + sent_msg + "</p>";
		console.log("message envoyé : " + sent_msg);
		socket.emit('local update', sent_msg); // On renvoie le message au client émetteur
		socket.broadcast.emit('broadcast update', sent_msg); // Et on l'envoie aux autres
		// Exécute le callback qui vide notre input
		callback();
	});
});

// Renvoie un timestamp du moment actuel
function getCurrentDate() {
	var currentDate = new Date();
	var day = (currentDate.getDate() < 10 ? '0' : '') + currentDate.getDate();
	var month = ((currentDate.getMonth() + 1) < 10 ? '0' : '') + (currentDate.getMonth() + 1);
	var year = currentDate.getFullYear();
	var hour = (currentDate.getHours() < 10 ? '0' : '') + currentDate.getHours();
	var minute = (currentDate.getMinutes() < 10 ? '0' : '') + currentDate.getMinutes();
	var second = (currentDate.getSeconds() < 10 ? '0' : '') + currentDate.getSeconds();
	return year + "-" + month + "-" + day + " " + hour + ":" + minute + ":" + second;
}

Server.listen(1337);