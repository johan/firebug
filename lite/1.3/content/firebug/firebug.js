FBL.ns(function() { with (FBL) {
// ************************************************************************************************

FBL.version = "1.3.0a";


// ************************************************************************************************
// Firebug

FBL.Firebug = 
{
    firebuglite: FBL.version
};

// ************************************************************************************************
// APIs

FBL.ConsoleAPI = extend(FBL.Firebug);
 
FBL.ChromeAPI = extend(FBL.Firebug); 


// ************************************************************************************************
// Internal variables

FBL.cacheID = "___FBL_";
FBL.alternateNS = "console2";
FBL.consoleNS = "console";
FBL.documentCache = {};


// ************************************************************************************************
// Internal functions

append(FBL.Firebug,  
{
    initialize: function()
    {
        this.cacheDocument();
        this.registerPublicNamespaces();
        
        var module;
        for(var name in Firebug)
        {
            module = Firebug[name];
            if(typeof module.initialize == "function")
                module.initialize();
        }
        
        if (isIE6)
            fixIE6BackgroundImageCache();
    },
  
    cacheDocument: function()
    {
        var els = document.getElementsByTagName("*");
        for (var i=0, l=els.length, el; i<l; i++)
        {
            el = els[i];
            el[cacheID] = i;
            documentCache[i] = el;
        }
    },
    
    registerPublicNamespaces: function()
    {
        FBL.NS = isFirefox ? FBL.alternateNS : FBL.consoleNS;
      
        window[NS] = ConsoleAPI;
        FBL.loaded = true;
    }
  
});


// ************************************************************************************************
}});