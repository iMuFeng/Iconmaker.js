var gm = require('gm').subClass({
	imageMagick: true
});
var fs = require('fs');
var jsonfile = require('jsonfile');
var colors = require('colors/safe');
var sizes = require('./sizes.json');
var iconmaker = function (opts) {
	this.init(opts)
};
iconmaker.prototype = {
	init: function (opts) {
		if (opts.type == 'iPhone') {
			this.sizes = sizes.iphone
		} else if (opts.type == 'iPad') {
			this.sizes = sizes.ipad
		} else if (opts.type == 'Android') {
			this.sizes = sizes.android	
		} else if (opts.type == 'WebApp') {
			this.sizes = sizes.webapp
		} else {
			this.sizes = sizes.iphone.concat(sizes.ipad)
		}
		this.type = opts.type;
		this.originalFile = opts.originalFile || (process.cwd() + '/' + opts.currentDirFile);
		this.targetPath = opts.targetPath || 'Iconmaker';
		this.quality = this.isNumber(opts.quality) ? opts.quality : 100;
		if (!this.originalFile || this.originalFile.trim() == '') {
			console.log(colors.red('[Error] Original file can\'t be empty.'));
			return
		}
		this.generateFiles()
	},
	generateFiles: function () {
		var self = this;
		console.time('[Done]');
		this.isFileExist(self.originalFile).then(function (exists) {
			if (!exists) {
				console.log(colors.red('[Error] (' + self.originalFile + ') is not existed'))
			} else {
				return self.isFileExist(self.targetPath).then(function (exists) {
					if (exists) {
						return self.loop()
					} else {
						return self.mkdir(self.targetPath).then(function () {
							return self.loop()
						}).catch(function (err) {
							console.log(colors.red('[Error] ', err))
						})
					}
				}).catch(function (err) {
					err && console.log(colors.red('[Error] ', err))
				})
			}
		}).catch(function (err) {
			err && console.log(colors.red('[Error] %s', err))
		})
	},
	resizeImage: function (index) {
		var self = this;
		return new Promise(function (resolve, reject) {
			var val = self.sizes[index],
				scale = parseFloat(val.scale),
				width = self.type == 'Android' ? parseInt(val.size.split('x')[0]) : parseInt(val.size.split('x')[0] * scale),
				filename = val.filename;

			if (self.type == 'Android') {
				var targetPath = self.targetPath + '/mipmap-' + val.idiom;
				self.mkdir(targetPath).then(function () {
					gm(self.originalFile).resize(width, width, '!').write(targetPath + '/' + filename, function (err) {
						if (err) {
							reject(err)
						} else {
							resolve(filename)
						}
					})
				}).catch(function (err) {
					console.log(colors.red('[Error] ', err))
				})
			} else {
				gm(self.originalFile).resize(width, width, '!').write(self.targetPath + '/' + filename, function (err) {
					if (err) {
						reject(err)
					} else {
						resolve(filename)
					}
				})
			}
		})
	},
	contentMap: function () {
		var self = this;
		return new Promise(function (resolve, reject) {
			var content = {
					images: self.sizes,
					info: {
						version: 1,
						author: 'xcode'
					}
				},
				contentPath = self.targetPath + '/Contents.json',
				options = {
					spaces: 2
				};
			jsonfile.writeFile(contentPath, content, options, function (err) {
				if (err) {
					reject(err)
				} else {
					console.timeEnd('[Done]');
					resolve()
				}
			})
		})
	},
	loop: function (times) {
		var self = this;
		times = times || 0;
		if (times < self.sizes.length) {
			return this.resizeImage(times).then(function (filename) {
				console.log(colors.green('[Generate] ' + filename));
				self.loop(times + 1)
			})
		} else {
			return this.contentMap()
		}
	},
	isFileExist: function (pathOrFile) {
		return new Promise(function (resolve, reject) {
			fs.exists(pathOrFile, function (exists) {
				resolve(exists)
			})
		})
	},
	mkdir: function (path) {
		return new Promise(function (resolve, reject) {
			fs.mkdir(path, function (err) {
				if (err) {
					reject(err)
				} else {
					resolve()
				}
			})
		})
	},
	isNumber: function (n) {
		return !isNaN(parseFloat(n)) && isFinite(n)
	}
};
module.exports = iconmaker;