# this addon adds some operators to easily add animations to make objects appear and disappear,
# with optional fading in and out. opacity animation depends on the object_opacity.py addon in
# this folder.
#
# this addon is a part of paperdave's creative toolkit, but you can also install it as a
# standalone addon by installing this file as an addon or running it as a script.

import bpy
from bpy.types import Operator
from .object_opacity import add_support_material

bl_info = {
  'name': "Creative Toolkit - Fade Tools",
  'author': "Dave Caruso",
  'blender': (3, 3, 0),
  'description': "Adds operators to easily add animations to make objects appear and disappear.",
  'wiki_url': "https://github.com/paperdave/creative-toolkit",
  'category': "Object"
}

def menu(self, context):
  self.layout.operator("object.fadetools", text="Appear").type = 'APPEAR'
  self.layout.operator("object.fadetools", text="Disappear").type = 'DISAPPEAR'
  self.layout.operator("object.fadetools", text="Fade In (30 Frames)").type = 'FADE_IN'
  self.layout.operator("object.fadetools", text="Fade Out (30 Frames)").type = 'FADE_OUT'

  op = self.layout.operator("object.fadetools", text="Fade In Custom")
  op.type = 'FADE_IN'
  op.prompt = True

  op = self.layout.operator("object.fadetools", text="Fade Out Custom")
  op.type = 'FADE_OUT'
  op.prompt = True

class OBJECT_MT_fadetools(bpy.types.Menu):
  bl_label = "FadeTools"
  bl_idname = "OBJECT_MT_fadetools"

  def draw(self, context):
    self.layout.operator_context = 'EXEC_DEFAULT'
    menu(self, context)

class OBJECT_OT_fadetools(Operator):
  bl_idname = "object.fadetools"
  bl_label = "FadeTools"
  bl_description = "Adds keyframes to make selected objects appear and disappear."
  bl_options = {'REGISTER', 'UNDO'}

  prompt: bpy.props.BoolProperty(
    default=False
  )

  type: bpy.props.EnumProperty(
    name="Type",
    description="Type of fade",
    items=[
      ('APPEAR', "Appear", "Instantly appear"),
      ('DISAPPEAR', "Disappear", "Instantly disappear"),
      ('FADE_IN', "Fade In", "Fade in over 30 frames"),
      ('FADE_OUT', "Fade Out", "Fade out over 30 frames"),
    ],
    default=None,
  )

  duration: bpy.props.IntProperty(
    name="Duration",
    description="Duration of fade in frames",
    default=30,
    min=2,
  )

  move_playhead: bpy.props.BoolProperty(
    name="Move Playhead",
    description="Move playhead to end of fade",
    default=True,
  )

  @classmethod
  def poll(self, context):
    return len(context.selected_objects) > 0

  def invoke(self, context, event):
    context.window_manager.popup_menu(menu, title="FadeTools", icon='NONE')
    return {'RUNNING_MODAL'}

  def execute(self, context):
    if self.prompt:
      self.prompt = False
      context.window_manager.invoke_props_dialog(self)
      return {'RUNNING_MODAL'}

    for obj in context.selected_objects:
      if self.type == 'APPEAR':
        obj.hide_viewport = True
        obj.keyframe_insert(data_path='hide_viewport', frame=context.scene.frame_current - 1)
        obj.hide_viewport = False
        obj.keyframe_insert(data_path='hide_viewport', frame=context.scene.frame_current)
      elif self.type == 'DISAPPEAR':
        obj.hide_viewport = False
        obj.keyframe_insert(data_path='hide_viewport', frame=context.scene.frame_current - 1)
        obj.hide_viewport = True
        obj.keyframe_insert(data_path='hide_viewport', frame=context.scene.frame_current)
      else:
        current_opacity = obj.opacity if obj.opacity > 0 else 1

        if self.duration < 2:
          self.report({'ERROR'}, "Duration must be at least 2 frames")
          return {'CANCELLED'}

        for material in obj.material_slots:
          if not material.material.has_opacity_support:
            result = add_support_material(material.material, self)
            if not result:
              return {'CANCELLED'}

        if self.type == 'FADE_IN':
          obj.opacity = 0
          obj.keyframe_insert(data_path='opacity', frame=context.scene.frame_current)
          obj.opacity = current_opacity
          obj.keyframe_insert(data_path='opacity', frame=context.scene.frame_current + self.duration)
        else:
          obj.opacity = current_opacity
          obj.keyframe_insert(data_path='opacity', frame=context.scene.frame_current)
          obj.opacity = 0
          obj.keyframe_insert(data_path='opacity', frame=context.scene.frame_current + self.duration)

        if self.move_playhead:
          context.scene.frame_current += self.duration

    return {'FINISHED'}

  def draw(self, context):
    layout = self.layout
    layout.prop(self, 'type', expand=True)

    if self.type in ['FADE_IN', 'FADE_OUT']:
      layout.prop(self, 'duration')
      layout.prop(self, 'move_playhead')

def menu_func(self, context):
  self.layout.separator()
  self.layout.menu("OBJECT_MT_fadetools", text="FadeTools")

classes = (
  OBJECT_OT_fadetools,
  OBJECT_MT_fadetools,
)

def register():
  for cls in classes:
    bpy.utils.register_class(cls)
  
  bpy.types.VIEW3D_MT_object.append(menu_func)
  bpy.types.VIEW3D_MT_object_context_menu.append(menu_func)

def unregister():
  for cls in reversed(classes):
    bpy.utils.unregister_class(cls)

  bpy.types.VIEW3D_MT_object.remove(menu_func)
  bpy.types.VIEW3D_MT_object_context_menu.remove(menu_func)
