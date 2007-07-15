/* See license.txt for terms of usage */

// UI control of debug Logging for Firebug internals

FBL.ns(function() { with (FBL) {

//***********************************************************************************
// Module
const DBG_TRACE = false;
const PrefService = CC("@mozilla.org/preferences-service;1");
const nsIPrefBranch2 = CI("nsIPrefBranch2");
const prefs = PrefService.getService(nsIPrefBranch2);
const prefDomain = "extensions.firebug";

this.namespaceName = "TracePanel";

Firebug.TraceModule = extend(Firebug.Console, 
{ 
	
		// Also add extension.firebug.BP etc to defaults/preferences/chromebug.js if you want persistence.
	DBG_BP: false, 			// debugger.js and firebug-services.js; lots of output
	DBG_TOPLEVEL: false, 		// firebug-service
	DBG_STACK: false,  		// call stack, mostly debugger.js
	DBG_UI_LOOP: false, 		// debugger.js
	DBG_ERRORS: true,  		// error.js
	DBG_EVENTS: false,  		// debugger.js for event handlers, need more
	DBG_FUNCTION_NAMES: false,  // heuristics for anon functions
	DBG_EVAL: false,    		// debugger.js and firebug-service.js
	DBG_CACHE: false,   		// sourceCache
	DBG_SOURCEFILES: false, 	// debugger and sourceCache
	DBG_WINDOWS: true,    	// tabWatcher, dispatch events; very useful for understand modules/panels 
	DBG_NET: false,        	// net.js
	DBG_SHOW_SYSTEM: false,    // isSystemURL return false always.
	DBG_INITIALIZE: true,		// registry (modules panels); initialize FB
	DBG_OPTIONS: false,
	DBG_TRACE: true,
	DBG_FBS_CREATION: false, // firebug-service script creation
	DBG_FBS_BP: false, // firebug-service breakpoints
	DBG_FBS_ERRORS: false, // firebug-service error handling
	DBG_HTML: false, // HTML panel
	
	debug: this.DBG_TRACE,
	
	injectOptions: function() 
	{
		for (p in this)
		{
			var m = reDBG.exec(p);
			if (m) 
				FBTrace[p] = this[p];
		}	
	},
	
	initialize: function(prefDomain, prefNames)
	{
		FBTrace.sysout("TraceModule.initialize prefDomain="+prefDomain+"\n");
		for (p in FBTrace) 
		{
			var m = reDBG.exec(p);
			if (m) 
			{
				var name = m[1];
				prefNames.push(name);	FBTrace.sysout("push name="+name+"\n");
			}
		}
	},
	
	initContext: function(context) 
	{
		if (this.debug)
			FBTrace.sysout("TraceModule.initContext\n");
		this.context = context;
		FBTrace.initializeTrace(context);
		FBTrace.sysout("TraceModule.initContext try sysout\n");
	},
	
	getPanel: function(context, noCreate)
	{
		return context ? context.getPanel("TraceFirebug", noCreate) : this.context.getPanel("TraceFirebug", noCreate);
	},
	
	showPanel: function(browser, panel) 
    { 
		if (!panel || panel.name != "TraceFirebug")
			return;
		if (this.debug) FBTrace.sysout("TraceModule showPanel module:\n");
		if (!FBTrace.dumpToPanel && !this.intro) 
		{
			this.intro = "Use Options on this panel to turn on tracing.";
			this.intro += " By default output goes to system console via dump(). (You need to set browser.dom.window.dump.enabled to true in about:config)."
			this.intro += " You can also trace into this panel by setting the 'dump to panel' option."
			Firebug.TraceModule.log(this.intro, FirebugContext, "info", FirebugReps.Text, true);
			this.intro = "shown";
		}
    },
	
});
// ************************************************************************************************

Firebug.TracePanel = function() {};
const reDBG = /DBG_(.*)/;
Firebug.TracePanel.prototype = extend(Firebug.ConsolePanel.prototype,
{
	name: "TraceFirebug", 
    title: "FBTrace", 
    searchable: false, 
    editable: false, 
    debug: Firebug.TraceModule.DBG_TRACE,
	
    initializeNode: function(myPanelNode)
    {
		if (this.debug) FBTrace.sysout("TracePanel initializeNode\n");
    },
	show: function()
	{
		if (this.debug) FBTrace.sysout("TraceFirebug.panel show context="+this.context+"\n");
		var consoleButtons = this.context.browser.chrome.$("fbConsoleButtons");
		collapse(consoleButtons, false);
	},
	
	hide: function() 
	{
		if (this.debug) FBTrace.sysout("TraceFirebug.panel hide\n");
		var consoleButtons = this.context.browser.chrome.$("fbConsoleButtons");
		collapse(consoleButtons, true);
	},

    watchWindow: function(win)
    {
		if (this.debug) FBTrace.sysout("TraceFirebug.panel watchWindow\n");
    },
    
    unwatchWindow: function(win)
    {
		if (this.debug) FBTrace.sysout("TraceFirebug.panel unwatchWindow\n");
    },
    

	updateSelection: function(object)
    {
		if (this.debug) FBTrace.sysout("TraceFirebug.panel updateSelection\n");
	},
	
	getObjectPath: function(object)
    {
		if (this.debug) FBTrace.sysout("TraceFirebug.panel getObjectPath\n");
    },

    getDefaultSelection: function()
    {
		if (this.debug) FBTrace.sysout("TraceFirebug.panel getDefaultSelection\n");
    },
    
    updateOption: function(name, value)
    {
		if (this.debug) FBTrace.sysout("TraceFirebug.panel updateOption\n");
    },
    
    getOptionsMenuItems: function()
    {
		if (this.debug) FBTrace.sysout("TraceFirebug.panel getOptionsMenuItems for this.context="+this.context+"\n");
		var items = [];
		var self = this;
		items.push({
			label: "dump into fbug panel", 
			nol10n: true, 
			type: "checkbox", 
			checked: FBTrace.dumpToPanel, 
			command: function(event){
				FBTrace.dumpToPanel = !FBTrace.dumpToPanel;
				FBTrace.initializeTrace(self.context);
			}
		});
		for (p in Firebug.TraceModule) 
		{
			var m = reDBG.exec(p);
			if (m) 
			{
				var label = m[1];
				items.push({
					label: label, 
					nol10n: true, 
					type: "checkbox", 
					checked: FBTrace[p], 
					command: this.setOption 
				});	
			}
		}
		//items.push(optionMenu("DBG_FBS_CREATION", "debugFirebug_CREATION"));
		//items.push(optionMenu("DBG_FBS_BP", "debugFirebug_BP"));
		//items.push(optionMenu("DBG_FBS_ERRORS", "debugFirebug_ERRORS"));
		return items;
    },

	setOption: function(event) 
	{
		var menuitem = event.target;
		var label = menuitem.getAttribute("label");
		var category = 'DBG_'+label;
		FBTrace[category] = !FBTrace[category];
		prefs.setBoolPref(prefDomain +"." + category, FBTrace[category]);
		if (FBTrace.DBG_OPTIONS)
			FBTrace.sysout("tracePanel.setOption: "+category + " = " + FBTrace[category] + "\n");
	},

    getContextMenuItems: function(object, target)
    {
		if (this.debug) FBTrace.sysout("TraceFirebug.panel getContextMenuItems\n");
    },
    
    getEditor: function(target, value)
    {
		if (this.debug) FBTrace.sysout("TraceFirebug.panel getEditor\n");
    }
	
});

Firebug.TraceModule.injectOptions();
Firebug.registerModule(Firebug.TraceModule);
Firebug.registerPanel(Firebug.TracePanel); 

}});