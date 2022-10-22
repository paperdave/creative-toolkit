# @paperdave/fusion: Fusion file format for JS

This package implements an easy way to parse, modify, and write `.comp`, `.setting` and other Blackmagic Fusion files. It does this by parsing the AST, and then returning classes that provide getter/setters that wrap the AST itself. It has no focus on performance, but instead on clean code.

Most of the properties are not available as I only implemented what I personally use, though you can access anything through chaining `.get()` calls
