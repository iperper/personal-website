var express = require('express');
var router = express.Router();
var path = require('path');
// const VisitorDB = require('../db/VisitorDB');


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', {title: 'Isaac Perper'});
//   VisitorDB.updateProject('index');
});

router.get('/temp_project', function(req, res, next) {
	console.log(req.params);
	res.render('temp_project', {title: 'Isaac Perper'});
});

router.get("/projects/*", function(req, res,next) {
	const pageUrl = req.params['0'];
	// console.log(req.params);
	// VisitorDB.updateProject(pageUrl);
	if (pageUrl){
		const projectUrl = path.join('projects', pageUrl);
		res.render(projectUrl);
	}
	else{
		res.render("temp_project", {title: 'Isaac Perper'});
	}
});

module.exports = router;


// router.get('/user', async(req, res) => {
//     let response = await UsersDB.getUserByUsername(req.body.username);
//     res.status(200).json(response).end();
// });

// router.post('/', async(req, res) => {
//     try {
//         let response = await UsersDB.addUser(req.body.username, req.body.password);
//         res.status(200).json(response).end();
//     } catch (e) {
//         res.status(400).json(e).end();
//     }
// });
