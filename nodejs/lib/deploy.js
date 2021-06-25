'user strict';
const extend = require('extend');
const axios = require('axios')
const {Repo, Environment, Deployment, Target} = require('../models/repo');
const deployTargets = require('./lxc');
const conf = require('../conf/conf');

async function doDeploy(action, repo, branch, repoSshurl, commit){
	var deployment;
	try{

		console.log(action, repo, branch, repoSshurl, commit)
		repo = await Repo.get(repo);

		let deployments = await repo.getDeploymentsbyBranch(branch, true)

		console.log('deployments', deployments)

		if(deployments.length && action === 'delete'){
			deployment = deployments[0]
		}if(deployments.length){
			deployment = deployments[0]
			action = 'update';
		}else{
			var environment = await repo.getEnvironmentsbyBranch(branch)
			deployment = await environment.addDeployment()
		}

		deployment.environment.settings.repoSshurl = repoSshurl
		deployment.environment.settings.branch = branch


	}catch(error){
		console.error('create start', error)
		throw new Error('Failed to make new Deployment')
	}

	try{
		deployment = new Depoy(deployment);
		setImmediate(async function(deployment, action) {
			try{
				await deployment[action]()
			}catch(error){
				console.log('set error', error)
			}
		}, deployment, action)

		return {id: deployment.id};
	}catch(error){
		console.error('create remote', error)
	}
}

function event(deployment, message){
	console.info('event:', message)
}

class Depoy{
	constructor(deployment){
		this.deployment = deployment
		this.environment = deployment.environment;
		this.settings = pasrseSetings(deployment);
		this.secrets = pasrseSecrets(deployment);
		this.id = deployment.repo_env_id

		this.target = new deployTargets[deployment.target.type](this.settings)
	}

	async exec(code, info){
		await this.event(`exec-start`, {info})
		code = `
			sudo su
			${exportBashVars(this.secrets)}
			echo 'nameserver 8.8.8.8' > /etc/resolv.conf
			export DEBIAN_FRONTEND=noninteractive
			${code}
		`
		let res = await this.target.exec(code);

		await this.event(`exec-finish`, {info, ...res})

		return res;
	}

	async event(name, data){
		
		console.log(`EVENT: ${name}`, data)
	}

	async log(type, message){
		console.log('LOG:', type, message)
	}

	async setinfo(){
		let info = await this.target.info();
		if(!info.ip){
			return await this.setinfo();
		}
		let id = info.ip.slice(-2);
		let settings = {
			sshURL: `${this.settings.host}:22${id}`,
			httpURL: `${this.settings.host}:80${id}`,
		}

		this.settings = {...this.settings, ...settings};

		await this.deployment.update('settings', {settings: this.settings, state:'deployed'})
	}

	async create(){

		this.event('deployment-started', {info: `Creating deployment ${this.settings.appName}`})
		await this.target.create('bionic-base')
		await this.target.start()
		await this.setinfo();

		console.log(this.settings)

		try{
			await this.exec(`
				while [ ! -f /opt/datacom/firstboot ]; do sleep 1; done
				sleep 2
			`, 'Wait for target to be ready')
		}catch(error){}
		await this.init();
		await this.updateProxy();
	}

	async init(){
		await this.exec(deployInitScript(this.settings), 'Initializing deployment')

		await this.exec(`
			cd ${this.settings.workingPath}; 
			./${this.settings.scriptsPath}/${this.environment.environment}/deploy.sh
		`, 'Running repo deploy script')
	}

	async update(){
		await this.exec(`
			cd ${this.settings.workingPath};
			git config --global user.email "you@example.com"
  			git config --global user.name "Your Name"
  			git stash

			export GIT_SSH_COMMAND="/usr/bin/ssh -o StrictHostKeyChecking=no -i $HOME/.ssh/id_rsa_deploy_key"
			git pull origin master;
			./${this.settings.scriptsPath}/${this.environment.environment}/update.sh
		`, 'Running repo update script')	
	}

	async updateProxy(){
		let target = this.settings.httpURL.split(':');

		let res = await axios.post(`${conf.httpProxyAPI.host}/api/host/`, {
			forcessl: true,
			host: this.settings.domain.replace('*', this.settings.branch),
			ip: target[0],
			targetPort: Number(target[1] || 80),
			targetssl: false
		}, {
    		headers: { "auth-token": conf.httpProxyAPI.key }
		})
	}

	async delete(){
		await this.target.destroy()
		await this.deployment.update({state: 'deleted', isActive: false})
	}

}


function deployUpdateScript(argument) {
	// body...
}

function deployInitScript(args){
	return `
		mkdir -p "${args.workingPath}";
		mkdir "$HOME/.ssh";
		chmod 700 "$HOME/.ssh"
		echo "${args.privateKey}" > $HOME/.ssh/id_rsa_deploy_key
		chmod 600 $HOME/.ssh/id_rsa_deploy_key
		wget https://raw.githubusercontent.com/tests-always-included/mo/master/mo -O /usr/local/bin/mo
		chmod +x /usr/local/bin/mo
		export GIT_SSH_COMMAND="/usr/bin/ssh -o StrictHostKeyChecking=no -i $HOME/.ssh/id_rsa_deploy_key"
		git clone ${args.repoSshurl} ${args.workingPath};
	`
}

function exportBashVars(map){
	let out = '';
	for (const [key, value] of Object.entries(map)){
		out += `export ${key}="${value}";`
	}

	return out
}

function pasrseBase(deployment){
	let appName = deployment.repo_env_id.replace('/', '_')

	return {
		appName: appName,
		scriptsPath: deployment.environment.repo.scriptsPath,
		privateKey: deployment.environment.repo.privateKey,
		environment: deployment.environment.environment,
		workingPath: `${deployment.environment.workingPath}/${appName}`,
		domain: deployment.environment.domain,
		name: appName,
	}
}

function pasrseSecrets(deployment){
	return {
		...deployment.environment.repo.secrets,
		...deployment.environment.secrets,
		...pasrseBase(deployment),

	}
}

function pasrseSetings(deployment){
	return {
		...deployment.target.settings,	
		...deployment.environment.repo.settings,
		...deployment.environment.settings,
		...pasrseBase(deployment),
	}
}



module.exports = {doDeploy};

(async function(){try{
	// console.log(await doDeploy('create', 'wmantly/static-test', 'master', 'ssh://gitea@git.theta42.com:2222/wmantly/static-test.git'))

	// let repo = await Repo.get('wmantly/static-test');
	// let deployments = await repo.getDeploymentsbyBranch('master')

	// for(let d of deployments){
	// 	try{
	// 		let lxc = new deployTargets.LXC({...{name: d.repo_env_id.replace('/', '_')}, ...d.target.settings})
	// 		console.log('deployment', d)
	// 		// await lxc.destroy();
	// 		console.log(await d.remove());

	// 	}catch(error){
	// 		console.log('err', error)
	// 	}finally{
	// 		await d.remove();
	// 	}
	// }


}catch(error){
	console.error('IIFE error:', error)
}})()
