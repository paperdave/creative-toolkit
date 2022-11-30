bl_info = {
  "name" : "Creative Toolkit",
  "author" : "Dave Caruso",
  "description" : "Collection of tools for paperdave content",
  "blender" : (3, 3, 0),
  "category" : "Generic"
}

from . import fade_tools
from . import object_opacity
from . import sync_render_visibility
from . import towards_camera
from . import typist

modules = (
  fade_tools,
  object_opacity,
  sync_render_visibility,
  towards_camera,
  typist,
)

def register():
  for module in modules:
    try:
      module.register()
    except Exception as e:
      print("Error registering module: " + module.__name__)
      print(e)

def unregister():
  for module in reversed(modules):
    try:
      module.unregister()
    except Exception as e:
      print("Error unregistering module: " + module.__name__)
      print(e)
