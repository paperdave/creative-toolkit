local uuid = os.getenv("ct_fusion_uuid");
print("ct_fusion_uuid: " .. uuid);
local fusion = Fusion("localhost", 0, uuid) -- ct's fusion render node

-- this line runs in fuscript
print("hello world!")

-- this line runs within FusionRenderNode
fusion:Execute("io.stdout:write('hello world!\\n')")
