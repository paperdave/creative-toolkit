bl_info = {
  "name" : "Creative Toolkit",
  "author" : "Dave Caruso",
  "description" : "Collection of tools for paperdave content",
  "blender" : (3, 3, 0),
  "version" : (0, 0, 0),
  "category" : "Generic"
}

from . import towards_camera
from . import typist

def register():
  towards_camera.register()
  typist.register()

def unregister():
  towards_camera.unregister()
  typist.unregister()
