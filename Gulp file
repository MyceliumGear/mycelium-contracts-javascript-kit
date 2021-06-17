var gulp = require("gulp");
var coffee = require("gulp-coffee");
var less = require("gulp-less");
var plumber = require("gulp-plumber");
var rename = require("gulp-rename");

var paths = {
  scripts: "./coffee/*.coffee",
  styles:  "./less/*.less"
};

gulp.task("coffee", function(){
  gulp.src(paths.scripts)
  .pipe(plumber())
  .pipe(coffee())
  .pipe(gulp.dest("./js"));
});

gulp.task("less", function(){
  gulp.src("./less/style.less")
  .pipe(plumber())
  .pipe(less({
    compress: true,
    cleancss: true
  }))
  //.pipe(rename("style.css"))
  .pipe(gulp.dest("./css"));
});

gulp.task("watch", function(){
  gulp.watch(paths.scripts, ["coffee"]);
  gulp.watch(paths.styles,  ["less"]);
});

gulp.task("default", ["coffee", "less", "watch"]);
