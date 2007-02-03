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

const searchDelay = 150;

// ************************************************************************************************

Firebug.Search = extend(Firebug.Module,
{
    search: function(text, context)
    {
        var searchBox = context.chrome.$("fbSearchBox");
        searchBox.value = text;
        this.update(context);
    },
    
    enter: function(context)
    {
        var panel = context.chrome.getSelectedPanel();
        if (!panel.searchable)
            return;

        var searchBox = context.chrome.$("fbSearchBox");
        var value = searchBox.value;
        
        panel.search(value, true);
    },
    
    cancel: function(context)
    {
        this.search("", context);
    },
    
    clear: function(context)
    {
        var searchBox = context.chrome.$("fbSearchBox");
        searchBox.value = "";
    },
    
    focus: function(context)
    {
        if (context.detached)
            context.chrome.focus();
        else
            Firebug.toggleBar(true);

        var searchBox = context.chrome.$("fbSearchBox");
        searchBox.focus();
        searchBox.select();
    },
    
    update: function(context, immediate)
    {
        var panel = context.chrome.getSelectedPanel();
        if (!panel.searchable)
            return;

        var searchBox = context.chrome.$("fbSearchBox");
        var panelNode = panel.panelNode;

        var value = searchBox.value;

        // This sucks, but the find service won't match nodes that are invisible, so we
        // have to make sure to make them all visible unless the user is appending to the
        // last string, in which case it's ok to just search the set of visible nodes
        if (!panel.searchText || value.indexOf(panel.searchText) != 0)
            removeClass(panelNode, "searching");

        // Cancel the previous search to keep typing smooth
        clearTimeout(panelNode.searchTimeout);

        if (immediate)
        {
            var found = panel.search(value);
            if (!found && value)
                beep();
            
            panel.searchText = value;
        }
        else
        {
            // After a delay, perform the search
            panelNode.searchTimeout = setTimeout(function()
            {
                if (value)
                {
                    // Hides all nodes that didn't pass the filter
                    setClass(panelNode, "searching");
                }
                else
                {
                    // Makes all nodes visible again
                    removeClass(panelNode, "searching");
                }

                var found = panel.search(value);
                if (!found && value)
                    beep();

                panel.searchText = value;
            }, searchDelay);
        }
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
    // extends Module
    
    enable: function()
    {
        var searchBox = FirebugChrome.$("fbSearchBox");
        searchBox.value = "";
        searchBox.disabled = false;
    },
    
    disable: function()
    {
        var searchBox = FirebugChrome.$("fbSearchBox");
        searchBox.value = "";
        searchBox.disabled = true;
    },
        
    showPanel: function(browser, panel)
    {
        var chrome = browser.chrome;
        var searchBox = chrome.$("fbSearchBox");
        searchBox.value = panel && panel.searchText ? panel.searchText : "";
        searchBox.disabled = !panel || !panel.searchable;
    }
});

// ************************************************************************************************

Firebug.registerModule(Firebug.Search);

// ************************************************************************************************
    
}});
