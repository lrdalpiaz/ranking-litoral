var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const mongoose = require('mongoose');
require('dotenv').config();


var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var matchesRouter = require('./routes/matches');
var tournamentsRouter = require('./routes/tournaments');
var app = express();

const mongoURI = process.env.MONGODB_URI || "mongodb+srv://lrdalpiaz:jp9N3bnaeTg4cr6c@cluster0.lgxrw0w.mongodb.net/sample_mflix?appName=Cluster0";
mongoose.connect(mongoURI)
  .then(() => console.log("✅ Conectado ao MongoDB Atlas com sucesso!"))
  .catch((err) => console.error("❌ Erro ao conectar ao MongoDB:", err));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/matches', matchesRouter);
app.use('/tournaments', tournamentsRouter);

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
