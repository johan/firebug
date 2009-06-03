FBL.ns(function() { with (FBL) {
// ************************************************************************************************
    
// ************************************************************************************************
// Chrome API
    
Firebug.Chrome = extend(Firebug.Controller, {
    
    destroy: function()
    {
        this.shutdown();
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
        
        //topHeight = fbTop.offsetHeight;
        //* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
        
        // create a new instance of the CommandLine class
        commandLine = new Firebug.CommandLine(fbCommandLine);
        
        
        // initialize all panels here...
        
        
        // initialize the chrome instance
        var chrome = application.chrome;
        var ChromeClass = chrome.type == "frame" ? ChromeFrame : ChromePopup;
        Firebug.chrome = new ChromeClass(chrome);
        Firebug.chrome.initialize();
        
        flush();
        
        if (!isSafari)
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
        
        //topHeight = null;
        //* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

        // destroy the instance of the CommandLine class
        commandLine.destroy();
        
        // shutdown the chrome instance
        Firebug.chrome.shutdown();
    },
    
    
    draw: function()
    {
        //try{
        
        // !!!!
        var commandLineVisible = true;
        var rightPanelVisible = false;
        var topHeight = fbTop.offsetHeight;
        /*
        var frame = Firebug.chrome.type == "frame" ?
                    Firebug.chrome.element :
                    Firebug.chrome.document.body;
        /**/
        var size = Firebug.chrome.getWindowSize();
        var height = size.height;
        var cmdHeight = commandLineVisible ? fbCommandLine.offsetHeight : 0;
        var fixedHeight = topHeight + cmdHeight;
        var y = Math.max(height, topHeight);
        
        fbVSplitterStyle.height = y - 27 - cmdHeight + "px";
        //frame.style.height = y + "px";
        fbContentStyle.height = Math.max(y - fixedHeight, 0)+ "px";

        // Fix Firefox problem with table rows with 100% height (fit height)
        if (isFirefox)
        {
            fbContentStyle.maxHeight = Math.max(y - fixedHeight, 0)+ "px";
        }
  
        var width = size.width;
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
            /*
            var isScrolled = tabL.offsetHeight > fbPanel1.offsetHeight;
            var scrollFix = isScrolled ? 18 : 0;
            tabLStyle.width = Math.max(width -2 - scrollFix - x, 0) + "px";
            /**/
        }
        
        //}catch(E){}
    }
    
});

Firebug.registerModule(Firebug.Chrome);


//************************************************************************************************
// Chrome Base

var ChromeBase = extend(Context.prototype, Firebug.Chrome);

//************************************************************************************************
// Chrome Frame Class

var ChromeFrame = function(chrome)
{
    Context.call(this, chrome.window);
    
    this.type = chrome.type;
    this.element = chrome.element;
};

//* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

ChromeFrame.prototype = extend(ChromeBase, {
    
    initialize: function()
    {
        Firebug.Controller.initialize.apply(this);
        
        this.addController(
                [Firebug.browser.window, "resize", this.draw],
                [Firebug.browser.window, "unload", this.destroy]
            );
        
        // TODO: Check visibility preferences here
        this.element.style.visibility = "visible";
    },
    
    shutdown: function()
    {
        Firebug.Controller.shutdown.apply(this);
    }

});


//************************************************************************************************
// Chrome Popup Class

var ChromePopup = function(chrome)
{
    this.type = chrome.type;
    this.element = chrome.element;
    this.window = chrome.window;
    this.document = chrome.document;
}

//* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

ChromePopup.prototype = extend(ChromeBase, {
    
    initialize: function()
    {
    },
    
    shutdown: function()
    {
        
    }

});



//************************************************************************************************
//


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

//var topHeight = null;



//* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
//







// ************************************************************************************************
}});