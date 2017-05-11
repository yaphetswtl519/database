'use strict';

let tools = {
	deleteKeys(target, arr) {
		arr.map((item) => {
			for(let i in target) {
				if (i == item) {
					delete target[i];
					return;
				}
			}
		});
		return target;
	},
	judgeType(target, origin) {
		let sign = null;
		let arr = [];
		Object.keys(target).forEach(item => {
			arr.push(target[item]);
		});
		origin.forEach((item, index) => {
			arr[index] === 'char' ? (typeof(item) === 'string' ? (sign = true) : (sign = false)) : (Number.isInteger(item) ? (sign = true) : (sign = false));
		});
		return sign;
	},
	increaseObj(target, origin) {
		let obj = {};
		Object.keys(target).forEach((item, index) => {
			obj[item] = origin[index];
		});
		return obj;
	},
	sortArr(arr, key) {
		let bySort = () => {
			return (o, p) => {
				let a = o[key];
				let b = p[key];
				if (isNaN(a)) {
					return a.localeCompare(b);
				} else {
					if (a === b) {
						return 0;
					}else {
						return a > b ? 1 : -1;
					}
				}
			}
		};
		arr.forEach((item, index) => {
			arr.sort(bySort(arr[index][key]));
		});
	},
	includes(a, b) {
		return JSON.stringify(a) === JSON.stringify(b);
	},
	printf(head, body) {
		let headContent = '';
		if (head instanceof Array) {
			headContent = head.join('\t');
			console.log(headContent);
			body.forEach(item => {
				let bodyStr = '';
				head.forEach(value => {
					bodyStr += `${item[value]}\t`;
				});
				console.log(bodyStr);
			});
		} else {
			headContent = Object.keys(body[0]).join('\t');
			console.log(headContent);
			body.forEach(item => {
				let bodyStr = '';
				for (let key in item) {
					bodyStr += `${item[key]}\t`;
				}
				console.log(bodyStr);
			});
		}	
	},
	es6eval(fn) {
		let Fn = Function;
		return new Fn('return ' + fn)();
	},
	getProperty(item, operator) {
		let index;
		let sign;
		operator.forEach(val => {
			if (item.indexOf(val) !== -1) {
				index = item.indexOf(val);
				sign = val;
			}
		});
		item = item.replace(sign, ' ');
		let property = item.slice(0, index);
		let result = item.slice(index+1, item.length);
	 	sign === '=' && (sign='==');
	 	return {
	 		property: property,
	 		sign: sign,
	 		result: result
	 	}
	}
};

module.exports = {
	deleteKeys: tools.deleteKeys,
	judgeType: tools.judgeType,
	increaseObj: tools.increaseObj,
	sortArr: tools.sortArr,
	includes: tools.includes,
	printf: tools.printf,
	es6eval: tools.es6eval,
	getProperty: tools.getProperty
};