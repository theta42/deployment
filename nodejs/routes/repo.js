'use strict';

const router = require('express').Router();
const {Repo} = require('../models/repo');

const Model = Repo;


router.get('/', async function(req, res, next){
	try{
		return res.json({
			hosts:  await Model[req.query.detail ? "listDetail" : "list"]()
		});
	}catch(error){
		return next(error);
	}
});

router.post('/', async function(req, res, next){
	try{
		req.body.created_by = req.user.username;
		await Model.add(req.body);

		return res.json({
			message: `"${req.body.host}" added.`
		});
	} catch (error){
		return next(error);
	}
});

router.get('/:item(*)', async function(req, res, next){
	try{

		return res.json({
			item: req.params.item,
			results: await Model.get(req.params.item)
		});
	}catch(error){
		return next(error);
	}
});

router.put('/:item(*)', async function(req, res, next){
	try{
		req.body.updated_by = req.user.username;
		let item = await Model.get(req.params.item);
		await item.update.call(item, req.body);

		return res.json({
			message: `"${req.params.item}" updated.`
		});

	}catch(error){
		return next(error);

	}
});

router.delete('/:item(*)', async function(req, res, next){
	try{
		let item = await Model.get(req.params);
		let count = await host.remove.call(item, item);

		return res.json({
			message: `${req.params.host} deleted`,
		});

	}catch(error){
		return next(error);
	}
});


module.exports = router;
