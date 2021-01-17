module.exports = {
	subject: 'Password reset for Theta 42 account',
	message: `
<h2> Theta 42 account</h2>

<p>
	Hello {{ user.givenName }},
</p>

<p>
	You have asked to reset the password for user name <b>{{ user.uid }}</b> . Please
	click the link below to complete this request. If this was done in errror,
	please ignore this email.
</p>

<p>
	{{ link }}
</p>

</p>
	Thank you,<br />
	Theta 42
</p>
`
};
