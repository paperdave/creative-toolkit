# we derive render visibility from viewport visibility, doing the other way around just doesn't work
# when animating stuff, so idk.
#
# initially this updated the data every frame, but that causes crashes during render, now it copies
# the fcurve animations from viewport to render visibility before rendering starts
 
import bpy
from bpy.app.handlers import persistent
from .util.layout import label_multiline

bl_info = {
  'name': "Creative Toolkit - Sync Render Visibility",
  'author': "Dave Caruso",
  'blender': (3, 3, 0),
  'api': 44136,
  'description': "makes visibility options a little more sensible. disabled by default in files",
  'wiki_url': "https://github.com/paperdave/creative-toolkit",
  'tracker_url': "",
  'category': "Generic"
}

@persistent
def on_render_init(scene):
  for action in bpy.data.actions:
    hide_viewport = None
    hide_render = None

    for curve in action.fcurves:
      if curve.data_path == "hide_viewport":
        hide_viewport = curve
        if hide_render:
          break
      elif curve.data_path == "hide_render":
        hide_render = curve
        if hide_viewport:
          break

    if hide_render:
      action.fcurves.remove(hide_render)
    
    if hide_viewport:
      # copy the hide_viewport curve to hide_render
      hide_render = action.fcurves.new(data_path="hide_render")
      hide_render.keyframe_points.add(len(hide_viewport.keyframe_points))
      for i, keyframe_point in enumerate(hide_viewport.keyframe_points):
        hide_render.keyframe_points[i].co = keyframe_point.co
        hide_render.keyframe_points[i].interpolation = keyframe_point.interpolation
        hide_render.keyframe_points[i].handle_left = keyframe_point.handle_left
        hide_render.keyframe_points[i].handle_right = keyframe_point.handle_right

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
  bpy.app.handlers.render_init.append(on_render_init)
  bpy.types.Scene.sync_visibility_enabled = bpy.props.BoolProperty(
    name="Sync Render Visibility",
    description="Automatically assign all object's render visibility from it's viewport visibility",
    default=False,
    update=on_enable
  )
  bpy.utils.register_class(SYNCVIS_PT_Panel)

def unregister():
  bpy.app.handlers.render_init.remove(on_render_init)
  del bpy.types.Scene.sync_visibility_enabled
  bpy.utils.unregister_class(SYNCVIS_PT_Panel)
