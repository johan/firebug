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

const maxWidth = 100, maxHeight = 80;
const infoTipMargin = 10;
const infoTipWindowPadding = 25;

// ************************************************************************************************

Firebug.InfoTip = extend(Firebug.Module,
{
    tags: domplate(
    {
        infoTipTag: DIV({class: "infoTip"}),
        
        colorTag:
            DIV({style: "background: $rgbValue; width: 100px; height: 40px"}, "&nbsp;"),

        imgTag:
            DIV({class: "infoTipImageBox infoTipLoading"},
                IMG({class: "infoTipImage", src: "$urlValue", repeat: "$repeat",
                    onload: "$onLoadImage"}),
                IMG({class: "infoTipBgImage", collapsed: true, src: "blank.gif"}),
                DIV({class: "infoTipCaption"})
            ),

        onLoadImage: function(event)
        {
            var img = event.currentTarget;
            var bgImg = img.nextSibling;
            if (!bgImg)
                return; // Sometimes gets called after element is dead
            
            var caption = bgImg.nextSibling;
            var innerBox = img.parentNode;

            var w = img.naturalWidth, h = img.naturalHeight;
            var repeat = img.getAttribute("repeat");

            if (repeat == "repeat-x" || (w == 1 && h > 1))
            {
                collapse(img, true);
                collapse(bgImg, false);
                bgImg.style.background = "url(" + img.src + ") repeat-x";
                bgImg.style.width = maxWidth + "px";
                if (h > maxHeight)
                    bgImg.style.height = maxHeight + "px";
                else
                    bgImg.style.height = h + "px";
            }
            else if (repeat == "repeat-y" || (h == 1 && w > 1))
            {
                collapse(img, true);
                collapse(bgImg, false);
                bgImg.style.background = "url(" + img.src + ") repeat-y";
                bgImg.style.height = maxHeight + "px";
                if (w > maxWidth)
                    bgImg.style.width = maxWidth + "px";
                else
                    bgImg.style.width = w + "px";
            }
            else if (repeat == "repeat" || (w == 1 && h == 1))
            {
                collapse(img, true);
                collapse(bgImg, false);
                bgImg.style.background = "url(" + img.src + ") repeat";
                bgImg.style.width = maxWidth + "px";
                bgImg.style.height = maxHeight + "px";
            }
            else
            {
                if (w > maxWidth || h > maxHeight)
                {
                    if (w > h)
                    {
                        img.style.width = maxWidth + "px";
                        img.style.height = Math.round((h / w) * maxWidth) + "px";
                    }
                    else
                    {
                        img.style.width = Math.round((w / h) * maxHeight) + "px";
                        img.style.height = maxHeight + "px";
                    }
                }
            }
                        
            caption.innerHTML = $STRF("Dimensions", [w, h]);
            
            removeClass(innerBox, "infoTipLoading");
        }
    }),
    
    initializeBrowser: function(browser)
    {
        browser.onInfoTipMouseOut = bind(this.onMouseOut, this, browser);
        browser.onInfoTipMouseMove = bind(this.onMouseMove, this, browser);

        var doc = browser.contentDocument;
        if (!doc)
            return;
        
        doc.addEventListener("mouseover", browser.onInfoTipMouseMove, true);
        doc.addEventListener("mouseout", browser.onInfoTipMouseOut, true);
        doc.addEventListener("mousemove", browser.onInfoTipMouseMove, true);

        return browser.infoTip = this.tags.infoTipTag.append({}, getBody(doc));
    },

    uninitializeBrowser: function(browser)
    {
        if (browser.infoTip)
        {
            var doc = browser.contentDocument;
            doc.removeEventListener("mouseover", browser.onInfoTipMouseMove, true);
            doc.removeEventListener("mouseout", browser.onInfoTipMouseOut, true);
            doc.removeEventListener("mousemove", browser.onInfoTipMouseMove, true);

            browser.infoTip.parentNode.removeChild(browser.infoTip);
            delete browser.infoTip;
            delete browser.onInfoTipMouseMove;
        }
    },
    
    showInfoTip: function(infoTip, panel, target, x, y)
    {
        if (!Firebug.showInfoTips)
            return;
                
        var scrollParent = getOverflowParent(target);
        var scrollX = x + (scrollParent ? scrollParent.scrollLeft : 0);
        
        if (panel.showInfoTip(infoTip, target, scrollX, y))
        {
            var htmlElt = infoTip.ownerDocument.documentElement;
            var panelWidth = htmlElt.clientWidth;
            var panelHeight = htmlElt.clientHeight;

            if (x+infoTip.offsetWidth+infoTipMargin > panelWidth-infoTipWindowPadding)
            {
                infoTip.style.left = "auto";
                infoTip.style.right = ((panelWidth-x)+infoTipMargin) + "px";
            }
            else
            {
                infoTip.style.left = (x+infoTipMargin) + "px";
                infoTip.style.right = "auto";
            }

            if (y+infoTip.offsetHeight+infoTipMargin > panelHeight)
            {
                infoTip.style.top = "auto";
                infoTip.style.bottom = ((panelHeight-y)+infoTipMargin) + "px";
            }
            else
            {
                infoTip.style.top = (y+infoTipMargin) + "px";
                infoTip.style.bottom = "auto";
            }
            
            infoTip.setAttribute("active", "true");
        }
        else
            this.hideInfoTip(infoTip);
    },
    
    hideInfoTip: function(infoTip)
    {
        if (infoTip)
            infoTip.removeAttribute("active");
    },

    onMouseOut: function(event, browser)
    {
        if (!event.relatedTarget)
            this.hideInfoTip(browser.infoTip);
    },
    
    onMouseMove: function(event, browser)
    {
        if (browser.currentPanel)
        {
            var x = event.clientX, y = event.clientY;
            this.showInfoTip(browser.infoTip, browser.currentPanel, event.target, x, y);
        }
        else
            this.hideInfoTip(browser.infoTip);
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
    
    populateColorInfoTip: function(infoTip, color)
    {
        this.tags.colorTag.replace({rgbValue: color}, infoTip);
        return true;
    },
    
    populateImageInfoTip: function(infoTip, url, repeat)
    {
        if (!repeat)
            repeat = "no-repeat";
        
        this.tags.imgTag.replace({urlValue: url, repeat: repeat}, infoTip);

        return true;
    },
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
    // extends Module

    disable: function()
    {
        // XXXjoe For each browser, call uninitializeBrowser
    },
    
    showPanel: function(browser, panel)
    {
        if (panel)
        {
            var infoTip = panel.panelBrowser.infoTip;
            if (!infoTip)
                infoTip = this.initializeBrowser(panel.panelBrowser);
            this.hideInfoTip(infoTip);
        }

    },
    
    showSidePanel: function(browser, panel)
    {
        this.showPanel(browser, panel);
    }
});

// ************************************************************************************************

Firebug.registerModule(Firebug.InfoTip);

// ************************************************************************************************
    
}});
