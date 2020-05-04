var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var stylus = require('stylus');

//Keep website awake
var http = require("http");
setInterval(function() {
    http.get("http://perper-website.herokuapp.com");
}, 300000); // every 5 minutes (300000)

var indexRouter = require('./routes/index');
// var portfolioRouter = require('./routes/portfolio') Not working put it in Index for now
var dbRouter = require('./routes/db');

var app = express();
app.locals.basedir = __dirname; // needed to use absolute paths in pug files

// view engine setup
app.set('views', [path.join(__dirname, 'views')]);
					// path.join(__dirname, 'views/projects/')]);
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(stylus.middleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/db', dbRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
