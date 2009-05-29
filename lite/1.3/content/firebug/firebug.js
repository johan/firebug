FBL.ns(function() { with (FBL) {
// ************************************************************************************************

FBL.version = "FirebugLite-1.3.0a";

// ************************************************************************************************
// Firebug

FBL.cacheID = "___FBL_";
FBL.documentCache = {};

//* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

FBL.Firebug =  
{
    cache: {},
    
    initialize: function()
    {
        FBL.Firebug.browser = new Context(application.global);
        FBL.Firebug.context = FBL.Firebug.browser;
        
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
        var els = Firebug.browser.document.getElementsByTagName("*");
        for (var i=0, l=els.length, el; i<l; i++)
        {
            el = els[i];
            el[cacheID] = i;
            documentCache[i] = el;
        }
    }
};


Firebug.Controller = {
        
    _controllers: null,
        
    initialize: function()
    {
        this._controllers = [];
    },
    
    shutdown: function()
    {
        this.removeControllers();
    },
    
    /**
     * 
     */
    addController: function()
    {
        for (var i=0, arg; arg=arguments[i]; i++)
        {
            var handler = arg[2];
            arg[2] = bind(this, handler);
            arg[3] = handler;
            
            this._controllers.push(arg);
            addEvent.apply(this, arg);
        }
    },
    
    removeController: function()
    {
        for (var i=0, arg; arg=arguments[i]; i++)
        {
            for (var j=0, c; c=this._controllers[j]; j++)
            {
                if (arg[0] == c[0] && arg[1] == c[1] && arg[2] == c[3])
                    removeEvent.apply(this, c);
            }
        }
    },
    
    removeControllers: function()
    {
        for (var i=0, c; c=this._controllers[i]; i++)
        {
            removeEvent.apply(this, c);
        }
    }
};


Firebug.Module = extend(Firebug.Controller, {
    
    initialize: function()
    {
        Firebug.Controller.initialize.apply(this);
    },
    
    shutdown: function()
    {
        Firebug.Controller.shutdown.apply(this);
    }
    
});


// ************************************************************************************************
}});