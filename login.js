'use strict';

const readline = require('readline');
const fs = require('fs');
const {Sql, analyze} = require('./index.js');
const tools = require('./method');

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

const init = () => {
	console.log('------------------------------');
	rl.question("Administrator(1) User(2) => ", answer => {
		switch(answer) {
			case "1":
				login('Administrator');
				break;
			case "2":
				login('User');
				break;
			default:
				console.log('error!');
				init();
				break;
		}
	});
};

const login = (type) => {
	let userName;
	let password;
	rl.question('用户名： ', username => {
		userName = username;
		rl.question('密码： ', password => {
			password = password;
			if (judge(type, userName, password)) {
				console.log('------------------------------');
				console.log(type);
				const AdministratorOrder = ['create', 'drop', 'alter', 'insert', 'delete', 'update','select'];
				const UserOrder = ['select'];
				rl.setPrompt('SQL> ')
				rl.prompt();
				rl.on('line', line => {
					analyze.dic = type === 'Administrator' ? AdministratorOrder : UserOrder;
				   	analyze.analyzeInp(line.trim());
				});
				rl.on('SIGINT', () => {
					rl.question('确定要退出吗？', quit => {
						if (quit.match(/^y(es)?$/i)) {
							init();
						}
					});
				});
			}else {
				console.log('username or password is not correct!');
				login(type);
			}
		});
	});
};

const judge = (type, username, password) => {
	const path = './user.json';
	const file = JSON.parse(fs.readFileSync(path, 'utf8'));
	let isCorrect;
	let arr = file[type];
	arr.some(item => {
		if (item[username] && item[username] == password) {
			isCorrect = true;
			return true;
		}
		isCorrect = false;
		return false;
	});
	return isCorrect;
};

init();