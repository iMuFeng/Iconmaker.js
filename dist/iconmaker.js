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
		} else if (opts.type == 'macOS') {
			this.sizes = sizes.macos
		} else {
			this.sizes = sizes.iphone.concat(sizes.ipad)
		}
		this.type = opts.type;
		this.isMacOSType = opts.type == 'macOS';
		this.originalFile = opts.originalFile || (process.cwd() + '/' + opts.currentDirFile);
		this.targetPath = opts.targetPath || process.cwd() + '/' + 'Iconmaker';
		this.quality = 100;
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
						return this.isMacOSType ? self.loop() : self.toicns()
					} else {
						return self.mkdir(self.targetPath).then(function () {
							return this.isMacOSType ? self.loop() : self.toicns()
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
	toicns: function () {
		var exec = require('child_process').exec;
		var self = this;

		exec('which sips', function(err, stdout, stderr) {
			if (err) {
				return console.log(colors.red('[Error] `sips` command not on system'));
			}

			var iconsetPath = self.targetPath + '/Iconmaker.iconset';

			self.isFileExist(iconsetPath).then(function (exists) {
				if (exists) {
					return self.generateIcnsFiles()
				} else {
					return self.mkdir(iconsetPath).then(function () {
						return self.generateIcnsFiles()
					}).catch(function (err) {
						console.log(colors.red('[Error] ', err))
					})
				}
			}).catch(function (err) {
				err && console.log(colors.red('[Error] ', err))
			})
		})
	},
	generateIcnsFiles: function () {
		var exec = require('child_process').exec;
		var self = this;
		var iconsetPath = self.targetPath + '/Iconmaker.iconset';
		self.sizes.forEach(function (val) {
			var scale = parseFloat(val.scale),
					width = parseInt(val.size.split('x')[0] * scale),
					filename = val.filename;

			exec('sips -z ' + width + ' ' + width + ' ' + self.originalFile + ' --out ' + iconsetPath + '/' + filename);		
		});

		exec('iconutil -c icns ' + iconsetPath, function(err, stdout, stderr) {
			exec('rm -R ' + iconsetPath);
		});
		console.timeEnd('[Done]');
	}
};
module.exports = iconmaker;