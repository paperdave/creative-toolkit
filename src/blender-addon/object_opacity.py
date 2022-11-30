import bpy

# this addon adds a per-object opacity slider at the top of the material panel. in order to use
# it, you have to opt-in all your materials to have an extra node group to handle applying the object
# opacity data. one material can work with multiple objects, so this opt-in does not copy the material
# after that, it just works as you would expect an opacity slider to work
#
# this addon is a part of paperdave's creative toolkit, but you can also install it as a
# standalone addon by installing this file as an addon or running it as a script. 

bl_info = {
  'name': "Creative Toolkit - Object Opacity",
  'author': "Dave Caruso",
  'blender': (3, 3, 0),
  'description': "Lets you set/animate opacity without each instance needing it's own material.",
  'wiki_url': "https://github.com/paperdave/creative-toolkit",
  'category': "Material"
}

MIX_NODE_TREE_NAME = "Apply Object Opacity"

def create_mix_node_tree():
  if MIX_NODE_TREE_NAME in bpy.data.node_groups:
    return bpy.data.node_groups[MIX_NODE_TREE_NAME]
  
  node_tree = bpy.data.node_groups.new(MIX_NODE_TREE_NAME, 'ShaderNodeTree')
  node_tree.inputs.new('NodeSocketShader', 'Surface')
  node_tree.outputs.new('NodeSocketShader', 'Surface')

  n_group_input = node_tree.nodes.new('NodeGroupInput')
  n_group_input.location = (-80, -60)
  n_group_input.hide = True

  n_group_output = node_tree.nodes.new('NodeGroupOutput')
  n_group_output.location = (270, 40)

  n_mix_shader = node_tree.nodes.new('ShaderNodeMixShader')
  n_mix_shader.location = (100, 40)

  n_transparent = node_tree.nodes.new('ShaderNodeBsdfTransparent')
  n_transparent.location = (-80, -20)
  n_transparent.hide = True

  n_o1 = node_tree.nodes.new('ShaderNodeAttribute')
  n_o1.location = (-80, 40)
  n_o1.attribute_name = 'opacity'
  n_o1.attribute_type = 'INSTANCER'
  n_o1.label = 'Object Opacity'
  n_o1.hide = True
  n_o1.width = 125

  node_tree.links.new(n_group_input.outputs[0], n_mix_shader.inputs[2])
  node_tree.links.new(n_transparent.outputs[0], n_mix_shader.inputs[1])
  node_tree.links.new(n_o1.outputs[0], n_mix_shader.inputs[0])
  node_tree.links.new(n_mix_shader.outputs[0], n_group_output.inputs[0])

  return node_tree

def add_support_material(material, self):
  tree = material.node_tree
  if tree is None:
    self.report({'ERROR'}, "Does not support materials without node trees")
    return False

  if material.blend_method == 'OPAQUE':
    material.blend_method = 'BLEND'
    material.show_transparent_back = False
    if material.shadow_method != 'NONE':
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
  n_group.node_tree = create_mix_node_tree()
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
  if len(obj.material_slots) == 0:
    return False
  for material in obj.material_slots:
    if not material.material.has_opacity_support:
      return False
  return True

def draw_material_menu(self, context):
  if obj_has_opacity_support(context.object):
    self.layout.prop(context.object, "opacity", text='Opacity', slider=True)
  else:
    row = self.layout.row()
    row.operator("object.enable_opacity")
    row.enabled = len(context.object.material_slots) > 0

def register():
  bpy.types.Object.opacity = bpy.props.FloatProperty(
    name="Object Opacity",
    description="Opacity",
    default=1.0,
    min=0.0,
    max=1.0,
    options={'ANIMATABLE'},
  )
  bpy.types.Material.has_opacity_support = bpy.props.BoolProperty(
    name="Has Opacity Support",
    description="If this material has been automatically modified to allow opacity support",
    default=False,
  )

  bpy.utils.register_class(OBJECT_OT_EnableOpacity)

  bpy.types.EEVEE_MATERIAL_PT_context_material.prepend(draw_material_menu)

def unregister():
  bpy.types.EEVEE_MATERIAL_PT_context_material.remove(draw_material_menu)

  bpy.utils.unregister_class(OBJECT_OT_EnableOpacity)

  del bpy.types.Object.opacity
  del bpy.types.Mesh.opacity
  del bpy.types.Material.has_opacity_support

if __name__ == "__main__":
  register()
