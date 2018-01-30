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
var urlencode = require('urlencode2');

const router = new Router();
mongoose.connect('mongodb://localhost:27017/zfl');


var Schema = mongoose.Schema;

var ThemeSchema = new Schema({
    title     : String,
    list      : Array,
    date      : Date,
    tags      : Array
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
    let tag = ctx.request.query.tag;
    let title = ctx.request.query.title;
    let pageSize = 10;

    ctx.body = await new Promise(function(resolve,reject){
            let param = {};
            if(tag){
                let skip = pageSize*(page-1);
                console.log(tag);
                Theme.find({ tags:decodeURIComponent(tag)}).skip(skip).limit(pageSize).sort({date:-1}).exec(function (err, docs) {
                    if(err){
                        console.log('ERROr');
                        return resolve(-2);
                    }
                    return resolve(docs);
                });

            }else if(title){
                let skip = pageSize*(page-1);
                let reg = new RegExp(decodeURIComponent(title));
                Theme.find({ title: reg}).skip(skip).limit(pageSize).sort({date:-1}).exec(function (err, docs) {
                    if(err){
                        console.log('ERROr');
                        return resolve(-2);
                    }
                    return resolve(docs);
                });
            }else if(id){
                param._id = id;
                Theme.find(param, function (err, docs) {

                    if(err){
                        console.log('ERROr');
                        return resolve(-2);
                    }

                    return resolve(docs);

                });
            }else if(page){
                let skip = pageSize*(page-1);
                Theme.find(param).skip(skip).limit(pageSize).sort({date:-1}).exec(function (err, docs) {
                    if(err){
                        console.log('ERROr');
                        return resolve(-2);
                    }
                    return resolve(docs);
                });
            }

        })

});


router.get('/getImagesByTag', function (ctx, next) {
    // ctx.router available

    let tags = ['无圣光','极品萝莉','推女郎','CHOKmoson', '柚木', '土肥圆矮挫穷', '小鸟酱', 'TuiGirl', 'XIUREN', 'Graphis', 'PR社', '露出自拍', '疯狂的爱丽丝', 'VIP', 'SK丝库', '大尺度', '爱丝AISS', '唐兴', 'wanimal', '秀人网', '极品美模', '极品嫩妹', '福利姬', '闫盼盼', '布丁酱', '尤蜜荟', '弱气乙女', '完具少女', '刘钰儿', '丝袜美腿极欲调教', '尤果网', '木奈奈', 'YouMi', '魅妍社', '摄影师', '嗲囡囡', '私拍', '网络红人', 'Tpimage', 'Mistar', '若兮', 'PLAYBOY', 'LegBaby', 'Ugirls', '我是女王', '小果酱', '蜜桃社', '私人玩物', '宋-KiKi', '悦爷妖精', '撸管必备', '夏小秋秋秋', 'Egg-尤妮丝', 'MASKED QUEEN', '王语纯', '假面女皇', '松果儿', '微博红人', '大屌萌妹', 'OWAKADO'];
    //let tags = ['土肥圆矮挫穷','YouMi'];


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

    let tagIndex = 0;
    let tagPageNumber = 1;
    getOneTag(tags[tagIndex]);



    function getOneTag(tag){

        console.log('——————————————————————tag:'+tag+'---主页:'+tagPageNumber+'---------------------');
        //let url = 'http://yxpjwnet.com/tags.php?/%59%6F%75%4D%69/1/';
        let url = 'http://yxpjwnet.com/tags.php?/'+urlencode(tag,'gb2312')+'/'+tagPageNumber+'/';
        console.log(url);
        request({url:url,gzip:true,encoding: null}, function (error, response, body) {
            console.log('error:', error); // Print the error if one occurred
            if(error){
                setTimeout(function(){
                    if(tags[tagIndex+1]){
                        tagIndex++;
                        tagPageNumber = 1;
                        console.log('下一tag...');
                        getOneTag(tags[tagIndex]);
                    }else{
                        console.log('完结——————————————');
                    }
                },10000);
                return;
            }
            //console.log(body);
            let bodyData = iconv.decode(body,'gb2312').toString();
            //console.log(bodyData);
            if(!JSON.stringify(bodyData).match('<!DOCTYPE HTML>')){
                console.log('爬完了');
                return;
            }
            let matchData = JSON.stringify(bodyData).match(/<h2><a target=.{1,200}<\/a><\/h2>/g);
            //console.log(matchData);

            if(matchData && matchData.length){
                for(var i = 0;i<matchData.length;i++){
                    var val = matchData[i];
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
                            if(!docs[0].tags){
                                docs[0].tags = [];
                            }
                            if(docs[0].tags.indexOf(tag) == -1){
                                docs[0].tags.push(tag);
                                docs[0].save(function(err){});
                            }
                        }else{
                            var theme = new Theme();
                            theme.title = title;
                            theme.list = [];
                            theme.date = new Date();
                            theme.tags = [tag];
                            getOneTheme(url,theme);
                        }

                    });
                }

                setTimeout(function(){
                    tagPageNumber++;
                    console.log('下一tagPage...');
                    getOneTag(tag);
                },10000);

            }else{
                setTimeout(function(){
                    if(tags[tagIndex+1]){
                        tagIndex++;
                        tagPageNumber = 1;
                        console.log('下一tag...');
                        getOneTag(tags[tagIndex]);
                    }
                },10000);
            }

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
        console.log('pageurl____________');
        console.log(url);
        console.log('_________________');
        request(url, function (error, response, body) {
            if(!body || !body.match('<!DOCTYPE HTML>')){
                console.log('这一页没东西了');

                theme.save(function (err) {
                    console.log(err);
                });
                return;
            }
            let matchData = JSON.stringify(body).match(/http:\/\/images.zhaofulipic.com:8818\/allimg\/\d+\/\w+-\d{1,3}\.jpg/g);
            //downloadAsyn(matchData, dir);

            if(matchData){
                matchData.forEach(function(val,index){

                    let filename = val.match(/\w+-\d+\.jpg/)[0];
                    filename = md5(filename+new Date().getTime());
                    theme.list.push(filename);
                    download(val,dir,filename);
                });
            }
            pageNumber++;
            console.log('下一页...');
            getOnePage(pageUrl,pageNumber,theme);

        });
    }


    ctx.body = 'getimageByTag';

});




