/*

-------------------------------------------------------------------------------
-------------------------------------------------------------------------------


---Core----
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
  - Files organized in folders.
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

(function(){

var bookmarletMode = true;

var bookmarletURL = "http://fbug.googlecode.com/svn/trunk/lite/1.3/build/";
var bookmarletSkinURL = "http://fbug.googlecode.com/svn/trunk/lite/1.3/skin/classic/";
//var bookmarletSkinURL = "http://pedrosimonetti.googlepages.com/";

var publishedURL = "";
var baseURL = "";
var sourceURL = "";
var skinURL = "";

var modules = 
[
    "lib.js",
    
    "firebug.js",

    "firebug/domplate.js",
    //"firebug/test.js",
    
    "firebug/object/reps.js",
    "firebug/object/selector.js",
    
    "firebug/console.js",
    "firebug/commandLine.js",

    "firebug/chrome.js",
    "firebug/chrome/frame.js",
    "firebug/chrome/popup.js",
    "firebug/chrome/injected.js",
    //"firebug/panel.js",
    
    "firebug/object/inspector.js",
    "firebug/object/html.js",
    
    "firebug/boot.js"
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
                        if (bookmarletMode)
                            result.push(["FBL.Firebug.Chrome.toggle(true);"]);
                        
                        out.style.cssText = "position: absolute; top: 0; left: 0; width: 100%; height: 100%;";
                        out.appendChild(document.createTextNode(result.join("")));
                        document.body.appendChild(out);
                    }
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
        return html.replace(/^[\s\S]*<\s*body.*>\s*|\s*<\s*\/body.*>[\s\S]*$/gm, "").
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
    
    for (var i=0, module, m=modules; module=m[i]; i++)
        loadScript(sourceURL + module);
        
    waitForFBL();
};

function findLocation() 
{
    var rePath = /^(.*\/)[^\/]+\.\w+.*$/;
    var reProtocol = /^\w+:\/\//;
    var head = document.documentElement.firstChild;
    var path = null;
    
    for(var i=0, c=head.childNodes, ci; ci=c[i]; i++)
    {
        if ( ci.nodeName == "SCRIPT" && 
            (ci.src.indexOf("devmode.js") != -1) )
        {
          
            if (reProtocol.test(ci.src)) {
                // absolute path
                path = rePath.exec(ci.src)[1];
              
            }
            else
            {
                // relative path
                var r = rePath.exec(ci.src);
                var src = r ? r[1] : ci.src;
                var rel = /^((\.\.\/)+)(.*)/.exec(src);
                var lastFolder = /^(.*\/)\w+\/$/;
                path = rePath.exec(location.href)[1];
                
                if (rel)
                {
                    var j = rel[1].length/3;
                    var p;
                    while (j-- > 0)
                        path = lastFolder.exec(path)[1];

                    path += rel[3];
                }
            }
            
            break;
        }
    }
    
    if (path && /content\/$/.test(path))
    {
        sourceURL = path;
        baseURL = path.substr(0, path.length-8);
        skinURL = baseURL + "skin/classic/";
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

    if (isIE || isSafari)
        document.write('<scr'+'ipt src="' + url + '"><\/scr'+'ipt>');
       
    else
    {
        var script = document.createElement("script");
        script.src = url;
        document.documentElement.firstChild.appendChild(script);
    }
};

function waitForFBL()
{
    if(document.body && window.FBL)
        onReady();
    else
        setTimeout(waitForFBL, 200);
}

function onReady()
{
    FBL.dev = API;
}

loadModules();

})();
