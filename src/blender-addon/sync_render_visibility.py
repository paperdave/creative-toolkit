import bpy
from bpy.app.handlers import persistent
import textwrap

# we derive render visibility from viewport visibility, doing the other way around just doesn't work
# when animating stuff, so idk.

# initially this used the msgbus rna stuff, but in reality this isnt needed at all since render
# visibility is only meaningful at ... render time. in the future this should be rewritten to
# only use render events and stuff, but this works.

bl_info = {
  'name': "Creative Toolkit - Sync Render Visibility",
  'author': "Dave Caruso",
  'version': (1, 0, 0),
  'blender': (3, 2, 0),
  'api': 44136,
  'description': "makes visibility options a little more sensible. disabled by default in files",
  'wiki_url': "https://github.com/paperdave/creative-toolkit/blob/main/src/blender-addon/sync_render_visibility.py",
  'tracker_url': "",
  'category': "Generic"
}

owner = object()

def update_scene():
  if bpy.context.scene.sync_visibility_enabled:
    for obj in bpy.context.scene.objects:
      obj.hide_render = obj.hide_viewport

@persistent
def on_load_post(scene):
  update_scene()

@persistent
def on_frame_update(scene):
  update_scene()

def on_enable(self, context):
  if bpy.context.scene.sync_visibility_enabled:
    # go to each outliner and hide the "render visibility" button
    # and show the "viewport visibility" button
    for workspace in bpy.data.workspaces:
      for screen in workspace.screens:
        for area in screen.areas:
          for space in area.spaces:
            if space.type == 'OUTLINER':
              space.show_restrict_column_render = False
              space.show_restrict_column_viewport = True

def label_multiline(context, text, parent):
  chars = int(context.region.width / 7)   # 7 pix on 1 character
  wrapper = textwrap.TextWrapper(width=chars)
  text_lines = wrapper.wrap(text=text)
  for text_line in text_lines:
    parent.label(text=text_line)
      
class SYNCVIS_PT_Panel(bpy.types.Panel):
  bl_label = "Sync Render Visibility"
  bl_idname = "SYNCVIS_PT_Panel"
  bl_space_type = 'PROPERTIES'
  bl_region_type = 'WINDOW'
  bl_context = "scene"

  def draw_header(self, context):
    self.layout.prop(context.scene, "sync_visibility_enabled", text="")
  
  def draw(self, context):
    label_multiline(
      context=context,
      text="With this enabled, all objects `hide_render` will be set to the same value as `hide_viewport`. This is disabled by default to avoid breaking existing/thirdparty files.",
      parent=self.layout
    )

def register():
  bpy.app.handlers.load_post.append(on_load_post)
  bpy.app.handlers.frame_change_post.append(on_frame_update)
  bpy.types.Scene.sync_visibility_enabled = bpy.props.BoolProperty(
    name="Sync Render Visibility",
    description="Automatically assign all object's render visibility from it's viewport visibility",
    default=False,
    update=on_enable
  )
  bpy.utils.register_class(SYNCVIS_PT_Panel)

def unregister():
  bpy.app.handlers.load_post.remove(on_load_post)
  bpy.app.handlers.frame_change_post.remove(on_frame_update)
  del bpy.types.Scene.sync_visibility_enabled
  bpy.utils.unregister_class(SYNCVIS_PT_Panel)
