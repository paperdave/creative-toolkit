# typist is an addon that allows the native blender text objects be animated
# many ways, including a "typewriter" effect where you can keyframe the amount
# of visible characters. it also supports dynamic python driven texts, data blocks,
# and list of different strings.
#
# this addon is a part of paperdave's creative toolkit, but you can also install it as a
# standalone addon by installing this file as an addon or running it as a script.
 
import bpy
from bpy.app.handlers import persistent

bl_info = {
  'name': "Creative Toolkit - Typist",
  'author': "Dave Caruso",
  'blender': (3, 3, 0),
  'description': "be the coolest typist on the block",
  'wiki_url': "https://github.com/paperdave/creative-toolkit",
  'category': "Text"
}

compile_cache = {}
def eval_script(script, text, context):
  cached = compile_cache.get(script)
  if cached is None:
    module = {
      "bpy": bpy,
      "data": bpy.data,
    }
    compiled = compile(script, "<string>", "exec")
    exec(compiled, {}, module)
    cached = module['get_text']
    compile_cache[script] = cached
  return cached(text, context, context.scene.frame_current)

def find_space(text, start):
  e1 = text.find(" ", start)
  e2 = text.find("\n", start)

  if e1 == -1:
    e1 = len(text)
  else:
    e1 += 1
  if e2 == -1:
    e2 = len(text)
  else:
    e2 += 1
  
  return min(e1, e2)

def find_newline(text, start):
  end = text.find("\n", start)
  if end == -1:
    end = len(text)
  else:
    end += 1
  return end

def step_skipping_spaces(text, start, num):
  end = start
  for _ in range(num):
    end += 1
    while end < len(text) and text[end] == " " and text[end] != "\n":
      end += 1
    if end >= len(text):
      return end
  return end

def trim_text(
  text:str,
  start_line:int = 0,
  start_word:int = 0,
  start_char:int = 0,
  len_line:int = 0,
  len_word:int = 0,
  len_char:int = -1,
  ignore_spaces:bool=False
):
  start = 0
  for _ in range(start_line):
    start = find_newline()
  for _ in range(start_word):
    start = find_space(text, start)
  if ignore_spaces:
    start = step_skipping_spaces(text, start, start_char)
  else:
    start += start_char

  start = min(start, len(text))
  end = start

  if len_line < 0 or len_word < 0 or len_char < 0:
    end = len(text)
  else:
    for _ in range(len_line):
      end = find_newline(text, end)
    for _ in range(len_word):
      end = find_space(text, end)
    if ignore_spaces:
      end = step_skipping_spaces(text, end, len_char)
    else:
      end += len_char
    
    end = min(end, len(text))
  
  return text[start:end]

def update_text(text, scene):
  if text.typist_mode == 'STATIC':
    source = text.typist_text.replace("\\n", "\n")
  elif text.typist_mode == 'EXPR':
    try:
      source = str(eval(text.typist_text, None, {
        "bpy": bpy,
        "data": bpy.data,
        "self": text,
        "frame": scene.frame_current,
      }))
    except Exception as e:
      text.body = "[error] " + str(e)
      return
  elif text.typist_mode == 'LIST':
    try:
      source = text.typist_list[text.typist_list_show].name.replace("\\n", "\n")
    except Exception as e:
      text.body = "[out of bounds]"
      return
  elif text.typist_mode == 'BLOCK':
    source = text.typist_block.as_string()
  elif text.typist_mode == 'SCRIPT':
    try:
      source = eval_script(text.typist_block.as_string(), text, bpy.context)
    except Exception as e:
      text.body = "[error] " + str(e)
      return
  else:
    text.body = "[unknown mode]"
    return
  
  text.body = trim_text(
    source,
    start_line=text.typist_start_line,
    start_word=text.typist_start_word,
    start_char=text.typist_start_char,
    len_line=text.typist_len_line,
    len_word=text.typist_len_word,
    len_char=text.typist_len_char,
    ignore_spaces=text.typist_ignore_spaces
  )

  print(f'updating object {text.name} at frame {scene.frame_current} to "{text.body}"')

def update_scene(scene):
  for text in scene.objects:
    if text.type == 'FONT' and text.data.typist_enabled:
      update_text(text.data, scene)

# is_rendering = False

@persistent   
def on_frame_change(scene):
  update_scene(scene)

# @persistent   
# def on_render_init(scene):
#   global is_rendering
#   is_rendering = True

# @persistent   
# def on_render_end(scene):
#   global is_rendering
#   is_rendering = False

# @persistent   
# def on_pre_render(scene):
#   update_scene(scene)

def on_attr_update(self, context):
  if self.typist_enabled:
    update_text(self)

def on_typist_enable(text, context):
  if text.typist_enabled:
    text.typist_backup = text.body
    text.typist_text = text.body.replace("\n", "\\n")
  elif text.typist_backup:
    text.body = text.typist_backup
    text.typist_backup = ""
    text.typist_text = ""

