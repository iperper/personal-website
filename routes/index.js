var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', {title: 'Isaac Perper'});
});

router.get('/temp_project', function(req, res, next) {
  res.render('temp_project', {title: 'Isaac Perper'});
});

module.exports = router;
