'use strict';

const router = require('express').Router();
const {doDeploy} = require('../lib/deploy');

router.all('/', async function(req, res, next) {
	try{
		var event = req.headers['x-github-event'];
		var call = (req.body.created && 'create') || 
			(req.body.deleted && 'delete') || 
			'update';

		var branch = req.body.ref.replace('refs/heads/', '');
		var sshURL = req.body.repository.ssh_url;
		var commit = req.body.after;
		let repo   = req.body.repository.full_name;

		let id = await doDeploy('create', repo, branch, sshURL, commit);
		
		res.json({id});

	}catch(error){
		next(error)
	}
});


module.exports = router;