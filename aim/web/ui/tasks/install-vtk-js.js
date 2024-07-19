var s = '../react-vtk-js', d = './node_modules/react-vtk-js', fs = require('fs'), r = require('path').resolve; 
fs.access(d, function (e) { e || fs.symlinkSync(r(s), r(d), 'junction') });