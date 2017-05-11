'use strict';

const fs = require('fs');
const tools = require('./method');

let Sql = {
	type: ['int', 'char'],
	pathCollection: {
		table: './table.json',
		tableDetail: './table/',
		index: './index/'
	},
	create_table(name, type) {//CREATE TABLE NAME ('xxx int', 'xxx, char')
		let path = this.pathCollection.table;
		let tablePath = this.pathCollection.tableDetail;
		if (!fs.existsSync(path)) {
			let defaultData = {
				"content": []
			}
			let stream = fs.createWriteStream(path);
			stream.write(JSON.stringify(defaultData, null, '\t'));
		}
		let data = '';
		let readStream = fs.createReadStream(path);
		let state = true;//管理表是否存在
		let allowCreate = true;//管理是否允许创建
		readStream.on('data', (chunk) => {
			data += chunk;
		});
		readStream.on('end', () => {
			data = JSON.parse(data);
			//判断表是否存在
			data.content.forEach((item, index) => {
				if (item.tableName == name) {
					console.log('name: ' + name + ' exist!');
					state = !state;
					return;
				}
			});
			//表不存在 => 判断是否为已知类型
			if (state) {
				if (!type.mainKey) {
					console.log('there is not mainKey!');
					allowCreate = !allowCreate;
					return;
				}
				// tools.deleteKeys(type, ['mainKey']);
				for(let i in type) {
					if (i != 'mainKey') {
						if (this.type.indexOf(type[i]) === -1) {
							console.log(type[i] + ' is unknown type!');
							allowCreate = !allowCreate;
							return;
						}
					}
				}
				if (allowCreate) {
					let obj = {
						tableName: name
					}
					for(let i in type) {
						obj[i] = type[i];
					}
					data.content.push(obj);
					fs.writeFile(path, JSON.stringify(data, null, '\t'), (err) => {
						if (err) {
							console.log('write fail!');
							return;
						}
						let defaultData = {
							"content": []
						};
						fs.writeFile(tablePath + name + '.json', JSON.stringify(defaultData, null, '\t'), (err) => {
							if (err) {
								console.log('write fail!');
								return;
							}
							console.log('create success!');
						});
					});
				} 
			}
		});
	},
	drop_table(name) {//DROP TABLE NAME
		let path = this.pathCollection.table;
		let tablePath = this.pathCollection.tableDetail + name + '.json';
		if (!fs.existsSync(path)) {//判断table是否存在
			console.log('table is not exist!');
			return;
		}
		fs.readFile(path, 'utf8', (err, data) => {
			if (err) {
				console.log('read file error!');
				return;
			}
			let dataResult = JSON.parse(data);
			let existTable = false;
			dataResult.content.forEach((item) => {
				if (item.tableName === name) {
					existTable = !existTable;
					return;
				}
			});
			if (existTable) {//table表中有name表
				if (fs.existsSync(tablePath)) {//判断name对应json文件是否在table文件夹中
					dataResult.content = dataResult.content.filter((val) => {
						return val.tableName != name;
					});
					fs.writeFile(path, JSON.stringify(dataResult, null, '\t'), (err) => {
						if (err) {
							console.log('unknown error!');
						}
						fs.unlink(tablePath, () => {
							console.log(`drop ${name} success`);
						});
					});
				}else {
					console.log(`${name} is not exist in table`);//table文件夹中没有对应name.json文件
				}
			} else {
				console.log(`${name} is not exist!`);
			}
		});
	},
	alter_table(option, name, type) {
		let path = this.pathCollection.table;
		if (!fs.existsSync(path)) {//判断文件是否存在
			console.log('table is not exist!');
			return;
		}
		fs.readFile(path, 'utf8', (err, data) => {
			if (err) {
				console.log('read file error!');
				return;
			}
			let dataResult = JSON.parse(data);
			let isInTable = false;
			let targetObj = null;
			dataResult.content.forEach((item) => {
				if (item.tableName === name) {
					isInTable = !isInTable;
					targetObj = item;
					return;
				}
			});
			if (isInTable) {//table中存在表名
				let isExist = false;
				if (option === 'add') {//ALTER TABLE NAME ADD (KEYS VALUES)
					let keys = Object.keys;
					let isIntype = true;
					keys(type).forEach((item) => {//判断属性是否存在
						if (targetObj[item]) {
							console.log(item + ' is exist!');
							isExist = !isExist;
							return;
						}
						if (this.type.indexOf(type[item]) === -1) {//判断类型是否符合
							isIntype = !isIntype;
							console.log(type[item] + ' is unknown type!');
							return;
						}
					});
					if (!isExist && isIntype) {//属性名不存在且类型符合
						Object.assign(targetObj, type);
						fs.writeFile(path, JSON.stringify(dataResult, null, '\t'), (err) => {
							if (err) {
								console.log('unknown error!');
								return;
							}
							console.log('alter_table add success!');
						});
					}
				}else if (option === 'drop') {//ALTER TABLE NAME DROP (KEYS)
					isExist = !isExist;
					type.forEach((item) => {//判断属性是否全部存在表中
						if (!targetObj[item]) {
							isExist = !isExist;
							console.log(item + ' is not exist!');
							return;
						}
					});
					if (isExist) {
						type.map((item) => {
							delete targetObj[item];
						});
						fs.writeFile(path, JSON.stringify(dataResult, null, '\t'), (err) => {
							if (err) {
								console.log('unknown error!');
								return;
							}
							console.log('alter_table drop success');
						});
					}
				}
			} else {
				console.log(name + ' is not in table!');
			}
		});
	},
	insert_into(columns, target, values) {//INSERT INTO NAME VALUES ('xxx', 'xxx', 'xxx') || INSERT INTO NAME (KEY1, KEY2) VALUES ('xxx', 'xxx')
		let tablePath = this.pathCollection.tableDetail + target + '.json';
		let path = this.pathCollection.table;
		if (fs.existsSync(tablePath)) {
			fs.readFile(path, 'utf8', (err, data) => {
				if (err) {
					console.log('read file error!');
					return;
				}
				let result = JSON.parse(data);
				let isInTable = false;
				let resultContent = '';
				let mainKey = '';
				let mainKeyIndex = null;
				let baseResult = '';
				result.content.forEach((item, index) => {
					if (item.tableName === target) {
						resultContent = item;
						mainKey = resultContent['mainKey'];
						baseResult = tools.deleteKeys(resultContent, ['tableName', 'mainKey']);
						mainKeyIndex = Object.keys(baseResult).indexOf(mainKey);
						isInTable = !isInTable;
						return;
					}
				});
				if (isInTable) {
					if (typeof (columns) == 'boolean') {//第一个参数为布尔值 => INSERT INTO NAME VALUES ('xxx', 'xxx')
						if (Object.keys(baseResult).length === values.length) {//传入values数量和table对应
							if (tools.judgeType(baseResult, values)) {//传入values类型和table对应
								fs.readFile(tablePath, 'utf8', (err, data) => {
									if (err) {
										console.log('read file error!');
										return;
									}
									let dataResult = JSON.parse(data);
									let state = false;
									dataResult.content.forEach((item) => {//判断主键是否重复
										if (item[mainKey] == values[mainKeyIndex]) {
											state = !state;
											return;
										}
 									});
 									if (!state) {//主键不同
 										let obj = tools.increaseObj(baseResult, values);
										dataResult.content.push(obj);
										fs.writeFile(tablePath, JSON.stringify(dataResult, null, '\t'), (err) => {
											if (err) {
												console.log('unknown error!');
												return;
											}
											console.log('insert into ' + target + ' success!');
										});
 									} else {
 										console.log(values[mainKeyIndex] + ' is exist!');
 									}
								});
							}else {
								console.log('type is not correct!');
							}
						} else {
							console.log("arguments can't match!");
						} 
					} else {//第一个参数为arr => INSERT INTO NAME (KEY1, KEY2) VALUES ('xxx', 'xxx')
						if (values.length === columns.length) {//传入参数一致
							let tempArr = Object.keys(baseResult).filter((item) => {
								return columns.indexOf(item) !== -1;
							});
							if (tools.judgeType(tempArr, values)) {//判断类型是否对应
								fs.readFile(tablePath, 'utf8', (err, data) => {
									if (err) {
										console.log('read file error!');
										return;
									}
									let resultData = JSON.parse(data);
									let state = false;
									resultData.content.forEach((item) => {
										if (item[mainKey] == values[columns.indexOf(mainKey)]) {
											state = true;
											console.log(values[columns.indexOf(mainKey)] + ' is exist!');
											return;
										}
									});
									if (!state) {//主键不同
										let obj = {};
										let targetObj = {};
										columns.forEach((item, index) => {
											obj[item] = values[index];
										});
										Object.keys(baseResult).forEach((item) => {
											targetObj[item] = "";
										});
										Object.assign(targetObj, obj);
										resultData.content.push(targetObj);
										fs.writeFile(tablePath, JSON.stringify(resultData, null, '\t'), (err) => {
											if (err) {
												console.log('unknown error!');
												return;
											}
											console.log('insert into ' + target + ' success!');
										});
									}
								});
							} else {
								console.log('type is not correct!');
							}
						}else {
							console.log('arguments is not match!');
						}
					}
				}
			});
		} else {
			console.log(target + 'is not exist!')
		}
	},
	deleteFrom(name, unknown) {//DELETE FROM NAME WHERE xxx = xxx 
		let path = this.pathCollection.tableDetail + name + '.json';
		if (!fs.existsSync(path)) {//判断文件是否存在
			console.log('table is not exist!');
			return;
		}
		fs.readFile(path, 'utf8', (err, data) => {
			if (err) {
				console.log('read file error!');
				return;
			}
			let dataResult = JSON.parse(data);
			if (typeof(unknown) === 'object') {//删除某一行
				let unknownKey = Object.keys(unknown)[0];
				dataResult.content = dataResult.content.filter((item) => {
					return item[unknownKey] !== unknown[unknownKey]; 
				});
				fs.writeFile(path, JSON.stringify(dataResult, null, '\t'), (err) => {
					if (err) {
						console.log('unknown error!');
					}
					console.log('delete success!');
				});
			} else if (unknown === '*'){
				let baseObj = {
					content: []
				};
				fs.writeFile(path, JSON.stringify(baseObj, null, '\t'), (err) => {
					if (err) {
						console.log('unknown error!');
					}
					console.log('delete success!');
				});
			}
		});
	},
	update(name, target, where) {//UPDATE NAME SET XXX = 'xxx' WHERE XXX = 'xxx' 
		let path = this.pathCollection.tableDetail + name + '.json';
		if (!fs.existsSync(path)) {//判断文件是否存在
			console.log('table is not exist!');
			return;
		}
		let targetItem = where[0];
		let targetSign = where[1];
		fs.readFile(path, 'utf8', (err, data) => {
			if (err) {
				console.log('read file error!');
				return;
			}
			let dataResult = JSON.parse(data);
			let isInTable = false;//判断where是否存在
			let isCorrectType = false;//判断类型是否对应
			let isCorrectName = false;//判断name是否对应
			let recordObj = null;
			dataResult.content.forEach((item) => {
				if (item[targetItem] === targetSign) {
					isInTable = !isInTable;
					recordObj = item;
					return;
				}
			});
			if (isInTable) {//where存在
				fs.readFile(this.pathCollection.table, 'utf8', (err, data) => {
					if (err) {
						console.log('read file error!');
						return;
					}
					let dataObj = JSON.parse(data);
					let temp = null;
					dataObj.content.forEach((item) => {
						if (item.tableName === name) {
							isCorrectName = !isCorrectName;
							if (tools.judgeType([item[targetItem]], [targetSign])) {
								isCorrectType = !isCorrectType;
								temp = item;
								return;
							};
						}
					});

					if (isCorrectName && isCorrectType) {//name对应，类型对应
						Object.keys(target).forEach((item) => {
							if (!tools.judgeType(temp[item], [target[item]])) {
								isCorrectType = !isCorrectType;
								return;
							}
						});
						if (isCorrectType) {//target每个item对应类型正确
							for(let i in target) {
								recordObj[i] = target[i];
							}
							fs.writeFile(path, JSON.stringify(dataResult, null, '\t'), (err) => {
								if (err) {
									console.log(err);
									return;
								}
								console.log('update success!');
							});
						} else {
							console.log('target arguments type is not correct!');
						}
					} else {
						console.log('arguments ' + where + ' is not correct!');
					}
				});
			}
		})
	},
	create_index(name, where, columns) {//CREATE INDEX index_name ON table_name (column_name)
		let indexPath = this.pathCollection.index + name + '.json';
		let targetPath = this.pathCollection.tableDetail + where + '.json';
		let tablePath = this.pathCollection.table;
		if (!fs.existsSync(targetPath)) {//判断table_name是否存在
			console.log(`${where} is not exist!`);
			return;
		}
		fs.readFile(targetPath, 'utf8', (err, data) => {
			if (err) {
				console.log(err);
				return;
			}
			let dataResult = JSON.parse(data);
			let copyResult;
			let keys = Object.keys(dataResult.content[0]);
			let isInTable = true;
			columns.every(item => {//判断传入列是否在表中
				if (keys.indexOf(item) === -1) {
					console.log(`${item} is not in ${where}!`);
					isInTable = false;
					return false;
				}
				return true;
			});
			if (isInTable) {//全部在表中
				let jsonObj = {};
				let tableData =  JSON.parse(fs.readFileSync(tablePath, 'utf8'));
				let symbol = tableData.content.findIndex(item => {
					return item.tableName === where;
				});//找到table中对应where表的索引
				columns.forEach((item, index) => {//对每个columns创建索引
					copyResult = JSON.parse(JSON.stringify(dataResult));//对象深拷贝
					let copyContent = copyResult.content;
					let dataContent = dataResult.content;
					// symbol[0][item] === 'int' ? copyContent.sort(tools.compareNum(item)) 
					// 							: copyContent.sort(tools.compareChar(item, false));
					tools.sortArr(copyContent, item);					
					if (tools.includes(copyContent, dataContent) || 
						tools.includes(copyContent.concat().reverse(), dataContent)) {//判断该属性为升序或降序（有序）
						const gap = 3;
						let temp = {};
						for(let i = 0, len = dataContent.length; i < len; i+=gap) {
							temp[dataContent[i][item]] = i;
						}
						jsonObj[item] = temp;
					}else {//无序 稠密索引
						let temp = {};
						copyContent.forEach((val, index) => {
							let findIndexNum = dataContent.findIndex((n, z) => {
								return n[item] === val[item];
							});
							temp[val[item]] = findIndexNum;
						});
						jsonObj[item] = temp;
					}
				});
				tableData.content[symbol].indexCloumns = columns;
				tableData.content[symbol].indexName ? tableData.content[symbol].indexName.push(name) : (tableData.content[symbol].indexName = [name]);
				fs.writeFile(indexPath, JSON.stringify(jsonObj, null, '\t'), err => {
					if (err) {
						console.log(err);
					}
					console.log('create index success!');
				});
				fs.writeFile(tablePath, JSON.stringify(tableData, null, '\t'), err => {
					if (err) {
						console.log(err);
					}
					console.log('table update!');
				});
			}
		});
	},
	drop_index(name) {//
		let path = this.pathCollection.index + name + '.json';
		let tablePath = this.pathCollection.table;
		if (!fs.existsSync(path)) {
			console.log(`${name} is not exist!`);
		}
		fs.readFile(path, 'utf8', (err, data) => {
			if (err) {
				console.log(err);
				return;
			}
			let dataContent = JSON.parse(data);
			let keys = Object.keys(dataContent);
			fs.readFile(tablePath, 'utf8', (err, data) => {
				if (err) {
					console.log(err);
					return;
				}
				let dataResult = JSON.parse(data);
				let dataResultContent = dataResult.content;
				let index = dataResultContent.findIndex(item => {
					return item.indexName.indexOf(name) !== -1;
				});
				let indexName = dataResultContent[index].indexName;
				let indexCloumns = dataResultContent[index].indexCloumns;
				keys.forEach(item => {
					let pos = indexCloumns.findIndex(val => {
						return val === item
					});
					indexCloumns.splice(pos, 1);
				});
				dataResultContent[index].indexName = indexName.filter(item => {
					return item !== name;
				});
				if (dataResultContent[index].indexName.length === 0 && indexCloumns.length === 0) {
					delete dataResultContent[index].indexName;
					delete dataResultContent[index].indexCloumns;
				}
				fs.writeFile(tablePath, JSON.stringify(dataResult, null, '\t'), err => {
					if (err) {
						console.log(err);
					}
					console.log('table update!');
				});
			});
		});
		fs.unlink(path, () => {
			console.log(`drop ${name} success!`);
		});
	},
	select_from(prop, target, options) {
		let tableDetailPath = this.pathCollection.tableDetail;
		let tablePath = this.pathCollection.table;
		let indexPath = this.pathCollection.index;
		let targetExist = true;//target存在标志位
		let propExist = true;//prop在target中标志位
		let fileCache = {};
		let tableCache = JSON.parse(fs.readFileSync(tablePath, 'utf8'));;
		target.every(item => {//判断target是否在index文件夹中
			let path = tableDetailPath + item + '.json';
			if (!fs.existsSync(path)) {
				console.log(`${item} is not exist!`);
				targetExist = false;
				return false;
			}
			return true;
		});
		if (prop[0] !== '*') {
			let tableData = tableCache.content;
			target.forEach(item => {//判断prop是否在每个target中
				let data = tableData.find(value => {
					return value.tableName === item;
				});
				prop.every(value => {
					if (!data[value]) {
						propExist = false;
						console.log(`${value} is not in ${item}`);
						return false;
					}
					return true;
				});
			});
		}
		if (!targetExist) {
			return;
		}
		if (!propExist) {
			return;
		}
		target.forEach(item => {
			let path = tableDetailPath + item + '.json';
			fileCache[item] = JSON.parse(fs.readFileSync(path, 'utf8'));
		});
		if (!options) {// select * from student     select name, age from student	
			if (prop[0] === '*') {
				tools.printf('*', fileCache[target[0]].content);
			} else {
				tools.printf(prop, fileCache[target[0]].content);
			}
		} else {//select * from student where name=wtl or || and
			let logic = ['and', 'or'];
			let operator = ['>', '<', '=', '>=', '<=', '!='];
			let existOperator = false;
			options.every(item => {
				if (logic.indexOf(item) !== -1) {
					existOperator = true;
					return false;
				}
				return true;
			});
			if (!existOperator) {
				let indexCache = {};
				let index;
				let sign;
			 	operator.forEach(item => {
			 		if (options[0].indexOf(item) !== -1) {
			 			index = options[0].indexOf(item);
			 			sign = item;//记录符号
			 		}
			 	});
			 	options[0] = options[0].replace(sign, ' ');
			 	let property = options[0].slice(0, index);
			 	let result = options[0].slice(index+1, options[0].length);
			 	sign === '=' && (sign='==');
			 	target.forEach(item => {//判断属性存在索引
			 		tableCache.content.every(val => {
			 			if (val.tableName === item) {
			 				if (val.indexCloumns && val.indexCloumns.indexOf(property) !== -1) {
			 					indexCache[item] = JSON.parse(fs.readFileSync(`${indexPath}${val.indexName[0]}.json`, 'utf8'));
			 				}
			 				return false;
			 			}
			 			return true;
			 		});
			 	});
			 	target.forEach(item => {
			 		let content = fileCache[item].content;
			 		if (indexCache[item]) {//存在索引
			 			if (Object.keys(indexCache[item][property]).length === fileCache[item].content.length) {//稠密索引
			 				let oIndex = indexCache[item][property];
			 				let printfArr = [];
							let indexCollection = [];
			 				if (sign === '==') {
			 					for (let key in oIndex) {
			 						if (key === result) {
			 							indexCollection.push(oIndex[key]);
			 						}
			 					}
			 				}else {
			 					for (let key in oIndex) {
			 						if (tools.es6eval(`"${key}"${sign}"${result}"`)) {
			 							indexCollection.push(oIndex[key]);
			 						}
			 					}
			 				}
			 				indexCollection.forEach(item => {
			 					printfArr.push(content[item]);
			 				});
			 				if (prop[0] === '*') {
								tools.printf('*', printfArr);
							}else {
								tools.printf(prop, printfArr);
							}
			 			}else {//稠密索引

			 			}
			 		}else {
			 			let printfArr = [];
			 			content.forEach(item => {
			 				if (tools.es6eval(`"${item[property]}"${sign}"${result}"`)) {
			 					printfArr.push(item);
			 				}
			 			});
			 			if (prop[0] === '*') {
							tools.printf('*', printfArr);
						}else {
							tools.printf(prop, printfArr);
						}
			 		}
			 	});//select * from student where name=wtl > < != >= <=  select name, age from student where name=xxx
			} else {//where xxx=xxx and xxx=xxx or xxx=xxx
				if (target.length === 1) {//select * from student where name!=wtl and age=19 or height=190
					let indexCollection = [];
					let printfArr = [];
					options.forEach((item, index) => {//找到每个表达式key value
						if (logic.indexOf(item) === -1) {//item为表达式
						 	let obj = tools.getProperty(item, operator);
						 	fileCache[target[0]].content.forEach(value => {
						 		if (tools.es6eval(`"${value[obj.property]}"${obj.sign}"${obj.result}"`)) {
						 			if (JSON.stringify(printfArr).indexOf(JSON.stringify(value)) === -1) {
						 				printfArr.push(value);
						 			}
						 		}
						 	});
						}else {
							indexCollection.push(index);
						}
					});
					indexCollection.forEach((item, index) => {
						let leftObj = tools.getProperty(options[item - 1], operator);
						let rightObj = tools.getProperty(options[item + 1], operator);
						switch(options[item]) {
							case 'and':
								if (index === 0) {
									printfArr = printfArr.filter(value => {	
										if (tools.es6eval(`"${value[leftObj.property]}"${leftObj.sign}"${leftObj.result}"`)) {
											return value;
										}
									});
								}
								printfArr = printfArr.filter(value => {	
									if (tools.es6eval(`"${value[rightObj.property]}"${rightObj.sign}"${rightObj.result}"`)) {
										return value;
									}
								});
								break;
							case 'or':
								fileCache[target[0]].content.forEach(value => {
							 		if (tools.es6eval(`"${value[rightObj.property]}"${rightObj.sign}"${rightObj.result}"`)) {
							 			if (JSON.stringify(printfArr).indexOf(JSON.stringify(value)) === -1) {
							 				printfArr.push(value);
							 			}
							 		}
							 	});
							 	break;
						}
					});
					if (prop[0] === '*') {
						tools.printf('*', printfArr);
					}else {
						tools.printf(prop, printfArr);
					}
				}else {//select * from a,b where a.id=b.id and xxx
					let Cartesian = [];//笛卡尔积数组
					let printfArr = [];
					let indexCollection = [];
					target.forEach((item, index) => {//获得笛卡尔积数组
						let content = fileCache[item].content;
						if (index === 0) {//第一次 初始化Cartesian
							content.forEach(value => {
								let obj = {};
								Object.keys(value).forEach(keys => {
									obj[`${item}.${keys}`] = value[keys];
								});
								Cartesian.push(obj);
							});
						}else {
							let tempArr = [];
							Cartesian.forEach(i => {
								content.forEach(j => {
									let tempObj = {};
									let obj = {};
									Object.keys(j).forEach(keys => {
										obj[`${item}.${keys}`] = j[keys];
									});
									Object.assign(tempObj, i, obj);
									tempArr.push(tempObj);
								});
							});
							Cartesian = tempArr;
						}
					});
					options.forEach((item, index) => {
						if (logic.indexOf(item) === -1) {
							let obj = tools.getProperty(item, operator);
							Cartesian.forEach(value => {
								if (obj.result.indexOf('.') !== -1) {
									if (tools.es6eval(`"${value[obj.property]}"${obj.sign}"${value[obj.result]}"`)) {
										if (JSON.stringify(printfArr).indexOf(JSON.stringify(value)) === -1) {
							 				printfArr.push(value);
							 			}
									}
								}else {
									if (tools.es6eval(`${value[obj.property]}${obj.sign}"${obj.result}"`)) {
										if (JSON.stringify(printfArr).indexOf(JSON.stringify(value)) === -1) {
							 				printfArr.push(value);
							 			}
									}
								}
							});
						}else {
							indexCollection.push(index);
						}
					});
					indexCollection.forEach((item, index) => {
						let leftObj = tools.getProperty(options[item - 1], operator);
						let rightObj = tools.getProperty(options[item + 1], operator);
						switch(options[item]) {
							case 'and':
								if (index === 0) {
									printfArr = printfArr.filter(value => {
										if (leftObj.result.indexOf('.') !== -1) {
											if (tools.es6eval(`"${value[leftObj.property]}"${leftObj.sign}"${value[leftObj.result]}"`)) {
												return value;
											}
										}else {
											if (tools.es6eval(`${value[leftObj.property]}${leftObj.sign}"${leftObj.result}"`)) {
												return value;
											}
										}	
									});
								}
								printfArr = printfArr.filter(value => {	
									if (rightObj.result.indexOf('.') !== -1) {
										if (tools.es6eval(`"${value[rightObj.property]}"${rightObj.sign}"${value[rightObj.result]}"`)) {
											return value;
										}
									}else {
										if (tools.es6eval(`${value[rightObj.property]}${rightObj.sign}"${rightObj.result}"`)) {
											return value;
										}
									}	
								});
								break;
							case 'or':
								fileCache[target[0]].content.forEach(value => {
									if (rightObj.result.indexOf('.') !== -1) {
										if (tools.es6eval(`"${value[rightObj.property]}"${rightObj.sign}"${value[rightObj.result]}"`)) {
								 			if (JSON.stringify(printfArr).indexOf(JSON.stringify(value)) === -1) {
								 				printfArr.push(value);
								 			}
								 		}
									}else {
										if (tools.es6eval(`${value[rightObj.property]}${rightObj.sign}"${rightObj.result}"`)) {
								 			if (JSON.stringify(printfArr).indexOf(JSON.stringify(value)) === -1) {
								 				printfArr.push(value);
								 			}
								 		}
									}
							 	});
							 	break;
						}
					});
					if (prop[0] === '*') {
						tools.printf('*', printfArr);
					}else {
						tools.printf(prop, printfArr);
					}
				}
			}
		}
	}
};

