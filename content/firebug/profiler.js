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

Firebug.Profiler = extend(Firebug.Module,
{        
    toggleProfiling: function(context)
    {
        if (fbs.profiling)
            this.stopProfiling(context);
        else
            this.startProfiling(context);
    },

    startProfiling: function(context, title)
    {
        fbs.startProfiling();

        context.chrome.setGlobalAttribute("cmd_toggleProfiling", "checked", "true");
        
        var isCustomMessage = !!title;
        if (!isCustomMessage)
            title = $STR("ProfilerStarted");
            
        context.profileRow = this.logProfileRow(context, title);
        context.profileRow.customMessage = isCustomMessage ;
    },

    stopProfiling: function(context, cancelReport)
    {
        var totalTime = fbs.stopProfiling();
        if (totalTime == -1)
            return;

        context.chrome.setGlobalAttribute("cmd_toggleProfiling", "checked", "false");

        if (cancelReport)
            delete context.profileRow;
        else
            this.logProfileReport(context)
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 

    logProfileRow: function(context, title)
    {
        var row = Firebug.Console.openGroup(title, context, "profile",
            Firebug.Profiler.ProfileCaption, true, null, true);
        setClass(row, "profilerRunning");
        
        Firebug.Console.closeGroup(context, true);
        
        return row;        
    },
    
    logProfileReport: function(context)
    {
        var calls = [];
        var totalCalls = 0;
        var totalTime = 0;
        
        updateScriptFiles(context);
        var sourceFileMap = context.sourceFileMap;
        
        jsd.enumerateScripts({enumerateScript: function(script)
        {
            if (script.callCount)
            {
                url = normalizeURL(script.fileName);
                if (url in sourceFileMap)
                {
                    var call = new ProfileCall(script, context, script.callCount, script.totalExecutionTime,
                        script.totalOwnExecutionTime, script.minExecutionTime, script.maxExecutionTime);
                    calls.push(call);
                    
                    totalCalls += script.callCount;
                    totalTime += script.totalOwnExecutionTime;
                    
                    script.clearProfileData();
                }
            }
        }});

        for (var i = 0; i < calls.length; ++i)
            calls[i].percent = Math.round((calls[i].totalOwnTime/totalTime) * 100 * 100) / 100;
        
        calls.sort(function(a, b)
        {
           return a.totalOwnTime < b.totalOwnTime ? 1 : -1;
        });

        totalTime = Math.round(totalTime * 1000) / 1000;
        
        var groupRow = context.profileRow && context.profileRow.ownerDocument
            ? context.profileRow
            : this.logProfileRow(context, "");
        delete context.profileRow;

        removeClass(groupRow, "profilerRunning");
        
        if (totalCalls > 0)
        {            
            var captionBox = getElementByClass(groupRow, "profileCaption");
            if (!groupRow.customMessage)
                captionBox.textContent = $STR("Profile");
            var timeBox = getElementByClass(groupRow, "profileTime");
            timeBox.textContent = $STRF("ProfileTime", [totalTime, totalCalls]);

            var groupBody = groupRow.lastChild;
            var table = Firebug.Profiler.ProfileTable.tag.replace({}, groupBody);
            var tbody = table.lastChild;

            var tag = Firebug.Profiler.ProfileCall.tag;
            var insert = tag.insertRows;

            for (var i = 0; i < calls.length; ++i)
                context.throttle(insert, tag, [{object: calls[i]}, tbody]);

            context.throttle(groupRow.scrollIntoView, groupRow);
        }
        else
        {
            var captionBox = getElementByClass(groupRow, "profileCaption");
            captionBox.textContent = $STR("NothingToProfile");
        }
    }
});

// ************************************************************************************************

Firebug.Profiler.ProfileTable = domplate(
{
    tag:
        TABLE({class: "profileTable", cellspacing: 0, cellpadding: 0, width: "100%"},
            TBODY(
                TR({class: "headerRow", onclick: "$onClick"},
                    TD({class: "headerCell alphaValue"},
                        DIV({class: "headerCellBox"},
                            $STR("Function")
                        )
                    ),
                    TD({class: "headerCell"},
                        DIV({class: "headerCellBox", title: $STR("CallsHeaderTooltip")},
                            $STR("Calls")
                        )
                    ),
                    TD({class: "headerCell headerSorted"},
                        DIV({class: "headerCellBox", title: $STR("PercentTooltip")},
                            $STR("Percent")
                        )
                    ),
                    TD({class: "headerCell"},
                        DIV({class: "headerCellBox", title: $STR("OwnTimeHeaderTooltip")},
                            $STR("OwnTime")
                        )
                    ),
                    TD({class: "headerCell"},
                        DIV({class: "headerCellBox", title: $STR("TimeHeaderTooltip")},
                            $STR("Time")
                        )
                    ),
                    TD({class: "headerCell"},
                        DIV({class: "headerCellBox", title: $STR("AvgHeaderTooltip")},
                            $STR("Avg")
                        )
                    ),
                    TD({class: "headerCell"},
                        DIV({class: "headerCellBox", title: $STR("MinHeaderTooltip")},
                            $STR("Min")
                        )
                    ),
                    TD({class: "headerCell"},
                        DIV({class: "headerCellBox", title: $STR("MaxHeaderTooltip")},
                            $STR("Max")
                        )
                    ),
                    TD({class: "headerCell alphaValue"},
                        DIV({class: "headerCellBox"},
                            $STR("File")
                        )
                    )
                )
            )
        ),

    onClick: function(event)
    {
        var table = getAncestorByClass(event.target, "profileTable");
        var header = getAncestorByClass(event.target, "headerCell");
        if (!header)
            return;
        
        var numerical = !hasClass(header, "alphaValue");
        
        var colIndex = 0;
        for (header = header.previousSibling; header; header = header.previousSibling)
            ++colIndex;
        
        this.sort(table, colIndex, numerical);
    },
    
    sort: function(table, colIndex, numerical)
    {
        var tbody = table.lastChild;
                    
        var values = [];
        for (var row = tbody.childNodes[1]; row; row = row.nextSibling)
        {
            var cell = row.childNodes[colIndex];
            var value = numerical ? parseFloat(cell.textContent) : cell.textContent;
            values.push({row: row, value: value});
        }
        
        values.sort(function(a, b) { return a.value < b.value ? -1 : 1; });

        var headerRow = tbody.firstChild;
        var headerSorted = getChildByClass(headerRow, "headerSorted");
        removeClass(headerSorted, "headerSorted");

        var header = headerRow.childNodes[colIndex];
        setClass(header, "headerSorted");

        if (!header.sorted || header.sorted == 1)
        {
            removeClass(header, "sortedDescending");
            setClass(header, "sortedAscending");

            header.sorted = -1;
            
            for (var i = 0; i < values.length; ++i)
                tbody.appendChild(values[i].row);
        }
        else
        {
            removeClass(header, "sortedAscending");
            setClass(header, "sortedDescending");

            header.sorted = 1;
            
            for (var i = values.length-1; i >= 0; --i)
                tbody.appendChild(values[i].row);
        }
    }
});

// ************************************************************************************************

Firebug.Profiler.ProfileCaption = domplate(Firebug.Rep,
{
    tag:
        SPAN({class: "profileTitle"},
            SPAN({class: "profileCaption"}, "$objects"),
            " ",
            SPAN({class: "profileTime"}, "")
        )
});

// ************************************************************************************************

Firebug.Profiler.ProfileCall = domplate(Firebug.Rep,
{
    tag: 
        TR(
            TD(
                FirebugReps.OBJECTLINK("$object|getCallName")
            ),
            TD("$object.callCount"),
            TD("$object.percent%"),
            TD("$object.totalOwnTime|roundTime\\ms"),
            TD("$object.totalTime|roundTime\\ms"),
            TD("$object|avgTime|roundTime\\ms"),
            TD("$object.minTime|roundTime\\ms"),
            TD("$object.maxTime|roundTime\\ms"),
            TD({class: "linkCell"},
                TAG(FirebugReps.SourceLink.tag, {object: "$object|getSourceLink"})
            )
        ),

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 

    getCallName: function(call)
    {
        return getFunctionName(call.script, call.context);
    },
    
    avgTime: function(call)
    {
        return call.totalTime / call.callCount;
    },
    
    getSourceLink: function(call)
    {
        var url = normalizeURL(call.script.fileName);
        return new SourceLink(url, call.script.baseLineNumber, "js");
    },

    roundTime: function(ms)
    {
        return Math.round(ms * 1000) / 1000;
    },
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 

    className: "profile",

    supportsObject: function(object)
    {
        return object instanceof ProfileCall;
    },
    
    inspectObject: function(call, context)
    {
        var sourceLink = this.getSourceLink(call);
        context.chrome.select(sourceLink);
    },
    
    getTooltip: function(call)
    {
        var fn = call.script.functionObject.getWrappedValue();
        return FirebugReps.Func.getTooltip(fn);
    },
    
    getContextMenuItems: function(call, target, context)
    {
        var fn = call.script.functionObject.getWrappedValue();
        return FirebugReps.Func.getContextMenuItems(fn, call.script, context);
    }
});

// ************************************************************************************************

function ProfileCall(script, context, callCount, totalTime, totalOwnTime, minTime, maxTime)
{
    this.script = script;
    this.context = context;
    this.callCount = callCount;
    this.totalTime = totalTime;
    this.totalOwnTime = totalOwnTime;
    this.minTime = minTime;
    this.maxTime = maxTime;
}

// ************************************************************************************************

Firebug.registerModule(Firebug.Profiler);
Firebug.registerRep(Firebug.Profiler.ProfileCall);

// ************************************************************************************************
    
}});
