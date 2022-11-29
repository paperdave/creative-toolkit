import bpy

bl_info = {
  'name': "Creative Toolkit - Object Opacity",
  'author': "Dave Caruso",
  'version': (1, 0, 0),
  'blender': (3, 2, 0),
  'api': 44136,
  'description': "Lets you set/animate opacity without each instance needing it's own material.",
  'wiki_url': "https://github.com/paperdave/creative-toolkit/blob/main/src/blender-addon/object_opacity.py",
  'tracker_url': "",
  'category': "Generic"
}

NODE_GROUP_NAME = "Apply Object Opacity"

def create_node_tree():
  if NODE_GROUP_NAME in bpy.data.node_groups:
    return bpy.data.node_groups[NODE_GROUP_NAME]
  
  node_tree = bpy.data.node_groups.new(NODE_GROUP_NAME, 'ShaderNodeTree')
  node_tree.inputs.new('NodeSocketShader', 'Surface')
  node_tree.outputs.new('NodeSocketShader', 'Surface')

  n_group_input = node_tree.nodes.new('NodeGroupInput')
  n_group_input.location = (-200, -80)
  n_group_input.hide = True

  n_group_output = node_tree.nodes.new('NodeGroupOutput')
  n_group_output.location = (260, 40)

  n_mix_shader = node_tree.nodes.new('ShaderNodeMixShader')
  n_mix_shader.location = (100, 40)

  n_transparent = node_tree.nodes.new('ShaderNodeBsdfTransparent')
  n_transparent.location = (-200, -40)
  n_transparent.hide = True

  n_o1 = node_tree.nodes.new('ShaderNodeAttribute')
  n_o1.location = (-200, 40)
  n_o1.attribute_name = 'opacity'
  n_o1.attribute_type = 'INSTANCER'
  n_o1.label = 'Object Opacity'
  n_o1.hide = True
  n_o1.width = 125

  n_o2 = node_tree.nodes.new('ShaderNodeAttribute')
  n_o2.location = (-200, 0)
  n_o2.attribute_name = 'data.opacity'
  n_o2.attribute_type = 'INSTANCER'
  n_o2.label = 'Mesh Opacity'
  n_o2.hide = True
  n_o2.width = 125

  n_multiply = node_tree.nodes.new('ShaderNodeMath')
  n_multiply.operation = 'MULTIPLY'
  n_multiply.location = (-40, 20)
  n_multiply.hide = True
  n_multiply.width = 100

  node_tree.links.new(n_group_input.outputs[0], n_mix_shader.inputs[2])
  node_tree.links.new(n_transparent.outputs[0], n_mix_shader.inputs[1])
  node_tree.links.new(n_o1.outputs[0], n_multiply.inputs[0])
  node_tree.links.new(n_o2.outputs[0], n_multiply.inputs[1])
  node_tree.links.new(n_multiply.outputs[0], n_mix_shader.inputs[0])
  node_tree.links.new(n_mix_shader.outputs[0], n_group_output.inputs[0])

  return node_tree

def add_support_material(material, self):
  tree = material.node_tree
  if tree is None:
    self.report({'ERROR'}, "Does not support materials without node trees")
    return False

  if material.blend_method == 'OPAQUE':
    material.blend_method = 'BLEND'
    material.shadow_method = 'HASHED'

  for node in tree.nodes:
    if node.type == 'OUTPUT_MATERIAL':
      n_output = node
      break
    if node.name == 'ApplyObjectOpacityNode':
      return True
  if n_output is None:
    self.report({'ERROR'}, "Could not find output node")
    return False

  n_group = tree.nodes.new('ShaderNodeGroup')
  n_group.name = 'ApplyObjectOpacityNode'
  n_group.node_tree = create_node_tree()
  n_group.location = n_output.location
  n_group.location[1] -= 40
  n_output.location[0] += 200
  n_group.hide = True
  n_group.width = 160

  for link in tree.links:
    if link.to_node == n_output:
      tree.links.new(link.from_socket, n_group.inputs[0])
      tree.links.remove(link)

  tree.links.new(n_group.outputs[0], n_output.inputs[0])

  material.has_opacity_support = True

  return True

class OBJECT_OT_EnableOpacity(bpy.types.Operator):
  bl_idname = "object.enable_opacity"
  bl_label = "Enable Opacity Modification"
  bl_description = "Enables opacity support for this object"

  def execute(self, context):
    for material in context.object.material_slots:
      if not material.material.has_opacity_support:
        result = add_support_material(material.material, self)
        if not result:
          return {'CANCELLED'}
    return {'FINISHED'}

def obj_has_opacity_support(obj):
  for material in obj.material_slots:
    if not material.material.has_opacity_support:
      return False
  return True

def draw_material_menu(self, context):
  if obj_has_opacity_support(context.object):
    self.layout.prop(context.object.data, "opacity", text='Opacity', slider=True)
  else:
    self.layout.operator("object.enable_opacity")

def draw_obj_visibility_menu(self, context):
  if obj_has_opacity_support(context.object):
    self.layout.prop(context.object, "opacity", text='Object Opacity', slider=True)
  else:
    self.layout.operator("object.enable_opacity")

def register():
  bpy.types.Object.opacity = bpy.props.FloatProperty(
    name="Object Opacity",
    description="Opacity of the object",
    default=1.0,
    min=0.0,
    max=1.0,
  )
  bpy.types.Mesh.opacity = bpy.props.FloatProperty(
    name="Mesh Opacity",
    description="Opacity of the mesh",
    default=1.0,
    min=0.0,
    max=1.0,
  )
  bpy.types.Curve.opacity = bpy.props.FloatProperty(
    name="Curve Opacity",
    description="Opacity of the curve",
    default=1.0,
    min=0.0,
    max=1.0,
  )
  bpy.types.Material.has_opacity_support = bpy.props.BoolProperty(
    name="Has Opacity Support",
    description="If this material has been automatically modified to allow opacity support",
    default=False,
  )

  bpy.utils.register_class(OBJECT_OT_EnableOpacity)

  bpy.types.EEVEE_MATERIAL_PT_context_material.prepend(draw_material_menu)
  bpy.types.OBJECT_PT_visibility.prepend(draw_obj_visibility_menu)


def unregister():
  bpy.types.EEVEE_MATERIAL_PT_context_material.remove(draw_material_menu)
  bpy.types.OBJECT_PT_visibility.remove(draw_obj_visibility_menu)

  bpy.utils.unregister_class(OBJECT_OT_EnableOpacity)

  del bpy.types.Object.opacity
  del bpy.types.Mesh.opacity
  del bpy.types.Material.has_opacity_support
