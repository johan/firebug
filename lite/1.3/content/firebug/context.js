FBL.ns(function() { with (FBL) {
// ************************************************************************************************

//************************************************************************************************
// Inspector Module
Firebug.Context = function(window){
  
    this.window = window.window;
    this.document = window.document;
  
};

Firebug.Context.prototype =
{  
  
    //* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Window Methods
    
    getWindowSize: function()
    {
        var width=0, height=0, el;
        
        if (typeof window.innerWidth == 'number')
        {
            width = window.innerWidth;
            height = window.innerHeight;
        }
        else if ((el=document.documentElement) && (el.clientHeight || el.clientWidth))
        {
            width = el.clientWidth;
            height = el.clientHeight;
        }
        else if ((el=document.body) && (el.clientHeight || el.clientWidth))
        {
            width = el.clientWidth;
            height = el.clientHeight;
        }
        
        return {width: width, height: height};
    },
    
    getWindowScrollSize: function()
    {
        var width=0, height=0, el;

        if (!isIEQuiksMode && (el=document.documentElement) && 
           (el.scrollHeight || el.scrollWidth))
        {
            width = el.scrollWidth;
            height = el.scrollHeight;
        }
        else if ((el=document.body) && (el.scrollHeight || el.scrollWidth))
        {
            width = el.scrollWidth;
            height = el.scrollHeight;
        }
        
        return {width: width, height: height};
    },
    
    getWindowScrollPosition: function()
    {
        var top=0, left=0, el;
        
        if(typeof window.pageYOffset == 'number')
        {
            top = window.pageYOffset;
            left = window.pageXOffset;
        }
        else if((el=document.body) && (el.scrollTop || el.scrollLeft))
        {
            top = el.scrollTop;
            left = el.scrollLeft;
        }
        else if((el=document.documentElement) && (el.scrollTop || el.scrollLeft))
        {
            top = el.scrollTop;
            left = el.scrollLeft;
        }
        
        return {top:top, left:left};
    },
    

    //* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Element Methods

    getElementFromPoint: function(x, y)
    {
        if (isOpera || isSafari)
        {
            var scroll = this.getWindowScrollPosition();
            return document.elementFromPoint(x + scroll.left, y + scroll.top);
        }
        else
            return document.elementFromPoint(x, y);
    },
    
    getElementPosition: function(el)
    {
        var left = 0
        var top = 0;
        
        if (el.offsetParent)
        {
            do
            {
                left += el.offsetLeft;
                top += el.offsetTop;
            }
            while (el = el.offsetParent);
        }
        return {left:left, top:top};      
    },
    
    getElementBox: function(el)
    {
        var result = {};
        
        if (el.getBoundingClientRect)
        {
            var rect = el.getBoundingClientRect();
            
            // fix IE problem with offset when not in fullscreen mode
            var offset = isIE ? document.body.clientTop || document.documentElement.clientTop: 0;
            
            var scroll = this.getWindowScrollPosition();
            
            result.top = Math.round(rect.top - offset + scroll.top);
            result.left = Math.round(rect.left - offset + scroll.left);
            result.height = Math.round(rect.bottom - rect.top);
            result.width = Math.round(rect.right - rect.left);
        }
        else 
        {
            var position = this.getElementPosition(el);
            
            result.top = position.top;
            result.left = position.left;
            result.height = el.offsetHeight;
            result.width = el.offsetWidth;
        }
        
        return result;
    },
    

    //* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Measurement Methods
    
    getMeasurement: function(el, name)
    {
        var result = {value: 0, unit: "px"};
        
        var cssValue = this.getCSS(el, name);
        if (!cssValue) return result;
        if (cssValue.toLowerCase() == "auto") return result;
        
        var reMeasure = /(\d+\.?\d*)(.*)/;
        var m = cssValue.match(reMeasure);
        
        if (m)
        {
            result.value = m[1]-0;
            result.unit = m[2].toLowerCase();
        }
        
        return result;        
    },
    
    getMeasurementInPixels: function(el, name)
    {
        if (!el) return null;
        
        var m = this.getMeasurement(el, name);
        var value = m.value;
        var unit = m.unit;
        
        if (unit == "px")
            return value;
          
        else if (unit == "pt")
            return this.pointsToPixels(name, value);
          
        if (unit == "em")
            return this.emToPixels(el, value);
          
        else if (unit == "%")
            return this.percentToPixels(el, value);
    },

    getMeasurementBox: function(el, name)
    {
        var sufixes = ["Top", "Left", "Bottom", "Right"];
        var result = [];
        
        for(var i=0, sufix; sufix=sufixes[i]; i++)
            result[i] = Math.round(this.getMeasurementInPixels(el, name + sufix));
        
        return {top:result[0], left:result[1], bottom:result[2], right:result[3]};
    }, 
    
    getFontSizeInPixels: function(el)
    {
        var size = this.getMeasurement(el, "fontSize");
        
        if (size.unit == "px") return size.value;
        
        // get font size, the dirty way
        var computeDirtyFontSize = function(el, calibration)
        {
            var div = document.createElement("div");
            var divStyle = offscreenStyle;

            if (calibration)
                divStyle +=  " font-size:"+calibration+"px;";
            
            div.style.cssText = divStyle;
            div.innerHTML = "A";
            el.appendChild(div);
            
            var value = div.offsetHeight;
            el.removeChild(div);
            return value;
        }
        
        // Calibration fails in some environments, so we're using a static value
        // based in the test case result.
        var rate = 200 / 225;
        //var calibrationBase = 200;
        //var calibrationValue = computeDirtyFontSize(el, calibrationBase);
        //var rate = calibrationBase / calibrationValue;
        
        var value = computeDirtyFontSize(el);

        return value * rate;
    },
    
    
    //* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Unit Funtions
  
    pointsToPixels: function(name, value)
    {
        var axis = /Top$|Bottom$/.test(name) ? "y" : "x";
        
        var result = value * pixelsPerInch[axis] / 72;
        
        return returnFloat ? result : Math.round(result);
    },
    
    emToPixels: function(el, value)
    {
        if (!el) return null;
        
        var fontSize = this.getFontSizeInPixels(el);
        
        return Math.round(value * fontSize);
    },
    
    exToPixels: function(el, value)
    {
        if (!el) return null;
        
        // get ex value, the dirty way
        var div = document.createElement("div");
        div.style.cssText = offscreenStyle + "width:"+value + "ex;";
        
        el.appendChild(div);
        var value = div.offsetWidth;
        el.removeChild(div);
        
        return value;
    },
      
    percentToPixels: function(el, value)
    {
        if (!el) return null;
        
        // get % value, the dirty way
        var div = document.createElement("div");
        div.style.cssText = offscreenStyle + "width:"+value + "%;";
        
        el.appendChild(div);
        var value = div.offsetWidth;
        el.removeChild(div);
        
        return value;
    },
    
    //* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    
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

//************************************************************************************************
// Inspector Internals


//* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
// Shared variables

FBL.offlineFragment = null;


//* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
// Internal variables

var boxModelVisible = false;

var pixelsPerInch, boxModel, boxModelStyle, boxMargin, boxMarginStyle, 
boxPadding, boxPaddingStyle, boxContent, boxContentStyle;

//* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

var resetStyle = "margin:0; padding:0; border:0; position:absolute; overflow:hidden; display:block;";
var offscreenStyle = resetStyle + "top:-1234px; left:-1234px;";

var inspectStyle = resetStyle + "z-index: 2147483500;";
var inspectFrameStyle = resetStyle + "z-index: 2147483550; top:0; left:0; background:url(http://pedrosimonetti.googlepages.com/pixel_transparent.gif);";
//var inspectFrameStyle = resetStyle + "z-index: 2147483550; top: 0; left: 0; background: #ff0; opacity: 0.1; _filter: alpha(opacity=10);";

var inspectModelStyle = inspectStyle + "opacity:0.8; _filter:alpha(opacity=80);";
var inspectMarginStyle = inspectStyle + "background: #EDFF64; height:100%; width:100%;";
var inspectPaddingStyle = inspectStyle + "background: SlateBlue;";
var inspectContentStyle = inspectStyle + "background: SkyBlue;";


var outlineStyle = { 
    fbHorizontalLine: "background: #3875D7; height: 2px;",
    fbVerticalLine: "background: #3875D7; width: 2px;"
}

//* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

var lastInspecting = 0;
var fbInspectFrame = null;
var fbBtnInspect = null;


//* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

var outlineVisible = false;
var outlineElements = {};
var outline = {
  "fbOutlineT": "fbHorizontalLine",
  "fbOutlineL": "fbVerticalLine",
  "fbOutlineB": "fbHorizontalLine",
  "fbOutlineR": "fbVerticalLine"
};


//************************************************************************************************
// Measurement Functions

var calculatePixelsPerInch = function calculatePixelsPerInch()
{
    var inch = document.createElement("div");
    inch.style.cssText = resetStyle + "width:1in; height:1in; position:absolute; top:-1234px; left:-1234px;";
    document.body.appendChild(inch);
    
    pixelsPerInch = {
        x: inch.offsetWidth,
        y: inch.offsetHeight
    };
    
    document.body.removeChild(inch);
};




//************************************************************************************************
// Section




// ************************************************************************************************
}});