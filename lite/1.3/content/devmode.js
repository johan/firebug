/*


TODO

- use of dispatch
 OK - frame, frameStyle, consoleFrame, consoleBody
- create/destroy, initialize/shutdown. rename functions to this pattern.




- context
- persitent popups
- library loading in different windows




Document Cache

[ELEMENT_ID]
    - element
    - context
    - styles
    - MD5


















styleCache = {};

// First style to add to cache is the inline styles
for(cid in documentCache)
{
    styleCache[cid] = [];
    styleCache[cid].push();
}

// for each stylesheet 
for(stylesheet in stylesheets)
{
    // look at each rule
    for(rule in stylesheet)
    {
        // get the rule's selector, and find all elements in document
        var els = Firebug.Selector(rule.selector);
        
        // for each element found
        for(var i=0, el; el=els[i]; i++)
        {
            var cid = el[cacheID];
            
            // Add style info in the cache stack of styles of the element 
            styleCache[cid].push({
                stylesheet: stylesheet,
                lineNumber: getLineNumber(rule, stylesheet),
                fileName: getFileName(rule, stylesheet),
                selector: rule.selector,
                styles: rule.styles
            });
        }
    }

}



-------------------------------------------------------------------------------
-------------------------------------------------------------------------------

DOMPLATE


IE problems with templates

1 - class name attributes of objects

2 - colon after the last property of a object

3 - event handlers  

-------------------------------------------------------------------------------
-------------------------------------------------------------------------------


---Core----
FIXED: Fixed bug in getLocation function, the relative path calculation wasn't 
       working in all cases. 

FIXED: Fixed bug in commandLine. Commands that doesn't return a value (if, for,
       while) wasn't being properly executed.



---Core----
TODO: Problem with id conflits. The same attribute is being used in the document
      elements and in the HTML Tree, in the user interface.

TODO: Better handling of switching tab contexts (selectedTab, rightPanelVisible)
TODO: Check if there's a problem using the Sizzle selector engine in the code

---Events----
TODO: handle disble text selection on Vertical Scrolling
TODO: handle disble mouse wheel in Chrome, when in frame mode?

---ui----
TODO: Opera problem with onunload and popups (context is not being destroyed)

---commandLine----
TODO: refactor commandLine to hide internal methods and properties.


-------------------------------------------------------------------------------
-------------------------------------------------------------------------------


---Inspector---
DONE: Inspect function implemented.

DONE: onInspecting highlight element in HTML Tree behaviour implemented.
      When inspecting, the elements are being highlighted, and the scroll
      is being changed to make the element visible in the tree.


-------------------------------------------------------------------------------
-------------------------------------------------------------------------------


---Chrome---
FIXED: Problem with multiple iframes and the resizing of the Chrome, that
       tries to add events on them.

FIXED: Fixed problem in IE when resizing the Chrome, when the relative position
       of the mouse wasnt being computed in all frames of the document, 
       resulting in strange flickerings when resizing it.

FIXED: Fixed problem in Opera when resizing the Chrome.

FIXED: Problem when resizing with the fbVSplitter, when it reaches the side of
       the screen. Problem with negative pixel numbers.

FIXED: fbVSplitter is bigger than the frame in firefox. Problem with mouse scroll.

FIXED: isScrolledToBottom is not working in Firefox, it seems that this is 
      happening because the scrollable panel is some pixels higher than
      it should be.


---Core----
FIXED: Problem with scope in event handlers. All functions that need to access
       the "shared scope" must be assigned to a local variable.
        
        var onClick = function onClick(e)
        {
        ...

FIXED: Revised "extend" and "append" functions

FIXED: problem with the new Firebug for FF3, it seems that it doesn't allow 
      extending the console namespace anymore.
            
FIXED: CommandLineAPI --> $, $$, dir, dirxml...


---Inspector---
FIXED: Selected element in HTML tree isn't being highlighted (boxmodel)

FIXED: BoxModel functions entirely revised. Now the position, size, padding
       and margin are being computed correctly, in all units: pt, px, em, ex
       and % (need to test more deeply the percentage values).


---Events----
FIXED: Opera problem with the TAB key in commandLine

FIXED: Better handling of the F12 key press, which wasn't being properly
       attached to the Chrome Frame window.


---commandLine---
FIXED: better handling of scope of commandLine.eval(), if you type "this" it will
      refer to the CommandLine module, and it should refer to "window" instead

-------------------------------------------------------------------------------
-------------------------------------------------------------------------------


*/


