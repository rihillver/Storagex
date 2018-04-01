(function(global) {

	var storage = plus.storage;

	var setItem = function(key, value) {
		if(value !== undefined && value !== null) {
			value = JSON.stringify(value);
			storage.setItem(key, value);
		}
	};

	var getItem = function(key) {
		var data = storage.getItem(key);
		if(data !== undefined && data !== null) {
			return JSON.parse(data);
		}
		return null;
	};

	var removeItem = function(key) {
		storage.removeItem(key);
	};

	var getCarrier = function(name) {
		var carrier = getItem(name);
		return carrier || {};
	};

	var deleteCarrierItems = function(carrier, keys) {
		keys.forEach(function(item) {
			if(typeof item === 'object') {
				delete carrier[item.k];
			} else {
				delete carrier[item];
			}
		});
	};

	/**
	 * 对 plus.storage 或 localStorage 进行封装。
	 * 
	 * 注：
	 * 1、属性遍历的顺序遵循ECMA-262第五版规范，遍历对象属性时会遵循一个规律，即先提取所有key的parseInt值为非负整数且小于2147483648（即2^31-1）的属性，
	 * 然后根据数字顺序对属性排序首先遍历出来，然后按照对象定义的顺序遍历余下的所有属性。
	 * 2、如果涉及unshift()方法的操作，请确保key的值小于2147483648（可选时间戳基于秒），这样才能保证在队头入队，
	 * 因为如果没有给定key或成员对象没有带k的属性值时，该方法只是取第一个key值减1作为key的值。
	 * 3、成员对象中含有k属性时则按照k属性的值作为载体对象的key，如果不含有k属性且也没有给定的key值时，则添加k属性并且取时间戳作为k属性的值。
	 * 4、如果设置了最大限制数量，则超过最大值时从遍历对象属性时最前面的属性开始删除。
	 * 
	 * @param {String} name storage存储键名
	 * @param {Number} limit [可选]最大限制数量，默认0
	 * @param {Boolean} basedOnSecond [可选]true：时间戳基于秒，false：时间戳基于毫秒，默认false
	 */
	var Storagex = function(name, limit, basedOnSecond) {
		this.name = name;
		this.limit = limit || 0;
		this.basedOnSecond = !!basedOnSecond;
		this.carrier = (function() {
			return getCarrier(name);
		})();
	};

	Storagex.prototype = {

		getTime: function() {
			var time = new Date().getTime();
			return this.basedOnSecond ? parseInt(time / 1000) : time;
		},

		/**
		 * 设置成员对象。
		 * 
		 * @param {String or Number or Object} key 如果是对象则认为是带k成员对象
		 * @param {Object} value [可选]成员对象
		 */
		set: function(key, value) {
			if(arguments.length === 1) {
				value = key;
				key = key.k || this.getTime();
			}
			this.carrier[key] = value;
			this.save();
		},

		/**
		 * 获取成员对象。
		 * 
		 * @param {String or Number or Object} key 如果是对象则认为是带k成员对象
		 */
		get: function(key) {
			if(typeof key === 'object') {
				return this.carrier[key.k];
			}
			return this.carrier[key];
		},

		/**
		 * 获取第一个成员对象。
		 * 
		 */
		getFirst: function() {
			var keys = this.keys();
			return keys.length > 0 ? this.carrier[keys[0]] : null;
		},

		/**
		 * 获取最后一个成员对象。
		 * 
		 */
		getLast: function() {
			var keys = this.keys();
			return keys.length > 0 ? this.carrier[keys[keys.length - 1]] : null;
		},

		/**
		 * 移除一个或多个成员对象。
		 * 
		 * @param {String or Number or Object or Array} keys 如果是对象或者是对象数组则认为是带k成员对象
		 */
		remove: function(keys) {
			if(!(keys instanceof Array)) {
				keys = [keys];
			}
			deleteCarrierItems(this.carrier, keys);
			this.save();
		},

		/**
		 * 删除最前的i个成员对象。
		 * 
		 * @param {Number} i [可选]数量，默认1
		 */
		removeFirst: function(i) {
			i = i || 1;
			var keys = this.keys();
			if(keys.length >= i) {
				keys = keys.slice(0, i);
			}
			deleteCarrierItems(this.carrier, keys);
			this.save();
		},

		/**
		 * 删除最后的i个成员对象。
		 * 
		 * @param {Number} i 数量
		 */
		removeLast: function(i) {
			i = i || 1;
			var keys = this.keys();
			if(keys.length >= i) {
				keys = keys.slice(keys.length - i, keys.length);
			}
			deleteCarrierItems(this.carrier, keys);
			this.save();
		},

		/**
		 * 入栈（先删除，再添加）。
		 *  
		 * @param {String or Number or Object} key 如果是对象则认为是带k成员对象
		 * @param {Object} value [可选]成员对象
		 */
		push: function(key, value) {
			if(arguments.length === 1) {
				value = key;
				key = key.k || this.getTime();
			}
			delete this.carrier[key];
			this.carrier[key] = value;
			this.save();
		},

		/**
		 * 出栈。
		 * 
		 */
		pop: function() {
			var obj = null;
			var keys = this.keys();
			if(keys.length > 0) {
				var index = keys.length - 1;
				obj = this.carrier[keys[index]];
				delete this.carrier[keys[index]];
				this.save();
			}
			return obj;
		},

		/**
		 * 出队。
		 * 
		 */
		shift: function() {
			var obj = null;
			var keys = this.keys();
			if(keys.length > 0) {
				obj = this.carrier[keys[0]];
				delete this.carrier[keys[0]];
				this.save();
			}
			return obj;
		},

		/**
		 * 队头入队（先删除，再添加）。
		 * 
		 * @param {String or Number or Object} key 如果是对象则认为是带k成员对象
		 * @param {Object} value [可选]成员对象
		 */
		unshift: function(key, value) {
			if(arguments.length === 1) {
				value = key;
				if(key.k) {
					key = key.k;
				} else {
					var keys = this.keys();
					key = keys.length > 0 ? keys[0] - 1 : this.getTime(); //如果没有给定key或成员对象没有带k的属性值时，则取第一个成员对象的key值减1，如果还没有任何成员对象，则取当前时间数
				}
			}
			delete this.carrier[key];
			this.carrier[key] = value;
			this.save();
		},

		/**
		 * 返回载体对象的key数组。
		 * 
		 */
		keys: function() {
			return Object.keys(this.carrier);
		},

		/**
		 * 返回载体对象的key数组（经过排序后）。
		 * 
		 * 注：用法和数组的sort()方法一致，可接收比较函数。
		 * 
		 */
		sort: function() {
			return Array.prototype.sort.apply(this.keys(), arguments);
		},

		/**
		 * 返回载体对象的key数组（经过反转后）。
		 * 
		 */
		reverse: function() {
			return this.keys().reverse();
		},

		/**
		 * 返回载体对象。
		 * 
		 * @param {String} propName 成员对象的属性名
		 * @param {String} prefix [可选]前缀
		 */
		value: function() {
			return this.carrier;
		},

		/**
		 * 保存到本地（如果超出最大限定数量则移除最前面的）。
		 * 
		 */
		save: function() {
			if(this.limit > 0) {
				var length = this.keys().length;
				if(length > this.limit) {
					this.removeFirst(length - this.limit);
				}
			}
			setItem(this.name, this.carrier);
		},

		/**
		 * 清空载体对象。
		 * 
		 */
		clear: function() {
			this.carrier = {};
			this.save();
		},

		/**
		 * 刷新载体对象（重新读取本地数据）。
		 * 
		 */
		flush: function() {
			this.carrier = getCarrier(this.name);
		},

		/**
		 * 返回是否含有指定的属性名和属性值的成员对象。
		 * 
		 * 注：当第一个参数类型为Function时则作为筛选函数（筛选函数的第一个参数：成员对象，第二个参数：载体对象的key，返回Boolean类型）。
		 * 
		 * @param {String or Number or Function} popName 成员对象属性名（如果类型为Function时则作为筛选函数）
		 * @param {Object} popValue 成员对象属性值
		 */
		has: function(popName, popValue) {
			for(var p in this.carrier) {
				var item = this.carrier[p];
				if(typeof popName === 'function') {
					if(popName(item, p)) {
						return true;
					}
				} else {
					if(item[popName] === popValue) {
						return true;
					}
				}
			}
			return false;
		},

		/**
		 * 返回含有指定的属性名和属性值的成员对象（没有则返回null）。
		 * 
		 * 注：当第一个参数类型为Function时则作为筛选函数（筛选函数的第一个参数：成员对象，第二个参数：载体对象的key，返回Boolean类型）。
		 * 
		 * @param {String or Number or Function} popName 成员对象属性名（如果类型为Function时则作为筛选函数）
		 * @param {Object} popValue 成员对象属性值
		 */
		lookup: function(popName, popValue) {
			for(var p in this.carrier) {
				var item = this.carrier[p];
				if(typeof popName === 'function') {
					if(popName(item, p)) {
						return item;
					}
				} else {
					if(item[popName] === popValue) {
						return item;
					}
				}
			}
			return null;
		},

		/**
		 * 返回含有指定的属性名和属性值的成员对象数组。
		 * 
		 * 注：当第一个参数类型为Function时则作为筛选函数（筛选函数的第一个参数：成员对象，第二个参数：载体对象的key，返回Boolean类型）。
		 * 
		 * @param {String or Number or Function} popName 成员对象属性名（如果类型为Function时则作为筛选函数）
		 * @param {Object} popValue 成员对象属性值
		 */
		find: function(popName, popValue) {
			var arr = [];
			for(var p in this.carrier) {
				var item = this.carrier[p];
				if(typeof popName === 'function') {
					if(popName(item, p)) {
						arr.push(item);
					}
				} else {
					if(item[popName] === popValue) {
						arr.push(item);
					}
				}
			}
			return arr;
		},

		/**
		 * 返回载体对象的key数组（通过筛选函数）。
		 * 
		 * 注：筛选函数返回true表示选取，返回false表示抛弃。
		 * 
		 * @param {Function} fn 筛选函数（第一个参数：成员对象，第二个参数：载体对象的key）
		 */
		filter: function(fn) {
			var arr = [];
			for(var p in this.carrier) {
				var item = this.carrier[p];
				if(fn(item, p)) {
					arr.push(p);
				}
			}
			return arr;
		},

		/**
		 * 返回成员对象数组（通过第一个函数进行筛选，构建出新数组，通过第二个函数进行比较，对数组进行排序）。
		 * 
		 * 注：
		 * 1、筛选函数返回true表示选取，返回false表示抛弃。
		 * 2、比较函数与数组sort()方法的比较函数的用法一致。
		 * 
		 * @param {Function} fn1 [可选]筛选函数（第一个参数：成员对象，第二个参数：载体对象的key）
		 * @param {Function} fn2 [可选]比较函数（第一个参数：数组元素[即成员对象]a，第二个参数：数组元素[即成员对象]b）
		 */
		list: function(fn1, fn2) {
			var arr = [];
			for(var p in this.carrier) {
				var item = this.carrier[p];
				if(fn1) {
					if(fn1(item, p)) {
						arr.push(item);
					}
				} else {
					arr.push(item);
				}
			}
			if(fn2) {
				var arr1 = arr.sort(fn2);
				return arr1;
			}
			return arr;
		},

		/**
		 * 遍历载体对象。
		 * 
		 * @param {Function} fn 回调函数（第一个参数：成员对象，第二个参数：载体对象的key，第三个参数：载体对象）
		 */
		forEach: function(fn) {
			for(var p in this.carrier) {
				fn(this.carrier[p], p, this.carrier);
			}
		},

		toString: function() {
			return JSON.stringify(this.carrier);
		}
	};

	global.Storagex = function(name, limit, basedOnSecond) {
		return new Storagex(name, limit, basedOnSecond);
	};

})(this);
