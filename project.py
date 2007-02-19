name = "firebug"
description = "Web development evolved"
version = "1.0"

buildPre = XPIDLCompile()
build = FirefoxExtension()

class config:
    extensionId = "firebug@software.joehewitt.com"
    chromeDirs = ["content", "locale/en-US", "skin"]
