/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

/**
 * @class Static utility class. Contains utilities used for displaying and
 *        searching a HTML tree.
 */
Firebug.HTMLLib =
{
    //* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Node Search Utilities
    //* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    /**
     * Constructs a NodeSearch instance.
     *
     * @class Class used to search a DOM tree for the given text. Will display
     *        the search results in a IO Box.
     *
     * @constructor
     * @param {String} text Text to search for
     * @param {Document} doc Document to search
     * @param {Object} panelNode Panel node containing the IO Box representing the DOM tree.
     * @param {Object} ioBox IO Box to display the search results in
     */
    NodeSearch: function(text, doc, panelNode, ioBox)
    {
        var walker = new DOMWalker(doc, doc.documentElement);
        var re = new ReversibleRegExp(text, "m");
        var matchCount = 0;

        /**
         * Finds the first match within the document.
         *
         * @param {boolean} revert true to search backward, false to search forward
         * @param {boolean} caseSensitive true to match exact case, false to ignore case
         * @return true if no more matches were found, but matches were found previously.
         */
        this.find = function(reverse, caseSensitive)
        {
            var match = this.findNextMatch(reverse, caseSensitive);
            if (match)
            {
                this.lastMatch = match;
                ++matchCount;

                var node = match.node;
                var nodeBox = this.openToNode(node, match.isValue);

                this.selectMatched(nodeBox, node, match, reverse);
            }
            else if (matchCount)
                return true;
            else
            {
                this.noMatch = true;
                dispatch([Firebug.A11yModel], 'onHTMLSearchNoMatchFound', [panelNode.ownerPanel, text]);
            }
        };

        /**
         * Resets the search to the beginning of the document.
         */
        this.reset = function()
        {
            delete this.lastMatch;
            delete this.lastRange;
        };

        /**
         * Finds the next match in the document.
         *
         * The return value is an object with the fields
         * - node: Node that contains the match
         * - isValue: true if the match is a match due to the value of the node, false if it is due to the name
         * - match: Regular expression result from the match
         *
         * @param {boolean} revert true to search backward, false to search forward
         * @param {boolean} caseSensitive true to match exact case, false to ignore case
         * @return Match object if found
         */
        this.findNextMatch = function(reverse, caseSensitive)
        {
            var innerMatch = this.findNextInnerMatch(reverse, caseSensitive);
            if (innerMatch)
                return innerMatch;
            else
                this.reset();

            function walkNode() { return reverse ? walker.previousNode() : walker.nextNode(); }

            var node;
            while (node = walkNode())
            {
                if (node.nodeType == Node.TEXT_NODE)
                {
                    if (Firebug.HTMLLib.isSourceElement(node.parentNode))
                        continue;
                }

                var m = this.checkNode(node, reverse, caseSensitive);
                if (m)
                    return m;
            }
        };

        /**
         * Helper util used to scan the current search result for more results
         * in the same object.
         *
         * @private
         */
        this.findNextInnerMatch = function(reverse, caseSensitive)
        {
            if (this.lastRange)
            {
                var lastMatchNode = this.lastMatch.node;
                var lastReMatch = this.lastMatch.match;
                var m = re.exec(lastReMatch.input, reverse, lastReMatch.caseSensitive, lastReMatch);
                if (m)
                {
                    return {
                        node: lastMatchNode,
                        isValue: this.lastMatch.isValue,
                        match: m
                    };
                }

                // May need to check the pair for attributes
                if (lastMatchNode.nodeType == Node.ATTRIBUTE_NODE
                        && this.lastMatch.isValue == reverse)
                {
                    return this.checkNode(lastMatchNode, reverse, caseSensitive, 1);
                }
            }
        };

        /**
         * Checks a given node for a search match.
         *
         * @private
         */
        this.checkNode = function(node, reverse, caseSensitive, firstStep)
        {
            var checkOrder;
            if (node.nodeType != Node.TEXT_NODE)
            {
                var nameCheck = { name: "nodeName", isValue: false, caseSensitive: false };
                var valueCheck = { name: "nodeValue", isValue: true, caseSensitive: caseSensitive };
                checkOrder = reverse ? [ valueCheck, nameCheck ] : [ nameCheck, valueCheck ];
            }
            else
            {
                checkOrder = [{name: "nodeValue", isValue: false, caseSensitive: caseSensitive }];
            }

            for (var i = firstStep || 0; i < checkOrder.length; i++) {
                var m = re.exec(node[checkOrder[i].name], reverse, checkOrder[i].caseSensitive);
                if (m)
                    return {
                        node: node,
                        isValue: checkOrder[i].isValue,
                        match: m
                    };
            }
        };

        /**
         * Opens the given node in the associated IO Box.
         *
         * @private
         */
        this.openToNode = function(node, isValue)
        {
            if (node.nodeType == Node.ELEMENT_NODE)
            {
                var nodeBox = ioBox.openToObject(node);
                return nodeBox.getElementsByClassName("nodeTag")[0];
            }
            else if (node.nodeType == Node.ATTRIBUTE_NODE)
            {
                var nodeBox = ioBox.openToObject(node.ownerElement);
                if (nodeBox)
                {
                    var attrNodeBox = Firebug.HTMLLib.findNodeAttrBox(nodeBox, node.nodeName);
                    if (isValue)
                        return getChildByClass(attrNodeBox, "nodeValue");
                    else
                        return getChildByClass(attrNodeBox, "nodeName");
                }
            }
            else if (node.nodeType == Node.TEXT_NODE)
            {
                var nodeBox = ioBox.openToObject(node);
                if (nodeBox)
                    return nodeBox;
                else
                {
                    var nodeBox = ioBox.openToObject(node.parentNode);
                    if (hasClass(nodeBox, "textNodeBox"))
                        nodeBox = Firebug.HTMLLib.getTextElementTextBox(nodeBox);
                    return nodeBox;
                }
            }
        };

        /**
         * Selects the search results.
         *
         * @private
         */
        this.selectMatched = function(nodeBox, node, match, reverse)
        {
            setTimeout(bindFixed(function()
            {
                var reMatch = match.match;
                this.selectNodeText(nodeBox, node, reMatch[0], reMatch.index, reverse, reMatch.caseSensitive);
                dispatch([Firebug.A11yModel], 'onHTMLSearchMatchFound', [panelNode.ownerPanel, match]);
            }, this));
        };

        /**
         * Select text node search results.
         *
         * @private
         */
        this.selectNodeText = function(nodeBox, node, text, index, reverse, caseSensitive)
        {
            var row, range;

            // If we are still inside the same node as the last search, advance the range
            // to the next substring within that node
            if (nodeBox == this.lastNodeBox)
            {
                var target = this.lastRange.startContainer;
                range = this.lastRange = panelNode.ownerDocument.createRange();
                range.setStart(target, index);
                range.setEnd(target, index+text.length);

                row = this.lastRow;
            }

            if (!range)
            {
                // Search for the first instance of the string inside the node
                function findRow(node) { return node.nodeType == 1 ? node : node.parentNode; }
                var search = new TextSearch(nodeBox, findRow);
                row = this.lastRow = search.find(text, reverse, caseSensitive);
                range = this.lastRange = search.range;
                this.lastNodeBox = nodeBox;
            }

            if (row)
            {
                var sel = panelNode.ownerDocument.defaultView.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);

                scrollIntoCenterView(row, panelNode);
                return true;
            }
        };
    },

    //* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    /**
     * Constructs a SelectorSearch instance.
     *
     * @class Class used to search a DOM tree for elements matching the given
     *        CSS selector.
     *
     * @constructor
     * @param {String} text CSS selector to search for
     * @param {Document} doc Document to search
     * @param {Object} panelNode Panel node containing the IO Box representing the DOM tree.
     * @param {Object} ioBox IO Box to display the search results in
     */
    SelectorSearch: function(text, doc, panelNode, ioBox)
    {
        this.parent = new Firebug.HTMLLib.NodeSearch(text, doc, panelNode, ioBox);

        /**
         * Finds the first match within the document.
         *
         * @param {boolean} revert true to search backward, false to search forward
         * @param {boolean} caseSensitive true to match exact case, false to ignore case
         * @return true if no more matches were found, but matches were found previously.
         */
        this.find = this.parent.find;

        /**
         * Resets the search to the beginning of the document.
         */
        this.reset = this.parent.reset;

        /**
         * Opens the given node in the associated IO Box.
         *
         * @private
         */
        this.openToNode = this.parent.openToNode;

        try
        {
            // http://dev.w3.org/2006/webapi/selectors-api/
            this.matchingNodes = doc.querySelectorAll(text);
            this.matchIndex = 0;
        }
        catch(exc)
        {
            FBTrace.sysout("SelectorSearch FAILS "+exc, exc);
        }

        /**
         * Finds the next match in the document.
         *
         * The return value is an object with the fields
         * - node: Node that contains the match
         * - isValue: true if the match is a match due to the value of the node, false if it is due to the name
         * - match: Regular expression result from the match
         *
         * @param {boolean} revert true to search backward, false to search forward
         * @param {boolean} caseSensitive true to match exact case, false to ignore case
         * @return Match object if found
         */
        this.findNextMatch = function(reverse, caseSensitive)
        {
            if (!this.matchingNodes || !this.matchingNodes.length)
                return undefined;

            if (reverse)
            {
                if (this.matchIndex > 0)
                    return { node: this.matchingNodes[this.matchIndex--], isValue: false, match: "?XX?"};
                else
                    return undefined;
            }
            else
            {
                if (this.matchIndex < this.matchingNodes.length)
                    return { node: this.matchingNodes[this.matchIndex++], isValue: false, match: "?XX?"};
                else
                    return undefined;
            }
        };

        /**
         * Selects the search results.
         *
         * @private
         */
        this.selectMatched = function(nodeBox, node, match, reverse)
        {
            setTimeout(bindFixed(function()
            {
                ioBox.select(node, true, true);
                dispatch([Firebug.A11yModel], 'onHTMLSearchMatchFound', [panelNode.ownerPanel, match]);
            }, this));
        };
    },

    //* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Node/Element Utilities
    //* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    /**
     * Determines if the given element is the source for a non-DOM resource such
     * as Javascript source or CSS definition.
     *
     * @param {Element} element Element to test
     * @return true if the element is a source element
     */
    isSourceElement: function(element)
    {
        var tag = element.localName.toLowerCase();
        return tag == "script" || tag == "link" || tag == "style"
            || (tag == "link" && element.getAttribute("rel") == "stylesheet");
    },

    /**
     * Retrieves the source URL for any external resource associated with a node.
     *
     * @param {Element} element Element to examine
     * @return URL of the external resouce.
     */
    getSourceHref: function(element)
    {
        var tag = element.localName.toLowerCase();
        if (tag == "script" && element.src)
            return element.src;
        else if (tag == "link")
            return element.href;
        else
            return null;
    },

    /**
     * Retrieves the source text for inline script and style elements.
     *
     * @param {Element} element Script or style element
     * @return Source text
     */
    getSourceText: function(element)
    {
        var tag = element.localName.toLowerCase();
        if (tag == "script" && !element.src)
            return element.textContent;
        else if (tag == "style")
            return element.textContent;
        else
            return null;
    },

    /**
     * Determines if the given element is a container element.
     *
     * @param {Element} element Element to test
     * @return True if the element is a container element.
     */
    isContainerElement: function(element)
    {
        var tag = element.localName.toLowerCase();
        switch (tag)
        {
            case "script":
            case "style":
            case "iframe":
            case "frame":
            case "tabbrowser":
            case "browser":
                return true;
            case "link":
                return element.getAttribute("rel") == "stylesheet";
        }
        return false;
    },

    /**
     * Determines if the given node has any children which are elements.
     *
     * @param {Element} element Element to test.
     * @return true if immediate children of type Element exist, false otherwise
     */
    hasNoElementChildren: function(element)
    {
        if (element.childElementCount != 0)  // FF 3.5+
            return false;

        // https://developer.mozilla.org/en/XBL/XBL_1.0_Reference/DOM_Interfaces
        if (element.ownerDocument instanceof Ci.nsIDOMDocumentXBL)
        {
            var anonChildren = element.ownerDocument.getAnonymousNodes(element);
            if (anonChildren)
            {
                for (var i = 0; i < anonChildren.length; i++)
                {
                    if (anonChildren[i].nodeType == 1)
                        return false;
                }
            }
        }
        if (FBTrace.DBG_HTML)
            FBTrace.sysout("hasNoElementChildren TRUE "+element.tagName, element);
        return true;
    },

    /**
     * Determines if the given node consists solely of whitespace text.
     *
     * @param {Node} node Node to test.
     * @return true if the node is a whitespace text node
     */
    isWhitespaceText: function(node)
    {
        if (node instanceof HTMLAppletElement)
            return false;
        return node.nodeType == 3 && isWhitespace(node.nodeValue);
    },

    /**
     * Determines if a given element is empty. When the
     * {@link Firebug#showWhitespaceNodes} parameter is true, an element is
     * considered empty if it has no child elements and is self closing. When
     * false, an element is considered empty if the only children are whitespace
     * nodes.
     *
     * @param {Element} element Element to test
     * @return true if the element is empty, false otherwise
     */
    isEmptyElement: function(element)
    {
        // XXXjjb the commented code causes issues 48, 240, and 244. I think the lines should be deleted.
        // If the DOM has whitespace children, then the element is not empty even if
        // we decide not to show the whitespace in the UI.

        // XXXsroussey reverted above but added a check for self closing tags
        if (Firebug.showWhitespaceNodes)
        {
            return !element.firstChild && isSelfClosing(element);
        }
        else
        {
            for (var child = element.firstChild; child; child = child.nextSibling)
            {
                if (!Firebug.HTMLLib.isWhitespaceText(child))
                    return false;
            }
        }
        return isSelfClosing(element);
    },

    /**
     * Finds the next sibling of the given node. If the
     * {@link Firebug#showWhitespaceNodes} parameter is set to true, the next
     * sibling may be a whitespace, otherwise the next is the first adjacent
     * non-whitespace node.
     *
     * @param {Node} node Node to analyze.
     * @return Next sibling node, if one exists
     */
    findNextSibling: function(node)
    {
        if (Firebug.showWhitespaceNodes)
            return node.nextSibling;
        else
        {
            // only return a non-whitespace node
            for (var child = node.nextSibling; child; child = child.nextSibling)
            {
                if (!Firebug.HTMLLib.isWhitespaceText(child))
                    return child;
            }
        }
    },

    //* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Domplate Utilities
    //* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    /**
     * Locates the attribute domplate node for a given element domplate. This method will
     * only examine notes marked with the "nodeAttr" class that are the direct
     * children of the given element.
     *
     * @param {Object} objectNodeBox The domplate element to look up the attribute for.
     * @param {String} attrName Attribute name
     * @return Attribute's domplate node
     */
    findNodeAttrBox: function(objectNodeBox, attrName)
    {
        var child = objectNodeBox.firstChild.lastChild.firstChild;
        for (; child; child = child.nextSibling)
        {
            if (hasClass(child, "nodeAttr") && child.childNodes[1].firstChild
                && child.childNodes[1].firstChild.nodeValue == attrName)
            {
                return child;
            }
        }
    },

    /**
     * Locates the text domplate node for a given text element domplate.
     * @param {Object} nodeBox Text element domplate
     * @return Element's domplate text node
     */
    getTextElementTextBox: function(nodeBox)
    {
        var nodeLabelBox = nodeBox.firstChild.lastChild;
        return getChildByClass(nodeLabelBox, "nodeText");
    }
};

}});