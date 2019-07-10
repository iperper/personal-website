var express = require('express');
var router = express.Router();
var path = require('path');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', {title: 'Isaac Perper'});
});

router.get('/temp_project', function(req, res, next) {
	console.log(req.params);
  res.render('temp_project', {title: 'Isaac Perper'});
});

router.get("/projects/*", function(req, res,next) {
	const pageUrl = req.params['0'];
	if (pageUrl){
		const projectUrl = path.join('projects', pageUrl);
		res.render(projectUrl);
	}
	else{
		res.render("temp_project", {title: 'Isaac Perper'});
	}
});

module.exports = router;
