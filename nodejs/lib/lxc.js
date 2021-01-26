'use strict';
const util = require('util');
const exec = util.promisify(require('child_process').exec)


class Local{
	async sysExec(command){
		try{
			return await exec(command)
		}catch(error){
			throw(error);
		}
	}

	async exec(...args){
		await this.sysExec()
	}
}

class SSH extends Local{
	constructor(args){
		super()
		this.user = args.user;
		this.host = args.host;
		this.keyPath = args.keyPath;
	}

	async sysExec(command){try{
		// console.log('command', command)
		command = new Buffer.from(command).toString('base64');
		command = `ssh -i "${this.keyPath}" -o StrictHostKeyChecking=no ${this.user}@${this.host} "echo ${command} | base64 --decode | bash"`;
		return await super.sysExec(command);
	}catch(error){
		throw error;
	}}
}

class LXC{
	constructor(args){
		// console.log('lxc args', args)
		this.name = args.name
		if(args.host){
			this.sysExec = (new SSH(args)).sysExec.bind(args)
		}else{
			this.sysExec = (new Local()).sysExec
		}
	}

	static async list(){
		try{
			let res = await this.prototype.sysExec(`lxc-ls --fancy`);
			let output = res.stdout.split("\n").slice(0).slice(0,-1);
			let keys = output.splice(0,1)[0].split(/\s+/).slice(0,-1).map(function(v){return v.toLowerCase()});
			let info = [];

			for(let line of output){
				if(line.match(/^-/)) continue;

				line = line.split(/\s+/).slice(0,-1);

				let mapOut = {};
				line.map(function(value,idx){
					mapOut[keys[idx]] = value;
				});
				info.push(mapOut);
			}

			return info;

		}catch(error){
			throw error;
		}
	}

	async create(from){
		try{
			return await this.sysExec(`lxc-copy --name "${from}" --newname "${this.name}" --daemon`);
		}catch(error){
			throw error;
		}
	}

	async start(){
		try{	
			return await this.sysExec(`lxc-start --name "${this.name}" --daemon`);
		}catch(error){
			throw error;
		}
	}

	async destroy(){
		try{
			let res = await this.sysExec(`lxc-destroy --force --name ${this.name}`)

			return !!res.stdout.match(/Destroyed container/);
		}catch(error){
			throw error;
		}
	}

	async stop(){
		try{			
			return await this.sysExec(`lxc-stop --name "${this.name}"`);
		}catch(error){
			throw error;
		}
	}

	async exec(code){
		try{
			code = new Buffer.from(code).toString('base64')
			return await this.sysExec(`lxc-attach -n "${this.name}" --clear-env -- bash -c 'echo "${code}" | base64 --decode | bash'`)
		}catch(error){
			throw error;
		}
	}

	async info(){
		try{
			let info = {};
			
			let res = await this.sysExec(`lxc-info --name "${this.name}"`);
			res = res.stdout;

			if(res.match("doesn't exist")){
				throw new Error('ContainerDoesntExist')
			}

			res = res.replace(/\suse/ig, '').replace(/\sbytes/ig, '').split("\n").slice(0,-1);
			for(var i in res){
				var temp = res[i].split(/\:\s+/);
				info[temp[0].toLowerCase().trim()] = temp[1].trim();
			}
			var args = [info].concat(Array.prototype.slice.call(arguments, 1));
			
			return info;
		}catch(error){
			throw error;
		}
	}

	async setAutoStart(name){
		await this.sysExec(`echo "lxc.start.auto = 1" >>  "$HOME/.local/share/lxc/${this.name}/config"`)
	}
}



module.exports = {Local, SSH, LXC};

(async function(){try{

// 	let lxc = new LXC();

// 	// console.log(await lxc.copy('hass', 'hass2'))

	// console.log(await lxc.destroy('hass2'))
	// console.log(await LXC.list())

	// let lxc = new LXC({name:'hass'})
	// console.log(await hass.start())



	// let lxc = new LXC({user:'virt-service', host:'142.93.30.52', keyPath:'/home/william/.ssh/id_rsa_virt-service', name: 'test2'})
	// console.log(await lxc.exec('hostname'))
// 	// console.log(await lxc.exec('test2', 'sleep 50'))
	// console.log(await lxc.info())
// 


}catch(error){
	console.error('IIFE error', error);
}})()
