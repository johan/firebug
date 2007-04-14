/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Initial Developer of the Original Code is Parakey Inc.
 *
 * Portions created by the Initial Developer are Copyright (C) 2006
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *     Joe Hewitt <joe@joehewitt.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */
 
FBL.ns(function() { with (FBL) {

// ************************************************************************************************
// Constants

const nsIScriptError = CI("nsIScriptError");

const WARNING_FLAG = nsIScriptError.warningFlag;

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 

const urlRe = new RegExp("([^:]*):(//)?([^/]*)");

const statusBar = $("fbStatusBar");
const statusText = $("fbStatusText");

const pointlessErrors =
{
    "uncaught exception: Permission denied to call method Location.toString": 1,
    "uncaught exception: Permission denied to get property Window.writeDebug": 1,
    "this.docShell has no properties": 1,
    "aDocShell.QueryInterface(Components.interfaces.nsIWebNavigation).currentURI has no properties": 1
};

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 

const fbs = CCSV("@joehewitt.com/firebug;1", "nsIFireBug");
const consoleService = CCSV("@mozilla.org/consoleservice;1", "nsIConsoleService");

// ************************************************************************************************

var Errors = Firebug.Errors = extend(Firebug.Module,
{
    clear: function(context)
    {
        this.setCount(context, 0)
    },

    increaseCount: function(context)
    {
        this.setCount(context, context.errorCount + 1)
    },
    
    setCount: function(context, count)
    {
        context.errorCount = count;
        
        if (context == FirebugContext)
            this.showCount(context.errorCount);
    },
    
    showCount: function(errorCount)
    {
        if (!statusBar)
            return;
        
        if (errorCount)
        {
            if (Firebug.showErrorCount)
            {
                var errorLabel = errorCount > 1
                    ? $STRF("ErrorsCount", [errorCount])
                    : $STRF("ErrorCount", [errorCount]);

                statusText.setAttribute("value", errorLabel);
            }
            
            statusBar.setAttribute("errors", "true");
        }
        else
        {
            statusText.setAttribute("value", "");
            statusBar.removeAttribute("errors");
        }
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
    // extends ConsoleObserver
    
    observe: function(object)
    {
        try
        {
            if (object instanceof nsIScriptError)
            {
                var context = FirebugContext;

                var category = getBaseCategory(object.category);
                var isWarning = object.flags & WARNING_FLAG;
                var isJSError = category == "js" && !isWarning;
                
                if (isJSError)
                {
                    var isSyntaxError = object.sourceLine != null;
                    if (!isSyntaxError)
                    {
                        var errorWin = fbs.lastErrorWindow;
                        if (errorWin)
                        {
                            context = TabWatcher.getContextByWindow(errorWin);
                            if (!context)
                                return;
                        }
                    }
                }

                if (!context || !categoryFilter(object.sourceName, object.category, isWarning))
                    return;

                if (object.errorMessage in pointlessErrors)
                    return;
                
                if (category == "css")
                {
                    var msgId = [object.errorMessage, object.sourceName, object.lineNumber].join("/");
                    if (context.errorMap && msgId in context.errorMap)
                        return;

                    if (!context.errorMap)
                        context.errorMap = {};
                    
                    context.errorMap[msgId] = 1;
                }

                if (!isWarning)    
                    this.increaseCount(context);
    			var sourceName = object.sourceName;
    			var lineNumber = object.lineNumber;
    			var trace = Firebug.errorStackTrace;
    			if (trace) 
    			{ 
    				var stack_frame = trace.frames[0];
    				if (stack_frame) 
    				{
						sourceName = stack_frame.href;
						lineNumber = stack_frame.lineNo;
					}
					var correctedError = object.init(object.errorMessage, sourceName, object.sourceLine,lineNumber, object.columnNumber, object.flags, object.category); 
						
    			}
                var error = new ErrorMessage(object.errorMessage, sourceName,
                        lineNumber, object.sourceLine, category, context);
                
                var className = isWarning ? "warningMessage" : "errorMessage";
                Firebug.Console.log(error, context,  className);
            }
            else if (Firebug.showChromeMessages)
            {
                // Must be an nsIConsoleMessage
                Firebug.Console.log(object.message, context, "consoleMessage", FirebugReps.Text);
            }
        }
        catch (exc)
        {
        	// Errors prior to console init will come out here, eg error message from Firefox startup jjb.
            // ERROR("Error while reporting error: " + exc);
        }
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
    // extends Module

    enable: function()
    {
        consoleService.registerListener(this);

        if (statusBar)
            statusBar.setAttribute("disabled", "true");
    },

    disable: function()
    {
        consoleService.unregisterListener(this);        
    },
    
    initContext: function(context)
    {
        context.errorCount = 0;
    },

    showContext: function(browser, context)
    {
        if (statusBar)
            statusBar.setAttribute("disabled", !context);

        this.showCount(context ? context.errorCount : 0);
    }
});

// ************************************************************************************************
// Local Helpers

const categoryMap = 
{
    "javascript": "js",
    "JavaScript": "js",
    "DOM": "js",
    "Events": "js",
    "CSS": "css",
    "XML": "xml",
    "malformed-xml": "xml"
};

function getBaseCategory(categories)
{
    var categoryList = categories.split(" ");
    for (var i = 0 ; i < categoryList.length; ++i)
    {
        var category = categoryList[i];
        if (category in categoryMap)
            return categoryMap[category];
    }
}

function categoryFilter(url, category, isWarning)
{
    var m = urlRe.exec(url);
    var errorScheme = m ? m[1] : "";
    if (errorScheme == "javascript")
        return true;

    var isChrome = false;
    
    var categories = category.split(" ");
    for (var i = 0 ; i < categories.length; ++i)
    {
        var category = categories[i];
        if (category == "CSS" && !Firebug.showCSSErrors)
            return false;
        else if ((category == "XML" || category == "malformed-xml" ) && !Firebug.showXMLErrors)
            return false;
        else if ((category == "javascript" || category == "JavaScript" || category == "DOM")
                    && !isWarning && !Firebug.showJSErrors)
            return false;
        else if ((category == "javascript" || category == "JavaScript" || category == "DOM")
                    && isWarning && !Firebug.showJSWarnings)
            return false;
        else if (errorScheme == "chrome" || category == "XUL" || category == "chrome"
                || category == "component")
            isChrome = true;
    }
    
    if ((isChrome && !Firebug.showChromeErrors) || (!isChrome && !Firebug.showWebErrors))
        return false;
    
    return true;
}

function domainFilter(url)
{
    if (Firebug.showExternalErrors)
        return true;
                
    var browserWin = document.getElementById("content").contentWindow;

    var m = urlRe.exec(browserWin.location.href);
    if (!m)
        return false;
        
    var browserDomain = m[3];

    m = urlRe.exec(url);
    if (!m)
        return false;

    var errorScheme = m[1];
    var errorDomain = m[3];
    
    return errorScheme == "javascript"
        || errorScheme == "chrome"
        || errorDomain == browserDomain;
}

// ************************************************************************************************

Firebug.registerModule(Errors);

// ************************************************************************************************
    
}});
