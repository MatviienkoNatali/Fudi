let project_folder= "dist";
let source_folder = "src";

let fs = require('fs');

let path = {
	build: {
		html: project_folder + "/",
		css: project_folder +  "/css/",
		js: project_folder + "/js/",
		img: project_folder + "/img/",
		fonts: project_folder + "/fonts/",
	},
	src: {
		html: [source_folder + "/*.html", "!"+source_folder + "/_*.html"],
		css: source_folder +  "/scss/style.scss",  // другие файлы копироваться не будут
		js: source_folder + "/js/**/*.js",
		img: source_folder + "/img/**/*.{jpg,png,svg,gif,ico,webp}",
		fonts: source_folder + "/fonts/*.ttf",
	}, 
	watch: {
		html: source_folder + "/**/*.html",
		css: source_folder +  "/scss/**/*.scss",
		js: source_folder + "/js/*.js",
		img: source_folder + "/img/**/*.{jpg,png,svg,gif,ico,webp}"
	},
	clean: "./" + project_folder + "/"
}

let { src, dest } = require('gulp'),
	gulp = require('gulp'),
	browsersync = require("browser-sync").create(),
	fileinclude = require("gulp-file-include"),
	del = require("del"),
	scss = require("gulp-sass"),
	autoprefixer = require("gulp-autoprefixer"), //добавляет префиксы
	group_media = require("gulp-group-css-media-queries"),  // групирирует медиа запросы
	clean_css = require("gulp-clean-css"), //оптимизирует файл
	rename = require("gulp-rename"),  //переименование файла
	uglify = require("gulp-uglify-es").default,
	imagemin = require("gulp-imagemin"),
	gifsicle = require("imagemin-gifsicle"),  // оптимизирует .gif
	optipng = require("imagemin-optipng"), // оптимизирует .npg
	mozjpeg = require("imagemin-mozjpeg"), //оптимизирует .jpeg/.jpg
	svgo = require("imagemin-svgo"),  // оптимизирует .svg
	ttf2woff = require("gulp-ttf2woff"),
	ttf2woff2 = require("gulp-ttf2woff2"), 
	fonter = require("gulp-fonter");




function browserSync(params) {
	browsersync.init({
		server: {
			baseDir:  "./" + project_folder + "/"
		},
		port:3000,
		notify: false   //увидомления о обновлении браузера
	})
}

function html() {
	return src(path.src.html) //путь к исходным файлам
		.pipe(fileinclude()) //собирает файли
		.pipe(dest(path.build.html)) //в .pipe пишем команды для gulp
		.pipe(browsersync.stream()) //обновление страницы
}

function css() {
	return src(path.src.css) //путь к исходным файлам
		.pipe(
			scss({
				outputStyle: "expanded"  // что бы файл css не сжимался
			})
		)
		.pipe(
			group_media()
		)
		.pipe(
			autoprefixer({  // настройки 
					overrideBrowserslist: ["last 5 versions"],  //поддержка браузеров
					cascade: true //стиль написание префиксов каскад
			})
		)
		.pipe(dest(path.build.css)) //(выгрузка файла перез сжиманием и переименованием)
		.pipe(browsersync.stream())
		.pipe(clean_css()) //сжимаем файл
		.pipe(
			rename({
				extname: ".min.css" //переименовываем файл
			})
		)
		.pipe(dest(path.build.css)) //в .pipe пишем команды для gulp (выгрузка)
		.pipe(browsersync.stream()) //обновление страницы
}

function js() {
	return src(path.src.js) //путь к исходным файлам
		.pipe(fileinclude()) //собирает файли
		.pipe(dest(path.build.js)) //(выгрузка файла перез сжиманием и переименованием)
		.pipe(uglify()) //сжимаем файл
		.pipe(
			rename({
				extname: ".min.js" //переименовываем файл
			})
		)
		.pipe(dest(path.build.js)) //в .pipe пишем команды для gulp
		.pipe(browsersync.stream()) //обновление страницы
}

function images() {
	return src(path.src.img) //путь к исходным файлам
		.pipe(dest(path.build.img))
		.pipe(src(path.src.img))
		.pipe(imagemin([    // сжатие разных форматов, без потерь
		    imagemin.gifsicle({interlaced: true}),
		    imagemin.mozjpeg({quality: 75, progressive: true}),
		    imagemin.optipng({optimizationLevel: 5}),
		    imagemin.svgo({
		        plugins: [
		            {removeViewBox: false},
		        ]
		    })
		]))
		.pipe(dest(path.build.img)) //в .pipe пишем команды для gulp
		.pipe(browsersync.stream()) //обновление страницы
}

function fonts(){
	src(path.src.fonts)
		.pipe(ttf2woff())
		.pipe(dest(path.build.fonts));
	return src(path.src.fonts)
		.pipe(ttf2woff2())
		.pipe(dest(path.build.fonts));
};

gulp.task('otf2ttf', function (){
	return src([source_folder + '/fonts/*.ttf'])
		.pipe(fonter({
			formats: ['ttf', 'olf', 'eot', 'woff', 'svg']
		}))
		.pipe(dest(source_folder + '/fonts/'));
})
function fontsStyle(params) {
	let file_content = fs.readFileSync(source_folder + '/scss/fonts.scss');
	if (file_content == '') {
		fs.writeFile(source_folder + '/scss/fonts.scss', '', cb);
			return fs.readdir(path.build.fonts, function (err, items) {
				if (items) {
					let c_fontname;
					for (var i = 0; i < items.length; i++) {
						let fontname = items[i].split('.');
						fontname = fontname[0];
						if (c_fontname != fontname) {
						fs.appendFile(source_folder + '/scss/fonts.scss', '@include font("' + fontname + '", "' + fontname + '", "400", "normal");\r\n', cb);
						}
						c_fontname = fontname;
					}
				}
			})
		}
	}
function cb() { }

function watchFiles(params) {  // слежка за файлами
	gulp.watch([path.watch.html], html);
	gulp.watch([path.watch.css], css);
	gulp.watch([path.watch.js], js);
	gulp.watch([path.watch.img], images);
}

// удаление папки dist
function clean(params) {
	return del(path.clean);
}
// подружить Gulp, что бы он их понимал, после удаление выполняеться html
let build = gulp.series(clean, gulp.parallel(js, css, html, images, fonts), fontsStyle);


// проверка работоспосбности
let watch = gulp.parallel(build, watchFiles, browserSync); // открытие файлов одновременно

// подружить Gulp с новыми переменными, что бы он их понимал
exports.fontsStyle = fontsStyle;
exports.fonts = fonts;
exports.images = images;
exports.js = js;
exports.css = css;
exports.html = html;
exports.build =  build;
exports.watch = watch;
exports.default = watch; // при запуске Gulp выполняеться данная переменная
