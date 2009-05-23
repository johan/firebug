FBL.ns(function() { with (FBL) {
// ************************************************************************************************

FBL.version = "1.3.0a";


// ************************************************************************************************
// Firebug

FBL.cacheID = "___FBL_";
FBL.documentCache = {};

//* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

FBL.Firebug =  
{
    initialize: function()
    {
        this.cacheDocument();
        
        var module;
        for(var name in Firebug)
        {
            module = Firebug[name];
            if(typeof module.initialize == "function")
                module.initialize();
        }
    },
  
    shutdown: function()
    {
        documentCache = {};
        
        var module;
        for(var name in Firebug)
        {
            module = Firebug[name];
            if(typeof module.shutdown == "function")
                module.shutdown();
        }
    },
    
    cacheDocument: function()
    {
        var els = browser.document.getElementsByTagName("*");
        for (var i=0, l=els.length, el; i<l; i++)
        {
            el = els[i];
            el[cacheID] = i;
            documentCache[i] = el;
        }
    }
  
};


FBL.Firebug.Module = {
    
}


// ************************************************************************************************
}});