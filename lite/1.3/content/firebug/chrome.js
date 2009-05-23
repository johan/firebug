FBL.ns(function() { with (FBL) {
// ************************************************************************************************

  
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
        
        var waitForWindowLoad = function()
        {
            if (win.document && win.document.body)
            {
                var script = win.document.createElement("script");
                script.src = location.source + "devmode.js#app";
                win.document.documentElement.firstChild.appendChild(script);
                waitForWindowApplicationLoad();
            } 
            else
                setTimeout(waitForWindowLoad, 50);
        }
        
        var waitForWindowApplicationLoad = function()
        {
            if (win.window && win.window.FirebugApplicationInstanceLoaded)
            {
                delete win.window.FirebugApplicationInstanceLoaded;
                
                win.window.FBL.browser = FBL.browser;
                win.window.FBL.Firebug.chrome = FBL.Firebug.chrome;
                win.window.FBL.Firebug.initialize();
            } 
            else
                setTimeout(waitForWindowApplicationLoad, 50);
        }
        
        options = options || {};
        options = extend(WindowDefaultOptions, options);
        
        var Win = null;
        if (options.type == "frame")
            Win = WindowFrame;
        else if (options.type == "popup")
            Win = WindowPopup;
        
        var win = new Win(context, options);
        FBL.Firebug.chrome = win;
        
        waitForWindowLoad();      
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
    }
};



//************************************************************************************************
// Application


//************************************************************************************************
// Base Window Class

var WindowBase = extend(Context.prototype, {

});

var WindowFrame = function(context, options)
{
    options = options || {};
    options = FBL.extend(FrameDefaultOptions, options);
    
    var element = this.element = context.document.createElement("iframe");
    
    element.setAttribute("id", options.id);
    element.setAttribute("frameBorder", "0");
    element.style.visibility = "hidden";
    element.style.zIndex = "2147483647"; // MAX z-index = 2147483647
    element.style.position = FBL.isIE6 ? "absolute" : "fixed";
    element.style.width = "100%"; // "102%"; IE auto margin bug
    element.style.left = "0";
    element.style.bottom = "-1px";
    element.style.height = options.height + "px";
    
    var injectedMode = options.injectedMode;
    if (!injectedMode)
        element.setAttribute("src", skinURL+"firebug.html");
    
    context.document.body.appendChild(element);
    
    var doc = element.contentWindow.document;
    var win = element.contentWindow.window;
      
    if (injectedMode)
    {
        doc.write('<style>'+ FBL.Application.Injected.CSS + '</style>');
        doc.write(FBL.Application.Injected.HTML);
        doc.close();
    }
    
    this.window = win;
    this.document = doc;
};

WindowFrame.prototype = extend(WindowBase, {

});


var WindowPopup = function(context, options)
{

    var injectedMode = options.injectedMode;
    var url = injectedMode ? "" : (skinURL + options.interfaceFile);
    
    var height = options.chromeHeight;
    var options = [
        "true,top=",
        Math.max(screen.height - height, 0),
        ",left=0,height=",
        height,
        ",width=",
        screen.width-10, // Opera opens popup in a new tab if it's too big
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

WindowPopup.prototype = extend(WindowBase, {

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