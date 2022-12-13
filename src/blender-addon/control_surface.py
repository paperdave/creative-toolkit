import bpy
from bpy.types import Operator
import socket
from threading import Thread

SOCKET_PATH = "/tmp/ct-control-surface.sock"

bl_info = {
  'name': "Creative Toolkit - Control Surface Integration",
  'author': "Dave Caruso",
  'blender': (3, 3, 0),
  'description': "Allows you to control blender via an external control surface. Currently only handles knob binding",
  'wiki_url': "https://github.com/paperdave/creative-toolkit",
}

knob_target = None
knob_prop = None
knob_index = 0

class OBJECT_OT_bind_knob(Operator):
  bl_idname = "anim.knob_bind"
  bl_label = "Bind Knob to Property"
  bl_description = "Bind a knob to a property"
  bl_options = {'REGISTER'}

  def execute(self, context):
    global knob_target
    global knob_prop

    knob_target = context.button_pointer
    knob_prop = context.button_prop

    print(f"Bound knob to {knob_target}.{knob_prop}")

    return {'FINISHED'}

def draw_menu(self, context):
  layout = self.layout
  layout.separator()
  layout.operator(OBJECT_OT_bind_knob.bl_idname)

# socket client
socket = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
socket.connect(SOCKET_PATH)

def respond_thread():
  while True:
    data = socket.recv(1024, timeout=0.25)
    if not data:
      break
  
    if data == "Hello":
      print("Hello from server")
    elif data.startswith(b"J"):
      if knob_target and knob_prop:
        rotations = int(data[1:]) / 1400000 # weird magic number

        if knob_prop.array_length > 0:
          current = getattr(knob_target, knob_prop.identifier)[knob_index]
        else:
          current = getattr(knob_target, knob_prop.identifier)
        
        factor = 4

        value = current + rotations * factor

        if knob_prop.array_length > 0:
          getattr(knob_target, knob_prop.identifier)[knob_index] = value
        else:
          setattr(knob_target, knob_prop.identifier, value)
        
        # if auto keyframing is enabled, keyframe the value
        if bpy.context.scene.tool_settings.use_keyframe_insert_auto:
          knob_target.keyframe_insert(data_path=knob_prop.identifier)

thread = None

def register():
  bpy.utils.register_class(OBJECT_OT_bind_knob)
  bpy.types.UI_MT_button_context_menu.append(draw_menu)
  thread = Thread(target=respond_thread)
  thread.daemon = True
  thread.start()

def unregister():
  bpy.utils.unregister_class(OBJECT_OT_bind_knob)
  bpy.types.UI_MT_button_context_menu.remove(draw_menu)
  socket.close()
  thread.join()

register()
