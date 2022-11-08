local active = comp.ActiveTool
comp:SetActiveTool(nil)
local MainInput = comp:FindTool("MainInput")

if active == nil then
  print("insert_cryptomatte: No active tool")
  return
end
if MainInput == nil then
  print("insert_cryptomatte: No MainInput")
  return
end

local cryptomatte = comp:AddTool("Fuse.Cryptomatte", -32768, -32768)
local link = comp:AddTool("Fuse.Wireless", -32768, -32768)

link.Input:ConnectTo(MainInput.Output)
cryptomatte.Input:ConnectTo(link.Output)
active.EffectMask:ConnectTo(cryptomatte.Output)
