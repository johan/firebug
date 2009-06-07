FBL.ns(function() { with (FBL) {
// ************************************************************************************************

//************************************************************************************************
// 

var ChromeDefaultOptions = 
{
    type: "frame",
    id: "FirebugChrome",
    height: 250
};

//************************************************************************************************
// 

FBL.createChrome = function(context, options, onChromeLoad)
{
    options = options || {};
    options = FBL.extend(ChromeDefaultOptions, options);
    
    var chrome = {};
    
    chrome.type = options.type;
    
    var isChromeFrame = chrome.type == "frame";
    var isBookmarletMode = application.isBookmarletMode;
    var url = isBookmarletMode ? "" : application.location.skin;
    
    if (isChromeFrame)
    {
        // Create the Chrome Frame
        var node = chrome.node = context.document.createElement("iframe");
        
        node.setAttribute("id", options.id);
        node.setAttribute("frameBorder", "0");
        node.style.border = "0";
        node.style.visibility = "hidden";
        node.style.zIndex = "2147483647"; // MAX z-index = 2147483647
        node.style.position = FBL.isIE6 ? "absolute" : "fixed";
        node.style.width = "100%"; // "102%"; IE auto margin bug
        node.style.left = "0";
        node.style.bottom = FBL.isIE6 ? "-1px" : "0";
        node.style.height = options.height + "px";
        
        var isBookmarletMode = FBL.application.isBookmarletMode;
        if (!isBookmarletMode)
            node.setAttribute("src", FBL.application.location.skin);
        
        context.document.body.appendChild(node);
    }
    else
    {
        // Create the Chrome Popup
        var height = options.height;
        var options = [
                "true,top=",
                Math.max(screen.height - height, 0),
                ",left=0,height=",
                height,
                ",width=",
                screen.width-10, // Opera opens popup in a new tab if it's too big!
                ",resizable"          
            ].join("");
        
        var node = chrome.node = window.open(
            url, 
            "popup", 
            options
          );
    
    }
    
    if (isBookmarletMode)
    {
        var doc = isChromeFrame ? doc : doc;
        // create getChromeTemplate Function?
        doc.write('<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/DTD/strict.dtd">');
        doc.write('<head><style>'+ FirebugChrome.injected.CSS + '</style>');
        doc.write('</head><body>'+ FirebugChrome.injected.HTML) + '</body>';        
        //doc.write( getChromeTemplate() );
        doc.close();
    }
    
    var win;
    var waitForChrome = function()
    {
              
        if ( // Frame loaded... OR
             isChromeFrame && (win=node.contentWindow) && 
             node.contentWindow.document.getElementById("fbCommandLine") ||
             
             // Popup loaded
             !isChromeFrame && (win=node.window) && node.document && 
             node.document.getElementById("fbCommandLine") )        
        {
            chrome.window = win.window;
            chrome.document = win.document;
            
            if (onChromeLoad)
                onChromeLoad(chrome);
        }
        else
            setTimeout(waitForChrome, 20);            
    }
    
    waitForChrome();    
}

//************************************************************************************************
// FirebugChrome Class
    
FBL.FirebugChrome = function(chrome)
{
    var Base = chrome.type == "frame" ? ChromeFrameBase : ChromePopupBase; 
    append(this, chrome);
    append(this, Base);
    
    return this;
}

// ************************************************************************************************
// ChromeBase
    
var ChromeBase = extend(Firebug.Controller, {
    
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

//************************************************************************************************
// ChromeFrameBase

var ChromeContext = extend(ChromeBase, Context.prototype); 

var ChromeFrameBase = extend(ChromeContext, {
    
    initialize: function()
    {
        ChromeBase.initialize.call(this)
        Firebug.Controller.initialize.call(this, this.node);
        
        this.addController(
                [Firebug.browser.window, "resize", this.draw],
                [Firebug.browser.window, "unload", this.destroy]
            );
        
        // TODO: Check visibility preferences here
        this.node.style.visibility = "visible";
    },
    
    shutdown: function()
    {
        Firebug.Controller.shutdown.apply(this);
    }

});


//************************************************************************************************
// ChromePopupBase

var ChromePopupBase = extend(ChromeContext, {
    
    initialize: function()
    {
        ChromeBase.initialize.call(this)
        Firebug.Controller.initialize.call(this, this.node);
    },
    
    shutdown: function()
    {
        
    }

});



//************************************************************************************************
// Internals


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