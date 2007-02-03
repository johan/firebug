name = "firebug"
description = "Web development evolved"
version = "1.0"

buildPath = "build"

buildPre = XPIDLCompile()
build = FirefoxExtension()

class variables:
    extensionId = "firebug@software.joehewitt.com"