let analyze = {
	inp: [],
	splitInput(input) {
		this.inp = input.split(' ');
	},
	analyzeInp(input) {
		this.splitInput(input);
		let inp = this.inp;
		if (this.dic.indexOf(inp[0]) !== -1) {
			switch(inp[0]) {
				case 'create':
					if (inp[1] === 'table') {
						inp.forEach((item, index) => {
							item.indexOf('(') !== -1 ? (inp[index] = item.slice(1, item.length)) : '';
							item.indexOf(')') !== -1 ? (inp[index] = item.slice(0, item.length - 1)) : '';
						});
						let sliceArr = inp.slice(3, inp.length);
						let obj = {};

						sliceArr.forEach((item, index) => {
							if (index % 2 === 0) {
								obj[item] = sliceArr[++index];
							}
						});
						Sql.create_table(inp[2], obj);
						break;
					}else if (inp[1] === 'index') {
						// create index index_student on student (age)
						let name = inp[2];
						let where = inp[4];
						let str = input.match(/\(.*?\)/)[0].replace('(', '').replace(')', '');
						let columns = str.split(',').map(item => {
							return item.trim();
						});
						Sql.create_index(name, where, columns);
						break;
					}
				case 'drop':
					if (inp[1] === 'table') {
						Sql.drop_table(inp[2]);
					}
					if (inp[1] === 'index') {
						Sql.drop_index(inp[2]);
					}
					break;
				case 'alter':
					if (inp[3] === 'add') {
						inp.forEach((item, index) => {
							item.indexOf('(') !== -1 ? (inp[index] = item.slice(1, item.length)) : '';
							item.indexOf(')') !== -1 ? (inp[index] = item.slice(0, item.length - 1)) : '';
						});
						let sliceArr = inp.slice(4, inp.length);
						let obj = {};
						sliceArr.forEach((item, index) => {
							if (index % 2 === 0) {
								obj[item] = sliceArr[++index];
							}
						});
						Sql.alter_table('add', inp[2], obj);
					} else if (inp[3] === 'drop') {
						inp.forEach((item, index) => {
							item.indexOf('(') !== -1 ? (inp[index] = item.slice(1, item.length)) : '';
							item.indexOf(')') !== -1 ? (inp[index] = item.slice(0, item.length - 1)) : '';
						});
						let sliceArr = inp.slice(4, inp.length);
						sliceArr = sliceArr.filter((item) => {
							return item !== '';
						});
						Sql.alter_table('drop', inp[2], sliceArr);
					} else {	
						console.log('order error!');
					}
					break;
				case 'delete':
					if (inp[1] === '*') {
						Sql.deleteFrom(inp[3], '*');
					} else if (inp[3] === 'where'){
						let sliceArr = inp.slice(4, inp.length);
						let obj = {};
						sliceArr.forEach((item) => {
							let temp = item.split('=');
							obj[temp[0]] = temp[1];
						});
						Sql.deleteFrom(inp[2], obj);
					} else {
						console.log('order error!');
					}
					break;
				case 'insert':
					if (inp[3] === 'values') {
						inp.forEach((item, index) => {
							item.indexOf('(') !== -1 ? (inp[index] = item.slice(1, item.length)) : '';
							item.indexOf(')') !== -1 ? (inp[index] = item.slice(0, item.length - 1)) : '';							
						});
						let sliceArr = inp.slice(4, inp.length);
						sliceArr.forEach((item, index) => {
							if (!isNaN(Number(item))) {
								sliceArr[index] = +item;
							}
						});
						Sql.insert_into(false, inp[2], sliceArr);
					} else {
						inp.forEach((item, index) => {
							item.indexOf('(') !== -1 ? (inp[index] = item.slice(1, item.length)) : '';
							item.indexOf(')') !== -1 ? (inp[index] = item.slice(0, item.length - 1)) : '';							
						});
						let index = inp.indexOf('values');
						let argsArr = inp.slice(3, index);
						let sliceArr = inp.slice(index + 1, inp.length);
						sliceArr.forEach((item, index) => {
							if (!isNaN(Number(item))) {
								sliceArr[index] = +item;
							}
						});
						Sql.insert_into(argsArr, inp[2], sliceArr);
					}
					break;
				case 'update':
					let index = inp.indexOf('where');
					let argsArr = inp.slice(3, index);
					let tempArr = inp.slice(index + 1, inp.length);
					let tempobj = {};
					argsArr.forEach((item) => {
						let temp = item.split('=');
						if (!isNaN(Number(temp[1]))) {
							temp[1] = +temp[1];
						}
						tempobj[temp[0]] = temp[1];
					});

					let resultArr = tempArr[0].split('=');
					Sql.update(inp[1], tempobj, resultArr);
					break;
				case 'select':
					if (inp.indexOf('where') === -1) {
						if (inp[1] === '*') {
							Sql.select_from(['*'], [inp[3]]);
						}else {
							let prop = inp[1].split(',');
							Sql.select_from(prop, [inp[3]]);
						}
					}else {
						let index = inp.indexOf('where');
						let arr = inp.slice(index + 1, inp.length);
						if (inp[1] === '*') {
							if (inp[3].indexOf(',')) {
								let target = inp[3].split(',');
								Sql.select_from(['*'], target, arr);
							}else {
								Sql.select_from(['*'], [inp[3]], arr);
							}
						}else {
							let prop = inp[1].split(',');
							Sql.select_from(prop, [inp[3]], arr);
						}
					}
			}
		} else {
			console.log('order error!');
		}
	}
};

