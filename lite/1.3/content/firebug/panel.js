FBL.ns(function() { with (FBL) {
// ************************************************************************************************

//************************************************************************************************

Firebug.Module =
{
    /**
     * Called when the window is opened.
     */
    initialize: function()
    {
    },
  
    /**
     * Called when the window is closed.
     */
    shutdown: function()
    {
  
    },
  
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
  
    /**
     * Called when a new context is created but before the page is loaded.
     */
    initContext: function(context)
    {
    },
  
    /**
     * Called after a context is detached to a separate window;
     */
    reattachContext: function(browser, context)
    {
    },
  
    /**
     * Called when a context is destroyed. Module may store info on persistedState for reloaded pages.
     */
    destroyContext: function(context, persistedState)
    {
    },
  
    // Called when a FF tab is create or activated (user changes FF tab)
    // Called after context is created or with context == null (to abort?)
    showContext: function(browser, context)
    {
    },
  
    /**
     * Called after a context's page gets DOMContentLoaded
     */
    loadedContext: function(context)
    {
    },
  
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
  
    showPanel: function(browser, panel)
    {
    },
  
    showSidePanel: function(browser, panel)
    {
    },
  
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
  
    updateOption: function(name, value)
    {
    },
  
    getObjectByURL: function(context, url)
    {
    }
};

// ************************************************************************************************

Firebug.Panel =
{
    name: "HelloWorld",
    title: "Hello World!",
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    
    options: {
        id: "fbName",
        
        hasCommandLine: false,
        hasSidePanel: false,
        hasStatusBar: false,
        hasToolButtons: false
    },
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    
    panelNode: null,
    panelBar: null,
    commandLine: null,
    
    toolButtons: null,
    statusBar: null,

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    
    searchable: false,
    editable: true,
    order: 2147483647,
    statusSeparator: "<",

    initialize: function(context, doc)
    {
        /*
        this.context = context;
        this.document = doc;

        this.panelNode = doc.createElement("div");
        this.panelNode.ownerPanel = this;

        setClass(this.panelNode, "panelNode panelNode-"+this.name+" contextUID="+context.uid);
        doc.body.appendChild(this.panelNode);

        if (FBTrace.DBG_INITIALIZE)
            FBTrace.sysout("firebug.initialize panelNode for "+this.name+"\n");

        this.initializeNode(this.panelNode);
        /**/
    },

    destroy: function(state) // Panel may store info on state
    {
        if (FBTrace.DBG_INITIALIZE)
            FBTrace.sysout("firebug.destroy panelNode for "+this.name+"\n");

        if (this.panelNode)
            delete this.panelNode.ownerPanel;

        this.destroyNode();
    },

    detach: function(oldChrome, newChrome)
    {
        this.lastScrollTop = this.panelNode.scrollTop;
    },

    reattach: function(doc)
    {
        this.document = doc;

        if (this.panelNode)
        {
            this.panelNode = doc.adoptNode(this.panelNode, true);
            this.panelNode.ownerPanel = this;
            doc.body.appendChild(this.panelNode);
            this.panelNode.scrollTop = this.lastScrollTop;
            delete this.lastScrollTop;
        }
    },

    // Called after module.initialize; addEventListener-s here
    initializeNode: function(myPanelNode)
    {
    },

    // removeEventListener-s here.
    destroyNode: function()
    {
    },

    show: function(state)  // persistedPanelState plus non-persisted hide() values
    {
    },

    hide: function(state)  // store info on state for next show.
    {
    },

    watchWindow: function(win)
    {
    },

    unwatchWindow: function(win)
    {
    },

    updateOption: function(name, value)
    {
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    /**
     * Toolbar helpers
     */
    showToolbarButtons: function(buttonsId, show)
    {
        try
        {
            if (!this.context.browser) // XXXjjb this is bug. Somehow the panel context is not FirebugContext.
            {
              if (FBTrace.DBG_ERRORS)
                FBTrace.sysout("firebug.Panel showToolbarButtons this.context has no browser, this:", this)
                return;
            }
            var buttons = this.context.browser.chrome.$(buttonsId);
            if (buttons)
                collapse(buttons, show ? "false" : "true");
        }
        catch (exc)
        {
            if (FBTrace.DBG_ERRORS)
            {
                FBTrace.dumpProperties("firebug.Panel showToolbarButtons FAILS", exc);
                if (!this.context.browser)FBTrace.dumpStack("firebug.Panel showToolbarButtons no browser");
            }
        }
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    /**
     * Returns a number indicating the view's ability to inspect the object.
     *
     * Zero means not supported, and higher numbers indicate specificity.
     */
    supportsObject: function(object)
    {
        return 0;
    },

    refresh: function()
    {

    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    startInspecting: function()
    {
    },

    stopInspecting: function(object, cancelled)
    {
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    search: function(text)
    {
    }

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *


};

//************************************************************************************************






//************************************************************************************************
//Panel Management

Firebug.registerPanel = function()
{

};




/*



From Honza Tutorial
----------------------------------------------------
FBL.ns(function() { with (FBL) {
var panelName = "HelloWorld";
Firebug.HelloWorldModel = extend(Firebug.Module,
{
    showPanel: function(browser, panel) {
        var isHwPanel = panel && panel.name == panelName;
        var hwButtons = browser.chrome.$("fbHelloWorldButtons");
        collapse(hwButtons, !isHwPanel);
    },
    onMyButton: function(context) {
        alert("Hello World!");
    }
});

function HelloWorldPanel() {}
HelloWorldPanel.prototype = extend(Firebug.Panel,
{
    name: panelName,
    title: "Hello World!",

    initialize: function() {
        Firebug.Panel.initialize.apply(this, arguments);
    }
});

Firebug.registerModule(Firebug.HelloWorldModel);
Firebug.registerPanel(HelloWorldPanel);

}});
----------------------------------------------------



  */  
  


// ************************************************************************************************
}});