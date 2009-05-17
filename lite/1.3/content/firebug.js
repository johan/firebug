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
FBL.sourceURL = null;
FBL.baseURL = null;
FBL.skinURL = null;


// ************************************************************************************************
// Internal functions

append(FBL.Firebug,  
{
    initialize: function()
    {
        this.cacheDocument();
        this.findLocation();
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
    
    findLocation: function() 
    {
        var reFirebugFile = /(firebug(\.\w+)?\.js|devmode\.js)$/;
        var rePath = /^(.*\/)/;
        var reProtocol = /^\w+:\/\//;
        var head = document.documentElement.firstChild;
        var path = null;
        
        for(var i=0, c=head.childNodes, ci; ci=c[i]; i++)
        {
            if ( ci.nodeName == "SCRIPT" && 
                 reFirebugFile.test(ci.src) )
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
        }
        else
        {
            throw "Firebug error: Library path not found";
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