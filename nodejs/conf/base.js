'use strict';

module.exports = {
	userModel: 'ldap', // pam, redis, ldap
	ldap: {
		url: 'ldap://192.168.1.54:389',
		bindDN: 'cn=admin,dc=theta42,dc=com',
		bindPassword: '__IN SRECREST FILE__',
		userBase: 'ou=people,dc=theta42,dc=com',
		groupBase: 'ou=groups,dc=theta42,dc=com',		
		userFilter: '(objectClass=posixAccount)',
		userNameAttribute: 'uid'
	},
	SENDGRID_API_KEy: '__IN SRECREST FILE__',
};
