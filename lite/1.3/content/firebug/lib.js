var FBL = {};

(function() {
// ************************************************************************************************

// ************************************************************************************************
// Namespaces

var namespaces = [];

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

this.ns = function(fn)
{
    var ns = {};
    namespaces.push(fn, ns);
    return ns;
};

this.initialize = function()
{
    //if (FBTrace.DBG_INITIALIZE) FBTrace.sysout("FBL.initialize BEGIN "+namespaces.length+" namespaces\n");
  
    if (FBL.isIE6)
      fixIE6BackgroundImageCache();
    
    findLocation();

    for (var i = 0; i < namespaces.length; i += 2)
    {
        var fn = namespaces[i];
        var ns = namespaces[i+1];
        fn.apply(ns);
    }
    
    waitForInit();

    //if (FBTrace.DBG_INITIALIZE) FBTrace.sysout("FBL.initialize END "+namespaces.length+" namespaces\n");
};

var waitForInit = function waitForInit()
{
    if (document.body)
    {
        // If the library is being loaded in the application context, that is
        // in the user interface window (iframe or popup)
        if (FBL.isApplicationContext)
        {
            window.onFirebugApplicationLoad = function(data)
            {
            	FBL.browser = data.browser;
            	FBL.Firebug.chrome = data.chrome;
            	FBL.Firebug.initialize();
            	
            	delete window.onFirebugApplicationLoad;
            }
        }
        else
        {
            FBL.Application.create();
        }
    }
    else
        setTimeout(waitForInit, 50);
};


//************************************************************************************************
// Application

this.Application = 
{
    Injected: null,
  
    create: function()
    {
        FBL.browser = new FBL.Context(window);
        FBL.Firebug.Chrome.create(FBL.browser);
    }
};


//************************************************************************************************
// Library location

this.location = {
    source: null,
    base: null,
    skin: null,
    file: null
};

this.isApplicationContext = false;

//* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

var findLocation =  function findLocation() 
{
    var reFirebugFile = /(firebug(?:\.\w+)?\.js|devmode\.js)(#.+)?$/;
    var rePath = /^(.*\/)/;
    var reProtocol = /^\w+:\/\//;
    var head = document.getElementsByTagName("head")[0];
    var path = null;
    
    for(var i=0, c=head.childNodes, ci; ci=c[i]; i++)
    {
        var file = null;
        
        if ( ci.nodeName.toLowerCase() == "script" && 
             (file = reFirebugFile.exec(ci.src)) )
        {
        	
            var fileName = file[1];
            var fileOptions = file[2];
            
            
            if (reProtocol.test(ci.src)) {
                // absolute path
                path = rePath.exec(ci.src)[1];
              
            }
            else
            {
                // relative path
                var r = rePath.exec(ci.src);
                var src = r ? r[1] : ci.src;
                var rel = /^((?:\.\.\/)+)(.*)/.exec(src);
                var lastFolder = /^(.*\/)[^\/]+\/$/;
                path = rePath.exec(location.href)[1];
                
                if (rel)
                {
                    var j = rel[1].length/3;
                    var p;
                    while (j-- > 0)
                        path = lastFolder.exec(path)[1];

                    path += rel[2];
                }
            }
            
            break;
        }
    }
    
    var m = path.match(/([^\/]+)\/$/);
    
    if (path && m)
    {
        FBL.location.source = path;
        FBL.location.base = path.substr(0, path.length - m[1].length - 1);
        FBL.location.skin = FBL.baseURL + "skin/classic/";
        FBL.location.app = path + fileName + "#app";
        
        if (fileOptions == "#app")
            FBL.isApplicationContext = true;
        
    }
    else
    {
        throw "Firebug error: Library path not found";
    }
};


// ************************************************************************************************
// Basics

this.extend = function(l, r)
{
	r = r || {};
    var newOb = {};
    for (var n in l)
        newOb[n] = l[n];
    for (var n in r)
        newOb[n] = r[n];

    return newOb;
};


this.append = function(l, r)
{
    for (var n in r)
        l[n] = r[n];
        
    return l;
};


// ************************************************************************************************
// Browser detection

var userAgent = navigator.userAgent;

this.isFirefox = userAgent.indexOf("Firefox") != -1;
this.isIE      = userAgent.indexOf("MSIE") != -1;
this.isOpera   = userAgent.indexOf("Opera") != -1;
this.isSafari  = userAgent.indexOf("AppleWebKit") != -1;
this.isIE6     = /msie 6/i.test(navigator.appVersion);
this.isIEQuiksMode = document.all ? document.compatMode == "BackCompat" : false;
this.isIEStantandMode = document.all ? document.compatMode == "CSS1Compat" : false;

// ************************************************************************************************
// Util

var HTMLtoEntity =
{
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&#39;",
    '"': "&quot;"
};

function replaceChars(ch)
{
    return HTMLtoEntity[ch];
};

this.escapeHTML = function(value)
{
    return (value+"").replace(/[<>&"']/g, replaceChars);
};



// ************************************************************************************************
// Empty

this.emptyFn = function(){};



//************************************************************************************************
// DOM

this.$ = function(id, doc)
{
    if (doc)
        return doc.getElementById(id);
    else
        return document.getElementById(id);
};

// ************************************************************************************************
// Event

this.bind = function(object, fn)
{
    return function(){return fn.apply(object, arguments);};
}

this.addEvent = function(object, name, handler)
{
    if (document.all)
        object.attachEvent("on"+name, handler);
    else
        object.addEventListener(name, handler, false);
};

this.removeEvent = function(object, name, handler)
{
    if (document.all)
        object.detachEvent("on"+name, handler);
    else
        object.removeEventListener(name, handler, false);
};

this.cancelEvent = function(e, preventDefault)
{
    if (!e) return;
    
    if (preventDefault)
    {
				if (e.preventDefault)
    				e.preventDefault();
				else
		    		e.returnValue = false;
    }
    
    if (document.all)
        e.cancelBubble = true;
    else
        e.stopPropagation();
                
};


//************************************************************************************************
// class Names

this.hasClass = function(object, name) {
    return (' '+object.className+' ').indexOf(' '+name+' ') != -1;
}

this.addClass = function(object, name) {
    if ((' '+object.className+' ').indexOf(' '+name+' ') == -1)
        object.className = object.className ? object.className + ' ' + name : name; 
}

this.removeClass = function(object, name) {
    object.className = (' ' + object.className + ' ').
        replace(new RegExp('(\\S*)\\s+'+name+'\\s+(\\S*)', 'g'), '$1 $2').
        replace(/^\s*|\s*$/g, '');
}

this.toggleClass = function(object, name) {
    if ((' '+object.className+' ').indexOf(' '+name+' ') >= 0)
        this.removeClass(object, name)
    else
        this.addClass(object, name);
}


//************************************************************************************************
// Opera Tab Fix

function onOperaTabBlur(e)
{
    if (this.lastKey == 9)
      this.focus();
};

function onOperaTabKeyDown(e)
{
  this.lastKey = e.keyCode;
};

function onOperaTabFocus(e)
{
    this.lastKey = null;
};

this.fixOperaTabKey = function(el)
{
    el.onfocus = onOperaTabFocus;
    el.onblur = onOperaTabBlur;
    el.onkeydown = onOperaTabKeyDown;
};


// ************************************************************************************************
// Ajax

this.Ajax =
{
  
    requests: [],
    transport: null,
    states: ["Uninitialized","Loading","Loaded","Interactive","Complete"],
  
    initialize: function()
    {
        this.transport = this.getXHRObject();
    },
    
    getXHRObject: function()
    {
        var xhrObj = false;
        try
        {
            xhrObj = new XMLHttpRequest();
        }
        catch(e)
        {
            var progid = [
                    "MSXML2.XMLHTTP.5.0", "MSXML2.XMLHTTP.4.0", 
                    "MSXML2.XMLHTTP.3.0", "MSXML2.XMLHTTP", "Microsoft.XMLHTTP"
                ];
              
            for ( var i=0; i < progid.length; ++i ) {
                try
                {
                    xhrObj = new ActiveXObject(progid[i]);
                }
                catch(e)
                {
                    continue;
                }
                break;
            }
        }
        finally
        {
            return xhrObj;
        }
    },
    
    
    /**
     * Realiza uma requisição ajax.
     * 
     * @name request
     * @param {Object}   options               Opções da requisição.  
     * @param {String}   options.url           URL a ser requisitada.
     * @param {String}   options.type          Tipo de requisição ("get" ou "post"). O padrão é "get".
     * @param {Boolean}  options.async         Indica se a requisição é assíncrona. O padrão é "true".   
     * @param {String}   options.dataType      Dado requisitado ("text", "html", "xml" ou "json"). O padrão é "text".
     * @param {String}   options.contentType   ContentType a ser usado. O padrão é "application/x-www-form-urlencoded".  
     * @param {Function} options.onLoading     Função a ser executada antes da requisição ser enviada.
     * @param {Function} options.onLoaded      Função a ser executada logo que a requisição for enviada.
     * @param {Function} options.onInteractive Função a ser executada durante o recebimento da requisição.
     * @param {Function} options.onComplete    Função a ser executada ao completar a requisição.
     * @param {Function} options.onUpdate      Função a ser executada após completar a requisição.
     * @param {Function} options.onSuccess     Função a ser executada ao completar a requisição com sucesso.
     * @param {Function} options.onError       Função a ser executada ao completar a requisição com erro.
     */      
    request: function(options)
    {
        var o = options || {};
    
        // Configura as opções que não foram definidas para o seu valor padrão
        o.type = o.type && o.type.toLowerCase() || "get";
        o.async = o.async || true;
        o.dataType = o.dataType || "text"; 
        o.contentType = o.contentType || "application/x-www-form-urlencoded";
    
        this.requests.push(o);
    
        var s = this.getState();
        if (s == "Uninitialized" || s == "Complete") 
            this.sendRequest();
    },
    
    serialize: function(data)
    {
        var r = [""], rl = 0;
        if (data) {
            if (typeof data == "string")  r[rl++] = data
              
            else if (data.innerHTML && data.elements) {
                for (var i=0,el,l=(el=data.elements).length; i < l; i++)
                    if (el[i].name) {
                        r[rl++] = encodeURIComponent(el[i].name); 
                        r[rl++] = "=";
                        r[rl++] = encodeURIComponent(el[i].value);
                        r[rl++] = "&";
                    }
                    
            } else 
                for(param in data) {
                    r[rl++] = encodeURIComponent(param); 
                    r[rl++] = "=";
                    r[rl++] = encodeURIComponent(data[param]);
                    r[rl++] = "&";
                }
        }
        return r.join("").replace(/&$/, "");
    },
  
    sendRequest: function()
    {
        var t = FBL.Ajax.transport, r = FBL.Ajax.requests.shift(), data;
    
        // Abre o objeto XMLHttpRequest
        t.open(r.type, r.url, r.async);
    
        //setRequestHeaders();
    
        // Registra o objeto para que o servidor saiba que é uma requisição AJAX
        t.setRequestHeader("X-Requested-With", "XMLHttpRequest");
    
        // Caso tenha sido informado algum dado
        if (data = FBL.Ajax.serialize(r.data))
          t.setRequestHeader("Content-Type", r.contentType);
    
        /** @ignore */
        // Tratamento de evento de mudança de estado
        t.onreadystatechange = function()
        { 
            FBL.Ajax.onStateChange(r); 
        }; 
    
        // Envia a requisição
        t.send(data);
    },
  
    /**
     * Função de tratamento da mudança de estado da requisição ajax.
     */     
    onStateChange: function(options)
    {
        var fn, o = options, t = this.transport;
        var state = this.getState(t); 
    
        if (fn = o["on" + state]) fn(this.getResponse(o), o);
    
        if (state == "Complete")
        {
            var success = t.status == 200, response = this.getResponse(o);
      
            if (fn = o["onUpdate"])
              fn(response, o);
      
            if (fn = o["on" + (success ? "Success" : "Failure")])
              fn(response, o);
      
            t.onreadystatechange = FBL.emptyFn;
      
            if (this.requests.length > 0) 
                setTimeout(this.sendRequest, 10);
        }
    },
  
    /**
     * Retorna a resposta de acordo com o tipo de dado requisitado.
     */  
    getResponse: function(options)
    {
        var t = this.transport, type = options.dataType;
    
        if      (t.status != 200) return t.statusText
        else if (type == "text")  return t.responseText
        else if (type == "html")  return t.responseText
        else if (type == "xml")   return t.responseXML
        else if (type == "json")  return eval("(" + t.responseText + ")");
    },
  
    /**
     * Retorna o atual estado da requisição ajax.
     */     
    getState: function()
    {
        return this.states[this.transport.readyState];
    }
  
};

this.Ajax.initialize();



// ************************************************************************************************
// Cookie, from http://www.quirksmode.org/js/cookies.html

this.createCookie = function(name,value,days)
{
    if (days) {
        var date = new Date();
        date.setTime(date.getTime()+(days*24*60*60*1000));
        var expires = "; expires="+date.toGMTString();
    }
    else var expires = "";
    document.cookie = name+"="+value+expires+"; path=/";
};

this.readCookie = function (name)
{
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++)
    {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
};

this.eraseCookie = function(name)
{
    createCookie(name,"",-1);
};



// ************************************************************************************************
// http://www.mister-pixel.com/#Content__state=is_that_simple
var fixIE6BackgroundImageCache = function(doc)
{
    doc = doc || document;
    try {
        doc.execCommand("BackgroundImageCache", false, true);
    } catch(err) {}
};


//************************************************************************************************
// Context
  
this.Context = function(win){
  
    this.window = win.window;
    this.document = win.document;
  
};

this.Context.prototype =
{  
  
    //* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Window Methods
    
    getWindowSize: function()
    {
        var width=0, height=0, el;
        
        if (typeof this.window.innerWidth == 'number')
        {
            width = this.window.innerWidth;
            height = this.window.innerHeight;
        }
        else if ((el=this.document.documentElement) && (el.clientHeight || el.clientWidth))
        {
            width = el.clientWidth;
            height = el.clientHeight;
        }
        else if ((el=this.document.body) && (el.clientHeight || el.clientWidth))
        {
            width = el.clientWidth;
            height = el.clientHeight;
        }
        
        return {width: width, height: height};
    },
    
    getWindowScrollSize: function()
    {
        var width=0, height=0, el;

        if (!isIEQuiksMode && (el=this.document.documentElement) && 
           (el.scrollHeight || el.scrollWidth))
        {
            width = el.scrollWidth;
            height = el.scrollHeight;
        }
        else if ((el=this.document.body) && (el.scrollHeight || el.scrollWidth))
        {
            width = el.scrollWidth;
            height = el.scrollHeight;
        }
        
        return {width: width, height: height};
    },
    
    getWindowScrollPosition: function()
    {
        var top=0, left=0, el;
        
        if(typeof this.window.pageYOffset == 'number')
        {
            top = this.window.pageYOffset;
            left = this.window.pageXOffset;
        }
        else if((el=this.document.body) && (el.scrollTop || el.scrollLeft))
        {
            top = el.scrollTop;
            left = el.scrollLeft;
        }
        else if((el=this.document.documentElement) && (el.scrollTop || el.scrollLeft))
        {
            top = el.scrollTop;
            left = el.scrollLeft;
        }
        
        return {top:top, left:left};
    },
    

    //* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Element Methods

    getElementFromPoint: function(x, y)
    {
        if (isOpera || isSafari)
        {
            var scroll = this.getWindowScrollPosition();
            return this.document.elementFromPoint(x + scroll.left, y + scroll.top);
        }
        else
            return this.document.elementFromPoint(x, y);
    },
    
    getElementPosition: function(el)
    {
        var left = 0
        var top = 0;
        
        if (el.offsetParent)
        {
            do
            {
                left += el.offsetLeft;
                top += el.offsetTop;
            }
            while (el = el.offsetParent);
        }
        return {left:left, top:top};      
    },
    
    getElementBox: function(el)
    {
        var result = {};
        
        if (el.getBoundingClientRect)
        {
            var rect = el.getBoundingClientRect();
            
            // fix IE problem with offset when not in fullscreen mode
            var offset = isIE ? this.document.body.clientTop || this.document.documentElement.clientTop: 0;
            
            var scroll = this.getWindowScrollPosition();
            
            result.top = Math.round(rect.top - offset + scroll.top);
            result.left = Math.round(rect.left - offset + scroll.left);
            result.height = Math.round(rect.bottom - rect.top);
            result.width = Math.round(rect.right - rect.left);
        }
        else 
        {
            var position = this.getElementPosition(el);
            
            result.top = position.top;
            result.left = position.left;
            result.height = el.offsetHeight;
            result.width = el.offsetWidth;
        }
        
        return result;
    },
    

    //* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Measurement Methods
    
    getMeasurement: function(el, name)
    {
        var result = {value: 0, unit: "px"};
        
        var cssValue = this.getCSS(el, name);
        if (!cssValue) return result;
        if (cssValue.toLowerCase() == "auto") return result;
        
        var reMeasure = /(\d+\.?\d*)(.*)/;
        var m = cssValue.match(reMeasure);
        
        if (m)
        {
            result.value = m[1]-0;
            result.unit = m[2].toLowerCase();
        }
        
        return result;        
    },
    
    getMeasurementInPixels: function(el, name)
    {
        if (!el) return null;
        
        var m = this.getMeasurement(el, name);
        var value = m.value;
        var unit = m.unit;
        
        if (unit == "px")
            return value;
          
        else if (unit == "pt")
            return this.pointsToPixels(name, value);
          
        if (unit == "em")
            return this.emToPixels(el, value);
          
        else if (unit == "%")
            return this.percentToPixels(el, value);
    },

    getMeasurementBox: function(el, name)
    {
        var sufixes = ["Top", "Left", "Bottom", "Right"];
        var result = [];
        
        for(var i=0, sufix; sufix=sufixes[i]; i++)
            result[i] = Math.round(this.getMeasurementInPixels(el, name + sufix));
        
        return {top:result[0], left:result[1], bottom:result[2], right:result[3]};
    }, 
    
    getFontSizeInPixels: function(el)
    {
        var size = this.getMeasurement(el, "fontSize");
        
        if (size.unit == "px") return size.value;
        
        // get font size, the dirty way
        var computeDirtyFontSize = function(el, calibration)
        {
            var div = this.document.createElement("div");
            var divStyle = offscreenStyle;

            if (calibration)
                divStyle +=  " font-size:"+calibration+"px;";
            
            div.style.cssText = divStyle;
            div.innerHTML = "A";
            el.appendChild(div);
            
            var value = div.offsetHeight;
            el.removeChild(div);
            return value;
        }
        
        // Calibration fails in some environments, so we're using a static value
        // based in the test case result.
        var rate = 200 / 225;
        //var calibrationBase = 200;
        //var calibrationValue = computeDirtyFontSize(el, calibrationBase);
        //var rate = calibrationBase / calibrationValue;
        
        var value = computeDirtyFontSize(el);

        return value * rate;
    },
    
    
    //* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Unit Funtions
  
    pointsToPixels: function(name, value)
    {
        var axis = /Top$|Bottom$/.test(name) ? "y" : "x";
        
        var result = value * pixelsPerInch[axis] / 72;
        
        return returnFloat ? result : Math.round(result);
    },
    
    emToPixels: function(el, value)
    {
        if (!el) return null;
        
        var fontSize = this.getFontSizeInPixels(el);
        
        return Math.round(value * fontSize);
    },
    
    exToPixels: function(el, value)
    {
        if (!el) return null;
        
        // get ex value, the dirty way
        var div = this.document.createElement("div");
        div.style.cssText = offscreenStyle + "width:"+value + "ex;";
        
        el.appendChild(div);
        var value = div.offsetWidth;
        el.removeChild(div);
        
        return value;
    },
      
    percentToPixels: function(el, value)
    {
        if (!el) return null;
        
        // get % value, the dirty way
        var div = this.document.createElement("div");
        div.style.cssText = offscreenStyle + "width:"+value + "%;";
        
        el.appendChild(div);
        var value = div.offsetWidth;
        el.removeChild(div);
        
        return value;
    },
    
    //* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    
    getCSS: this.isIE ? function(el, name)
    {
        return el.currentStyle[name] || el.style[name] || undefined;
    }
    : function(el, name)
    {
        return this.document.defaultView.getComputedStyle(el,null)[name] 
            || el.style[name] || undefined;
    }

};

//* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
// Internal variables

var pixelsPerInch;

//************************************************************************************************
// Measurement Functions

var calculatePixelsPerInch = function calculatePixelsPerInch()
{
    var inch = this.document.createElement("div");
    inch.style.cssText = resetStyle + "width:1in; height:1in; position:absolute; top:-1234px; left:-1234px;";
    this.document.body.appendChild(inch);
    
    pixelsPerInch = {
        x: inch.offsetWidth,
        y: inch.offsetHeight
    };
    
    this.document.body.removeChild(inch);
};



// ************************************************************************************************
}).apply(FBL);