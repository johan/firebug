FBL.ns(function() { with (FBL) {
// ************************************************************************************************
    
/*


Problems
    - when NOT in injected mode, the new application load system doesn't work.

    - when in injected DEVELOPMENT mode, in XHTML documents, Google Chrome
      is having problems with the loading order of the multiple scripts.



*/
  
// ************************************************************************************************
// Chrome API
    
Firebug.Chrome = {


    /**
     * options.type
     * options.injectedMode
     */
    create: function(context, options)
    {
        context = context || new Context(window);
        
        // wait loading the new window, then install the application on it
        var waitForWindowLoad = function()
        {
            if (_doc && _doc.body)
            {
                waitForWindowApplicationLoad();
            } 
            else
                setTimeout(waitForWindowLoad, 50);
        }
        
        // wait loading the application, then initialize the application itself
        var waitForWindowApplicationLoad = function()
        {
            if (_win && typeof _win.onFirebugApplicationLoad != "undefined")
            {
                _win.onFirebugApplicationLoad({
                    browser: FBL.browser,
                    chrome: FBL.Firebug.chrome
                });
            } 
            else
                setTimeout(waitForWindowApplicationLoad, 50);
        }
        
        options = options || {};
        options = extend(WindowDefaultOptions, options);
        
        var Win = (options.type == "popup") ? ChromePopup : ChromeFrame;
        var win = new Win(context, options);
        var _win = win.window;
        var _doc = win.document;
        FBL.Firebug.chrome = win;
        
        setTimeout(waitForWindowLoad, 0);
    },
    
    
    destroy: function()
    {
    },
    
    
    initialize: function()
    {
        //* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
        // create the interface elements cache
        fbTop = $("fbTop");
        fbContent = $("fbContent");
        fbContentStyle = fbContent.style;
        fbBottom = $("fbBottom");
        fbBtnInspect = $("fbBtnInspect");
      
        fbPanelBox1 = $("fbPanelBox1");
        fbPanelBox1Style = fbPanelBox1.style;
        fbPanelBox2 = $("fbPanelBox2");
        fbPanelBox2Style = fbPanelBox2.style;
        fbPanelBar2Box = $("fbPanelBar2Box");
        fbPanelBar2BoxStyle = fbPanelBar2Box.style;
      
        fbHSplitter = $("fbHSplitter");
        fbVSplitter = $("fbVSplitter");
        fbVSplitterStyle = fbVSplitter.style;
      
        fbPanel1 = $("fbPanel1");
        fbPanel1Style = fbPanel1.style;
        fbPanel2 = $("fbPanel2");
      
        fbConsole = $("fbConsole");
        fbConsoleStyle = fbConsole.style;
        fbHTML = $("fbHTML");
      
        fbCommandLine = $("fbCommandLine");
        //* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
        
        // create a new instance of the CommandLine class
        commandLine = new Firebug.CommandLine(fbCommandLine);
        
        // ...
        Firebug.chrome.element.style.visibility = "visible";
        this.draw();
    },
    
    shutdown: function()
    {
        //* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
        // Remove the interface elements cache
        fbTop = null;
        fbContent = null;
        fbContentStyle = null;
        fbBottom = null;
        fbBtnInspect = null;
  
        fbPanelBox1 = null;
        fbPanelBox1Style = null;
        fbPanelBox2 = null;
        fbPanelBox2Style = null;
        fbPanelBar2Box = null;
        fbPanelBar2BoxStyle = null;
  
        fbHSplitter = null;
        fbVSplitter = null;
        fbVSplitterStyle = null;
  
        fbPanel1 = null;
        fbPanel1Style = null;
        fbPanel2 = null;
  
        fbConsole = null;
        fbConsoleStyle = null;
        fbHTML = null;
  
        fbCommandLine = null;
        //* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

        // destroy the instance of the CommandLine class
        commandLine.destroy();    
    },
    
    
    draw: function()
    {
        // !!!!
        var commandLineVisible = true;
        var rightPanelVisible = false;
        var topHeight = 0;
        var frame = Firebug.chrome.element;
        /**/
        
        var height = Firebug.chrome.element.clientHeight;
        var cmdHeight = commandLineVisible ? fbCommandLine.offsetHeight : 0;
        var fixedHeight = topHeight + cmdHeight;
        var y = Math.max(height, topHeight);
        
        fbVSplitterStyle.height = y - 27 - cmdHeight + "px"; 
        frame.style.height = y + "px";
        fbContentStyle.height = Math.max(y - fixedHeight, 0)+ "px";

        // Fix Firefox problem with table rows with 100% height (fit height)
        if (isFirefox)
        {
            fbContentStyle.maxHeight = Math.max(y - fixedHeight, 0)+ "px";
        }
  
        var width = frame.offsetLeft + frame.clientWidth;
        var x = rightPanelVisible ? sidePanelWidth : 0;
        
        fbPanelBox1Style.width = Math.max(width - x, 0) + "px";
        fbPanel1Style.width = Math.max(width - x, 0) + "px";                
        
        if (rightPanelVisible)
        {
            fbPanelBox2Style.width = x + "px";
            fbPanelBar2BoxStyle.width = Math.max(x -1, 0) + "px";
            fbVSplitterStyle.right = Math.max(x - 6, 0) + "px";
        }
        
        // Avoid horizontal scrollbar problem in IE
        if (isIE)
        {
            var isScrolled = tabL.offsetHeight > fbPanel1.offsetHeight;
            var scrollFix = isScrolled ? 18 : 0;
            tabLStyle.width = Math.max(width -2 - scrollFix - x, 0) + "px";
        }
    }
    
};



//************************************************************************************************
// Chrome Base

var ChromeBase = extend(Context.prototype, {

});

//************************************************************************************************
// Chrome Frame Class

var ChromeFrame = function(context, options)
{
    options = options || {};
    options = extend(FrameDefaultOptions, options);
    
    var element = this.element = context.document.createElement("iframe");
    
    element.setAttribute("id", options.id);
    element.setAttribute("frameBorder", "0");
    element.style.border = "0";
    element.style.visibility = "hidden";
    element.style.zIndex = "2147483647"; // MAX z-index = 2147483647
    element.style.position = isIE6 ? "absolute" : "fixed";
    element.style.width = "100%"; // "102%"; IE auto margin bug
    element.style.left = "0";
    element.style.bottom = "-1px";
    element.style.height = options.height + "px";
    
    var injectedMode = options.injectedMode;
    if (!injectedMode)
        element.setAttribute("src", location.skin+"firebug.html");
    
    context.document.body.appendChild(element);
    
    var doc = element.contentWindow.document;
    var win = element.contentWindow.window;
    
    if (injectedMode)
    {
        doc.write('<style>'+ Application.Injected.CSS + '</style>');
        doc.write("<scr"+"ipt src='" + location.app + "'><\/scr"+"ipt>");
        doc.write(Application.Injected.HTML);
        doc.close();
    }
    
    this.window = win;
    this.document = doc;
};

//* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

ChromeFrame.prototype = extend(ChromeBase, {

});


//************************************************************************************************
// Chrome Popup Class

var ChromePopup = function(context, options)
{

    var injectedMode = options.injectedMode;
    var url = injectedMode ? "" : (location.skin + options.interfaceFile);
    
    var height = options.chromeHeight;
    var options = [
        "true,top=",
        Math.max(screen.height - height, 0),
        ",left=0,height=",
        height,
        ",width=",
        screen.width-10, // Opera opens popup in a new tab if it's too big!
        ",resizable"          
      ].join("");
    
    var element = this.element = window.open(
        url, 
        "popup", 
        options
      );
    
    var doc = element.document;
    var win = element.window;
    
    if (injectedMode)
    {
        doc.write("<style>"+ FBL.Application.Injected.CSS + "</style>");
        doc.write("<scr"+"ipt src='" + location.app + "'><\/scr"+"ipt>");
        doc.write(FBL.Application.Injected.HTML);
        doc.close();
    }
    
    if (element)
    {
        element.focus();
    }
    else
    {
        Chrome.Popup.element = null;
        alert("Disable the popup blocker to open the console in another window!")
    }


    this.window = win;
    this.document = doc;
};

//* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

ChromePopup.prototype = extend(ChromeBase, {

});



//************************************************************************************************
// 


//* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
//

var WindowDefaultOptions = 
{
    injectedMode: true,
    type: "frame"
};

var FrameDefaultOptions = 
{
    id: "FirebugChrome",
    height: 250
};

var PopupDefaultOptions = 
{
    id: "FirebugChromePopup",
    height: 250
};


//* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
//
var commandLine = null;


//* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
// Interface Elements Cache

var fbTop = null;
var fbContent = null;
var fbContentStyle = null;
var fbBottom = null;
var fbBtnInspect = null;

var fbPanelBox1 = null;
var fbPanelBox1Style = null;
var fbPanelBox2 = null;
var fbPanelBox2Style = null;
var fbPanelBar2Box = null;
var fbPanelBar2BoxStyle = null;

var fbHSplitter = null;
var fbVSplitter = null;
var fbVSplitterStyle = null;

var fbPanel1 = null;
var fbPanel1Style = null;
var fbPanel2 = null;

var fbConsole = null;
var fbConsoleStyle = null;
var fbHTML = null;

var fbCommandLine = null;












// ************************************************************************************************
}});