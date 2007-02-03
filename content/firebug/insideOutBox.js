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
 
/**
 * Creates a tree based on objects provided by a separate "view" object.
 *
 * Construction uses an "inside-out" algorithm, meaning that the view's job is first
 * to tell us the ancestry of each object, and secondarily its descendants.
 */
top.InsideOutBox = function(view, box)
{
    this.view = view;
    this.box = box;

    this.rootObject = null;

    this.rootObjectBox = null;
    this.selectedObjectBox = null;
    this.highlightedObjectBox = null;

    this.onMouseDown = bind(this.onMouseDown, this);
    box.addEventListener("mousedown", this.onMouseDown, false);
};

InsideOutBox.prototype = 
{
    destroy: function()
    {
        this.box.removeEventListener("mousedown", this.onMouseDown, false);
    },

    highlight: function(object)
    {
        var objectBox = this.createObjectBox(object);
        this.highlightObjectBox(objectBox);
        return objectBox;
    },

    openObject: function(object)
    {
        var firstChild = this.view.getChildObject(object, 0);
        if (firstChild)
            object = firstChild;
    
        var objectBox = this.createObjectBox(object);
        this.openObjectBox(objectBox);
        return objectBox;
    },

    openToObject: function(object)
    {
        var objectBox = this.createObjectBox(object);
        this.openObjectBox(objectBox);
        return objectBox;
    },

    select: function(object, makeBoxVisible, forceOpen, noScrollIntoView)
    {
        var objectBox = this.createObjectBox(object);
        this.selectObjectBox(objectBox, forceOpen);
        if (makeBoxVisible)
        {
            this.openObjectBox(objectBox);
            if (!noScrollIntoView)
                scrollIntoCenterView(objectBox);
        }
        return objectBox;
    },

    expandObject: function(object)
    {
        var objectBox = this.createObjectBox(object);
        if (objectBox)
            this.expandObjectBox(objectBox);
    },

    contractObject: function(object)
    {
        var objectBox = this.createObjectBox(object);
        if (objectBox)
            this.contractObjectBox(objectBox);
    },

    highlightObjectBox: function(objectBox)
    {
        if (this.highlightedObjectBox)
        {
            removeClass(this.highlightedObjectBox, "highlighted");
    
            var highlightedBox = this.getParentObjectBox(this.highlightedObjectBox);
            for (; highlightedBox; highlightedBox = this.getParentObjectBox(highlightedBox))
                removeClass(highlightedBox, "highlightOpen");
        }
    
        this.highlightedObjectBox = objectBox;

        if (objectBox)
        {
            setClass(objectBox, "highlighted");

            var highlightedBox = this.getParentObjectBox(objectBox);
            for (; highlightedBox; highlightedBox = this.getParentObjectBox(highlightedBox))
                setClass(highlightedBox, "highlightOpen");

           scrollIntoCenterView(objectBox);
        }
    },

    selectObjectBox: function(objectBox, forceOpen)
    {
        var isSelected = this.selectedObjectBox && objectBox == this.selectedObjectBox;    
        if (!isSelected)
        {
            removeClass(this.selectedObjectBox, "selected");
    
            this.selectedObjectBox = objectBox;
        
            if (objectBox)
            {
                setClass(objectBox, "selected");
            
                // Force it open the first time it is selected
                if (forceOpen)
                    this.toggleObjectBox(objectBox, true);
            }
        }
    },

    openObjectBox: function(objectBox)
    {
        if (objectBox)
        {
            // Set all of the node's ancestors to be permanently open
            var parentBox = this.getParentObjectBox(objectBox);
            for (; parentBox; parentBox = this.getParentObjectBox(parentBox))
                setClass(parentBox, "open");
        }
    },

    expandObjectBox: function(objectBox)
    {
        var nodeChildBox = this.getChildObjectBox(objectBox);
        if (!nodeChildBox)
            return;
        
        if (!objectBox.populated)
        {
            var firstChild = this.view.getChildObject(objectBox.repObject, 0);
            this.populateChildBox(firstChild, nodeChildBox);
        }

        setClass(objectBox, "open");
    },
    
    contractObjectBox: function(objectBox)
    {
        removeClass(objectBox, "open");
    },
    
    toggleObjectBox: function(objectBox, forceOpen)
    {
        var isOpen = hasClass(objectBox, "open");
        if (!forceOpen && isOpen)
            this.contractObjectBox(objectBox);

        else if (!isOpen)
            this.expandObjectBox(objectBox);
    },

    getNextObjectBox: function(objectBox)
    {
        return findNext(objectBox, isVisibleTarget, false, this.box);
    },
    
    getPreviousObjectBox: function(objectBox)
    {
        return findPrevious(objectBox, isVisibleTarget, true, this.box);
    },
    
    /**
     * Creates all of the boxes for an object, its ancestors, and siblings.
     */
    createObjectBox: function(object)
    {
        if (!object)
            return null;

        var rootObject = this.rootObject;
        if (!rootObject)
            this.rootObject = this.getRootNode(object);

        // Get or create all of the boxes for the target and its ancestors
        var objectBox = this.createObjectBoxes(object, this.rootObject);

        if (!objectBox)
            return null;
        else if (object == this.rootObject)
            return objectBox;
        else
            return this.populateChildBox(object, objectBox.parentNode);
    },

    /**
     * Creates all of the boxes for an object, its ancestors, and siblings up to a root.
     */
    createObjectBoxes: function(object, rootObject)
    {
        if (!object)
            return null;
    
        if (object == rootObject)
        {
            if (!this.rootObjectBox || this.rootObjectBox.repObject != rootObject)
            {
                if (this.rootObjectBox)
                    this.box.removeChild(this.rootObjectBox);

                this.highlightedObjectBox = null;
                this.selectedObjectBox = null;

                this.rootObjectBox = this.view.createObjectBox(object, true);
                this.box.appendChild(this.rootObjectBox);
            }

            return this.rootObjectBox;
        }
        else
        {
            var parentNode = this.view.getParentObject(object);
            var parentObjectBox = this.createObjectBoxes(parentNode, rootObject);
            if (!parentObjectBox)
                return null;
        
            var parentChildBox = this.getChildObjectBox(parentObjectBox);
            if (!parentChildBox)
                return null;
        
            var childObjectBox = this.findChildObjectBox(parentChildBox, object);
            return childObjectBox
                ? childObjectBox
                : this.populateChildBox(object, parentChildBox);
        }
    },

    findObjectBox: function(object)
    {
        if (!object)
            return null;
    
        if (object == this.rootObject)
            return this.rootObjectBox;
        else
        {
            var parentNode = this.view.getParentObject(object);
            var parentObjectBox = this.findObjectBox(parentNode);
            if (!parentObjectBox)
                return null;
        
            var parentChildBox = this.getChildObjectBox(parentObjectBox);
            if (!parentChildBox)
                return null;
        
            return this.findChildObjectBox(parentChildBox, object);
        }
    },

    appendChildBox: function(parentNodeBox, repObject)
    {
        var childBox = this.getChildObjectBox(parentNodeBox);    
        var objectBox = this.findChildObjectBox(childBox, repObject);
        if (objectBox)
            return objectBox;
    
        objectBox = this.view.createObjectBox(repObject);
        if (objectBox)
        {
            var childBox = this.getChildObjectBox(parentNodeBox);
            childBox.appendChild(objectBox);
        }
        return objectBox;
    },

    insertChildBoxBefore: function(parentNodeBox, repObject, nextSibling)
    {
        var childBox = this.getChildObjectBox(parentNodeBox);    
        var objectBox = this.findChildObjectBox(childBox, repObject);
        if (objectBox)
            return objectBox;
    
        objectBox = this.view.createObjectBox(repObject);
        if (objectBox)
        {
            var siblingBox = this.findChildObjectBox(childBox, nextSibling);
            childBox.insertBefore(objectBox, siblingBox);
        }
        return objectBox;
    },

    removeChildBox: function(parentNodeBox, repObject)
    {
        var childBox = this.getChildObjectBox(parentNodeBox);
        var objectBox = this.findChildObjectBox(childBox, repObject);
        if (objectBox)
            childBox.removeChild(objectBox);
    },

    populateChildBox: function(repObject, nodeChildBox)
    {    
        if (!repObject)
            return null;

        var parentObjectBox = nodeChildBox.parentNode;
        if (parentObjectBox.populated)
            return this.findChildObjectBox(nodeChildBox, repObject);
        
        var lastSiblingBox = this.getChildObjectBox(nodeChildBox);
        var siblingBox = nodeChildBox.firstChild;
        var targetBox = null;

        var view = this.view;
    
        var targetSibling = null;
        var parentNode = view.getParentObject(repObject);
        for (var i = 0; 1; ++i)
        {
            targetSibling = view.getChildObject(parentNode, i, targetSibling);
            if (!targetSibling)
                break;
        
            // Check if we need to start appending, or continue to insert before
            if (lastSiblingBox && lastSiblingBox.repObject == targetSibling)
                lastSiblingBox = null;
        
            if (!siblingBox || siblingBox.repObject != targetSibling)
            {
                var newBox = view.createObjectBox(targetSibling);
                if (newBox)
                {
                    if (lastSiblingBox)
                        nodeChildBox.insertBefore(newBox, lastSiblingBox);
                    else
                        nodeChildBox.appendChild(newBox);
                }
            
                siblingBox = newBox;
            }

            if (targetSibling == repObject)
                targetBox = siblingBox;

            if (siblingBox && siblingBox.repObject == targetSibling)
                siblingBox = siblingBox.nextSibling;
        }
    
        if (targetBox)
            parentObjectBox.populated = true;

        return targetBox;
    },

    getParentObjectBox: function(objectBox)
    {
        var parent = objectBox.parentNode ? objectBox.parentNode.parentNode : null;
        return parent && parent.repObject ? parent : null;
    },

    getChildObjectBox: function(objectBox)
    {
        return getChildByClass(objectBox, "nodeChildBox");
    },

    findChildObjectBox: function(parentNodeBox, repObject)
    {
        for (var childBox = parentNodeBox.firstChild; childBox; childBox = childBox.nextSibling)
        {
            if (childBox.repObject == repObject)
                return childBox;
        }    
    },

    getRootNode: function(node)
    {
        while (1)
        {
            var parentNode = this.view.getParentObject(node);
            if (!parentNode)
                return node;
            else
                node = parentNode;
        }
        return null;
    },

    // ********************************************************************************************

    onMouseDown: function(event)
    {
        var hitTwisty = false;
        for (var child = event.target; child; child = child.parentNode)
        {
            if (hasClass(child, "twisty"))
                hitTwisty = true;
            else if (child.repObject)
            {
                if (hitTwisty)
                    this.toggleObjectBox(child);
                break;
            }
        }
    }
};

// ************************************************************************************************
// Local Helpers

function isVisibleTarget(node)
{
    if (node.repObject && node.repObject.nodeType == 1)
    {
        for (var parent = node.parentNode; parent; parent = parent.parentNode)
        {
            if (hasClass(parent, "nodeChildBox")
                && !hasClass(parent.parentNode, "open")
                && !hasClass(parent.parentNode, "highlightOpen"))
                return false;
        }
        return true;
    }
}

}});
