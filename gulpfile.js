var gulp = require('gulp'),
  connect = require('gulp-connect'),
  exec = require('child_process').exec;
 
gulp.task('connect', function() {
  connect.server({
    port: 9010
  });
});

gulp.task('server', function (cb) {
  var api = exec('PORT=9011 node server.js');
  
  api.stdout.on('data', function(data) {
      console.log(data); 
  });
  
  api.stderr.on('data', function(data) {
      console.log(data); 
  });
});
 
gulp.task('default', ['connect', 'server']);
