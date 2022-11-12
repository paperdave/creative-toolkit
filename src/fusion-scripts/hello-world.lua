local fusion = Fusion(os.getenv("ct_fusion_uid")) -- ct's fusion render node

-- this line runs in fuscript
print("hello world!")

-- this line runs within FusionRenderNode
fusion:Execute("io.stdout:write('hello world!\\n')")
