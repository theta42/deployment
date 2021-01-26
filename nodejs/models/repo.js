'use strict';

const {promisify} = require('util');
const forge = require('node-forge');

const Table = require('../utils/redis_model');

var rasGenerate = promisify(forge.pki.rsa.generateKeyPair);

async function generateOpenSshPair(keySize){
  keySize = keySize || 2048;
  let keyPair = await rasGenerate({bits: keySize});

  return {
    publicKey: forge.ssh.publicKeyToOpenSSH(keyPair.publicKey),
    privateKey: forge.ssh.privateKeyToOpenSSH(keyPair.privateKey)

  };
};

const UUID = function b(a){return a?(a^Math.random()*16>>a/4).toString(16):([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,b)};

class Repo extends Table{
	static _key = 'repo'
	static _keyMap = {
		'created_by': {isRequired: true, type: 'string', min: 3, max: 500},
		'created_on': {default: function(){return (new Date).getTime()}},
		'updated_by': {default:"__NONE__", isRequired: false, type: 'string',},
		'updated_on': {default: function(){return (new Date).getTime()}, always: true},
		'repo': {isRequired: true, type: 'string', min: 3, max: 500},
		'hookCallCount': {default: 0, type: 'number'},
		'scriptsPath': {default:'scripts', type: 'string'},
		'settings': {default: {}, type:'object'},
		'secrets': {default: {}, type: 'object', min: 3, max: 500},
		'privateKey': {type: 'string'},
		'publicKey': {type: 'string'},
	}

	constructor(...args){
		super(...args);
	}

	static async add(data){
		return super.add({...data, ...(await generateOpenSshPair(2048))})
	}

	async getEnvironments(){
		let environments = await Environment.list();
		let out = [];

		for(let environment of environments){
			if(environment.startsWith(this.repo)){
				environment = await Environment.get(environment);
				environment.repo = this;
				out.push(environment)
			}
		}

		return out;
	}

	async getEnvironmentsbyBranch(branch){
		let list = await this.getEnvironments();
		let any;

		for(let key of list){
			if(branch === key.branchMatch) return key;
			if(key.branchMatch === '*') any = key;
		}

		return any;
	}

	async getDeploymentsbyBranch(branch, state){
		let environment = await this.getEnvironmentsbyBranch(branch);
		let deployments = await Deployment.list();
		let out = []

		for(let deployment of deployments){
			if(deployment.startsWith(`${this.repo}_${environment.environment}`)){
				deployment = await Deployment.get(deployment);
					deployment.environment = environment;
					deployment.target = await Target.get(environment.target);
					out.push(deployment)
				if(state && deployment.state === state){
				}
			}
		}

		return out;
	}
}

class Environment extends Table{
	static _key = 'repo_env'
	static _keyMap = {
		'created_by': {isRequired: true, type: 'string', min: 3, max: 500},
		'created_on': {default: function(){return (new Date).getTime()}},
		'updated_by': {default:"__NONE__", isRequired: false, type: 'string',},
		'updated_on': {default: function(){return (new Date).getTime()}, always: true},
		'repo_env': {isRequired: true, type: 'string', min: 3, max: 500},
		'repo': {type: 'string', min: 3, max: 500},
		'environment': {isRequired: true, type: 'string', min: 3, max: 500},
		'branchMatch': {isRequired: true, type: 'string', min: 1, max: 500},
		'target': {isRequired: true, type: 'string', min: 3, max: 500},
		'settings': {default: {}, type: 'object', min: 3, max: 500},
		'secrets': {default: {}, type: 'object', min: 3, max: 500},
		'hookCallCount': {default: 0, type: 'number'},
		'lastCommit': {default:"__NONE__", isRequired: false, type: 'string'},
		'workingPath': {default: '/opt/datacom', type: 'string'},
		'domain': {isRequired: true, type: 'string'},

	}

	static async add(data){
		try{
			await Repo.get(data.repo);
			await Target.get(data.target);

			data.repo_env = `${data.repo}_${data.environment}`
			return await super.add(data);

		}catch(error){
			throw error;
		}
	};

	async addDeployment(data){
		try{
			data = data || {}
			data.created_by = data.uid || this.created_by;
			data.repo = this.repo.repo || this.repo;
			data.environment = this.environment;
			data.id = UUID().split('-').reverse()[0]
			data.repo_env_id = `${data.repo}_${data.environment}_${data.id}`
			let deployment = await Deployment.add(data);
			deployment.target = await Target.get(this.target)
			deployment.environment = this;

			return deployment;
		}catch(error){
			throw error;
		}
	};
}

class Deployment extends Table{
	static _key = 'repo_env_id'
	static _keyMap = {
		'created_by': {isRequired: true, type: 'string', min: 3, max: 500},
		'created_on': {default: function(){return (new Date).getTime()}},
		'updated_by': {default:"__NONE__", isRequired: false, type: 'string',},
		'updated_on': {default: function(){return (new Date).getTime()}, always: true},
		'id': {type: 'string', min: 12, max: 12},
		'repo_env_id': {isRequired: true, type: 'string', min: 3, max: 500},
		'repo': {type: 'string', min: 3, max: 500},
		'environment': {isRequired: true, type: 'string', min: 3, max: 500},
		'state': {default: 'new', type: 'string', min: 3, max: 500},
		'isActive': {default: true, type: 'boolean',},
		'target_url': {default:"__NONE__", isRequired: false, type: 'string'},
	}
}

class Target extends Table{
	static _key = 'name'
	static _keyMap = {
		'created_by': {isRequired: true, type: 'string', min: 3, max: 500},
		'created_on': {default: function(){return (new Date).getTime()}},
		'updated_by': {default:"__NONE__", isRequired: false, type: 'string',},
		'updated_on': {default: function(){return (new Date).getTime()}, always: true},
		'name': {isRequired: true, type: 'string', min: 2, max: 500},
		'type': {isRequired: true, type: 'string', min: 1, max: 36},
		'settings': {default: {}, type: 'object', min: 3, max: 500},
		
	}
}

module.exports = {Repo, Environment, Deployment, Target};

(async function(){try{

// 	// console.log(await Repo.list())

// 	// To ssh://git.theta42.com:2222/wmantly/static-test.git

// 	let lxc_starting = await Target.add({
// 		created_by: 'wmantly',
// 		name: 'lxc_starting',
// 		type: 'LXC',
// 		settings: {
// 			user:'virt-service',
// 			host:'142.93.30.52',
// 			keyPath:'/home/william/.ssh/id_rsa_virt-service'
// 		}
// 	});

// 	var repo = await Repo.add({
// 		created_by: 'wmantly',
// 		repo: 'wmantly/static-test',
// 	})

// 	var environment = await Environment.add({
// 		created_by: 'wmantly',
// 		environment: 'staging',
// 		branchMatch: '*',
// 		repo: 'wmantly/static-test',
// 		domain: 'test.dc.vm42.us',
// 		target: 'lxc_starting'
// 	})



	let environment = await Environment.get('wmantly/static-test_staging')
	await environment.update({'domain': '*.dc.vm42.us'})


// 	// console.log(test)


// 	// console.log(await Environment.listDetail())
// 	// let repo = await Repo.get('wmantly/test2')
// 	// console.log(repo)
// 	// repo.update({hookCallCount: 5});
// 	// let envs = await repo.getEnvironments();
// 	// let env = await repo.getEnvironmentsbyBranch('staging');
// 	// let deployment = await env.addDeployment()
// 	// console.log('deployment', deployment)
// 	// let deployments = await repo.getDeploymentsbyBranch('staging')
// 	// console.log('deployments', deployments)
// 	// console.log('deployments', await Deployment.listDetail())



// 	console.log('repo', await Repo.listDetail())
// 	console.log('environment', await Environment.listDetail())
	
	// for(let d of await Deployment.listDetail()){
	// 	console.log('to remove', d)
	// 	await d.remove()
	// }

	// console.log('deployment', await Deployment.listDetail())


	// console.log('blah')
	// let repo = await Repo.get('wmantly/static-test');
	// // let environment = await repo.getEnvironmentsbyBranch('master')
	// // console.log('environment', environment)

	// let deployment = await repo.getDeploymentsbyBranch('master')

	// console.log('deployments', deployment)


// 	return 0;
}catch(error){
	console.error('IIFE error', error, error.message);
}})()