def on_list_struct_update(self, context):
  text = context.object.data
  if not text.typist_enabled:
    return
  update_text(text)

class TYPIST_OT_NewText(bpy.types.Operator):
  bl_idname = "typist.new_text_block"
  bl_label = "New Text Block"

  def execute(self, context):
    block = bpy.data.texts.new("Typist Block")
    context.active_object.data.typist_block = block
    return {'FINISHED'}

class TYPIST_OT_NewScript(bpy.types.Operator):
  bl_idname = "typist.new_text_block_script"
  bl_label = "New Script Text Block"

  def execute(self, context):
    block = bpy.data.texts.new("Typist Script")
    block.write("# return string to display\n")
    block.write("def get_text(text, context, frame):\n")
    block.write("  return \"hello\"\n")
    context.active_object.data.typist_block = block
    return {'FINISHED'}

class TYPIST_OT_ListAction(bpy.types.Operator):
  bl_idname = "typist.list_action"
  bl_label = "List Actions"
  bl_options = {'REGISTER'}

  action: bpy.props.EnumProperty(
    items=(
      ('UP', "Up", ""),
      ('DOWN', "Down", ""),
      ('REMOVE', "Remove", ""),
      ('ADD', "Add", ""),
      ('SET', "Set", "")))

  index: bpy.props.IntProperty()

  def invoke(self, context, event):
    text = context.object.data
    idx = text.typist_list_index

    if self.action == 'DOWN' and idx < len(text.typist_list) - 1:
      text.typist_list.move(idx, idx+1)
      text.typist_list_index += 1
    elif self.action == 'UP' and idx >= 1:
      text.typist_list.move(idx, idx-1)
      text.typist_list_index -= 1
    elif self.action == 'REMOVE':
      text.typist_list_index -= 1
      text.typist_list.remove(idx)
    elif self.action == 'ADD':
      item = text.typist_list.add()
      item.name = "[text]"
      text.typist_list_index = len(text.typist_list)-1
    elif self.action == 'SET':
      text.typist_list_show = self.index
      if context.scene.tool_settings.use_keyframe_insert_auto:
        text.keyframe_insert(data_path="typist_list_show", frame=context.scene.frame_current)
    return {"FINISHED"}

class TYPIST_UL_TextList(bpy.types.UIList):
  def draw_item(self, context, layout, data, item, icon, active_data, active_propname, index):
    op = layout.operator(
      "typist.list_action",
      text="",
      icon="RADIOBUT_ON" if index == context.object.data.typist_list_show else "RADIOBUT_OFF",
      emboss=False
    )
    op.action = 'SET'
    op.index = index
    layout.prop(item, "name", text="", emboss=False)

  def invoke(self, context, event):
    pass   
    
class TYPIST_ListStruct(bpy.types.PropertyGroup):
  name: bpy.props.StringProperty(
    update=on_list_struct_update,
  )
  
class TYPIST_PT_MainPanel(bpy.types.Panel):
  '''
  Typist Panel
  '''
  bl_label = "Typist"
  bl_idname = "TEXT_PT_Typist"
  bl_space_type = 'PROPERTIES'
  bl_region_type = 'WINDOW'
  bl_context = 'data'

  @classmethod
  def poll(cls, context):
    return context.active_object and context.active_object.type == 'FONT'

  def draw_header(self, context):
    text = context.active_object.data
    layout = self.layout

    layout.prop(text, 'typist_enabled', text="")

  def draw(self, context):
    st = context.space_data
    text = context.active_object.data
    layout = self.layout

    layout.enabled = text.typist_enabled

    layout.prop(text, 'typist_mode', expand=True)
    
    if text.typist_mode == 'STATIC':
      layout.prop(text, 'typist_text', text="")
    elif text.typist_mode == 'BLOCK':
      layout.template_ID(text, 'typist_block', new="typist.new_text_block")
    elif text.typist_mode == 'LIST':
      row = layout.row()
      row.template_list("TYPIST_UL_TextList", "", text, "typist_list", text, "typist_list_index")
      col = row.column(align=True)
      col.operator("typist.list_action", icon='ADD', text="").action = 'ADD'
      col.operator("typist.list_action", icon='REMOVE', text="").action = 'REMOVE'
      col.separator()
      col.operator("typist.list_action", icon='TRIA_UP', text="").action = 'UP'
      col.operator("typist.list_action", icon='TRIA_DOWN', text="").action = 'DOWN'

      layout.prop(text, 'typist_list_show', text="Visible Item")
    elif text.typist_mode == 'EXPR':
      layout.prop(text, 'typist_text', text="")
    elif text.typist_mode == 'SCRIPT':
      layout.template_ID(text, 'typist_block', new="typist.new_text_block_script")

    layout.label(text="Start")
    row = layout.row()
    row.prop(text, 'typist_start_line', text='Line')
    row.prop(text, 'typist_start_word', text='Word')
    row.prop(text, 'typist_start_char', text='Char')
    layout.label(text="Length")
    row = layout.row()
    row.prop(text, 'typist_len_line', text='Line')
    row.prop(text, 'typist_len_word', text='Word')
    row.prop(text, 'typist_len_char', text='Char')
    layout.prop(text, 'typist_ignore_spaces')