module.exports = {
	Sql,
	analyze
};

// Sql.drop_table('student');    //   drop table student
// Sql.create_table('student', {    //create table student (name char age int height int mainKey name)
// 	'name': 'char',
// 	'age': 'int',
// 	'height': 'int',
// 	'mainKey': 'name'
// });
// Sql.alter_table('add', 'student', {  alter table student add (weight int)
// 	'weight': 'int'                     alter table student drop ( weight )
// }); 
// Sql.alter_table('drop', 'student', ['name']);    
//column
// Sql.insert_into(['name', 'age'], 'student', ['sc', 18]);  insert into student values (yy 20 160)
// Sql.insert_into(false, 'student', ["sb", 20]);
// Sql.deleteFrom('student', {                                insert into student (name height) values (wtl 180)
	// name: 'sd'                                        delete from student where name=sa
// });
                                                         
// Sql.deleteFrom('student', '*');                       delete * from student

// Sql.update('student', {height: 120}, ['name', 'sc']);    update student set height=165 where name=yy

// Sql.create_index('index_student', 'student', ['name','age']);  create index index_student on student (age)
//                                       																(age, name)


// Sql.select_from(['*'], ['teacher'], ['age<23', 'and', 'name!=wtl', 'and', 'height=190']);
// Sql.select_from(['name','age'], ['teacher'], ['age<23', 'and', 'name!=wtl', 'and', 'height=190']);
// Sql.select_from(['name','height'], ['teacher'], ['age>23'])
// Sql.select_from(['*'], ['teacher'], ['age>23']);
// Sql.select_from(['*'], ['student', 'lesson'], ['student.name=lesson.name', 'and', 'student.age>10']);




// select * from student
// select name,age from student

// select * from teacher where age<23 and name!=wtl and height=190
// select name,age from teacher where age<23 and name!=wtl and height=190
// select name,age from teacher where age<23 and name!=wtl or height=190

// select * from teacher where age>23

// select * from student,lesson where student.name=lesson.name and student.age>10


