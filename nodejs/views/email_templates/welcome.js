module.exports = {
	subject: 'Welcome to Theta 42!',
	message: `
<p>
	Welcome {{user.givenName}},
</p>

<p>
	Your new Theta 42 Single sign-on account is ready to use. Here is some
	information to get you started.
</p>

<p>
	Your username is <b>{{user.uid}}</b>
</p>

<p>
	You can manage your account at https://sso.theta42.com
</p>

<p>
	You account is ready to be used now, test it by SSHing into the Theta 42
	jump host \`ssh {{user.uid}}@718it.biz\`
</p>

<p>
	The SSO service is still in beta, so please report any bugs you may find!
	You will be notified of new features and services as they become available.
</p>
	Thank you,<br />
	Theta 42
</p>
`
};
