FBL.ns(function() { with (FBL) {
// ************************************************************************************************

/*



From Honza Tutorial
----------------------------------------------------
FBL.ns(function() { with (FBL) {
var panelName = "HelloWorld";
Firebug.HelloWorldModel = extend(Firebug.Module,
{
    showPanel: function(browser, panel) {
        var isHwPanel = panel && panel.name == panelName;
        var hwButtons = browser.chrome.$("fbHelloWorldButtons");
        collapse(hwButtons, !isHwPanel);
    },
    onMyButton: function(context) {
        alert("Hello World!");
    }
});

function HelloWorldPanel() {}
HelloWorldPanel.prototype = extend(Firebug.Panel,
{
    name: panelName,
    title: "Hello World!",

    initialize: function() {
        Firebug.Panel.initialize.apply(this, arguments);
    }
});

Firebug.registerModule(Firebug.HelloWorldModel);
Firebug.registerPanel(HelloWorldPanel);

}});
----------------------------------------------------



  */  
  
  
Firebug.Panel = 
{
    panelNode: null,
    panelBar: null,

    name: "HelloWorld",
    title: "Hello World!",
    
    initialize: function()
    {
        //Firebug.Panel.initialize.apply(this, arguments);
    },
    
    sync: function()
    {
      
    }
    
};

//************************************************************************************************
// Panel Management

Firebug.registerPanel = function()
{
  
};

// ************************************************************************************************
}});