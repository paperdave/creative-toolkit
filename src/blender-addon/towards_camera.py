# todo: organize this better
import bpy

class PointAtCameraOperator(bpy.types.Operator):
  bl_idname = "object.pointatcamera"
  bl_label = "PointAtCamera"

  def execute(self, context):
    for obj in context.selected_objects:
      obj.rotation_euler = context.scene.camera.rotation_euler
    return {'FINISHED'}

class MoveTowardsCameraOperator(bpy.types.Operator):
  bl_idname = "object.movetowardscamera"
  bl_label = "MoveTowardsCamera"

  def execute(self, context):
    return bpy.ops.transform.translate(
      "INVOKE_DEFAULT",
      orient_axis_ortho='X', 
      orient_matrix=context.scene.camera.matrix_world.to_3x3(),
      constraint_axis=(False, False, True)
  )

def menu_func(self, context):
  self.layout.operator(PointAtCameraOperator.bl_idname)
  self.layout.operator(MoveTowardsCameraOperator.bl_idname)

def register():
  bpy.utils.register_class(PointAtCameraOperator)
  bpy.utils.register_class(MoveTowardsCameraOperator)
  bpy.types.VIEW3D_MT_object.append(menu_func)

def unregister():
  bpy.utils.unregister_class(PointAtCameraOperator)
  bpy.utils.unregister_class(MoveTowardsCameraOperator)
  bpy.types.VIEW3D_MT_object.remove(menu_func)
