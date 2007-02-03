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
 
function FirebugCommandLineAPI(context)
{
    var baseWindow = context.window;
    
    this.$ = function(id)
    {
        var doc = baseWindow.document;
        return baseWindow.document.getElementById(id);
    };
    
    this.$$ = function(selector)
    {
        return FBL.getElementsBySelector(baseWindow.document, selector);
    };
    
    this.$x = function(xpath)
    {
        return FBL.getElementsByXPath(baseWindow.document, xpath);
    };

    this.cd = function(object)
    {
        if (object instanceof Window)
            baseWindow = context.baseWindow = object;
        else
            throw "Object must be a window.";
    };
    
    this.dir = function(o)
    {
        Firebug.Console.log(o, context, "dir", Firebug.DOMPanel.DirTable);
    };
    
    this.dirxml = function(o)
    {
        if (o instanceof Window)
            o = o.document.documentElement;
        else if (o instanceof Document)
            o = o.documentElement;

        Firebug.Console.log(o, context, "dirxml", Firebug.HTMLPanel.SoloElement);
    };

    this.clear = function()
    {
        Firebug.Console.clear(context);
    };

    this.inspect = function(obj, panelName)
    {
        context.chrome.select(obj, panelName);
    };

    this.keys = function(o)
    {
        return FBL.keys(o);
    };

    this.values = function(o)
    {
        return FBL.values(o);
    };
    
    this.debug = function(fn)
    {
        Firebug.Debugger.trace(fn, null, "debug");
    };    
    
    this.undebug = function(fn)
    {
        Firebug.Debugger.untrace(fn, null, "debug");
    };

    this.monitor = function(fn)
    {
        Firebug.Debugger.trace(fn, null, "monitor");
    };
    
    this.unmonitor = function(fn)
    {
        Firebug.Debugger.untrace(fn, null, "monitor");
    };
    
    this.monitorEvents = function(object, types)
    {
        monitorEvents(object, types, context);
    };

    this.unmonitorEvents = function(object, types)
    {
        unmonitorEvents(object, types, context);
    };
    
    this.profile = function(title)
    {
        Firebug.Profiler.startProfiling(context, title);
    };
    
    this.profileEnd = function()
    {
        Firebug.Profiler.stopProfiling(context);
    };

    this.copy = function(x)
    {
        FBL.copyToClipboard(x);
    };
}