router.get('/getImages', function (ctx, next) {
    // ctx.router available
    let page = ctx.request.query.page;

    //let i = 0;
    //
    //// 主要方法，用于下载文件
    //var downloadAsyn = function(urls, dir){
    //    let filename = urls[i].split('161023/')[1];
    //    request({uri: urls[i], encoding: 'binary'}, function (error, response, body) {
    //        console.log(filename);
    //        if (!error && response.statusCode == 200) {
    //            if (!body)  console.log("(╥╯^╰╥)哎呀没有内容。。。")
    //            fs.writeFile(dir + '/' + filename, body, 'binary', function (err) {
    //                if (err) {
    //                    console.log(err);
    //                }
    //                console.log('o(*￣▽￣*)o偷偷下载' + dir + '/' + filename + ' done');
    //                i++;
    //                if(i<urls.length){
    //                    downloadAsyn(urls,dir);
    //                }
    //            });
    //        }else{
    //
    //            console.log('error!');
    //            console.log(error);
    //            console.log(response);
    //        }
    //    });
    //};

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

    let indexNumber = page || 61;
    getOneIndexPage(indexNumber);

    function getOneIndexPage(indexNumber){
        console.log('——————————————————————主页:'+indexNumber+'---------------------');
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
            let matchData = JSON.stringify(bodyData).match(/<h2><a target=.{1,200}<\/a><\/h2>/g);
            //console.log(matchData);

            if(matchData && matchData.length){
                for(var i = matchData.length-1;i>=0;i--){
                    var val = matchData[i];
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
                            theme.title = title;
                            theme.list = [];
                            theme.date = new Date();
                            getOneTheme(url,theme);
                        }

                    });
                }

            }
            if(indexNumber>1){
                setTimeout(function(){
                    indexNumber--;
                    console.log('下一主页...');
                    getOneIndexPage(indexNumber);
                },10000);
            }

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

            if(matchData){
                matchData.forEach(function(val,index){

                    let filename = val.match(/\w+-\d+\.jpg/)[0];
                    filename = md5(filename+new Date().getTime());
                    theme.list.push(filename);
                    download(val,dir,filename);
                });
            }
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