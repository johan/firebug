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

const nsIIOService = CI("nsIIOService");
const nsIRequest = CI("nsIRequest");
const nsICachingChannel = CI("nsICachingChannel");
const nsIScriptableInputStream = CI("nsIScriptableInputStream");
const nsIUploadChannel = CI("nsIUploadChannel");

const IOService = CC("@mozilla.org/network/io-service;1");
const ScriptableInputStream = CC("@mozilla.org/scriptableinputstream;1");

const LOAD_FROM_CACHE = nsIRequest.LOAD_FROM_CACHE;
const LOAD_BYPASS_LOCAL_CACHE_IF_BUSY = nsICachingChannel.LOAD_BYPASS_LOCAL_CACHE_IF_BUSY;

const NS_BINDING_ABORTED = 0x804b0002;

// ************************************************************************************************

top.SourceCache = function(context)
{
    this.context = context;
    this.cache = {};
};

top.SourceCache.prototype =
{
    loadText: function(url)
    {
        var lines = this.load(url);
        return lines ? lines.join("\n") : null;
    },
    
    load: function(url)
    {
        if (url in this.cache)
            return this.cache[url];
        
        var d = FBL.reDataURL.exec(url);
        if (d) 
        {
        	var src = url.substring(FBL.reDataURL.lastIndex); 
        	var data = decodeURIComponent(src);
        	var lines = data.split(/\r\n|\r|\n/);
            this.cache[url] = lines;
            
            return lines;
        }
		
		var j = FBL.reJavascript.exec(url);
		if (j) 
		{
			var src = url.substring(FBL.reJavascript.lastIndex);
			var lines = src.split(/\r\n|\r|\n/);
            this.cache[url] = lines;
            
            return lines;
		}
        
        var charset = this.context.window.document.characterSet;
        
        var ioService = IOService.getService(nsIIOService);

        var channel;
        try
        {
            channel = ioService.newChannel(url, null, null);
            channel.loadFlags |= LOAD_FROM_CACHE | LOAD_BYPASS_LOCAL_CACHE_IF_BUSY;
        }
        catch (exc)
        {
			if (FBL.DBG_CACHE) FBL.sysout("sourceCache for window="+this.context.window.location.href+" error: \n"+FBL.getStackDump()+"\n");
			if (FBL.DBG_CACHE) FBL.dumpProperties(this.cache);
        	ERROR("sourceCache.load fails newChannel for url="+url+ " cause:"+exc+"\n");
            return;
        }

        if (url == this.context.browser.contentWindow.location.href)
        {
            if (channel instanceof nsIUploadChannel)
            {
                var postData = getPostStream(this.context);
                var uploadChannel = QI(channel, nsIUploadChannel);
                uploadChannel.setUploadStream(postData, "", -1);
            }
            
            if (channel instanceof nsICachingChannel)
            {
                var cacheChannel = QI(channel, nsICachingChannel);
                cacheChannel.cacheKey = getCacheKey(this.context);
            }
        }
        
        var stream;
        try
        {
            stream = channel.open();
        }
        catch (exc)
        {
        	ERROR("sourceCache.load fails channel.open for url="+url+ " cause:"+exc+"\n");
            return;
        }
        
        try
        {
            var data = readFromStream(stream, charset);
            var lines = data.split(/\r\n|\r|\n/);
            this.cache[url] = lines;
            return lines;
        }
        catch (exc)
        {
            stream.close();
        }
    },
    
    loadAsync: function(url, cb)
    {
        if (url in this.cache)
        {
            cb(this.cache[url], url);
            return;
        }

        var ioService = IOService.getService(nsIIOService);

        var channel = ioService.newChannel(url, null, null);
        channel.loadFlags |= LOAD_FROM_CACHE | LOAD_BYPASS_LOCAL_CACHE_IF_BUSY;

        var listener = new StreamListener(url, this, cb);
        channel.asyncOpen(listener, null);            
    }, 
    
    store: function(url, text)
    {
		if (FBL.DBG_CACHE) FBL.sysout("sourceCache for window="+this.context.window.location.href+" store url="+url+"\n");
        var lines = splitLines(text);
        return this.cache[url] = lines;
    },
    
    invalidate: function(url)
    {
        delete this.cache[url];
    },
    
    getLine: function(url, lineNo)
    {
        var lines = this.load(url);
        return lines ? lines[lineNo-1] : null;
    },

    getLineAsync: function(url, lineNo, cb)
    {
        if (url in this.cache)
            cb(this.cache[url][lineNo-1], url, lineNo);
        else
        {
            function loader(lines, url)
            {      
                cb(lines[lineNo-1], url, lineNo);
            }

            this.loadAsync(url, loader);
        }
    }    
};

// ************************************************************************************************

function StreamListener(url, cache, cb)
{
    this.url = url;
    this.cache = cache;
    this.cb = cb;
    this.data = [];
}

StreamListener.prototype =
{
    onStartRequest: function(request, context)
    {
    },

    onStopRequest: function(request, context, status)
    {
        this.done = true;
        
        if (status != NS_BINDING_ABORTED)
        {
            var data = this.data.join("");
            var lines = this.cache.store(this.url, data);
            this.cb(lines, this.url, status);
        }
    },

    onDataAvailable: function(request, context, inStr, sourceOffset, count)
    {
        var sis = ScriptableInputStream.createInstance(nsIScriptableInputStream);
        sis.init(inStr);
        this.data.push(sis.read(count));
    }
};

// ************************************************************************************************

function getPostStream(context)
{
    try
    {
        var webNav = context.browser.webNavigation;
        var descriptor = QI(webNav, CI("nsIWebPageDescriptor")).currentDescriptor;
        var entry = QI(descriptor, CI("nsISHEntry"));
        
        // Seek to the beginning, or it will probably start reading at the end
        var postStream = QI(entry.postData, CI("nsISeekableStream"));
        postStream.seek(0, 0);
        
        return postStream;
     }
     catch (exc)
     {
     }
}

function getCacheKey(context)
{
    try
    {
        var webNav = context.browser.webNavigation;
        var descriptor = QI(webNav, CI("nsIWebPageDescriptor")).currentDescriptor;
        var entry = QI(descriptor, CI("nsISHEntry"));
        return entry.cacheKey;
     }
     catch (exc)
     {
     }
}

// ************************************************************************************************
    
}});
