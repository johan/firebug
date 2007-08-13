/* See license.txt for terms of usage */

// ************************************************************************************************
// Utils

function CC(className)
{
    return Components.classes[className];
}

function CI(ifaceName)
{
    return Components.interfaces[ifaceName];
}
 
// ************************************************************************************************
// Constants
 
const CLASS_ID = Components.ID("{a380e9c0-cb39-11da-a94d-0800200c9a66}");
const CLASS_NAME = "Firebug Service";
const CONTRACT_ID = "@joehewitt.com/firebug;1";

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 

const PrefService = CC("@mozilla.org/preferences-service;1");
const DebuggerService = CC("@mozilla.org/js/jsd/debugger-service;1");
const ConsoleService = CC("@mozilla.org/consoleservice;1");
const Timer = CC("@mozilla.org/timer;1");

const jsdIDebuggerService = CI("jsdIDebuggerService");
const jsdIScript = CI("jsdIScript");
const jsdIStackFrame = CI("jsdIStackFrame");
const jsdICallHook = CI("jsdICallHook");
const jsdIExecutionHook = CI("jsdIExecutionHook");
const jsdIErrorHook = CI("jsdIErrorHook");
const nsIFireBug = CI("nsIFireBug");
const nsIFireBugWithEval = CI("nsIFireBugWithEval");
const nsIFireBugDebuggerWithEval = CI("nsIFireBugDebuggerWithEval");
const nsIPrefBranch2 = CI("nsIPrefBranch2");
const nsIComponentRegistrar = CI("nsIComponentRegistrar");
const nsIFactory = CI("nsIFactory");
const nsIConsoleService = CI("nsIConsoleService");
const nsITimer = CI("nsITimer");

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 

const NS_ERROR_NO_INTERFACE = Components.results.NS_ERROR_NO_INTERFACE;
const NS_ERROR_NOT_IMPLEMENTED = Components.results.NS_ERROR_NOT_IMPLEMENTED;
const NS_ERROR_NO_AGGREGATION = Components.results.NS_ERROR_NO_AGGREGATION;

const PCMAP_SOURCETEXT = jsdIScript.PCMAP_SOURCETEXT;
const PCMAP_PRETTYPRINT = jsdIScript.PCMAP_PRETTYPRINT;

const COLLECT_PROFILE_DATA = jsdIDebuggerService.COLLECT_PROFILE_DATA;
const DISABLE_OBJECT_TRACE = jsdIDebuggerService.DISABLE_OBJECT_TRACE;
const HIDE_DISABLED_FRAMES = jsdIDebuggerService.HIDE_DISABLED_FRAMES;
const DEBUG_WHEN_SET = jsdIDebuggerService.DEBUG_WHEN_SET;
const MASK_TOP_FRAME_ONLY = jsdIDebuggerService.MASK_TOP_FRAME_ONLY;

const TYPE_FUNCTION_CALL = jsdICallHook.TYPE_FUNCTION_CALL;
const TYPE_FUNCTION_RETURN = jsdICallHook.TYPE_FUNCTION_RETURN;

const RETURN_CONTINUE = jsdIExecutionHook.RETURN_CONTINUE;
const RETURN_VALUE = jsdIExecutionHook.RETURN_RET_WITH_VAL;  
const RETURN_THROW_WITH_VAL = jsdIExecutionHook.RETURN_THROW_WITH_VAL;
const RETURN_CONTINUE_THROW = jsdIExecutionHook.RETURN_CONTINUE_THROW;

const STEP_OVER = nsIFireBug.STEP_OVER;
const STEP_INTO = nsIFireBug.STEP_INTO;
const STEP_OUT = nsIFireBug.STEP_OUT;

const TYPE_ONE_SHOT = nsITimer.TYPE_ONE_SHOT;

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 

const BP_NORMAL = 1;
const BP_MONITOR = 2;
const BP_UNTIL = 4;
const BP_ONRELOAD = 8;  // This is a mark for the UI to test

const LEVEL_TOP = 1;
const LEVEL_EVAL = 2;
const LEVEL_EVENT = 3;

// ************************************************************************************************
// Globals

var jsd, fbs, prefs;

var contextCount = 0;

var clients = [];
var debuggers = [];

var stepMode = 0;
var stepFrame;
var stepFrameLineId;
var stepFrameCount;
var hookFrameCount;

var haltDebugger = null;

var breakpoints = {};
var breakpointCount = 0;
var disabledCount = 0;
var monitorCount = 0;
var conditionCount = 0;
var runningUntil = null;

var errorBreakpoints = [];

var profileCount = 0;
var profileStart;

var enabledDebugger = false;
var reportNextError = false;
var nextErrorMessage =""; 
var breakOnNextError = false;

var timer = Timer.createInstance(nsITimer);
var waitingForTimer = false;

// ************************************************************************************************

function FirebugService()
{
    fbs = this;

    this.enabled = false;
    this.profiling = false;
    
    prefs = PrefService.getService(nsIPrefBranch2);    
    prefs.addObserver("extensions.firebug", FirebugPrefsObserver, false);

    var observerService = CC("@mozilla.org/observer-service;1")
        .getService(CI("nsIObserverService"));
    observerService.addObserver(ShutdownObserver, "quit-application", false);

    this.showStackTrace = prefs.getBoolPref("extensions.firebug.showStackTrace");
    this.breakOnErrors = prefs.getBoolPref("extensions.firebug.breakOnErrors");
	this.breakOnTopLevel = prefs.getBoolPref("extensions.firebug.breakOnTopLevel");
	
    this.topLevelScriptTag = {};          // top- or eval-level
    this.eventLevelScriptTag = {};        // event scripts like onclick
	this.nestedScriptStack = {};          // scripts contained in leveledScript that have not been drained
	this.sourceURLByTag = {};             // all script tags created by eval
	this.scriptInfoArrayByURL = {}; 
	this.scriptInfoByTag = {};
}