/*
 * 

Geral
  FBL.$
  FBL.$$
  $0
  $1



========================================================================
===== Chrome States ====================================================
========================================================================

===== Window ===========================================================
    - type (frame, popup)
    - height
    - width (popup)
    - position (popup)

===== Console ==========================================================
    - console log history
    - console commandLine history

===== Tab ==============================================================
  - active Panel



========================================================================
===== Panel States =====================================================
========================================================================
    - offset (scroll position)
    - toolbarButtons (confirmar o que é isso)
    - statusBar
    
    - isSearchable
    - busca
    
    - consoleVisible
    - sidePanelVisible

===== SidePanel =======================================================
    - offset (scroll position)
    - sidePanelWidth
    - activeSidePanel


Eventos
  - adição e remoção (controladores)
  - painéis
  - delegação
    - clique
    - inspeção

  - Mover testes antigos (ferramentas de desenvolvimento: 
    compress HTML, CSS e Build)





<script language="JavaScript1.2">

function disabletext(e){
return false
}

function reEnable(){
return true
}

//if the browser is IE4+
document.onselectstart=new Function ("return false")

//if the browser is NS6
if (window.sidebar){
document.onmousedown=disabletext
document.onclick=reEnable
}
</script>

*/

  

/*

CHECK!!!!:

IE - get element position (very fast). To use in BoxModel
getBoundingClientRect OK!!!!

QUESTIONS:
  - Document Caching
  - The "build" folder doesn't exists in Firebug. 
ok- Files organized in folders.
  - How to proceed when the console global variable is already defined?
  
  - Loading process
    full:
        - js with embedded HTML and CSS codes
        - sprite image

TO THINK:
  - how to auto-load FirebugLite + Extension in a single bookmarlet?

  


<script language="JavaScript1.2">

function disabletext(e){
return false
}

function reEnable(){
return true
}

//if the browser is IE4+
document.onselectstart=new Function ("return false")

//if the browser is NS6
if (window.sidebar){
document.onmousedown=disabletext
document.onclick=reEnable
}
</script>



*/

/*



function getXPath(node, path) {
  path = path || [];
  if(node.parentNode) {
    path = getXPath(node.parentNode, path);
  }

  if(node.previousSibling) {
    var count = 1;
    var sibling = node.previousSibling
    do {
      if(sibling.nodeType == 1 && sibling.nodeName == node.nodeName) {count++;}
      sibling = sibling.previousSibling;
    } while(sibling);
    if(count == 1) {count = null;}
  } else if(node.nextSibling) {
    var sibling = node.nextSibling;
    do {
      if(sibling.nodeType == 1 && sibling.nodeName == node.nodeName) {
        var count = 1;
        sibling = null;
      } else {
        var count = null;
        sibling = sibling.previousSibling;
      }
    } while(sibling);
  }

  if(node.nodeType == 1) {
    path.push(node.nodeName.toLowerCase() + (node.id ? "[@id='"+node.id+"']" : count > 0 ? "["+count+"]" : ''));
  }
  return path;
};


// Getting result
document.evaluate("/html/body/div/ul/li[2]", document, null, XPathResult.ANY_TYPE, null ).iterateNext()





---------------------------------------------------------

//Returns true if it is a DOM node
function isNode(o){
  return (
    typeof Node === "object" ? o instanceof Node : 
    typeof o === "object" && typeof o.nodeType === "number" && typeof o.nodeName==="string"
  );
}

//Returns true if it is a DOM element    
function isElement(o){
  return (
    typeof HTMLElement === "object" ? o instanceof HTMLElement : //DOM2
    typeof o === "object" && o.nodeType === 1 && typeof o.nodeName==="string"
);
}




*/


/*
function getInlineStyles(el)
{
    var style = el.style;
    var r = {}, l, prop;
    
    // Good browsers first
    if (l = style.length)
    {
        for(var i=0; i<l; i++)
        {
            prop = style[i];
            r[toCamelCase(prop)] = style.getPropertyValue(prop);
        }
    }
    // Sad browsers last
    else
    {
      for(var prop in style)
        if (ignoreIEStyleProperties.indexOf(prop) == -1 && 
            isIEInlineStyleProperty(el, prop))
                r[prop] = style[prop];
    }
    
    return r;
}

var ignoreIEStyleProperties = " cssText accelerator ";
function isIEInlineStyleProperty(el, prop)
{
    var r = false;
    
    if (typeof el.style[prop] == "string")
    {
        r = !!el.style[prop];
    }
    
    return r;
}


function toCamelCase(s)
{
    return s.replace(_selectorCaseMatch, _toCamelCaseReplaceFn);
}

function toSelectorCase(s)
{
  return s.replace(_camelCaseMatch, "-$1").toLowerCase();
  
}

var _camelCaseMatch = /([A-Z])/g;
var _selectorCaseMatch = /\-(.)/g; 
function _toCamelCaseReplaceFn(m,g)
{
    return g.toUpperCase();
}





/**/



