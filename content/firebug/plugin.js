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

Firebug.PluginPanel = function() {};

Firebug.PluginPanel.prototype = extend(Firebug.Panel,
{
    createBrowser: function()
    {
        var doc = this.context.chrome.window.document;
        this.browser = doc.createElement("browser");
        this.browser.addEventListener("DOMContentLoaded", this.browserReady, false);
        this.browser.className = "pluginBrowser";
        this.browser.setAttribute("src", this.url);
    },
    
    destroyBrowser: function()
    {
        if (this.browser)
        {
            this.browser.parentNode.removeChild(this.browser);
            delete this.browser;
        }
    },
    
    browserReady: function()
    {
        this.browser.removeEventListener("DOMContentLoaded", this.browserReady, false);
        this.innerPanel = this.browser.contentWindow.FirebugPanel;
        if (this.visible)
        {
            innerCall(this.innerPanel, "initialize", [this.context.window]);
            this.updateSelection(this.selection);
        }
    },
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *    
    // extends Panel
    
    initialize: function()
    {
        this.browserReady = bindFixed(this.browserReady, this);
        Firebug.Panel.initialize.apply(this, arguments);
    },
    
    destroy: function(state)
    {
        this.destroyBrowser();
        Firebug.Panel.destroy.apply(this, arguments);
    },
    
    reattach: function(doc)
    {
        this.destroyBrowser();        
        this.createBrowser();
    },
    
    show: function(state)
    {
        if (!this.browser)
            this.createBrowser();
    },
    
    hide: function()
    {
    },

    supportsObject: function(object)
    {
        if (this.innerPanel)
            return innerCall(this.innerPanel, "supportsObject", [object]);
        else
            return 0;
    },
    
    updateSelection: function(object)
    {
        if (!this.innerPanel)
            return;
        
        innerCall(this.innerPanel, "select", [object]);
    },
        
    getObjectPath: function(object)
    {
    },

    getDefaultSelection: function()
    {
    },
    
    updateOption: function(name, value)
    {
    },
    
    getOptionsMenuItems: function()
    {
    },

    getContextMenuItems: function(object, target)
    {
    },
    
    getEditor: function(target, value)
    {
    }
});

// ************************************************************************************************

function innerCall(innerPanel, name, args)
{
    try
    {
        innerPanel[name].apply(innerPanel, args);
    }
    catch (exc)
    {
        ERROR(exc);
    }
}

// ************************************************************************************************
    
}});