FirebugService.prototype =
{
    shutdown: function()
    {
		prefs.removeObserver("extensions.firebug", FirebugPrefsObserver);
        timer = null;
        fbs = null;
        jsd = null;
    },
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
    // nsISupports

    QueryInterface: function(iid)
    {
        if (!iid.equals(nsIFireBug) && !iid.equals(nsISupports) && !iid.equals(nsIFireBugWithEval))
            throw NS_ERROR_NO_INTERFACE;

        return this;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
    // nsIFireBug
    
    get lastErrorWindow()
    {    
        var win = this._lastErrorWindow;
        this._lastErrorWindow = null; // Release to avoid leaks
        return win;
    },

    countContext: function(on)
    {
        contextCount += on ? 1 : -1;
        
        if (on && contextCount == 1)
        {
            this.enabled = true;
            dispatch(clients, "enable");
        }
        else if (contextCount == 0)
        {
            this.enabled = false;
            dispatch(clients, "disable");
        }
        
        return true;
    },
    
    registerClient: function(client)
    {
        clients.push(client);
    },

    unregisterClient: function(client)
    {
        for (var i = 0; i < clients.length; ++i)
        {
            if (clients[i] == client)
            {
                clients.splice(i, 1);
                break;
            }
        }
    },
    
    registerDebugger: function(debuggr)
    {
        this.enableDebugger();

        debuggers.push(debuggr);
    },

    unregisterDebugger: function(debuggr)
    {
        for (var i = 0; i < debuggers.length; ++i)
        {
            if (debuggers[i] == debuggr)
            {
                debuggers.splice(i, 1);
                break;
            }
        }

        if (!debuggers.length)
            this.disableDebugger();
    },

    lockDebugger: function()
    {
        if (this.locked)
            return;
        
        this.locked = true;

        dispatch(debuggers, "onLock", [true]);
    },

    unlockDebugger: function()
    {
        if (!this.locked)
            return;

        this.locked = false;

        dispatch(debuggers, "onLock", [false]);
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
    // nsIFireBugWithEval
    
    registerDebuggerWithEval: function(debuggr)
    {
        this.enableDebugger();

        debuggers.push(debuggr);
    },

    unregisterDebuggerWithEval: function(debuggr)
    {
        for (var i = 0; i < debuggers.length; ++i)
        {
            if (debuggers[i] == debuggr)
            {
                debuggers.splice(i, 1);
                break;
            }
        }

        if (!debuggers.length)
            this.disableDebugger();
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 

    halt: function(debuggr)
    {
        haltDebugger = debuggr;
    },
    
    step: function(mode, startFrame)
    {
        stepMode = mode;
        stepFrame = startFrame;
        stepFrameCount = countFrames(startFrame);
        stepFrameLineId = stepFrameCount + startFrame.script.fileName + startFrame.line;
    },
    
    runUntil: function(url, lineNo, startFrame)
    {
        runningUntil = this.addBreakpoint(BP_UNTIL, url, lineNo);
        stepFrameCount = countFrames(startFrame);
        stepFrameLineId = stepFrameCount + startFrame.script.fileName + startFrame.line;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
    
    setBreakpoint: function(url, lineNo)
    {
        if (this.addBreakpoint(BP_NORMAL, url, lineNo))
            dispatch(debuggers, "onToggleBreakpoint", [url, lineNo, true]);
    },

    clearBreakpoint: function(url, lineNo)
    {
        if (this.removeBreakpoint(BP_NORMAL, url, lineNo))
            dispatch(debuggers, "onToggleBreakpoint", [url, lineNo, false]);
    },

    enableBreakpoint: function(url, lineNo)
    {
        url = denormalizeURL(url);

        var bp = this.findBreakpoint(url, lineNo);
        if (bp && bp.type & BP_NORMAL)
        {
            bp.disabled &= ~BP_NORMAL;
            dispatch(debuggers, "onToggleBreakpointDisabled", [url, lineNo, false]);
            --disabledCount;
        }
    },

    disableBreakpoint: function(url, lineNo)
    {
        url = denormalizeURL(url);

        var bp = this.findBreakpoint(url, lineNo);
        if (bp && bp.type & BP_NORMAL)
        {
            bp.disabled |= BP_NORMAL;
            ++disabledCount;
            dispatch(debuggers, "onToggleBreakpointDisabled", [url, lineNo, true]);
        }
    },

    isBreakpointDisabled: function(url, lineNo)
    {
        url = denormalizeURL(url);

        var bp = this.findBreakpoint(url, lineNo);
        if (bp && bp.type & BP_NORMAL)
            return bp.disabled & BP_NORMAL;
        else
            return false;
    },

    setBreakpointCondition: function(url, lineNo, condition)
    {
        url = denormalizeURL(url);
        var bp = this.findBreakpoint(url, lineNo);
        if (!bp)
        {
            bp = this.addBreakpoint(BP_NORMAL, url, lineNo);
            if (bp)
                dispatch(debuggers, "onToggleBreakpoint", [url, lineNo, true]);
        }

        if (!bp)
            return;
        
        if (bp.condition && !condition)
        {
            --conditionCount;
            dispatch(debuggers, "onToggleBreakpointCondition", [url, lineNo, false]);            
        }
        else if (condition && !bp.condition)
        {
            ++conditionCount;        
            dispatch(debuggers, "onToggleBreakpointCondition", [url, lineNo, true]);
        }

        bp.condition = condition;
    },

    getBreakpointCondition: function(url, lineNo)
    {
        url = denormalizeURL(url);
        var bp = this.findBreakpoint(url, lineNo);
        return bp ? bp.condition : "";
    },

    clearAllBreakpoints: function(urlCount, urls)
    {
        for (var i = 0; i < urls.length; ++i)
        {
            var url = denormalizeURL(urls[i]);
            var urlBreakpoints = breakpoints[url];
            if (!urlBreakpoints)
                continue;

            urlBreakpoints = urlBreakpoints.slice();
            for (var j = 0; j < urlBreakpoints.length; ++j)
            {
                var bp = urlBreakpoints[j];
                this.clearBreakpoint(url, bp.lineNo);
            }
         }
    },

    hasBreakpoint: function(script)
    {  // Dead code
        var url = fbs.getSourceURL(script);
        
        var lineNo = findFirstExecutableLine(script);  

        var urlBreakpoints = breakpoints[url];
        if (urlBreakpoints)
        {
            for (var i = 0; i < urlBreakpoints.length; ++i)
            {
                var bp = urlBreakpoints[i];
                if (bp.lineNo == lineNo && bp.type & BP_NORMAL)
                    return true;
            }
        }

        return false;
    },

    enumerateBreakpoints: function(url, cb)
    {
        if (url)
        {
            url = denormalizeURL(url);
            
            var urlBreakpoints = breakpoints[url];
            if (urlBreakpoints)
            {
                for (var i = 0; i < urlBreakpoints.length; ++i)
                {
                    var bp = urlBreakpoints[i];
                    if (bp.type & BP_NORMAL)
                        cb.call(url, bp.lineNo, bp.startLineNo, bp.disabled & BP_NORMAL,
                            bp.condition);
                }
            }
        }
        else
        {
            for (var url in breakpoints)
                this.enumerateBreakpoints(url, cb);
        }
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 

    setErrorBreakpoint: function(url, lineNo)
    {
        var index = this.findErrorBreakpoint(url, lineNo);
        if (index == -1)
        {
            var scriptInfos = this.findScriptInfos(denormalizeURL(url), lineNo);
            if (scriptInfos.length)
            {
				var script = scriptInfos[0].script;  // TODO Loop??
                errorBreakpoints.push({href: normalizeURL(url), lineNo: lineNo,
                    startLineNo: script.baseLineNumber});
                dispatch(debuggers, "onToggleErrorBreakpoint", [url, lineNo, true]);
            }
        }
    },

    clearErrorBreakpoint: function(url, lineNo)
    {
        var index = this.findErrorBreakpoint(url, lineNo);
        if (index != -1)
        {
            errorBreakpoints.splice(index, 1);

            dispatch(debuggers, "onToggleErrorBreakpoint", [url, lineNo, false]);
        }
    },

    hasErrorBreakpoint: function(url, lineNo)
    {
        return this.findErrorBreakpoint(url, lineNo) != -1;
    },

    enumerateErrorBreakpoints: function(url, cb)
    {
        if (url)
        {
            url = normalizeURL(url);
            for (var i = 0; i < errorBreakpoints.length; ++i)
            {
                var bp = errorBreakpoints[i];
                if (bp.href == url)
                    cb.call(bp.href, bp.lineNo, bp.startLineNo, false, "");
            }
        }
        else
        {
            for (var i = 0; i < errorBreakpoints.length; ++i)
            {
                var bp = errorBreakpoints[i];
                cb.call(bp.href, bp.lineNo, bp.startLineNo, false, "");
            }
        }
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 

    monitor: function(script, debuggr)
    {
        var lineNo = findFirstExecutableLine(script);
		var scriptInfo = fbs.scriptInfoByTag[script.tag];
        var url = scriptInfo.url;
        if (lineNo != -1 && this.addBreakpoint(BP_MONITOR, url, lineNo, debuggr, scriptInfo))
        {
            ++monitorCount;
            dispatch(debuggers, "onToggleMonitor", [script.fileName, lineNo, true]);
        }
    },

    unmonitor: function(script)
    {
        var lineNo = findFirstExecutableLine(script);
        var url = fbs.getSourceURL(script);
        if (lineNo != -1 && this.removeBreakpoint(BP_MONITOR, url, lineNo, script))
        {
            --monitorCount;
            dispatch(debuggers, "onToggleMonitor", [url, lineNo, false]);
        }
    },

    isMonitored: function(script)
    {
        var lineNo = findFirstExecutableLine(script);
        var url = fbs.getSourceURL(script);
        var bp = lineNo != -1 ? this.findBreakpoint(url, lineNo) : null;
        return bp && bp.type & BP_MONITOR;
    },

    enumerateMonitors: function(url, cb)
    {
        if (url)
        {
            url = denormalizeURL(url);
            
            var urlBreakpoints = breakpoints[url];
            if (urlBreakpoints)
            {
                for (var i = 0; i < urlBreakpoints.length; ++i)
                {
                    var bp = urlBreakpoints[i];
                    if (bp.type & BP_MONITOR)
                        cb.call(url, bp.lineNo, bp.startLineNo, false, "");
                }
            }
        }
        else
        {
            for (var url in breakpoints)
                this.enumerateBreakpoints(url, cb);
        }
    },
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 

    startProfiling: function()
    {
        if (!this.profiling)
        {
            this.profiling = true;
            profileStart = new Date();

            jsd.flags |= COLLECT_PROFILE_DATA;
        }

        ++profileCount;
    },

    stopProfiling: function()
    {
        if (--profileCount == 0)
        {
            jsd.flags &= ~COLLECT_PROFILE_DATA;

            var t = profileStart.getTime();

            this.profiling = false;
            profileStart = null;

            return new Date().getTime() - t;
        }
        else
            return -1;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 

    enableDebugger: function()
    {
        if (waitingForTimer)
        {
            timer.cancel();
            waitingForTimer = false;
        }
		
		if (enabledDebugger)
            return;
    
        enabledDebugger = true;

        if (jsd)
        {
            jsd.unPause();
            this.hookScripts();
        }
        else
        {
            jsd = DebuggerService.getService(jsdIDebuggerService);

            jsd.flags |= DISABLE_OBJECT_TRACE;

            jsd.on();
            this.hookScripts();

            jsd.debuggerHook = { onExecute: hook(this.onDebugger, RETURN_CONTINUE) };
            jsd.debugHook = { onExecute: hook(this.onDebug, RETURN_CONTINUE) };
            jsd.breakpointHook = { onExecute: hook(this.onBreakpoint, RETURN_CONTINUE_THROW) };
            //jsd.throwHook = { onExecute: hook(this.onThrow, RETURN_CONTINUE) };
            jsd.errorHook = { onError: hook(this.onError, true) };
			this.syncTopLevelHook();
        }
		
    },

    disableDebugger: function()
    {
        if (!enabledDebugger)
            return;
        
        timer.init({observe: function()
        {
            enabledDebugger = false;

            jsd.pause();
            fbs.unhookScripts();
        }}, 1000, TYPE_ONE_SHOT);
        
        waitingForTimer = true;
    },
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
    // jsd Hooks
    
    // When (debugger keyword and not halt)||(bp and BP_UNTIL) || (onBreakPoint && no conditions)
    // || interuptHook.  rv is ignored 
    onBreak: function(frame, type, rv)
    {   
    	try 
		{ 
	        var debuggr = this.findDebugger(frame);
        	if (debuggr)
            	return this.breakIntoDebugger(debuggr, frame);
        } 
        catch(exc) 
        {
	        ERROR("onDebugger failed: "+exc);
        }
        return RETURN_CONTINUE;
    },

    onDebugger: function(frame, type, rv) // When engine encounters debugger keyword (only)
    {   
    	try {  
	        if (haltDebugger)
	        {
	            var debuggr = haltDebugger;
	            haltDebugger = null;
	            
	            return debuggr.onHalt(frame);
	        }
	        else
	            return this.onBreak(frame, type, rv);
	        } 
        catch(exc) 
        {
        	ERROR("onDebugger failed: "+exc);
        	return RETURN_CONTINUE;
        }
    },
    
    onDebug: function(frame, type, rv)
    {   
    	try 
    	{ 
			var debuggr = reportNextError || breakOnNextError ? this.findDebugger(frame) : null;
	        
	        if (reportNextError)
	        {
	            reportNextError = false;
	            if (debuggr) {
					if (nsIFireBugDebuggerWithEval && debuggr.QueryInterface(nsIFireBugDebuggerWithEval) ) 
	        		{
						debuggr.onErrorWithMessage(frame, nextErrorMessage);
						nextErrorMessage = null;
						debuggr = this.reFindDebugger(frame, debuggr);
					}
					else
						debuggr.onError(frame);
				}
	               
	        }
	
	        if (breakOnNextError)
	        {
	            breakOnNextError = false;
	            if (debuggr)
	                return this.breakIntoDebugger(debuggr, frame);
	        }
        } catch (exc) {
	        ERROR("onDebug failed: "+exc);
        	return RETURN_CONTINUE;
        }

        return RETURN_CONTINUE;
    },

    onBreakpoint: function(frame, type, val)
    {            
		if (frame.script.tag in fbs.topLevelScriptTag)
    	{
    		delete fbs.topLevelScriptTag[frame.script.tag];
    		return this.onEvalBreak(frame, type, val);
    	}
    	if (frame.script.tag in fbs.eventLevelScriptTag)
    	{
			delete fbs.eventLevelScriptTag[frame.script.tag];
    		return this.onEventScriptBreak(frame, type, val);
    	}
        if (disabledCount || monitorCount || conditionCount || runningUntil)
        {
            var url = fbs.getSourceURL(frame.script);
			var scriptInfo = fbs.scriptInfoByTag[frame.script.tag];
			if (scriptInfo) 
				var lineNo = scriptInfo.unshiftFromSourceBufferToScriptNumbering(frame.line);
			else
				var lineNo = frame.line;
				
            var bp = this.findBreakpoint(url, lineNo);
            if (bp)
            {
                if (bp.type & BP_MONITOR && !(bp.disabled & BP_MONITOR))
                    bp.debuggr.onCall(frame);

                if (bp.type & BP_UNTIL)
                {
                    this.stopStepping();
                    return this.onBreak(frame, type, val);
                }
                else if (bp.type & BP_NORMAL && bp.condition)
                {
                    var passed = evaluateCondition(frame, bp.condition);
                    if (!passed)
                        return RETURN_CONTINUE;
                }
                else if (!(bp.type & BP_NORMAL) || bp.disabled & BP_NORMAL)
                    return RETURN_CONTINUE;
            }
            else
                return RETURN_CONTINUE;
        }

        if (runningUntil) // XXXjjb ?? bp and after onCall? Seems dubious
            return RETURN_CONTINUE;
        else
            return this.onBreak(frame, type, val);
    },

    onThrow: function(frame, type, val)
    {
        // Remember the error where the last exception is thrown - this will
        // be used later when the console service reports the error, since
        // it doesn't currently report the window where the error occured
        this._lastErrorWindow = getFrameWindow(frame);

        return RETURN_CONTINUE_THROW;
    },

    onError: function(message, fileName, lineNo, pos, flags, errnum, exc)
    {   
			
        if (this.showStackTrace)
        {
            reportNextError = true;
			nextErrorMessage = message; // file and line on frame
            var theNeed = this.needToBreakForError(fileName, lineNo);
			
            return false;  // Drop into onDebug
        }
        else
        {
            return !this.needToBreakForError(fileName, lineNo);
        }
    },

	onEventScriptBreak: function(frame, type, val) 
	{
		try {
			var script = frame.script;
			var bp = this.findZeroPCBreakpoint(script, PCMAP_SOURCETEXT);		
			if (bp == undefined)		
				script.clearBreakpoint(0); 
		
			var debuggr = this.findDebugger(frame);  // sets debuggr.breakContext
			
	        if (debuggr) 
	        {
	        	if (nsIFireBugDebuggerWithEval && debuggr.QueryInterface(nsIFireBugDebuggerWithEval) ) 
	        	{
	        		var eventURL = fbs.getURLFromDebugger(debuggr.onEventScript, frame);
					if (eventURL)
					{
						fbs.registerEventLevelScript(frame.script, eventURL, "event level");     // 1 is determined experimentally
						//fbs.drainTopLevelScriptStack(eventURL, frame, frame.script, debuggr);  TODO test multiple functions in event
					}
	   
					return RETURN_CONTINUE;	 
	        	}
	        }
	    } catch(exc) {
	    	ERROR("onEventScriptBreak failed: "+exc);
	    }	
		return RETURN_CONTINUE;
	},
	
	onEvalBreak: function(frame, type, val) 
	{ 
		try 
		{
			// In onScriptHook we found a no-name script, set a bp in PC=0, and a flag. 
			// onBreakpoint saw the flag, cleared the flag, and sent us here.
			// Start by undoing our damage
			var script = frame.script;
			var bp = this.findZeroPCBreakpoint(script, PCMAP_SOURCETEXT);		
			if (bp == undefined)
			{
				script.clearBreakpoint(0);
			} 
			
			var debuggr = this.findDebugger(frame);  // sets debuggr.breakContext
			
	        if (!debuggr)
	        {
	        	return RETURN_CONTINUE;
	        }
	        
	       	if (! (nsIFireBugDebuggerWithEval && debuggr.QueryInterface(nsIFireBugDebuggerWithEval)) )
	       	{
	        	ERROR("firebug-service: no DebuggerWithEval\n"); 
	        	return RETURN_CONTINUE;
	        }
	         
       		if (!frame.callingFrame) 
			{
				var topLevelURL = fbs.getURLFromDebugger(debuggr.onTopLevel, frame);
				if (topLevelURL)
				{

					fbs.registerTopLevelScript(script, topLevelURL, "top-level");      
					fbs.drainTopLevelScriptStack(topLevelURL, frame, script, debuggr);
				}
				return RETURN_CONTINUE;	 // top_level
			}
       		else
       		{	
				var leveledScriptURL = fbs.getURLFromDebugger(debuggr.onEval, frame);
				if (leveledScriptURL)
				{
            		fbs.registerEvalLevelScript(script, leveledScriptURL, "eval-level", 1);           			
					fbs.drainEvalScriptStack(leveledScriptURL, frame, script, debuggr);
				}
       			return RETURN_CONTINUE;
       		}
        } 
		catch (exc) 
		{
			ERROR("onEvalBreak failed: "+exc);
		}
		return RETURN_CONTINUE;
	}, 
	
	getURLFromDebugger: function(callback, frame) 
	{
		var result_url = {};
   		try 
		{
			var rc = callback(frame, result_url);
         
	        if (!rc) 
	        {
	        	ERROR("firebug-service: debuggr callback for url failed \n");
	        	return;
	        }  
		} 
		catch(exc)
		{
			ERROR("firebug-service: debuggr callback for url FAILED with exception="+exc+"\n");
			return;
		}
   		
        		
        return result_url.value.getWrappedValue();
	},
	

	drainTopLevelScriptStack: function(leveledScriptURL, frame, leveledScript, debuggr) 
	{   	 
		for (tag in fbs.nestedScriptStack) {
        	var nestedScript = fbs.nestedScriptStack[tag];
        	if (nestedScript.fileName != leveledScriptURL) 
        		continue;
				
        	var lineNo = nestedScript.baseLineNumber - leveledScript.baseLineNumber + 1;
        	
			debuggr = this.reFindDebugger(frame, debuggr);
        	debuggr.onTopLevelScript(leveledScriptURL, lineNo, nestedScript);
        	
			var scriptInfo = fbs.registerTopLevelScript(nestedScript, leveledScriptURL, "nested in top-level");
       }
       fbs.nestedScriptStack = {}; // XXXjjb TODO we lose all the moz scripts here
	},
	
	drainEvalScriptStack: function(leveledScriptURL, frame, script, debuggr) 
	{    	 
		for (tag in fbs.nestedScriptStack) {
        	var nestedScript = fbs.nestedScriptStack[tag];
			if (nestedScript.fileName != script.fileName) 
        		continue;
        	var baseLineNumberWithEvalBuffer = nestedScript.baseLineNumber - script.baseLineNumber + 1;
        	if (baseLineNumberWithEvalBuffer <= 0) 
			{	
				// happens for ppfun internally generated functions and maybe for injected script tags?
        	}
        	debuggr = this.reFindDebugger(frame, debuggr);
        	debuggr.onEvalScript(leveledScriptURL, baseLineNumberWithEvalBuffer, nestedScript);
        	
        	var scriptInfo = fbs.registerEvalLevelScript(nestedScript, leveledScriptURL, "nested in eval-level",  script.baseLineNumber);

       }
       fbs.nestedScriptStack = {};
	},
	
    onScriptCreated: function(script)
    { 
        try {
        
	        if (!script.fileName) return;  // some internal thing?
	        if (script.fileName.indexOf(":") == -1) return; // XStringBundle etal
	        //if (script.fileName.indexOf("chrome:") != -1) return; // can't deal with extensions (yet?)
	        
           	
           	if (script.fileName.indexOf("__firebugTemp__") != -1) return; // see spy.js
           	
	        if (!script.functionName) 
	        { 	
	        	// top or eval-level
	    		// We need to detect eval() and grab its source. For that we need a stack frame.
	    		// Get a frame by breakpointing the no-name script that was just created.
	    		fbs.topLevelScriptTag[script.tag] = true;
	    		script.setBreakpoint(0);
	    	} 
	    	else if (script.baseLineNumber == 1 && script.fileName in fbs.scriptInfoArrayByURL) 
	    	{
		        fbs.eventLevelScriptTag[script.tag]= true; 
		        script.setBreakpoint(0);  // XXXjjb possible conflict with bp set by user
	    	}
	    	else
	    	{
	    		fbs.nestedScriptStack[script.tag] = script;
	    	}	    	
         }
         catch(error)
         { 
         	ERROR(error);
         }
    },
    
	resetBreakpoints: function(scriptInfo) 
	{ 
        // If the new script is replacing an old script with a breakpoint still
        // set in it, try to re-set the breakpoint in the new script
		var url = scriptInfo.url;
        var urlBreakpoints = breakpoints[url];
        var pcmap = scriptInfo.pcmap;
        if (urlBreakpoints)
        {	
			
			for (var i = 0; i < urlBreakpoints.length; ++i)
            { 
                var bp = urlBreakpoints[i];
                var endScript = scriptInfo.baseLineNumber + scriptInfo.lineExtent;
                var sourceLineNo = bp.lineNo; 
				var lineInScript = scriptInfo.shiftFromSourceBufferToScriptNumbering(sourceLineNo);
                if (scriptInfo.baseLineNumber <= lineInScript 
                    && lineInScript <= endScript)
                { 
					var script = scriptInfo.script;
					
                    if (script.isLineExecutable(lineInScript, pcmap))
                    {
                        var pc = script.lineToPc(lineInScript, pcmap);
                        script.setBreakpoint(pc); 
                        bp.startLineNo = scriptInfo.baseLineNumber;
                    }
                }
            }
        }
    },

    onScriptDestroyed: function(script)
    {
			
        if (script.tag in fbs.scriptInfoByTag)  
        {
        	var scriptInfo = fbs.scriptInfoByTag[script.tag];
 			var url = scriptInfo.url;
			if (url in fbs.scriptInfoArrayByURL)
        		remove(fbs.scriptInfoArrayByURL[url], scriptInfo);
        	delete fbs.scriptInfoByTag[script.tag];
        }
            
        if (script.tag in fbs.nestedScriptStack) delete fbs.nestedScriptStack[script.tag];
        if (script.tag in fbs.eventLevelScriptTag) delete fbs.eventLevelScriptTag[script.tag];
        

    },
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
	// ScriptInfo
	// the script exists between baseLineNumber and baseLineNumber + lineExtent.
	
	
	registerScriptInfo: function(script, url, typename) 
	{
		var scriptInfo = new Object();
		scriptInfo.script = script;
		scriptInfo.url = url;
		scriptInfo.typename = typename;
		
		if (scriptInfo.url in fbs.scriptInfoArrayByURL)
			fbs.scriptInfoArrayByURL[scriptInfo.url].push(scriptInfo);
		else 
			fbs.scriptInfoArrayByURL[scriptInfo.url]= [scriptInfo];
		
		fbs.scriptInfoByTag[scriptInfo.script.tag] = scriptInfo;
		
		return scriptInfo;
	},			

	shiftNone: function(lineNo) 
	{
		return lineNo;
	},

	registerTopLevelScript: function(script, url, typename) 
	{
		var scriptInfo = fbs.registerScriptInfo(script, url, typename);
		scriptInfo.pcmap = PCMAP_SOURCETEXT;
		scriptInfo.lineExtent = script.lineExtent;
		scriptInfo.baseLineNumber = script.baseLineNumber; 
		scriptInfo.shiftFromSourceBufferToScriptNumbering = fbs.shiftNone;
		scriptInfo.unshiftFromSourceBufferToScriptNumbering = fbs.shiftNone;
		
		fbs.resetBreakpoints(scriptInfo);
		
		
		return scriptInfo;
	},
	
	registerEvalLevelScript: function(script, url, typename, evalLineNumber) 
	{
		var scriptInfo = fbs.registerScriptInfo(script, url, typename);
		scriptInfo.pcmap = PCMAP_SOURCETEXT;
		scriptInfo.lineExtent = script.lineExtent;
		scriptInfo.baseLineNumber = script.baseLineNumber;
		scriptInfo.evalLineNumber = evalLineNumber;
		scriptInfo.shiftFromSourceBufferToScriptNumbering = function(lineNo) 
		{
			// We've taken the eval source into a buffer starting at 1.
			// This particular script starts at baseLineNumber relative to 1.
			// The engine uses scriptLineNo = eval-point-lineNumber + lineNo - 1.
			//
			return lineNo + this.evalLineNumber - 1;
		}
		scriptInfo.unshiftFromSourceBufferToScriptNumbering = function(lineNo) 
		{
			return lineNo - this.evalLineNumber + 1;
		}
		fbs.resetBreakpoints(scriptInfo);
		
		
		return scriptInfo;
	},
	
	shiftOne: function(lineNo)
	{
		return lineNo + 1;	
	},
		
	unshiftOne: function(lineNo)
	{
		return lineNo - 1;	
	},
	
	registerEventLevelScript: function(script, url, typename) 
	{
		var scriptInfo  = fbs.registerScriptInfo(script, url, typename);
		scriptInfo.pcmap = PCMAP_PRETTYPRINT;
		scriptInfo.lineExtent = fbs.countLines(script);
		scriptInfo.baseLineNumber = script.baseLineNumber;
		scriptInfo.shiftFromSourceBufferToScriptNumbering = fbs.shiftOne;  // heursitic
		scriptInfo.unshiftFromSourceBufferToScriptNumbering = fbs.unshiftOne;
		fbs.resetBreakpoints(scriptInfo);
		
		return scriptInfo;
	},
	
	formatScriptInfo: function(scriptInfo) 
	{
		return scriptInfo.script.tag+"@("+scriptInfo.baseLineNumber+"-"+(scriptInfo.baseLineNumber+scriptInfo.lineExtent)+")"+ scriptInfo.url+":"+scriptInfo.typename;
	},
	
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 

    findDebugger: function(frame)
    {
        var win = getFrameWindow(frame);
        if (!win)
            return;
        
        for (var i = 0; i < debuggers.length; ++i)
        {
            try
            {
                var debuggr = debuggers[i];
                if (debuggr.supportsWindow(win))
                    return debuggr;
            }
            catch (exc) { /* ERROR("firebug-service findDebugger: "+exc)*/}
        }
    },
    
    diagnoseFindDebugger: function(frame)
    {
    	dumpToFileWithStack("diagnoseFindDebugger", frame);
        var win = getFrameWindow(frame);
        if (!win)
            return;
        ddd("diagnoseFindDebugger find win.location ="+(win.location?win.location.href:"(undefined)")+"\n");
        for (var i = 0; i < debuggers.length; ++i)
        {
            try
            {
                var debuggr = debuggers[i];
                if (debuggr.supportsWindow(win))
                    return debuggr;
            }
            catch (exc) {ddd("caught:"+exc+"\n");}
        }
        ddd("diagnoseFindDebugger tried "+debuggers.length+"\n");
    },
    
    reFindDebugger: function(frame, debuggr) 
    {
    	var win = getFrameWindow(frame);
    	if (debuggr.supportsWindow(win)) return debuggr; // for side-effect: context set on debugger.js
    },
    
    getSourceURL: function(script)
    {
    	if (script.tag in fbs.scriptInfoByTag) 
        	return fbs.scriptInfoByTag[script.tag].url;
        else
        	return script.fileName;
    },
    
    countLines: function(script) {
    	var lines = script.functionSource.split(/\r\n|\r|\n/);
    	return lines.length;
    },
    
    findScriptInfos: function(url, lineNo)
    {    
        var hits = [];
		
        var scriptInfos = fbs.scriptInfoArrayByURL[url]; 
        if (scriptInfos)
        {	        	
            for (var i = 0; i < scriptInfos.length; ++i)
            {
	            var scriptInfo = scriptInfos[i];
				
				var lineInScript = scriptInfo.shiftFromSourceBufferToScriptNumbering(lineNo);   
				
				var offset = scriptInfo.baseLineNumber;
				var max = offset + scriptInfo.lineExtent;	
				var pcmap = scriptInfo.pcmap; 	
				
				var script = scriptInfo.script;				
				
                if (lineInScript >= offset && lineInScript <= max)
                { 	
                    if (script.isLineExecutable(lineInScript, pcmap))
	                {	
    	                hits.push(scriptInfo);
        	        }
        	     }
            }
        }
        
        return hits;
    },

    findBreakpoint: function(url, lineNo)
    {
        var urlBreakpoints = breakpoints[url];
        if (urlBreakpoints)
        {
            for (var i = 0; i < urlBreakpoints.length; ++i)
            {
                var bp = urlBreakpoints[i];
                if (bp.lineNo == lineNo)
                    return bp;
            }
        }

        return null;
    },

    findErrorBreakpoint: function(url, lineNo)
    {
        url = normalizeURL(url);
        
        for (var i = 0; i < errorBreakpoints.length; ++i)
        {
            var bp = errorBreakpoints[i];
            if (bp.lineNo == lineNo && bp.href == url)
                return i;
        }
    
        return -1;
    },
    
    findZeroPCBreakpoint: function(script, pcmap) 
    {
    	    var url = fbs.getSourceURL(script);
    	    var line = script.pcToLine(0, pcmap);
            return this.findBreakpoint(url, line);
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 

    addBreakpoint: function(type, url, lineNo, debuggr, scriptInfo)
    { // ddd("addBreakpoint type="+type+"\n");
        url = denormalizeURL(url);

        var bp = this.findBreakpoint(url, lineNo);
        if (bp && bp.type & type)
            return null;
        
        if (bp)
        {
            bp.type |= type;

            if (debuggr)
                bp.debuggr = debuggr;
        }
        else
        {
            var scriptInfos = scriptInfo ? [scriptInfo] : this.findScriptInfos(url, lineNo); 
			
			var onNextReloadOnly = true;
            for (var i = 0; i < scriptInfos.length; ++i)
            {
                scriptInfo = scriptInfos[i];
				var script = scriptInfo.script;
				var pcmap = scriptInfo.pcmap;
				
				var lineInScript = scriptInfo.shiftFromSourceBufferToScriptNumbering(lineNo);
				var pc = script.lineToPc(lineInScript, pcmap);
                script.setBreakpoint(pc);  
				
				
				var firstSourceLine = scriptInfo.unshiftFromSourceBufferToScriptNumbering(script.baseLineNumber);
				var bp = fbs.recordBreakpoint(type, url, lineNo, debuggr, firstSourceLine);
				
				onNextReloadOnly = false;
			}
			if (onNextReloadOnly)
			{
				var bp = fbs.recordBreakpoint(type | BP_ONRELOAD, url, lineNo, debuggr);  // mark for next reload
			} 
        }

        return bp;
    },

	recordBreakpoint: function(type, url, lineNo, debuggr, functionDeclarationLine)
	{
		var urlBreakpoints = breakpoints[url];
  		if (!urlBreakpoints)
        	breakpoints[url] = urlBreakpoints = [];

    	bp = {type: type, href: url, lineNo: lineNo, disabled: 0,
            startLineNo: functionDeclarationLine, debuggr: debuggr,
            condition: ""};
    	urlBreakpoints.push(bp);
    	++breakpointCount;
		return bp;
	},

    removeBreakpoint: function(type, url, lineNo, script) // xxxJJB script arg not used?
    {
        url = denormalizeURL(url);
		
        var urlBreakpoints = breakpoints[url];
        if (!urlBreakpoints)
            return false;
			
		
        for (var i = 0; i < urlBreakpoints.length; ++i)
        {
            var bp = urlBreakpoints[i];
			
			
            if (bp.lineNo == lineNo)
            {
                bp.type &= ~type;
				
                if (!(bp.type & !BP_ONRELOAD) )  // if BP_ONRELOAD is not set...
                {
					// Check all scripts that may be defined on this line of url
					// xxxJJB this is expensive, we could track the scripts
					jsd.enumerateScripts({enumerateScript: function(script)
                    {
                        if (script)
                        {
							var scriptInfo = fbs.scriptInfoByTag[script.tag];
							
							if (scriptInfo)
							{
								var pcmap = scriptInfo.pcmap;
								if(scriptInfo.url == url
							  		&& script.isLineExecutable(lineNo, pcmap))
                        		{
									var lineInScript = scriptInfo.shiftFromSourceBufferToScriptNumbering(lineNo);
                            		var pc = script.lineToPc(lineInScript, pcmap);
                            		script.clearBreakpoint(pc); 
                        		}
							}
                        }
                    }});
					
                    urlBreakpoints.splice(i, 1);
                    --breakpointCount;

                    if (bp.disabled)
                        --disabledCount;
                    
                    if (bp.condition)
                    {
                        --conditionCount;
                        dispatch(debuggers, "onToggleBreakpointCondition", [url, lineNo, false]);
                    }
                    
                    if (!urlBreakpoints.length)
                        delete breakpoints[url];
                                        
                }
                
                return true;
            }
        }

        return false;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    breakIntoDebugger: function(debuggr, frame)
    {
        // Before we break, clear information about previous stepping session
        this.stopStepping();
        
        // Break into the debugger - execution will stop here until the user resumes
        var returned;
        try
        {
            returned = debuggr.onBreak(frame);
        }
        catch (exc)
        {
            ERROR(exc);
            returned = RETURN_CONTINUE;
        }
        
        // Execution resumes now. Check if the user requested stepping and if so
        // install the necessary hooks
        this.startStepping();
        
        return returned;
    },
    
    needToBreakForError: function(url, lineNo)
    {
        return breakOnNextError =
            this.breakOnErrors || this.findErrorBreakpoint(url, lineNo) != -1;
    },

    startStepping: function()
    {
        if (!stepMode && !runningUntil)
            return;

        hookFrameCount = stepFrameCount;
       
        this.hookFunctions();
        
        if (stepMode == STEP_OVER || stepMode == STEP_INTO)
            this.hookInterrupts();
    },
    
    stopStepping: function()
    {
        stepMode = 0;
        stepFrame = null;
        stepFrameCount = 0;
        stepFrameLineId = null;
                
        if (runningUntil)
        {
            this.removeBreakpoint(BP_UNTIL, runningUntil.href, runningUntil.lineNo);
            runningUntil = null;
        }

        jsd.interruptHook = null;
        jsd.functionHook = null;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 

    hookFunctions: function()
    {
        function functionHook(frame, type)
        {
            switch (type)
            {
                case TYPE_FUNCTION_CALL:
                {
                    ++hookFrameCount;
										
                    if (stepMode == STEP_OVER)
                        jsd.interruptHook = null;
                    break;
                }
                case TYPE_FUNCTION_RETURN:
                {
                    --hookFrameCount;
					

                    if (hookFrameCount == 0)
                        fbs.stopStepping();
                    else if (stepMode == STEP_OVER || stepMode == STEP_INTO)
                    {
                        if (hookFrameCount <= stepFrameCount) 
							 return fbs.onBreak(frame, type);
                    }
                    else if (stepMode == STEP_OUT)
                    {
                        if (hookFrameCount < stepFrameCount)
                            return fbs.onBreak(frame, type);
                    }
                    
                    break;
                }
            }
        }
        jsd.functionHook = { onCall: functionHook };
    },
    
	hookTopLevel: function()
	{
		function topLevelHook(frame, type)
		{
			fbs.onBreak(frame, type);
		}
		jsd.topLevelHook = { onCall: topLevelHook };
	},
	
    hookInterrupts: function()
    {
        function interruptHook(frame, type, rv)
        {
            // Sometimes the same line will have multiple interrupts, so check
            // a unique id for the line and don't break until it changes
            var frameLineId = hookFrameCount + frame.script.fileName + frame.line;
            if (frameLineId != stepFrameLineId)
                return fbs.onBreak(frame, type, rv);
            else
                return RETURN_CONTINUE;
        }
        jsd.interruptHook = { onExecute: interruptHook };
    },
        
    hookScripts: function()
    {
        jsd.scriptHook = {
            onScriptCreated: hook(this.onScriptCreated),
            onScriptDestroyed: hook(this.onScriptDestroyed)
        };

        fbs.scriptInfoArrayByURL = {};  
		
		jsd.enumerateScripts({enumerateScript: function(script)
        {
            var url = script.fileName;  
            fbs.registerTopLevelScript(script, url, "enumerated");  
        }});
        
    },

    unhookScripts: function()
    {
        jsd.scriptHook = null;
        fbs.scriptInfoArrayByURL = null;
    },
	
	syncTopLevelHook: function() 
	{
		if (fbs.breakOnTopLevel)
		    fbs.hookTopLevel();
		else
			jsd.topLevelHook = null;
	},
	
	dumpScriptInfo: function()
	{
		var reComponents = /file:.*\/components\/.*:enumerated/;
		for (url in this.scriptInfoArrayByURL)
		{
			if (isSystemURL(url)) continue;
			if (url.substr(0, 9) == "chrome://") continue;
			if (url.match(reComponents)) continue;
			
			var scriptInfos = this.scriptInfoArrayByURL[url];
			for (var i = 0; i < scriptInfos.length; i++)
			{
				ddd(i+"/"+scriptInfos.length+": "+this.formatScriptInfo(scriptInfos[i])+"\n");
			}
		}
	}
};

// ************************************************************************************************

var FirebugFactory =
{
    createInstance: function (outer, iid)
    {
        if (outer != null)
            throw NS_ERROR_NO_AGGREGATION;

        return (new FirebugService()).QueryInterface(iid);
    }
};

// ************************************************************************************************

var FirebugModule =
{
    registerSelf: function (compMgr, fileSpec, location, type)
    {
        compMgr = compMgr.QueryInterface(nsIComponentRegistrar);
        compMgr.registerFactoryLocation(CLASS_ID, CLASS_NAME, CONTRACT_ID, fileSpec, location, type);

        try
        {
            var jsd = DebuggerService.getService(jsdIDebuggerService);
            jsd.initAtStartup = true;
        }
        catch (exc)
        {
        }    
    },

    unregisterSelf: function(compMgr, fileSpec, location)
    {        
        compMgr = compMgr.QueryInterface(nsIComponentRegistrar);
        compMgr.unregisterFactoryLocation(CLASS_ID, location);
    },

    getClassObject: function (compMgr, cid, iid)
    {
        if (!iid.equals(nsIFactory))
            throw NS_ERROR_NOT_IMPLEMENTED;
    
        if (cid.equals(CLASS_ID))
            return FirebugFactory;

        throw NS_ERROR_NO_INTERFACE;
    },

    canUnload: function(compMgr)
    {
        return true;
    }
};

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 

function NSGetModule(compMgr, fileSpec)
{
    return FirebugModule;
}

// ************************************************************************************************
// Local Helpers

function normalizeURL(url)
{
    // For some reason, JSD reports file URLs like "file:/" instead of "file:///", so they
    // don't match up with the URLs we get back from the DOM
    return url ? url.replace(/file:\/([^/])/, "file:///$1") : "";
}

function denormalizeURL(url)
{
    return url ? url.replace(/file:\/\/\//, "file:/") : "";
}

function isSystemURL(url)
{
    if (url.substr(0, 17) == "chrome://firebug/")
        return true;
    else if (url.indexOf("firebug-service.js") != -1)
        return true;
    else if (url == "XStringBundle")
        return true;
    else
        return false;
}

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 

function dispatch(listeners, name, args)
{
    for (var i = 0; i < listeners.length; ++i)
    {
        var listener = listeners[i];
        if (name in listener)
            listener[name].apply(listener, args);
    }
}

function hook(fn, rv)
{
    return function()
    {
        try
        {
            return fn.apply(fbs, arguments);
        }
        catch (exc)
        {
        	var msg = "Error in hook: " + exc +" stack=";
            for (var frame = Components.stack; frame; frame = frame.caller)
        		msg += frame.filename + "@" + frame.lineNumber + ";\n"; 
       		ERROR(msg);
            return rv;
        }
    }
}

function getFrameWindow(frame)
{
    try
    {
        var result_frameWindow = {};
        frame.eval("window", "", 1, result_frameWindow);

        var win = result_frameWindow.value.getWrappedValue();
        return getRootWindow(win);
    }
    catch (exc)
    {
        ERROR("firebug-service getFrameWindow fails: "+exc);  // FBS.DBG_WINDOWS
		return null;
    }
}

function getRootWindow(win)
{
    for (; win; win = win.parent)
    {
        if (!win.parent || win == win.parent)
            return win;
    }
    return null;
}

function countFrames(frame)
{
    var frameCount = 0;
    for (; frame; frame = frame.callingFrame)
        ++frameCount;
    return frameCount;
}

function findFirstExecutableLine(script)
{
	var scriptInfo = fbs.scriptInfoByTag[script.tag];
	var url = scriptInfo.tag;
	var pcmap = scriptInfo.pcmap;
	var line = script.pcToLine(0, pcmap);
	return line;
}

function evaluateCondition(frame, condition)
{
    var result_condition = {};
    frame.scope.refresh();
    var ok = frame.eval(condition, "", 1, result_condition);
    return ok && !!result_condition.value.getWrappedValue();
}

function remove(list, item)
{
    var index = list.indexOf(item);
    if (index != -1)
        list.splice(index, 1);
}

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 

var FirebugPrefsObserver =
{
    observe: function(subject, topic, data)
    {
        if (data == "extensions.firebug.showStackTrace")
            fbs.showStackTrace =  prefs.getBoolPref("extensions.firebug.showStackTrace");
        else if (data == "extensions.firebug.breakOnErrors")
            fbs.breakOnErrors =  prefs.getBoolPref("extensions.firebug.breakOnErrors");
		else if (data == "extensions.firebug.breakOnTopLevel")
			fbs.breakOnTopLevel = prefs.getBoolPref("extensions.firebug.breakOnTopLevel");
		else if (data == "extensions.firebug.DBG_FBS_CREATION")
			fbs.DBG_CREATION = prefs.getBoolPref("extensions.firebug.DBG_FBS_CREATION");
		else if (data == "extensions.firebug.DBG_FBS_BP")
			fbs.DBG_BP = prefs.getBoolPref("extensions.firebug.DBG_FBS_BP");
		else if (data == "extensions.firebug.DBG_FBS_ERRORS")
			fbs.DBG_ERRORS = prefs.getBoolPref("extensions.firebug.DBG_FBS_ERRORS");
		else if (data == "extensions.firebug.DBG_FBS_STEP")
			fbs.DBG_STEP = prefs.getBoolPref("extensions.firebug.DBG_FBS_STEP");
		else if (data == "extensions.firebug.DBG_FBS_FF_START")
			fbs.DBG_FBS_FF_START = prefs.getBoolPref("extensions.firebug.DBG_FBS_FF_START");
		else if (data == "extensions.firebug.DBG_FBS_SCRIPTINFO")
		{
			fbs.DBG_FBS_SCRIPTINFO = prefs.getBoolPref("extensions.firebug.DBG_FBS_SCRIPTINFO");
			if (fbs.DBG_FBS_SCRIPTINFO)
				fbs.dumpScriptInfo();
		}
		fbs.syncTopLevelHook();
    }
};

var ShutdownObserver = 
{
    observe: function(subject, topic, data)
    {
        fbs.shutdown();
    }
};

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 

var consoleService = null;

function ERROR(text)
{
    if (!consoleService)
        consoleService = ConsoleService.getService(nsIConsoleService);

    consoleService.logStringMessage(text + "");
}


function ddd(text)
{
    	ERROR(text);
}

function dumpProperties(title, obj) {
	var msg = title + "\n";
	for (p in obj)
	{
		msg += "["+p+"]="+obj[p]+"\n";	
	}
	ddd(msg);
}

function dFormat(script, url) 
{
	return script.tag+"@("+script.baseLineNumber+"-"+(script.baseLineNumber+script.lineExtent)+")"+ url;
}

function getDumpStream()
{
	var path = "c:\\download\\tmp\\firebug.txt";  // I welcome your corrections.
    var f = CC("@mozilla.org/file/local;1").createInstance(CI("nsILocalFile"));
    f.initWithPath(path);
    if( f.exists() == true ) f.remove( false );
    if ( f.exists() == false ) {
    	f.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420 );
    	ERROR("creating file "+path);
    } else {
    	ERROR("file exists "+path);
    }
    var stream = CC("@mozilla.org/network/file-output-stream;1")
        .createInstance(CI("nsIFileOutputStream"));
    stream.init(f, 0x04 | 0x08 | 0x10, 424, 0);
    return stream;
}
var dumpStream;

function dumpToFile(text) {
	if (!dumpStream) dumpStream = getDumpStream();
    dumpStream.write(text, text.length);
    //dumpStream.flush();  // If FF crashes you need to run with flush on every line
}

function flushDebugStream() 
{
	dumpStream.flush();
}

function dumpToFileWithStack(text, frame) {
	if (!dumpStream) dumpStream = getDumpStream();
    dumpStream.write(text, text.length);
	text = " stack: \n";
	while(frame) {
		text += frame.line+"@"+frame.script.fileName + "\n";
        frame = frame.callingFrame;
	}
	text += "-------------------------------------\n";
	dumpStream.write(text, text.length); 
    dumpStream.flush();
}
function dumpit(text)
{
    var f = CC("@mozilla.org/file/local;1").createInstance(CI("nsILocalFile"));
    f.initWithPath("/dump.txt");
    
    var stream = CC("@mozilla.org/network/file-output-stream;1")
        .createInstance(CI("nsIFileOutputStream"));
    stream.init(f, 0x04 | 0x08 | 0x10, 424, 0);
    stream.write(text, text.length);
    stream.flush();
    stream.close();
}

function dumpStack() 
{
   	var str = "<top>";
	var frame = Components.stack;
    while (frame) 
    {
        str += "\n" + frame;  
   	    frame = frame.caller;
    }
	str += "\n<bottom>";
    return str;
}
var hD="0123456789ABCDEF";
function d2h(d) {
	var h = hD.substr(d&15,1);
	while(d>15) {d>>=4;h=hD.substr(d&15,1)+h;}
	return h;
}

function getStackDump()
{
    var lines = [];
    for (var frame = Components.stack; frame; frame = frame.caller)
        lines.push(frame.filename + " (" + frame.lineNumber + ")");
    
    return lines.join("\n");
};


function getPropertyName(object, value)
{
	for (p in object) 
	{
		if (value == object[p]) return p;	
	}
}
function getExecutionStopNameFromType(type) 
{
	switch (type)
	{
		case jsdIExecutionHook.TYPE_INTERRUPTED: return "interrupted";
		case jsdIExecutionHook.TYPE_BREAKPOINT: return "breakpoint";
		case jsdIExecutionHook.TYPE_DEBUG_REQUESTED: return "debug requested";
		case jsdIExecutionHook.TYPE_DEBUGGER_KEYWORD: return "debugger_keyword";
		case jsdIExecutionHook.TYPE_THROW: return "interrupted";
		default: return "unknown("+type+")";
	}
}