(function(){

var bookmarletMode = true;

var bookmarletURL = "http://fbug.googlecode.com/svn/trunk/lite/1.3/build/";
var bookmarletSkinURL = "http://fbug.googlecode.com/svn/trunk/lite/1.3/skin/classic/";
//var bookmarletSkinURL = "http://pedrosimonetti.googlepages.com/";

var publishedURL = "";
var baseURL = "";
var sourceURL = "";
var skinURL = "";
var fullURL = "";
var isApplicationContext = false;

var modules = 
[
     
    "firebug/lib.js",
    "firebug/lib.injected.js",
    "firebug/firebug.js",
    //"firebug/domplate.js",
    "firebug/reps.js",
    "firebug/console.js",
    
    "firebug/chrome.js",
    
    "firebug/selector.js",
    "firebug/inspector.js",
    //"firebug/panel.js",
    
    "firebug/commandLine.js",
    "firebug/html.js",
    
    "firebug/boot.js"
    /**/
];


var isFirefox = navigator.userAgent.indexOf("Firefox") != -1;
var isIE = navigator.userAgent.indexOf("MSIE") != -1;
var isOpera = navigator.userAgent.indexOf("Opera") != -1;
var isSafari = navigator.userAgent.indexOf("AppleWebKit") != -1;


var API =
{

    build: function() {
        var s = document.getElementsByTagName("script"); 
        var result = [];
        
        var out = document.createElement("textarea");
        
        //result.push(["(function(){"]);
        
        for(var i=1, l=s.length; i<l-1; i++)
        {
            FBL.Ajax.request({url: s[i].src, i: i, onComplete:function(r,o)
                {
                    result.push(r, o.i < (l-2) ? "\n\n" : "");
                    
                    if(o.i == (l-2))
                    {
                        //result.push(["\n})();"]);
                        /*
                        if (bookmarletMode)
                            result.push(["FBL.Firebug.Chrome.toggle(true);"]);
                            /**/
                        
                        out.style.cssText = "position: absolute; top: 0; left: 0; width: 100%; height: 100%;";
                        out.appendChild(document.createTextNode(result.join("")));
                        document.body.appendChild(out);
                    }
                    /**/
                }
            });
        
        }
    },
    
    compressInterace: function()
    {
        var files = [
            ];
    },
    
    compressSkinHTML: function()
    {
        var url = skinURL + "firebug.html";
        
        var out = document.createElement("textarea");
        
        FBL.Ajax.request({url: url, onComplete:function(r)
            {
                var result = FBL.dev.compressHTML(r);
                
                out.style.cssText = "position: absolute; top: 0; left: 0; width: 100%; height: 100%;";
                out.appendChild(document.createTextNode(result));
                document.body.appendChild(out);
            }
        });
        
    },
    
    
    compressSkinCSS: function()
    {
        var url = skinURL + "firebug.css";
        
        var out = document.createElement("textarea");
        
        FBL.Ajax.request({url: url, onComplete:function(r)
            {
                var result = FBL.dev.compressCSS(r);
                
                out.style.cssText = "position: absolute; top: 0; left: 0; width: 100%; height: 100%;";
                out.appendChild(document.createTextNode(result));
                document.body.appendChild(out);
            }
        });
        
    },
    
    compressHTML: function(html)
    {
        var reHTMLComment = /(<!--([^-]|-(?!->))*-->)/g;
        
        return html.replace(/^[\s\S]*<\s*body.*>\s*|\s*<\s*\/body.*>[\s\S]*$/gm, "").
            replace(reHTMLComment, "").
            replace(/\s\s/gm, "").
            replace(/\s+</gm, "<").
            replace(/<\s+/gm, "<").
            replace(/\s+>/gm, ">").
            replace(/>\s+/gm, ">").
            replace(/\s+\/>/gm, "/>");
    },

    compressCSS: function(css)
    {
        var reComment = /(\/\/.*)\n/g;
        var reMultiComment = /(\/\*([^\*]|\*(?!\/))*\*\/)/g;

        return css.replace(reComment, "").
            replace(reMultiComment, "").
            replace(/url\(/gi, "url("+publishedURL).
            replace(/\s\s/gm, "").
            replace(/\s+\{/gm, "{").
            replace(/\{\s+/gm, "{").
            replace(/\s+\}/gm, "}").
            replace(/\}\s+/gm, "}").
            replace(/\s+\:/gm, ":").            
            replace(/\:\s+/gm, ":").            
            replace(/,\s+/gm, ",");            
    }

}

function loadModules() {
    findLocation();
    
    publishedURL = bookmarletMode ? bookmarletSkinURL : skinURL;
    
    var sufix = isApplicationContext ? "#app" : "";
    
    for (var i=0, module; module=modules[i]; i++)
        loadScript(sourceURL + module + sufix);
        
    waitForFBL();
};

function findLocation() 
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
        sourceURL = path;
        baseURL = path.substr(0, path.length - m[1].length - 1);
        skinURL = baseURL + "skin/classic/";
        fullURL = path + fileName;
        
        if (fileOptions == "#app")
            isApplicationContext = true;
    }
    else
    {
        throw "Firebug error: Library path not found";
    }
};

/*
 * Carrega o script dinamicamente.
 */
function loadScript(url)
{
    var agent = navigator.userAgent;

    if (isIE)
        document.write('<scr'+'ipt src="' + url + '"><\/scr'+'ipt>');
       
    else
    {
        var script = document.createElement("script");
        script.src = url;
        document.getElementsByTagName("head")[0].appendChild(script);
    }
};

function waitForFBL()
{
    if(document.body && window.FBL)
    {
        initialize();
    }
    else
        setTimeout(waitForFBL, 200);
}

function initialize()
{
    FBL.Dev = API;
}

loadModules();

})();
