import bpy
import sys

# pretend this is in utils.py
import json
import sys

def sendCTKData(data):
  sys.stderr.write("\nCT_DATA\n%s\n" % json.dumps(data))
# you can stop pretending now

argv = sys.argv[sys.argv.index("--") + 1:]
bpy.context.scene.render.filepath = argv[0]
bpy.context.scene.render.image_settings.file_format = 'OPEN_EXR_MULTILAYER'
bpy.context.scene.render.image_settings.color_mode = 'RGB'
bpy.context.scene.render.image_settings.color_depth = '16'
# DWAA generates small-ish files that load the fastest in Fusion.
# but unfortunately, "fastest" is only 10fps on my machine.
bpy.context.scene.render.image_settings.exr_codec = 'DWAA'
bpy.context.scene.render.use_overwrite = False
bpy.context.scene.render.use_placeholder = True
bpy.context.scene.render.image_settings.use_preview = True
bpy.context.scene.render.use_file_extension = True
bpy.ops.wm.save_mainfile(exit=False)

sendCTKData([
  bpy.context.scene.frame_start,
  bpy.context.scene.frame_end
])