def register():
  bpy.utils.register_class(TYPIST_OT_ListAction)
  bpy.utils.register_class(TYPIST_UL_TextList)
  bpy.utils.register_class(TYPIST_ListStruct)
  bpy.utils.register_class(TYPIST_OT_NewText)
  bpy.utils.register_class(TYPIST_OT_NewScript)
  bpy.utils.register_class(TYPIST_PT_MainPanel)

  bpy.types.TextCurve.typist_enabled = bpy.props.BoolProperty(
    update=on_typist_enable,
    default=False,
    name="Enable Typist"
  )
  bpy.types.TextCurve.typist_ignore_spaces = bpy.props.BoolProperty(
    update=on_attr_update,
    default=True,
    options={'ANIMATABLE'},
    name="Ignore Spaces"
  )
  bpy.types.TextCurve.typist_start_line = bpy.props.IntProperty(
    update=on_attr_update,
    min=0,
    default=0,
    options={'ANIMATABLE'},
    name="Start Line"
  )
  bpy.types.TextCurve.typist_start_word = bpy.props.IntProperty(
    update=on_attr_update,
    min=0,
    default=0,
    options={'ANIMATABLE'},
    name="Start Word"
  )
  bpy.types.TextCurve.typist_start_char = bpy.props.IntProperty(
    update=on_attr_update,
    min=0,
    default=0,
    options={'ANIMATABLE'},
    name="Start Char"
  )
  bpy.types.TextCurve.typist_len_line = bpy.props.IntProperty(
    update=on_attr_update,
    min=0,
    default=0,
    options={'ANIMATABLE'},
    name="Length Line"
  )
  bpy.types.TextCurve.typist_len_word = bpy.props.IntProperty(
    update=on_attr_update,
    min=0,
    default=0,
    options={'ANIMATABLE'},
    name="Length Word"
  )
  bpy.types.TextCurve.typist_len_char = bpy.props.IntProperty(
    update=on_attr_update,
    min=-1,
    default=-1,
    options={'ANIMATABLE'},
    name="Length Char"
  )
  bpy.types.TextCurve.typist_backup = bpy.props.StringProperty()
  bpy.types.TextCurve.typist_text = bpy.props.StringProperty(
    update=on_attr_update,
    name="Text String",
  )
  bpy.types.TextCurve.typist_block = bpy.props.PointerProperty(
    update=on_attr_update,
    name="Text Block",
    type=bpy.types.Text,
  )
  bpy.types.TextCurve.typist_list = bpy.props.CollectionProperty(
    type=TYPIST_ListStruct,
    name="Text List",
  )
  bpy.types.TextCurve.typist_list_index = bpy.props.IntProperty()
  bpy.types.TextCurve.typist_list_show = bpy.props.IntProperty(
    update=on_attr_update,
    default=0,
  )
  bpy.types.TextCurve.typist_mode = bpy.props.EnumProperty(
    items=(
      ('STATIC', 'Static', 'Display a static string'),
      ('BLOCK', 'Block', 'Display a block of text'),
      ('LIST', 'List', 'Use a list of strings, select which text'),
      ('EXPR', 'Expression', 'Python Expression'),
      ('SCRIPT', 'Script', 'Python Script'),
    ),
    update=on_attr_update,
    name="Mode",
    description="Typist Mode"
  )
  
  bpy.app.handlers.frame_change_post.append(on_frame_change)

def unregister():
  bpy.app.handlers.frame_change_post.remove(on_frame_change)

  bpy.utils.unregister_class(TYPIST_PT_MainPanel)
  bpy.utils.unregister_class(TYPIST_OT_NewText)
  bpy.utils.unregister_class(TYPIST_OT_NewScript)
  bpy.utils.unregister_class(TYPIST_ListStruct)
  bpy.utils.unregister_class(TYPIST_UL_TextList)
  bpy.utils.unregister_class(TYPIST_OT_ListAction)

  del(bpy.types.TextCurve.typist_enabled)
  del(bpy.types.TextCurve.typist_ignore_spaces)
  del(bpy.types.TextCurve.typist_start_line)
  del(bpy.types.TextCurve.typist_start_word)
  del(bpy.types.TextCurve.typist_start_char)
  del(bpy.types.TextCurve.typist_len_line)
  del(bpy.types.TextCurve.typist_len_word)
  del(bpy.types.TextCurve.typist_len_char)
  del(bpy.types.TextCurve.typist_backup)
  del(bpy.types.TextCurve.typist_text)
  del(bpy.types.TextCurve.typist_block)
  del(bpy.types.TextCurve.typist_list)
  del(bpy.types.TextCurve.typist_list_index)
  del(bpy.types.TextCurve.typist_list_show)
  del(bpy.types.TextCurve.typist_mode)

if __name__ == "__main__":
  register()
