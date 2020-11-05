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

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const router = new Router();
mongoose.connect('mongodb://localhost:27017/zfl');

const resourceHost = ['http://yxpjwnet.com','https://961.one','http://yxpjwnet2.com','http://yxpjwnet3.com','http://fuli010.com','https://52zfl.com','https://652ll.com','https://qqr522.com','https://ucr775.com'];


var Schema = mongoose.Schema;

var ThemeSchema = new Schema({
    title     : String,
    list      : Array,
    date      : Date,
    url       : String,
    tags      : Array
});

var UserSchema = new Schema({
    username     : String,
    date      : Date,
    password       : String,
    like : Array
});

var Theme = mongoose.model('Theme', ThemeSchema);
var User = mongoose.model('User', UserSchema);

// x-response-time

app.use(async (ctx, next) => {
    const start = Date.now();
    console.log(`${ctx.method} ${ctx.url} - start!!!!!!`);
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

router.get('/register', async function (ctx, next) {
    let username = ctx.request.query.username;
    let password = ctx.request.query.password;
    if(!username || !password) return resolve(-2);
    let param = {};
    param.username = username;
    ctx.body = await new Promise(function(resolve,reject){
        User.find(param, function (err, docs) {

            if(err){
                console.log('ERROr');
                return resolve(-2);
            }
            if(!docs || !docs.length){
                var user = new User();
                user.username = username;
                user.password = password;
                user.date = new Date();
                user.save(function(err, res){
                    return resolve({username: username, token: res._id})
                })
            }else{
                return resolve({code:100, msg:'用户已存在'})
            }

        });
    })

})

router.get('/login', async function (ctx, next) {
    let username = ctx.request.query.username;
    let password = ctx.request.query.password;
    if(!username || !password) return resolve(-2);
    let param = {};
    param.username = username;
    param.password = password;
    ctx.body = await new Promise(function(resolve,reject){
        User.find(param, function (err, docs) {

            if(err){
                console.log('ERROr');
                return resolve(-2);
            }
            if(docs && docs.length){
                return resolve({username:username, token: docs[0]._id})
            }else{
                return resolve({code:100, msg:'用户名或密码错误'})
            }

        });
    })

})

router.get('/like', async function (ctx, next) {
    let id = ctx.request.query.id;
    let token = ctx.request.query.token;
    if(!id || !token) return resolve({code:100, msg:'未获取到用户信息'});

    let param = {};
    param._id = id;
    ctx.body = await new Promise(function(resolve,reject){
        User.findById(token, function(e,user){
            if(e || !user ){
                return resolve({code:100, msg: '未获取到用户信息'})
            }
            let repeat = false;
            if(user.like && user.like.length){
                user.like.forEach(function(item, index){
                    if(item._id == id){
                        repeat = true;
                    }
                });
            }

            if(!repeat){
                Theme.findById(id, function (err, docs) {

                    if(err||!docs){
                        console.log('ERROr');
                        return resolve(-2);
                    }
                    docs.list = [];
                    user.like.unshift(docs);
                    user.save(function (err, doc) {
                        if(err){
                            console.log('添加失败!!!', doc)
                            return resolve({code:500,msg:'添加失败!'})
                        }
                        return resolve(docs);
                    });

                });
            }else{
                return resolve({code:500,msg:'已存在了哦'})
            }

        })

    })

})

router.get('/dislike', async function (ctx, next) {
    let id = ctx.request.query.id;
    let token = ctx.request.query.token;
    if(!id || !token) return resolve({code:100, msg:'未获取到用户信息'});

    let param = {};
    param._id = id;
    ctx.body = await new Promise(function(resolve,reject){
        User.findById(token, function(e,user){
            if(e || !user ){
                return resolve({code:100, msg: '未获取到用户信息'})
            }
            if(user.like && user.like.length){
                user.like.forEach(function(item, index){
                    if(item._id == id){
                        user.like.splice(index,1);
                        user.save(function (err, doc) {
                            if(err){
                                console.log('移除失败!!!', doc)
                                return resolve(-2)
                            }
                            return resolve(doc);
                        });
                    }
                });

            }else{
                return resolve(-2)
            }

        })

    })

})

router.get('/delete', async function (ctx, next) {
    let id = ctx.request.query.id;
    let token = ctx.request.query.token;
    if(!id || !token) return resolve({code:100, msg:'未获取到用户信息'});

    let param = {};
    param._id = id;
    ctx.body = await new Promise(function(resolve,reject){
        User.find({_id: token}, function(e,d){
            if(e || !d ||!d.length){
                return resolve({code:100, msg: '未获取到用户信息'})
            }
            if(d[0].username != 'cmy5001'){
                return resolve({code:100, msg: '没有权限哦'})
            }
            Theme.find(param, function (err, docs) {

                if(err||!docs||!docs.length){
                    console.log('ERROr');
                    return resolve(-2);
                }

                docs[0].list.forEach(function(item, index){
                    fs.unlink(dir+'/'+item,function(err){
                        if (err) {
                            console.log(err);
                        }
                        console.log('删除' + dir + '/' + item + ' done');
                    })
                });


                Theme.remove(param, function(err, docs){
                    if(err){
                        console.log('删除记录失败!!!', docs)
                    }
                });
                return resolve(docs);

            });
        })

    })

})


router.get('/showImages', async function(ctx, next){
    let id = ctx.request.query.id;
    let page = ctx.request.query.page;
    let tag = ctx.request.query.tag;
    let title = ctx.request.query.title;
    let token = ctx.request.query.token;
    let like = ctx.request.query.like;
    let pageSize = 10;

    ctx.body = await new Promise(function(resolve,reject){
        User.find({_id: token}, function(e,d){
            if(e || !d ||!d.length){
                return resolve({code:100, msg: '未获取到用户信息'})
            }
            if(like){
                return resolve(d[0].like || []);
            }
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
                let reg = new RegExp(decodeURIComponent(title),'i');
                let array = decodeURIComponent(title).split(' ');
                if(array.length>1){
                    reg = new RegExp('('+array.join(')+(\\S)*(')+')+','i');
                }
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

    })

});



router.get('/getImages', function (ctx, next) {
    // ctx.router available
    let page = ctx.request.query.page;
    let host = ctx.request.query.host || '7';


    var download = function(url, dir,filename){
        request({uri: url, encoding: 'binary',strictSSL: false, // allow us to use our self-signed cert for testing
            rejectUnauthorized: false}, function (error, response, body) {
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

    let indexNumber = page || 122;
    getOneIndexPage(indexNumber);

    function getOneIndexPage(indexNumber){
        console.log('——————————————————————主页:'+indexNumber+'---------------------');
        //console.log(resourceHost[host]+'/page/'+indexNumber+'.html');
        console.log(resourceHost[host]+'/luyilu/list_5_'+indexNumber+'.html');
        request({url:resourceHost[host]+'/luyilu/list_5_'+indexNumber+'.html',gzip:true,encoding: null}, function (error, response, body) {
            if(error){
                console.log('error:', error); // Print the error if one occurred
                console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
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
                for(var i = matchData.length-1;i>=0;i--){
                    var val = matchData[i];
                    let url = val.split('href=\\"')[1];
                    url = resourceHost[host]+url.split('\\" title=')[0];
                    let title = val.split('title=\\"')[1];
                    title = title.split('\\">')[0];
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

        request({url:url,gzip:true,encoding: null}, function (error, response, body) {
            if(error){
                console.log('error:');
                console.log(error);
            }
            let bodyData = iconv.decode(body,'gb2312').toString();
            if(!JSON.stringify(bodyData) || !JSON.stringify(bodyData).match('<!DOCTYPE HTML>')){
                console.log('这一页没东西了 no body');

                theme.save(function (err) {
                    console.log(err);
                });
                return;
            }
            console.log('pageurl____________');
            console.log(url);
            console.log('_________________');
            let matchData = JSON.stringify(bodyData).match(/https:\/\/www.images.zflpic.vip:8819\/allimg\/\d+\/\w+-\d{1,3}\.jpg/g);
            //downloadAsyn(matchData, dir);

            if(!matchData || !matchData.length){
                console.log('这一页没东西了 no image');

                theme.save(function (err) {
                    console.log(err);
                });
                return;
            }

            if(matchData){
                matchData.forEach(function(val,index){

                    let filename = val.match(/\d+\/\w+-\d{1,3}\.jpg/)[0];
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


setInterval(function(){

    console.log('开始更新咯~开始更新咯~开始更新咯~开始更新咯~开始更新咯~开始更新咯~开始更新咯~开始更新咯~开始更新咯~开始更新咯~开始更新咯~开始更新咯~开始更新咯~开始更新咯~开始更新咯~开始更新咯~', new Date())


    let page = 1;
    let host = '7';


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

    let indexNumber = page || 122;
    getOneIndexPage(indexNumber);

    function getOneIndexPage(indexNumber){
        console.log('——————————————————————主页:'+indexNumber+'---------------------');
        //console.log(resourceHost[host]+'/page/'+indexNumber+'.html');
        console.log(resourceHost[host]+'/luyilu/list_5_'+indexNumber+'.html');
        request({url:resourceHost[host]+'/luyilu/list_5_'+indexNumber+'.html',gzip:true,encoding: null}, function (error, response, body) {
            if(error){
                console.log('error:', error); // Print the error if one occurred
                console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
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
                for(var i = matchData.length-1;i>=0;i--){
                    var val = matchData[i];
                    let url = val.split('href=\\"')[1];
                    url = resourceHost[host]+url.split('\\" title=')[0];
                    let title = val.split('title=\\"')[1];
                    title = title.split('\\">')[0];
                    Theme.find({title:title}, function (err, docs) {
                        // docs.forEach
                        err && console.log(err);
                        if(docs && docs.length){
                        }else{
                            var theme = new Theme();
                            theme.title = title;
                            theme.list = [];
                            theme.url = url;
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
        request({url:url,gzip:true,encoding: null}, function (error, response, body) {
            if(error){
                console.log('error:');
                console.log(error);
            }
            let bodyData = iconv.decode(body,'gb2312').toString();
            if(!JSON.stringify(bodyData) || !JSON.stringify(bodyData).match('<!DOCTYPE HTML>')){
                console.log('这一页没东西了 no body');

                theme.save(function (err) {
                    console.log(err);
                });
                return;
            }
            console.log('pageurl____________');
            console.log(url);
            console.log('_________________');
            let matchData = JSON.stringify(bodyData).match(/https:\/\/www.images.zflpic.vip:8819\/allimg\/\d+\/\w+-\d{1,3}\.jpg/g);
            //downloadAsyn(matchData, dir);

            if(!matchData || !matchData.length){
                console.log('这一页没东西了 no image');

                theme.save(function (err) {
                    console.log(err);
                });
                return;
            }

            if(matchData){
                matchData.forEach(function(val,index){

                    let filename = val.match(/\d+\/\w+-\d{1,3}\.jpg/)[0];
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
}, 60*1000*60*24)


app
    .use(router.routes())
    .use(router.allowedMethods());


app.listen(3000);
console.log('listen 3000');