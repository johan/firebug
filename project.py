name = "firebug"
description = "Web development evolved"
version = "1.02"

buildPre = XPIDLCompile()
build = FirefoxExtension()

class config:
    extensionId = "firebug@software.joehewitt.com"
    chromeDirs = ["content", "locale/en-US", "locale/ja-JP", "skin"]
