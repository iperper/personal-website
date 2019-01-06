var express = require('express');
var router = express.Router();

/* GET Project page. */
router.get('/temp_project', function(req, res, next) {
  res.render('temp_project', {title: 'Isaac Perper'});
});

module.exports = router;
