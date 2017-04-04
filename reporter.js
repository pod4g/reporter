 /**
  * 前端异常监控
  * Author：李彦峰
  *
  * 自定义的error code:
  *  0 代码错误
  *  1 主动上报的错误
  *  2 主动上报的warn
  *  3 图片挂了
  */
 (function(window) {
     'use strict';
     //  接收报告信息的接口
     var url = '//x.x.x.x/error_reciver'
     /**
      * 1、减少传输量，在后台拿出UA即可
      * 没必要在前端分析操作系统、浏览器、浏览器版本
      *
      * 2、减少传输量，在后台拿到refer，这样发生异常的url也不用传输了
      */

     /*
        原生ajax函数。用法与jquery ajax一致。
        author:李彦峰
        修改时间:2016,02,20
        版本:1.1
        https://github.com/pod4g/qAjax
    */
     // TODO: 作为上报组件的一个功能。简化成只支持JSONP即可
     // 这样就支持IE8+以上的上报了。
     function request(opts) {
         var
             data = opts.data || {}, // 请求参数
             type = function(arg) {
                 var t = typeof arg;
                 if (t === 'object') {
                     if (arg === null) {
                         return 'null';
                     } else {
                         return Object.prototype.toString.call(arg).slice(8, -1).toLowerCase();
                     }
                 } else {
                     return t;
                 }
             },
             prop2prame = function(data) {
                 var ret = "", prop;
                 if (!data || type(data) !== 'object') {
                     return ret;
                 }
                 for (prop in data) {
                     var val = data[prop];
                     if (type(val) === "array") {
                         for (var i = 0, l = val.length; i < l; i++) {
                             ret += prop + "=" + val[i] + "&";
                         }
                     } else {
                         ret += prop + "=" + val + "&";
                     }
                 }
                 return ret;
             };
         // 尽可能地缩短传输参数。
         // 在IE8 下的URL地址总长度为：4076，超过该长度会自动忽略后面的内容；
         // 在firefox 25下的URL地址总长度可以达到:7530，超过该长度会访问错误；
         // 在chrome 29.0.1547.62 的最大总长度达到:7675，超过该长度会访问错误；
         var callbackParamValue = '_cb__' + Math.floor(Math.random() * 10000);
         var url = opts.url;
         var param = prop2prame(data);
         // b=_cb__4553
         // 原来key是c
         // 导致和错误信息中的 c 即列号冲突
         // 在server端拿到的c为["9","_cb__4553"]
         // 导致insert到数据库中报语法错误
         param = param.concat('b').concat('=').concat(callbackParamValue);
         param = url.indexOf('?') == -1? '?' + param : '&' + param;
        //  if (url.indexOf('?') == -1) {
        //      param = '?' + param;
        //  } else {
        //      param = '&' + param;
        //  }
         var doJSONP = function(src) {
             var
                 doc = document,
                 body = doc.body,
                 __script__ = doc.createElement('script');
                 __script__.type = 'text/javascript';
                 __script__.src = src;
             window[callbackParamValue] = function() {
                 // 执行完毕之后，抹除JSONP标记
                 window[callbackParamValue] = void 0;
                 body.removeChild(__script__);
             }
             body.appendChild(__script__);
             var timeout = opts.timeout || 5000;
             if (timeout > 0) {
                 setTimeout(function() {
                     body.removeChild(__script__);
                 }, timeout)
             }
         }
         doJSONP(opts.url + param);
     }

     function addEvent(obj, event, handler) {
         return obj.addEventListene? obj.addEventListener(event, handler) : obj.attachEvent('on' + event, handler)
     }
     function isObject(obj) {
       if(obj === null){
         return false
       }
       return /object/.test(typeof obj)
     }

     function isFunctionOrObject(obj) {
         return /function/.test(typeof obj) || isObject(obj)
     }

     function encode(str){
        return encodeURIComponent( str || '' );
     }

     /**
      * 传输的参数格式为：
      *   {
      *     t: 0,1,2,3 // type
      *     m: 'error info' // message
      *     f: 'xxx.js' // filename
      *     l: 119 // lineno
      *     c: 120 // colno
      *   }
      */

     // hook console
     (function() {

         function errorHook(msg) {
             var type = typeof msg;
             var err = { "t": 1 }
             if (/string|number/.test(type)) {
                 err.m = encode(msg);
             } else if (isObject(msg)) {
                 err.m = encode(msg.message);
                 err.f = msg.filename || '';
                 err.l = msg.lineno || '';
                 err.c = msg.colno || '';
             }
             // console.log('触发主动上报error' + JSON.stringify(err));
             request({ url: url, data: err });
         }

         function warnHook(msg) {
             var warn = {
                 "t": 2,
                 "m": encode(msg)
             }
             // console.log('触发主动上报warn' + JSON.stringify(warn));
             // request({url:url, data:JSON.stringify({type:'warn',message: msg})};
             request({
                 url: url,
                 data: warn
             });
         }

         var console = window.console;

         if (console) {
             var oError = console.error;
             var oWarn = console.warn;
             if (isFunctionOrObject(oError)) {
                 console.error = function(msg) {
                     try {
                         oError.call(console, msg);
                         // console.log('执行errorHook');
                         errorHook(msg);
                     } catch (e) { // 必须有参数，在IE8下会报 “缺少标识符” 错误
                         // errorHook(msg);
                     }
                 }
             }
             if (isFunctionOrObject(oWarn)) {
                 console.warn = function(msg) {
                     try {
                         oWarn.call(console, msg);
                         warnHook(msg);
                     } catch (e) { // 必须有参数，在IE8下会报 “缺少标识符” 错误
                         // warnHook(msg);
                     }
                 }
             }
         } else {
             window.console = {
                 error: function(msg) {
                     errorHook(msg);
                 },
                 warn: function(msg) {
                     warnHook(msg);
                 }
             }
         }
     }());


     addEvent(window, 'error', function(e, sUrl, sLine) {
         // e = e || event;
         // alert(e);
         // 代码错误 type: 0
         // ie8-
         var error;
         if(
            // ie8-
            typeof e === 'string'
          ){
            error = {
                 t: 0,
                 m: encode(e),
                 l: sLine
            }
         }
          else  // w3c
         {
            error = {
                 t: 0,
                 m: encode(e.message),
                 f: e.filename,
                 l: e.lineno,
                 c: e.colno
            }
         }
         // console.log('应该上报一次，代码执行异常类型。信息：', JSON.stringify(error));
         // e.preventDefault(); // 不报错
         if(error){
            request({
                 url: url,
                 data: error
            });
         }
     });

     addEvent(window, 'load', function() {
         var imgs = document.getElementsByTagName('img'),
             brokens = [],
             img, i = 0;
         while (img = imgs[i++]) {
             if (!img.complete || (img.naturalWidth === 0 && img.naturalHeight === 0)) {
                 brokens.push(img.src);
             }
         }
         // console.log('应该上报一次，图片挂了。信息：', JSON.stringify(brokens));
         // 图片挂了 type: 3
         if(brokens.length > 0 ){
            var error = {
                t:3,
                m: encode(brokens.join(','))
             };
             request({
                 url: url,
                 data: error
             });
         }
     });
 }(window));
