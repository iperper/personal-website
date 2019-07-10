var express = require('express');
var router = express.Router();

/* GET Project page. */
// router.get('../temp_project', function(req, res, next) {
//   res.render('temp_project', {title: 'Isaac Perper'});
// });

router.get('colorwave', function(req, res, next) {
  res.render('colorwave', {title: 'Isaac Perper'});
});
// router.get("*", function(req, res) {
// 	console.log(req);
// 	// console.log("Res", res);
// 	const pageUrl = req.params['0'];
// 	// console.log("Page url");
// 	console.log(req);
// 	const projectUrl = path.join('projects', 'colorwave');
// 	console.log(projectUrl);
// 	res.render('/projects/colorwave');
// });

module.exports = router;
