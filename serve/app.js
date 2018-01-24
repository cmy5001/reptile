/**
 * Created by mingyang on 18/1/23.
 */
const Koa = require('koa');
const app = new Koa();
const Router = require('koa-router');
var request = require('request');
var fs = require('fs');
var path = require('path');
var iconv = require('iconv-lite');
var md5 = require('md5');
const mongoose = require('mongoose');
const serve = require('koa-static');

const router = new Router();
mongoose.connect('mongodb://localhost:27017/zfl');


var Schema = mongoose.Schema;

var ThemeSchema = new Schema({
    page      : Number,
    index     : Number,
    title     : String,
    list      : Array,
    date      : Date
});

var Theme = mongoose.model('Theme', ThemeSchema);

// x-response-time

app.use(async (ctx, next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    ctx.set('X-Response-Time', `${ms}ms`);

});

app.use(serve(path.join(__dirname, '..', 'public')));
app.use(serve(path.join(__dirname, '..', 'images')));
//app.use(serve('../images/'));

// logger

app.use(async (ctx, next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    console.log(`${ctx.method} ${ctx.url} - ${ms}`);
});

router.get('/', function (ctx, next) {
    // ctx.router available
    ctx.body = 'Hello World!';
});

//本地存储目录
var dir = path.join(__dirname + '/../images');



router.get('/showImages', async function(ctx, next){
    let id = ctx.request.query.id;
    let page = ctx.request.query.page;
    let pageSize = 10;


    ctx.body = await new Promise(function(resolve,reject){
            let param = {};
            if(id){
                param._id = id;
                Theme.find(param, function (err, docs) {

                    console.log(docs);
                    if(err){
                        console.log('ERROr');
                        return resolve(-2);
                    }

                    return resolve(docs);

                });
            }else if(page){
                let skip = pageSize*(page-1);
                Theme.find(param).skip(skip).limit(pageSize).sort({date:1}).exec(function (err, docs) {
                    console.log(docs);
                    if(err){
                        console.log('ERROr');
                        return resolve(-2);
                    }
                    return resolve(docs);
                });
            }

        })

});


router.get('/getImages', function (ctx, next) {
    // ctx.router available


    let i = 0;

    // 主要方法，用于下载文件
    var downloadAsyn = function(urls, dir){
        let filename = urls[i].split('161023/')[1];
        request({uri: urls[i], encoding: 'binary'}, function (error, response, body) {
            console.log(filename);
            if (!error && response.statusCode == 200) {
                if (!body)  console.log("(╥╯^╰╥)哎呀没有内容。。。")
                fs.writeFile(dir + '/' + filename, body, 'binary', function (err) {
                    if (err) {
                        console.log(err);
                    }
                    console.log('o(*￣▽￣*)o偷偷下载' + dir + '/' + filename + ' done');
                    i++;
                    if(i<urls.length){
                        downloadAsyn(urls,dir);
                    }
                });
            }else{

                console.log('error!');
                console.log(error);
                console.log(response);
            }
        });
    };

    var download = function(url, dir,filename){
        request({uri: url, encoding: 'binary'}, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                if (!body)  console.log("(╥╯^╰╥)哎呀没有内容。。。")
                fs.writeFile(dir + '/' + filename, body, 'binary', function (err) {
                    if (err) {
                        console.log(err);
                    }
                    console.log('o(*￣▽￣*)o偷偷下载' + dir + '/' + filename + ' done');
                });
            }else{

                console.log('error!');
                console.log(error);
                console.log(response);
            }
        });
    };

    let indexNumber = 1;
    getOneIndexPage(indexNumber);

    function getOneIndexPage(indexNumber){
        request({url:'http://yxpjwnet.com/page/'+indexNumber+'.html',gzip:true,encoding: null}, function (error, response, body) {
            console.log('error:', error); // Print the error if one occurred
            console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
            //console.log(body);
            let bodyData = iconv.decode(body,'gb2312').toString();
            //console.log(bodyData);
            if(!JSON.stringify(bodyData).match('<!DOCTYPE HTML>')){
                console.log('爬完了');
                return;
            }
            let matchData = JSON.stringify(bodyData).match(/<h2><a target=.{1,150}<\/a><\/h2>/g);
            //console.log(matchData);

            matchData.forEach(function(val,index){
                //console.log(val);
                //if(index>0){
                //    return;
                //}
                let url = val.split('href=\\"')[1];
                url = 'http://yxpjwnet.com'+url.split('\\" title=')[0];
                let title = val.split('title=\\"')[1];
                title = title.split('\\">')[0];
                console.log(url);
                console.log(title);

                Theme.find({title:title}, function (err, docs) {
                    // docs.forEach
                    err && console.log(err);
                    if(docs && docs.length){
                    }else{
                        var theme = new Theme();
                        theme.page = indexNumber;
                        theme.index = index;
                        theme.title = title;
                        theme.list = [];
                        theme.date = new Date();
                        getOneTheme(url,theme);
                    }

                });


            });
            setTimeout(function(){
                indexNumber++;
                console.log('下一主页...');
                getOneIndexPage(indexNumber);
            },10000);

        });
    }

    //getOneTheme('http://yxpjwnet.com/luyilu/2016/1023/2532.html');

    function getOneTheme(pageUrl,theme){
        let pageNumber = 1;
        getOnePage(pageUrl,pageNumber,theme);

    }

    function getOnePage(pageUrl,pageNumber,theme){

        let url;
        if(pageNumber>1){
            url = pageUrl.split('.html')[0]+'_'+pageNumber+'.html';
        }else{
            url = pageUrl;
        }
        request(url, function (error, response, body) {
            if(!body.match('<!DOCTYPE HTML>')){
                console.log('这一页没东西了');

                theme.save(function (err) {
                    console.log(err);
                });
                return;
            }
            let matchData = JSON.stringify(body).match(/http:\/\/images.zhaofulipic.com:8818\/allimg\/\d+\/\w+-\d{1,3}\.jpg/g);
            //downloadAsyn(matchData, dir);

            matchData.forEach(function(val,index){

                let filename = val.match(/\w+-\d+\.jpg/)[0];
                filename = md5(filename+new Date().getTime());
                theme.list.push(filename);
                download(val,dir,filename);
            });
            pageNumber++;
            console.log('下一页...');
            getOnePage(pageUrl,pageNumber,theme);

        });
    }


    ctx.body = 'getimage12';

});


app
    .use(router.routes())
    .use(router.allowedMethods());


app.listen(3000);
console.log('listen 3000');