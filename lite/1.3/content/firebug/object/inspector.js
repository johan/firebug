FBL.ns(function() { with (FBL) {
// ************************************************************************************************

/*============================================================================
  inspector
*===========================================================================*/
var pixelsPerInch, boxModel, boxModelStyle, boxMargin, boxMarginStyle, 
  boxPadding, boxPaddingStyle, boxContent, boxContentStyle, offlineFragment;

var IEStantandMode = document.all && document.compatMode == "CSS1Compat";
var resetStyle = "margin:0; padding:0; border: 0; position:absolute; overflow:hidden; display:block; z-index: 2147483500;";
var boxModelVisible = false;


var fbBtnInspect = null;
var outlineVisible = false;
var outlineElements = {};
var outline = {
    "fbOutlineT": "fbHorizontalLine",
    "fbOutlineL": "fbVerticalLine",
    "fbOutlineB": "fbHorizontalLine",
    "fbOutlineR": "fbVerticalLine"
};
var outlineStyle = { 
    fbHorizontalLine: "background: #3875D7; height: 2px;",
    fbVerticalLine: "background: #3875D7; width: 2px;"
}
  


FBL.offlineFragment = null;

Firebug.Inspector =
{  
  
    onReady: function()
    {
        offlineFragment = document.createDocumentFragment();
        this.calculatePixelsPerInch();
        this.createBoxModelInspector();
        this.createOutlineInspector();
    },
    
    onChromeReady: function()
    {
        fbBtnInspect = UI$("fbBtnInspect");
    },    
  
    startInspecting: function()
    {
        fbBtnInspect.href = "javascript:FB.stopInspecting(this)";
        fbBtnInspect.className = "fbBtnInspectActive";
        
        addEvent(document, "mousemove", Firebug.Inspector.onInspecting)
        addEvent(document, "click", Firebug.Inspector.onInspectingClick)
    },
    
    stopInspecting: function()
    {
        fbBtnInspect.href = "javascript:FB.startInspecting(this)";
        fbBtnInspect.className = "";
        
        if (outlineVisible) this.hideOutline();
        removeEvent(document, "mousemove", Firebug.Inspector.onInspecting)
        removeEvent(document, "click", Firebug.Inspector.onInspectingClick)
    },
    
    onInspectingClick: function(e)
    {
        e = e || event || window;
        var targ;
        
        if (e.target) targ = e.target;
        else if (e.srcElement) targ = e.srcElement;
        if (targ.nodeType == 3) // defeat Safari bug
            targ = targ.parentNode;
        
        Firebug.Console.log(targ);
        Firebug.Inspector.stopInspecting();
        
        cancelEvent(e, true);
        return false;
    },
    
    onInspecting: function(e)
    {
        e = e || event || window;
        var targ;
        
        if (e.target) targ = e.target;
        else if (e.srcElement) targ = e.srcElement;
        if (targ.nodeType == 3) // defeat Safari bug
            targ = targ.parentNode;
            
        var id = targ.id;
        if (id && /^fbOutline\w$/.test(id)) return;
        
        var nodeName = targ.nodeName.toLowerCase();
        if (" html head body ".indexOf(" "+nodeName+" ") != -1) { 
          return;
        }
        
        //Firebug.Console.log(targ);

        Firebug.Inspector.drawOutline(targ);      
    },
    
    createOutlineInspector: function()
    {
      for (var name in outline)
      {
          var el = outlineElements[name] = document.createElement("div");
          el.id = name;
          el.style.cssText = resetStyle + outlineStyle[outline[name]];
          offlineFragment.appendChild(el);
      }
    },
    
    
    drawOutline: function(el)
    {
        if (!outlineVisible) this.showOutline();
        
        if (isSafari)
        {
            var top = el.offsetTop;
            var left = el.offsetLeft;
            var height = el.offsetHeight;
            var width = el.offsetWidth;
        }
        else 
        {
            var rect = el.getBoundingClientRect();
            
            // fix IE problem with offset when not in fullscreen mode
            var offset = document.all ? document.body.clientTop || document.documentElement.clientTop: 0;
      
            var top = Math.round(rect.top - offset);
            var left = Math.round(rect.left - offset);
            var height = Math.round(rect.bottom - top - offset);
            var width = Math.round(rect.right - left - offset);
        }
        
        var border = 2;
        
        var els = outlineElements;
        
        els.fbOutlineT.style.top = Math.max(top-border, 0);
        els.fbOutlineT.style.left = left;
        els.fbOutlineT.style.width = width;
  
        els.fbOutlineB.style.top = top+height;
        els.fbOutlineB.style.left = left;
        els.fbOutlineB.style.width = width;
        
        els.fbOutlineL.style.top = Math.max(top-border, 0);
        els.fbOutlineL.style.left = Math.max(left-border, 0);
        els.fbOutlineL.style.height = Math.min(height+2*border, document.body.scrollHeight-2*border);

        els.fbOutlineR.style.top = Math.max(top-border, 0);
        els.fbOutlineR.style.left = Math.min(left+width, document.body.scrollWidth-border);
        els.fbOutlineR.style.height = Math.min(height+2*border, document.body.scrollHeight-2*border);
    },
    
    hideOutline: function()
    {
        for (var name in outline)
            offlineFragment.appendChild(outlineElements[name]);

        outlineVisible = false;
    },
    
    showOutline: function()
    {
        for (var name in outline)
            document.body.appendChild(outlineElements[name]);
        
        outlineVisible = true;
    },
  
    createBoxModelInspector: function()
    {
        boxModel = document.createElement("div");
        boxModel.id = "fbBoxModel";
        boxModelStyle = boxModel.style;
        boxModelStyle.cssText = resetStyle + "opacity:0.8; _filter:alpha(opacity=80);";
        
        boxMargin = document.createElement("div");
        boxMargin.id = "fbBoxMargin";
        boxMarginStyle = boxMargin.style;
        boxMarginStyle.cssText = resetStyle + "background: #EDFF64; height:100%; width:100%;";
        boxModel.appendChild(boxMargin);
        
        boxPadding = document.createElement("div");
        boxPadding.id = "fbBoxPadding";
        boxPaddingStyle = boxPadding.style;
        boxPaddingStyle.cssText = resetStyle + "background: SlateBlue;";
        boxModel.appendChild(boxPadding);
        
        boxContent = document.createElement("div");
        boxContent.id = "fbBoxContent";
        boxContentStyle = boxContent.style;
        boxContentStyle.cssText = resetStyle + "background: SkyBlue;";
        boxModel.appendChild(boxContent);
        
        offlineFragment.appendChild(boxModel);
    },
    
  
    drawBoxModel: function(el)
    {
        if (!boxModelVisible) this.showBoxModel();
        
        var top = this.getOffset(el, "offsetTop");
        var left = this.getOffset(el, "offsetLeft");
        var height = el.offsetHeight;
        var width = el.offsetWidth;
        
        var margin = this.getCSSMeasurementBox(el, "margin");
        var padding = this.getCSSMeasurementBox(el, "padding");
    
        boxModelStyle.top = top - margin.top;
        boxModelStyle.left = left - margin.left;
        boxModelStyle.height = height + margin.top + margin.bottom;
        boxModelStyle.width = width + margin.left + margin.right;
      
        boxPaddingStyle.top = margin.top;
        boxPaddingStyle.left = margin.left;
        boxPaddingStyle.height = height;
        boxPaddingStyle.width = width;
      
        boxContentStyle.top = margin.top + padding.top;
        boxContentStyle.left = margin.left + padding.left;
        boxContentStyle.height = height - padding.top - padding.bottom;
        boxContentStyle.width = width - padding.left - padding.right;
    },
    
  
    hideBoxModel: function()
    {  
        offlineFragment.appendChild(boxModel);
        boxModelVisible = false;
    },
    
  
    showBoxModel: function()
    {
        document.body.appendChild(boxModel);
        boxModelVisible = true;
    },
     
  
    calculatePixelsPerInch: function()
    {
        var inch = document.createElement("div");
        inch.style.cssText = resetStyle + "width:1in; height:1in; visibility: hidden;";
        document.body.appendChild(inch);
        
        pixelsPerInch = {
            x: inch.offsetWidth,
            y: inch.offsetHeight
        };
        
        document.body.removeChild(inch);
    },
    
    
    /**
     * options.axis
     * options.floatValue
     */
    getCSSMeasurementInPixels: function(el, name, options)
    {
        if (!el) return null;
        
        options = options || {axis: "x", floatValue: false};
    
        var cssValue = this.getCSS(el, name);
        
        if(!cssValue) return 0;
        
        var reMeasure = /(\d+\.?\d*)(.*)/;
        var m = cssValue.match(reMeasure);
        
        if (m)
        {
        
            var value = m[1]-0;
            var unit = m[2].toLowerCase();
            
            if (unit == "px")
                return value;
              
            else if (unit == "pt")
                return this.pointsToPixels(value, options.axis, options.floatValue);
              
            if (unit == "em")
                return this.emToPixels(el, value);
              
            else if (unit == "%")
                return this.percentToPixels(el, value, options.axis);
          
        } else
            return 0;
    },
    
  
    getOffset: function(el, name)
    {
        if (!el) return 0;
        
        var isVertical = /Top|Bottom$/.test(name);
    
        // When in "Standard" Compliance mode, IE6 doesn't count the document
        // body margin when calculating offsetTop/offsetLeft, so we need to 
        // calculate it manually
        if (IEStantandMode)
            var offset = isVertical ? 
                this.getCSSMeasurementInPixels(document.body, "marginTop") :
                this.getCSSMeasurementInPixels(document.body, "marginLeft");
        else
            var offset = 0;
    
        var value = el[name];
        
        var display = this.getCSS(el, "display");
        var position = this.getCSS(el, "position");
        
        if (!document.all || display != "inline" && position != "relative")
            return offset + value;
        else
            return value + this.getOffset(el.parentNode, name);  
    },
    
    
    getCSSMeasurementBox: function(el, name)
    {
        var sufixes = ["Top", "Left", "Bottom", "Right"];
        var result = [];
        
        if (document.all)
        {
            var propName, cssValue;
            var autoMargin = null;
            
            for(var i=0, sufix; sufix=sufixes[i]; i++)
            {
                propName = name + sufix;
                
                cssValue = el.currentStyle[propName] || el.style[propName]; 
                
                if (cssValue == "auto")
                {
                    autoMargin = autoMargin || this.getCSSAutoMarginBox(el);
                    result[i] = autoMargin[sufix.toLowerCase()];
                }
                else
                    result[i] = this.getCSSMeasurementInPixels(el, propName);
                      
            }
        
        }
        else
        {
            for(var i=0, sufix; sufix=sufixes[i]; i++)
                result[i] = this.getCSSMeasurementInPixels(el, name + sufix);
        }
        
        return {top:result[0], left:result[1], bottom:result[2], right:result[3]};
    }, 
    
  
    getCSSAutoMarginBox: function(el)
    {
        if (isIE && " meta title input script link ".indexOf(" "+el.nodeName.toLowerCase()+" ") != -1)
            return {top:0, left:0, bottom:0, right:0};
        
        var box = document.createElement("div");
        box.style.cssText = "margin:0; padding:1px; border: 0; position:static; overflow:hidden; visibility: hidden;";
        
        var clone = el.cloneNode(false);
        var text = document.createTextNode("&nbsp;");
        clone.appendChild(text);
        
        box.appendChild(clone);
    
        document.body.appendChild(box);
        
        var marginTop = clone.offsetTop - box.offsetTop - 1;
        var marginBottom = box.offsetHeight - clone.offsetHeight - 2 - marginTop;
        
        var marginLeft = clone.offsetLeft - box.offsetLeft - 1;
        var marginRight = box.offsetWidth - clone.offsetWidth - 2 - marginLeft;
        
        document.body.removeChild(box);
        
        return {top:marginTop, left:marginLeft, bottom:marginBottom, right:marginRight};
    },
    
  
    pointsToPixels: function(value, axis, returnFloat)
    {
        axis = axis || "x";
        
        var result = value * pixelsPerInch[axis] / 72;
        
        return returnFloat ? result : Math.round(result);
    },
      
    
    emToPixels: function(el, value)
    {
        if (!el) return null;
        
        var fontSize = this.getCSSMeasurementInPixels(el, "fontSize");
        
        return Math.round(value * fontSize);
    },
    
    
    exToPixels: function(el, value)
    {
        if (!el) return null;
        
        // get ex value, the dirty way
        var div = document.createElement("div");
        div.style.position = "absolute";
        div.style.width = value + "ex";
        div.style.visibility = "hidden";
        
        document.body.appendChild(div);
        
        var value = div.offsetWidth;
        
        document.body.removeChild(div);
        
        return value;
    },
    
  
    percentToPixels: function(el, value)
    {
        if (!el) return null;
        
        // TODO:
    },
    
  
    getCSS: isIE ? function(el, name)
    {
        return el.currentStyle[name] || el.style[name] || undefined;
    }
    : function(el, name)
    {
        return document.defaultView.getComputedStyle(el,null)[name] 
            || el.style[name] || undefined;
    }

};

// ************************************************************************************************
}});